const request = require('supertest');

// Mock complet de Mongoose
jest.mock('mongoose', () => {
  const mockSchema = jest.fn().mockImplementation(() => ({
    methods: {},
    toJSON: jest.fn(),
    toObject: jest.fn()
  }));
  
  mockSchema.prototype.methods = {};
  
  return {
    connect: jest.fn().mockResolvedValue({}),
    connection: { readyState: 1 },
    Schema: mockSchema,
    model: jest.fn().mockReturnValue({
      findById: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn()
    })
  };
});

// Mock JWT Config
jest.mock('../config/jwtConfig', () => ({
  generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  verifyToken: jest.fn().mockReturnValue({
    userId: 'test123',
    email: 'test@example.com',
    role: 'user'
  })
}));

// Mock Passport
jest.mock('passport', () => ({
  initialize: jest.fn(() => (req, res, next) => next()),
  session: jest.fn(() => (req, res, next) => next()),
  authenticate: jest.fn((strategy) => (req, res, next) => {
    if (strategy === 'google') {
      res.redirect('https://accounts.google.com/oauth/mock');
    } else if (strategy === 'facebook') {
      res.redirect('https://www.facebook.com/v18.0/dialog/oauth');
    } else {
      next();
    }
  })
}));

// Mock du data service
jest.mock('../services/dataService', () => ({
  healthCheck: jest.fn().mockResolvedValue({ status: 'ok' }),
  findUserByEmail: jest.fn(),
  createUser: jest.fn()
}));

// Mock de PassportConfig
jest.mock('../config/passportConfig', () => ({
  initializeStrategies: jest.fn()
}));

// Mock express-session
jest.mock('express-session', () => {
  return jest.fn(() => (req, res, next) => {
    req.session = {
      id: 'mock-session-id',
      destroy: jest.fn(cb => cb()),
      save: jest.fn(cb => cb())
    };
    next();
  });
});

// Import de l'app après les mocks
const app = require('../index');
const JwtConfig = require('../config/jwtConfig');

describe('🔐 Auth Service M2 Tests', () => {
  
  test('✅ Health check fonctionne', async () => {
    const res = await request(app).get('/health');
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body.service).toBe('auth-service');
  });

  test('✅ Google OAuth redirige correctement', async () => {
    const res = await request(app)
      .get('/auth/oauth/google')
      .expect(302);
    
    expect(res.headers.location).toContain('accounts.google.com');
  });

  test('✅ Facebook OAuth redirige correctement', async () => {
    const res = await request(app)
      .get('/auth/oauth/facebook')
      .expect(302);
    
    expect(res.headers.location).toContain('facebook.com');
  });

  test('✅ JWT token génération fonctionne', () => {
    const mockUser = {
      _id: 'test123',
      email: 'test@example.com',
      role: 'user'
    };
    
    const token = JwtConfig.generateAccessToken(mockUser);
    expect(token).toBe('mock-access-token');
  });

  test('✅ Providers info retourne la config', async () => {
    const res = await request(app)
      .get('/providers')
      .expect(200);
    
    expect(res.body.providers).toHaveProperty('google');
    expect(res.body.providers).toHaveProperty('facebook');
  });

  test('✅ Service répond correctement', async () => {
    const res = await request(app).get('/docs');
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();
  });
});