const request = require('supertest');

// Mock OpenAI
jest.mock('openai', () => {
  const mockOpenAI = jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                type: 'roadtrip_itinerary',
                destination: 'France',
                duree_recommandee: '7 jours',
                budget_estime: {
                  total: '1200€',
                  transport: '300€',
                  hebergement: '500€',
                  nourriture: '250€',
                  activites: '150€'
                },
                saison_ideale: 'Printemps',
                points_interet: ['Paris', 'Loire'],
                itineraire: [{
                  jour: 1,
                  lieu: 'Paris',
                  description: 'Capital',
                  activites: ['Tour Eiffel'],
                  distance: '0 km',
                  temps_conduite: '0h'
                }],
                conseils: ["Réservez à l'avance"]
              })
            }
          }]
        })
      }
    }
  }));
  return { __esModule: true, default: mockOpenAI, OpenAI: mockOpenAI };
});

jest.mock('../config/jwtConfig', () => ({
  verifyToken: jest.fn((token) => {
    if (token === 'valid-token') {
      return { userId: 'test123', email: 'test@example.com', role: 'premium' };
    }
    throw new Error('Token invalide');
  })
}));

jest.mock('../middlewares/authMiddleware', () => ({
  authMiddleware: jest.fn((req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentification requise.' });
    }
    if (token === 'valid-token') {
      req.user = { userId: 'test123', email: 'test@example.com', role: 'premium' };
      next();
    } else {
      res.status(401).json({ message: 'Authentification invalide.', code: 'INVALID_TOKEN' });
    }
  }),
  roleMiddleware: jest.fn(() => jest.fn((req, res, next) => next()))
}));

jest.mock('../services/dataService', () => ({
  createMessage: jest.fn(() => Promise.resolve({ id: 'msg123' })),
  getMessagesByUser: jest.fn(() => Promise.resolve([])),
  deleteMessagesByUser: jest.fn(() => Promise.resolve({ success: true })),
  getMessagesByConversation: jest.fn(() => Promise.resolve([])),
  deleteConversation: jest.fn(() => Promise.resolve({ deletedCount: 1 }))
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  middleware: () => (req, res, next) => {
    req.id = 'test-id';
    next();
  }
}));

jest.mock('../metrics', () => ({
  register: {
    contentType: 'text/plain',
    metrics: () => Promise.resolve('metrics')
  },
  httpRequestDuration: { observe: jest.fn() },
  httpRequestsTotal: { inc: jest.fn() },
  updateServiceHealth: jest.fn(),
  updateActiveConnections: jest.fn(),
  updateExternalServiceHealth: jest.fn()
}));

jest.mock('../utils/roadtripValidation', () => ({
  isRoadtripRelated: jest.fn((query) =>
    query.includes('roadtrip') || query.includes('France')
  )
}));

jest.mock('../utils/durationExtractor', () => ({
  extractDurationFromQuery: jest.fn(() => ({ days: 7, error: null }))
}));

jest.mock('../utils/cacheKey', () => ({
  generateCacheKey: jest.fn(() => 'test-cache-key')
}));

// Externes
jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: { results: [] } }))
}));
jest.mock('node-cache', () =>
  jest.fn().mockImplementation(() => ({
    get: jest.fn(() => null),
    set: jest.fn(() => true)
  }))
);

// Env test
process.env.OPENAI_API_KEY = 'sk-test123';
process.env.NODE_ENV = 'test';
process.env.SERVICE_NAME = 'ai-service';

// Import de l'app depuis la racine
const { app, server, metricsServer } = require('../index');

// ===== TESTS =====
describe('🚀 AI Service - Tests complets', () => {

  afterAll(async () => {
    if (server?.close) await new Promise(res => server.close(res));
    if (metricsServer?.close) await new Promise(res => metricsServer.close(res));
  });

  describe('📡 Infrastructure', () => {
    test('Service démarre correctement', async () => {
      const res = await request(app).get('/health');
      expect([200,503]).toContain(res.statusCode);
      expect(res.body.service).toBe('ai-service');
    });

    test('Ping répond', async () => {
      const res = await request(app).get('/ping');
      expect(res.statusCode).toBe(200);
    });

    test('Gestion 404', async () => {
      const res = await request(app).get('/inexistant');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('🔐 Authentification', () => {
    test('Refuse accès sans token', async () => {
      const res = await request(app)
        .post('/api/ai/ask')
        .send({ prompt: 'roadtrip France' });
      expect(res.statusCode).toBe(401);
    });

    test('Accepte token valide', async () => {
      const res = await request(app)
        .post('/api/ai/ask')
        .set('Authorization', 'Bearer valid-token')
        .send({ prompt: 'roadtrip en France' });
      expect([200,201]).toContain(res.statusCode);
    });
  });

  describe('🤖 Intelligence Artificielle', () => {
    test('Génère itinéraire roadtrip', async () => {
      const res = await request(app)
        .post('/api/ai/ask')
        .set('Authorization', 'Bearer valid-token')
        .send({ prompt: 'roadtrip en France 7 jours' });

      expect([200,201]).toContain(res.statusCode);
      expect(res.body.destination).toBe('France');
      expect(res.body.type).toBe('roadtrip_itinerary');
    });
  });

  describe('💬 Gestion Conversations', () => {
    test('Sauvegarde message', async () => {
      const res = await request(app)
        .post('/api/ai/save')
        .set('Authorization', 'Bearer valid-token')
        .send({ role: 'user', content: 'Test message', conversationId: 'conv123' });
      expect([200,201]).toContain(res.statusCode);
    });

    test('Récupère historique utilisateur', async () => {
      const res = await request(app)
        .get('/api/ai/history')
        .set('Authorization', 'Bearer valid-token');
      expect(res.statusCode).toBe(200);
    });

    test('Supprime historique complet', async () => {
      const res = await request(app)
        .delete('/api/ai/history')
        .set('Authorization', 'Bearer valid-token');
      expect([200,204]).toContain(res.statusCode);
    });

    test('Récupère conversation spécifique', async () => {
      const res = await request(app)
        .get('/api/ai/conversation/conv123')
        .set('Authorization', 'Bearer valid-token');
      expect(res.statusCode).toBe(200);
    });

    test('Supprime conversation spécifique', async () => {
      const res = await request(app)
        .delete('/api/ai/conversation/conv123')
        .set('Authorization', 'Bearer valid-token');
      expect([200,204]).toContain(res.statusCode);
    });
  });
});