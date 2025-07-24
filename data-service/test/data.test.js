const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

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
      once: jest.fn(),
      close: jest.fn().mockResolvedValue({})
    },
    Schema: mockSchema,
    model: jest.fn().mockReturnValue({
      find: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ _id: 'mock-id' }),
      save: jest.fn().mockResolvedValue({ _id: 'mock-id' }),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      deleteOne: jest.fn().mockResolvedValue({ acknowledged: true })
    }),
    Types: {
      ObjectId: jest.fn().mockImplementation((id) => ({ _id: id || 'mock-object-id' }))
    }
  };
});

// Mock JWT Config
jest.mock('../config/jwtConfig', () => ({
  generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  verifyAccessToken: jest.fn().mockReturnValue({
    userId: 'test123',
    email: 'test@example.com',
    role: 'user'
  })
}));

// Mock du notification service
jest.mock('../services/notificationService', () => ({
  sendConfirmationEmail: jest.fn().mockResolvedValue({ status: 200 }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ status: 200 }),
  healthCheck: jest.fn().mockResolvedValue({ status: 'ok' })
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Mock express-validator
jest.mock('express-validator', () => ({
  validationResult: jest.fn().mockReturnValue({
    isEmpty: jest.fn().mockReturnValue(true),
    array: jest.fn().mockReturnValue([])
  }),
  check: jest.fn().mockReturnValue({
    isEmail: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    matches: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis()
  })
}));

// Mock fetch pour les appels de services externes
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({ status: 'ok' })
});

// Import de l'app APRÈS tous les mocks
const app = require('../index');

describe('Data Service Tests', () => {
  
  test('✅ Health check fonctionne', async () => {
    const res = await request(app).get('/health');
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body.service).toBe('data-service');
    expect(res.body.dependencies).toBeDefined();
  });

  test('✅ API Roadtrips accessible', async () => {
    const res = await request(app).get('/api/roadtrips');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('mock');
  });

  test('✅ Route 404 gérée correctement', async () => {
    const res = await request(app)
      .get('/route-inexistante')
      .expect(404);
    
    expect(res.body.error).toBe('Route non trouvée');
    expect(res.body.service).toBe('data-service');
    expect(res.body.availableRoutes).toBeDefined();
  });

  test('✅ Documentation API disponible', async () => {
    const res = await request(app)
      .get('/docs')
      .expect(200);
    
    expect(res.body.service).toBe('data-service');
    expect(res.body.main_endpoints).toBeDefined();
    expect(res.body.integrations).toBeDefined();
  });

  test('✅ Vitals endpoint fonctionne', async () => {
    const res = await request(app)
      .get('/vitals')
      .expect(200);
    
    expect(res.body.service).toBe('data-service');
    expect(res.body.database).toBeDefined();
    expect(res.body.features).toBeDefined();
    expect(res.body.integrations).toBeDefined();
  });

  test('✅ Ping endpoint répond', async () => {
    const res = await request(app)
      .get('/ping')
      .expect(200);
    
    expect(res.body.status).toBe('pong ✅');
    expect(res.body.service).toBe('data-service');
    expect(res.body.timestamp).toBeDefined();
  });

  test('✅ Métriques Prometheus disponibles', async () => {
    const res = await request(app).get('/metrics');
    expect([200, 500]).toContain(res.statusCode);
    
    if (res.statusCode === 200) {
      expect(res.text).toContain('service_health_status');
      expect(res.text).toContain('http_requests_total');
      expect(res.text).toContain('data-service');
    }
  });

  test('✅ API Auth mock fonctionne', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('mock');
  });

  test('✅ API Messages mock fonctionne', async () => {
    const res = await request(app)
      .get('/api/messages');
    
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('mock');
  });

  test('✅ Health check contient toutes les dépendances', async () => {
    const res = await request(app).get('/health');
    
    expect(res.body.dependencies).toHaveProperty('mongodb');
    expect(res.body.dependencies).toHaveProperty('notificationService');
    expect(res.body.dependencies).toHaveProperty('aiService');
    expect(res.body.dependencies).toHaveProperty('authService');
  });
});