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
                conseils: ['Réservez à l\'avance']
              })
            }
          }]
        })
      }
    }
  }));
  return { __esModule: true, default: mockOpenAI, OpenAI: mockOpenAI };
});

// Mock JWT Configuration
jest.mock('../config/jwtConfig', () => ({
  verifyToken: jest.fn((token) => {
    if (token === 'valid-token') {
      return { userId: 'test123', email: 'test@example.com', role: 'premium' };
    }
    throw new Error('Token invalide');
  })
}));

// Mock Authentication Middleware
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

// Mock Data Service
jest.mock('../services/dataService', () => ({
  createMessage: jest.fn(() => Promise.resolve({ id: 'msg123' })),
  getMessagesByUser: jest.fn(() => Promise.resolve([])),
  deleteMessagesByUser: jest.fn(() => Promise.resolve({ success: true })),
  getMessagesByConversation: jest.fn(() => Promise.resolve([])),
  deleteConversation: jest.fn(() => Promise.resolve({ deletedCount: 1 }))
}));

// Mock Utilities
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

// Mock External Dependencies
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

// Environment Setup
process.env.OPENAI_API_KEY = 'sk-test123';
process.env.NODE_ENV = 'test';

// Import Application
const { app, server, metricsServer } = require('../index');

// ===== TEST SUITE =====

describe('🚀 AI Service - Tests Complets', () => {
  
  afterAll(async () => {
    if (server?.close) server.close();
    if (metricsServer?.close) metricsServer.close();
  });

  // Tests Infrastructure
  describe('📡 Infrastructure', () => {
    test('Service démarre correctement', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
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

  // Tests Authentification
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
      expect(res.statusCode).toBe(200);
    });
  });

  // Tests API IA
  describe('🤖 Intelligence Artificielle', () => {
    test('Génère itinéraire roadtrip', async () => {
      const res = await request(app)
        .post('/api/ai/ask')
        .set('Authorization', 'Bearer valid-token')
        .send({ prompt: 'roadtrip en France 7 jours' });

      expect(res.statusCode).toBe(200);
      expect(res.body.type).toBe('roadtrip_itinerary');
      expect(res.body.destination).toBe('France');
    });
  });

  // Tests Gestion Conversations
  describe('💬 Gestion Conversations', () => {
    test('Sauvegarde message', async () => {
      const res = await request(app)
        .post('/api/ai/save')
        .set('Authorization', 'Bearer valid-token')
        .send({
          role: 'user',
          content: 'Test message',
          conversationId: 'conv123'
        });
      expect(res.statusCode).toBe(201);
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
      expect(res.statusCode).toBe(200);
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
      expect(res.statusCode).toBe(200);
    });
  });
});