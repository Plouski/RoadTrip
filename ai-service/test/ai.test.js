const request = require('supertest');

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  type: 'roadtrip_itinerary',
                  destination: 'Test Destination',
                  duree_recommandee: '7 jours'
                })
              }
            }]
          })
        }
      }
    }))
  };
});

// Mock JWT Config
jest.mock('../config/jwtConfig', () => ({
  verifyToken: jest.fn().mockReturnValue({
    userId: 'test123',
    email: 'test@example.com',
    role: 'premium'
  })
}));

// Mock data service
jest.mock('../services/dataService', () => ({
  createMessage: jest.fn().mockResolvedValue({ id: 'msg123' }),
  getMessagesByUser: jest.fn().mockResolvedValue([]),
  deleteMessagesByUser: jest.fn().mockResolvedValue({ success: true })
}));

// Mock axios pour météo
jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({
    data: {
      weather: [{ description: 'sunny' }],
      main: { temp: 25 }
    }
  })
}));

const { app, server, metricsServer } = require('../index');

describe('🤖 AI Service Tests', () => {
  
  // Nettoyage pour éviter les open handles
  afterAll(async () => {
    if (server) server.close();
    if (metricsServer) metricsServer.close();
  });

  // Tests essentiels
  test('✅ Service démarre (Health check)', async () => {
    const res = await request(app).get('/health');
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body.service).toBe('ai-service');
  });

  test('✅ Endpoint principal protégé', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .send({ prompt: 'roadtrip en France' })
      .expect(401);
    
    expect(res.body.message).toBe('Authentification requise.');
  });

  test('✅ Endpoint principal fonctionne avec auth', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', 'Bearer valid_token')
      .send({
        prompt: 'roadtrip en France',
        type: 'roadtrip_itinerary'
      })
      .expect(200);
    
    expect(res.body).toHaveProperty('content');
  });

  test('✅ Ping basique', async () => {
    const res = await request(app)
      .get('/ping')
      .expect(200);
    
    expect(res.body.status).toBe('pong ✅');
  });
});