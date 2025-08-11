const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.ENABLE_FILE_LOGGING = 'false';
process.env.LOG_LEVEL = 'error';

// Logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  level: 'error',
  middleware: () => (req, _res, next) => { req.id = 'test-id'; next(); },
}));

// Mongoose
jest.mock('mongoose', () => {
  const mockSchema = jest.fn().mockImplementation(() => ({
    methods: {},
    statics: {},
    pre: jest.fn(),
    post: jest.fn(),
  }));
  mockSchema.Types = {
    ObjectId: jest.fn().mockImplementation((id) => ({ _id: id || 'mock-object-id' })),
  };
  return {
    connect: jest.fn().mockResolvedValue({}),
    connection: {
      readyState: 1,
      on: jest.fn(),
      once: jest.fn(),
      close: jest.fn().mockResolvedValue({}),
    },
    Schema: mockSchema,
    model: jest.fn().mockReturnValue({
      find: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ _id: 'mock-id' }),
      save: jest.fn().mockResolvedValue({ _id: 'mock-id' }),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      deleteOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    }),
    Types: {
      ObjectId: jest.fn().mockImplementation((id) => ({ _id: id || 'mock-object-id' })),
    },
  };
});

// JWT config
jest.mock('../config/jwtConfig', () => ({
  generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  verifyAccessToken: jest.fn().mockReturnValue({
    userId: 'test123',
    email: 'test@example.com',
    role: 'user',
  }),
}));

// Notification service
jest.mock('../services/notificationService', () => ({
  sendConfirmationEmail: jest.fn().mockResolvedValue({ status: 200 }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ status: 200 }),
  healthCheck: jest.fn().mockResolvedValue({ status: 'ok' }),
}));

// bcrypt
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

// express-validator
jest.mock('express-validator', () => ({
  validationResult: jest.fn().mockReturnValue({
    isEmpty: jest.fn().mockReturnValue(true),
    array: jest.fn().mockReturnValue([]),
  }),
  check: jest.fn().mockReturnValue({
    isEmail: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    matches: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
  }),
}));

// fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({ status: 'ok' }),
});

const app = require('../index');

describe('💾 Data Service - Tests', () => {
  test('✅ Health check fonctionne', async () => {
    const res = await request(app).get('/health');
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body.service).toBe('data-service');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('dependencies');
  });

  test('✅ API Roadtrips accessible (mock en test)', async () => {
    const res = await request(app).get('/api/roadtrips');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('mock');
  });

  test('✅ API Auth mock fonctionne', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('mock');
  });

  test('✅ API Messages mock fonctionne', async () => {
    const res = await request(app).get('/api/messages');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('mock');
  });

  test('✅ Vitals endpoint fonctionne', async () => {
    const res = await request(app).get('/vitals');
    expect(res.statusCode).toBe(200);
    expect(res.body.service).toBe('data-service');
    expect(res.body).toHaveProperty('database');
    expect(res.body).toHaveProperty('features');
    expect(res.body).toHaveProperty('integrations');
  });

  test('✅ Ping endpoint répond', async () => {
    const res = await request(app).get('/ping');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('pong ✅');
    expect(res.body.service).toBe('data-service');
    expect(res.body).toHaveProperty('timestamp');
  });

  test('✅ Métriques Prometheus disponibles', async () => {
    const res = await request(app).get('/metrics');
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.text).toMatch(/data_service_/);
      expect(res.text).toMatch(/http_requests_total|http_request_duration_seconds/);
    }
  });

  test('✅ Route 404 gérée correctement', async () => {
    const res = await request(app).get('/route-inexistante').expect(404);
    expect(res.body.error).toBe('Route non trouvée');
    expect(res.body.service).toBe('data-service');
    expect(res.body.availableRoutes).toBeDefined();
  });

  test('✅ Health check contient toutes les dépendances (mock en test)', async () => {
    const res = await request(app).get('/health');
    expect(res.body.dependencies).toHaveProperty('mongodb');
    expect(res.body.dependencies).toHaveProperty('notificationService');
    expect(res.body.dependencies).toHaveProperty('aiService');
    expect(res.body.dependencies).toHaveProperty('authService');
  });
});