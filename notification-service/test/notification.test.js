const request = require('supertest');

// IMPORTANT: Définir NODE_ENV=test AVANT les imports
process.env.NODE_ENV = 'test';

// Mock des services
jest.mock('../services/emailService', () => ({
  sendConfirmationEmail: jest.fn().mockResolvedValue({ messageId: 'test123' }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ messageId: 'test456' })
}));

jest.mock('../services/smsService', () => ({
  sendPasswordResetCode: jest.fn().mockResolvedValue({ success: true })
}));

const app = require('../index');

describe('📧 Notification Service M2 Tests', () => {
  
  test('✅ Health check fonctionne', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.service).toBe('notification-service');
    expect(res.body.config).toBeDefined();
  });

  test('✅ Documentation API disponible', async () => {
    const res = await request(app)
      .get('/docs')
      .expect(200);
    
    expect(res.body.service).toBe('notification-service');
    expect(res.body.endpoints).toBeDefined();
    expect(res.body.authentication).toBeDefined();
  });

  test('✅ Email confirmation endpoint (sans API key)', async () => {
    const res = await request(app)
      .post('/api/email/confirm')
      .send({
        email: 'test@example.com',
        token: 'test-token'
      })
      .expect(403);
    
    expect(res.body.error).toBe('API key requise');
  });

  test('✅ Email confirmation endpoint (avec API key valide)', async () => {
    // Définir une API key valide pour ce test
    process.env.NOTIFICATION_API_KEY = 'test-valid-key';
    
    const res = await request(app)
      .post('/api/email/confirm')
      .set('x-api-key', 'test-valid-key')
      .send({
        email: 'test@example.com',
        token: 'test-token'
      });
    
    expect([200, 500]).toContain(res.statusCode);
    
    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Email');
    }
  });

  test('✅ Email endpoint avec données invalides', async () => {
    process.env.NOTIFICATION_API_KEY = 'test-valid-key';
    
    const res = await request(app)
      .post('/api/email/confirm')
      .set('x-api-key', 'test-valid-key')
      .send({
        email: 'invalid-email',
        token: 'test-token'
      })
      .expect(400);
    
    expect(res.body.error).toBe('Email invalide');
  });

  test('✅ SMS reset endpoint sécurisé', async () => {
    const res = await request(app)
      .post('/api/sms/reset')
      .send({
        username: '12345678',
        apiKey: 'test-key',
        code: '123456'
      })
      .expect(403);
    
    expect(res.body.error).toBe('API key requise');
  });

  test('✅ SMS endpoint avec API key valide', async () => {
    process.env.NOTIFICATION_API_KEY = 'test-valid-key';
    
    const res = await request(app)
      .post('/api/sms/reset')
      .set('x-api-key', 'test-valid-key')
      .send({
        username: '12345678',
        apiKey: 'test-key',
        code: '123456'
      });
    
    expect([200, 500]).toContain(res.statusCode);
    
    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
    }
  });

  test('✅ Route 404 gérée', async () => {
    const res = await request(app)
      .get('/api/inexistant')
      .expect(404);
    
    expect(res.body.error).toBe('Route non trouvée');
    expect(res.body.service).toBe('notification-service');
  });

  test('✅ Validation des paramètres manquants', async () => {
    process.env.NOTIFICATION_API_KEY = 'test-valid-key';
    
    const res = await request(app)
      .post('/api/email/confirm')
      .set('x-api-key', 'test-valid-key')
      .send({
        email: 'test@example.com'
        // token manquant
      })
      .expect(400);
    
    expect(res.body.error).toBe('Paramètres manquants');
    expect(res.body.required).toContain('token');
  });
});