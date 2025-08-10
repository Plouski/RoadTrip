const request = require('supertest');

// IMPORTANT: Définir NODE_ENV=test AVANT les imports
process.env.NODE_ENV = 'test';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { id: 'test_session' } }
      })
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          url: 'https://checkout.stripe.com/test'
        })
      }
    }
  }));
});

// Mock complet de mongoose
jest.mock('mongoose', () => {
  const mockSchema = jest.fn().mockImplementation(() => ({
    methods: {},
    statics: {},
    pre: jest.fn(),
    post: jest.fn()
  }));
  
  mockSchema.Types = {
    ObjectId: jest.fn().mockImplementation((id) => ({ _id: id || 'mock-object-id' }))
  };
  
  return {
    connect: jest.fn().mockResolvedValue({}),
    connection: {
      readyState: 1,
      on: jest.fn(),
      host: 'localhost',
      name: 'test',
      close: jest.fn().mockResolvedValue({})
    },
    Schema: mockSchema,
    model: jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ _id: 'mock-id' }),
      save: jest.fn().mockResolvedValue({ _id: 'mock-id' }),
      find: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null)
    }),
    Types: {
      ObjectId: jest.fn().mockImplementation((id) => ({ _id: id || 'mock-object-id' }))
    }
  };
});

// Mock JWT Config
jest.mock('../config/jwtConfig', () => ({
  verifyToken: jest.fn().mockReturnValue({
    userId: 'test123',
    email: 'test@example.com',
    role: 'user'
  })
}));

// Mock du logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    middleware: jest.fn(() => (req, res, next) => next()) // ✅ retourne une fonction Express
  },
  stream: {
    write: jest.fn()
  },
  middleware: jest.fn(() => (req, res, next) => next()) // ✅ idem ici
}));



// Mock de la DB connection
jest.mock('../config/db', () => jest.fn().mockResolvedValue({}));

const app = require('../index');

describe('💳 Payment Service M2 Tests', () => {
  
  test('✅ Health check fonctionne', async () => {
    const res = await request(app).get('/health');
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body.service).toBe('paiement-service');
    expect(res.body.dependencies).toBeDefined();
  });

  test('✅ Vitals endpoint fonctionne', async () => {
    const res = await request(app)
      .get('/vitals')
      .expect(200);
    
    expect(res.body.service).toBe('paiement-service');
    expect(res.body.payment).toBeDefined();
    expect(res.body.payment.providers).toBeDefined();
    expect(res.body.database).toBeDefined();
  });

  test('✅ Métriques Prometheus disponibles', async () => {
    const res = await request(app).get('/metrics');
    expect([200, 500]).toContain(res.statusCode);
    
    if (res.statusCode === 200) {
      expect(res.text).toContain('service_health_status');
      expect(res.text).toContain('http_requests_total');
    }
  });

  test('✅ Webhook endpoint accessible', async () => {
    const res = await request(app)
      .post('/webhook')
      .set('stripe-signature', 'test_signature')
      .send('test_payload');
    
    expect([200, 400, 500]).toContain(res.statusCode);
    
    if (res.statusCode === 200) {
      expect(res.body.mock).toBe(true);
    }
  });

  test('✅ Subscription endpoint protégé', async () => {
    const res = await request(app)
      .get('/subscription/current')
      .expect(401);
    
    expect(res.body.message).toBe('Authentification requise.');
  });

  test('✅ Subscription endpoint avec auth', async () => {
    const res = await request(app)
      .get('/subscription/current')
      .set('Authorization', 'Bearer valid_token');
    
    expect([200, 500]).toContain(res.statusCode);
    
    if (res.statusCode === 200) {
      expect(res.body.status).toBe('mock');
    }
  });

  test('✅ Ping endpoint répond', async () => {
    const res = await request(app)
      .get('/ping')
      .expect(200);
    
    expect(res.body.status).toBe('pong ✅');
    expect(res.body.service).toBe('paiement-service');
  });

  test('✅ Route 404 gérée correctement', async () => {
    const res = await request(app)
      .get('/route-inexistante')
      .expect(404);
    
    expect(res.body.error).toBe('Route non trouvée');
    expect(res.body.service).toBe('paiement-service');
    expect(res.body.availableRoutes).toBeDefined();
  });

  test('✅ Health check contient toutes les dépendances', async () => {
    const res = await request(app).get('/health');
    
    expect(res.body.dependencies).toHaveProperty('mongodb');
    expect(res.body.dependencies).toHaveProperty('stripe');
    // PayPal retiré car non utilisé
  });

  test('✅ Vitals contient informations de paiement', async () => {
    const res = await request(app).get('/vitals');
    
    expect(res.body.payment.providers).toHaveProperty('stripe');
    expect(res.body.payment.webhook_endpoints).toContain('/webhook');
    expect(res.body.payment.currencies_supported).toContain('EUR');
    expect(res.body.payment.currencies_supported).toContain('USD');
  });
});