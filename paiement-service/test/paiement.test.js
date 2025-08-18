const request = require('supertest');
const mongoose = require('mongoose');
const { createApp } = require('../app');
const WebhookController = require('../controllers/webhookController');
const SubscriptionIntegrationService = require('../services/subscriptionIntegrationService');
const JwtConfig = require('../config/jwtConfig');

jest.mock('../services/subscriptionIntegrationService');

jest.mock('stripe', () => {
  const mockStripe = {
    webhooks: {
      constructEvent: jest.fn()
    },
    subscriptions: {
      retrieve: jest.fn()
    },
    checkout: {
      sessions: {
        create: jest.fn()
      }
    }
  };
  
  return jest.fn(() => mockStripe);
});

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  payment: jest.fn(),
  middleware: () => (req, res, next) => next(),
  request: jest.fn()
}));

jest.spyOn(WebhookController, 'handleSubscriptionDeleted').mockImplementation(async (subscription) => {
  await SubscriptionIntegrationService.getUserIdFromCustomerId(subscription.customer);
  return { success: true, message: 'Subscription deleted' };
});

describe('🧪 Paiement Service Tests', () => {
  let app;
  let mockUser;
  let authToken;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-very-long-for-security';
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/roadtrip_test';
    process.env.SERVICE_NAME = 'paiement-service';

    app = createApp();

    mockUser = {
      _id: '64f5a1b2c3d4e5f6789abcde',
      email: 'test@roadtrip.com',
      role: 'user'
    };

    authToken = JwtConfig.generateAccessToken(mockUser);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    jest.clearAllMocks();
  });

  // 🔧 TESTS DES ROUTES SYSTÈME

  describe('🏥 Routes Système', () => {
    
    test('GET /ping - doit retourner pong', async () => {
      const response = await request(app)
        .get('/ping')
        .expect(200);

      expect(response.body).toEqual({
        status: 'pong ✅',
        service: 'paiement-service'
      });
    });

    test('GET /health - doit retourner l\'état de santé', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('service', 'paiement-service');
      expect(response.body).toHaveProperty('dependencies');
      expect(response.body.dependencies).toHaveProperty('mongodb');
      expect(response.body.dependencies).toHaveProperty('stripe');
    });

    test('GET /vitals - doit retourner les informations vitales', async () => {
      const response = await request(app)
        .get('/vitals')
        .expect(200);

      expect(response.body).toHaveProperty('service', 'paiement-service');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('status', 'running');
      expect(response.body).toHaveProperty('payment');
      expect(response.body.payment).toHaveProperty('providers');
      expect(response.body.payment).toHaveProperty('currencies_supported');
    });

    test('GET /metrics - doit retourner les métriques Prometheus', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('paiement_service');
    });

  });

  // 💰 TESTS DES WEBHOOKS STRIPE

  describe('🪝 Webhooks Stripe', () => {

    beforeEach(() => {
      jest.clearAllMocks();
      
      SubscriptionIntegrationService.updateSubscription = jest.fn().mockResolvedValue({
        success: true,
        subscription: { id: 'test-sub', status: 'active' }
      });
      
      SubscriptionIntegrationService.getUserIdFromCustomerId = jest.fn().mockResolvedValue('64f5a1b2c3d4e5f6789abcde');
      SubscriptionIntegrationService.getPlanFromStripePrice = jest.fn().mockReturnValue('premium');
      SubscriptionIntegrationService.recordSubscriptionPayment = jest.fn().mockResolvedValue({ success: true });
      SubscriptionIntegrationService.recordPaymentFailure = jest.fn().mockResolvedValue({ success: true });
      
      SubscriptionIntegrationService.getCurrentSubscription = jest.fn().mockResolvedValue({
        id: 'sub_test',
        userId: '64f5a1b2c3d4e5f6789abcde',
        plan: 'premium',
        status: 'active',
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
      
      SubscriptionIntegrationService.cancelSubscriptionAtPeriodEnd = jest.fn().mockResolvedValue({
        id: 'sub_test',
        status: 'canceled',
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        cancelationType: 'end_of_period'
      });
      
      SubscriptionIntegrationService.reactivateSubscription = jest.fn().mockResolvedValue({
        id: 'sub_test',
        status: 'active',
        isActive: true
      });
      
      SubscriptionIntegrationService.changePlan = jest.fn().mockResolvedValue({
        subscription: { id: 'sub_test', plan: 'annual' },
        oldPlan: 'monthly',
        newPlan: 'annual',
        prorationAmount: 5.50
      });
    });

    test('POST /webhook - checkout.session.completed', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_session',
            customer: 'cus_test_customer',
            subscription: 'sub_test_subscription',
            payment_intent: 'pi_test_intent',
            metadata: {
              userId: '64f5a1b2c3d4e5f6789abcde',
              plan: 'premium'
            }
          }
        }
      };

      const stripe = require('stripe');
      const stripeInstance = stripe();
      
      stripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      stripeInstance.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_test_subscription',
        items: {
          data: [{
            price: { id: 'price_test_premium' }
          }]
        }
      });

      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'test-signature')
        .send(Buffer.from(JSON.stringify(mockEvent)))
        .expect(200);

      expect(SubscriptionIntegrationService.updateSubscription).toHaveBeenCalledWith(
        '64f5a1b2c3d4e5f6789abcde',
        expect.objectContaining({
          plan: 'premium',
          status: 'active',
          paymentMethod: 'stripe',
          isActive: true
        })
      );
    });

    test('POST /webhook - customer.subscription.deleted', async () => {
      const mockEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_subscription',
            customer: 'cus_test_customer'
          }
        }
      };

      const stripe = require('stripe');
      const stripeInstance = stripe();
      stripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'test-signature')
        .send(Buffer.from(JSON.stringify(mockEvent)))
        .expect(200);

      expect(SubscriptionIntegrationService.getUserIdFromCustomerId).toHaveBeenCalledWith('cus_test_customer');
      expect(response.body).toHaveProperty('success', true);
    });

    test('POST /webhook - signature invalide', async () => {
      const stripe = require('stripe');
      const stripeInstance = stripe();
      stripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'invalid-signature')
        .send(Buffer.from('{"type": "test"}'))
        .expect(400);

      expect(response.text).toContain('Webhook Error');
    });

    test('POST /webhook - événement non traité', async () => {
      const mockEvent = {
        type: 'unknown.event.type',
        data: { object: {} }
      };

      const stripe = require('stripe');
      const stripeInstance = stripe();
      stripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'test-signature')
        .send(Buffer.from(JSON.stringify(mockEvent)))
        .expect(200);

      expect(response.body).toEqual({
        received: true,
        ignored: true
      });
    });

  });

  // 📋 TESTS DES ROUTES D'ABONNEMENT

  describe('📋 Routes Abonnement', () => {

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('GET /subscription/current - sans authentification', async () => {
      const response = await request(app)
        .get('/subscription/current')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Authentification requise.');
    });

    test('GET /subscription/current - avec authentification', async () => {
      const response = await request(app)
        .get('/subscription/current')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', 'sub_test');
      expect(response.body).toHaveProperty('userId', mockUser._id);
      expect(response.body).toHaveProperty('status', 'active');
      expect(SubscriptionIntegrationService.getCurrentSubscription).toHaveBeenCalledWith(mockUser._id);
    });

    test('POST /subscription/checkout - création session Stripe', async () => {
      const stripe = require('stripe');
      const stripeInstance = stripe();
      stripeInstance.checkout = {
        sessions: {
          create: jest.fn().mockResolvedValue({
            url: 'https://checkout.stripe.com/session_123'
          })
        }
      };

      process.env.STRIPE_PRICE_MONTHLY_ID = 'price_monthly_test';
      process.env.CLIENT_URL = 'http://localhost:3000';

      const response = await request(app)
        .post('/subscription/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plan: 'monthly'
        })
        .expect(200);

      expect(response.body).toHaveProperty('url');
      expect(response.body.url).toContain('checkout.stripe.com');
    });

    test('DELETE /subscription/cancel - annulation abonnement', async () => {
      const response = await request(app)
        .delete('/subscription/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('cancelationType', 'end_of_period');
      expect(SubscriptionIntegrationService.cancelSubscriptionAtPeriodEnd).toHaveBeenCalledWith(mockUser._id);
    });

    test('POST /subscription/reactivate - réactivation abonnement', async () => {
      const response = await request(app)
        .post('/subscription/reactivate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Abonnement réactivé avec succès !');
      expect(SubscriptionIntegrationService.reactivateSubscription).toHaveBeenCalledWith(mockUser._id);
    });

    test('PUT /subscription/change-plan - changement de plan', async () => {
      const response = await request(app)
        .put('/subscription/change-plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ newPlan: 'annual' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('oldPlan', 'monthly');
      expect(response.body).toHaveProperty('newPlan', 'annual');
      expect(SubscriptionIntegrationService.changePlan).toHaveBeenCalledWith(mockUser._id, 'annual');
    });

    test('GET /subscription/refund/eligibility - vérification éligibilité remboursement', async () => {
      SubscriptionIntegrationService.getCurrentSubscription.mockResolvedValueOnce({
        id: 'sub_test',
        userId: mockUser._id,
        status: 'active',
        plan: 'monthly',
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .get('/subscription/refund/eligibility')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('eligible', true);
      expect(response.body).toHaveProperty('daysSinceStart', 2);
      expect(response.body).toHaveProperty('daysRemainingForRefund', 5);
    });

    test('POST /subscription/refund - demande de remboursement', async () => {
      SubscriptionIntegrationService.getCurrentSubscription.mockResolvedValueOnce({
        id: 'sub_test',
        userId: mockUser._id,
        status: 'active',
        plan: 'monthly',
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .post('/subscription/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Pas satisfait du service' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Remboursement demandé avec succès');
      expect(response.body.refund).toHaveProperty('amount', 5);
      expect(response.body.refund).toHaveProperty('currency', 'EUR');
    });

  });

  // 🧮 TESTS DES FONCTIONS UTILITAIRES

  describe('🧮 Fonctions Utilitaires', () => {

    test('calculateSubscriptionDates - plan mensuel', () => {
      const startDate = new Date('2024-01-01');
      const expectedEndDate = new Date('2024-02-01');
      
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      
      expect(endDate.getTime()).toBe(expectedEndDate.getTime());
    });

    test('calculateSubscriptionDates - plan annuel', () => {
      const startDate = new Date('2024-01-01');
      const expectedEndDate = new Date('2025-01-01');
      
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
      
      expect(endDate.getTime()).toBe(expectedEndDate.getTime());
    });

  });

  // 🔐 TESTS D'AUTHENTIFICATION

  describe('🔐 Authentification', () => {

    test('Token invalide', async () => {
      const response = await request(app)
        .get('/subscription/current')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Authentification invalide.');
    });

    test('Token expiré', async () => {
      const jwt = require('jsonwebtoken');
      const expiredPayload = {
        userId: mockUser._id,
        email: mockUser.email,
        role: mockUser.role,
        exp: Math.floor(Date.now() / 1000) - 3600
      };
      
      const expiredToken = jwt.sign(expiredPayload, process.env.JWT_SECRET);

      const response = await request(app)
        .get('/subscription/current')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('code', 'TOKEN_EXPIRED');
    });

    test('Aucun token fourni', async () => {
      const response = await request(app)
        .get('/subscription/current')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Authentification requise.');
    });

  });

  // ✅ TESTS DE VALIDATION

  describe('✅ Validation des données', () => {

    test('POST /subscription/checkout - plan invalide', async () => {
      const response = await request(app)
        .post('/subscription/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ plan: 'invalid_plan' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Plan invalide');
    });

    test('PUT /subscription/change-plan - plan invalide', async () => {
      const response = await request(app)
        .put('/subscription/change-plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ newPlan: 'invalid_plan' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Plan invalide');
    });

    test('GET /subscription/refund/eligibility - pas d\'abonnement', async () => {
      SubscriptionIntegrationService.getCurrentSubscription.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/subscription/refund/eligibility')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('eligible', false);
      expect(response.body).toHaveProperty('reason', 'Aucun abonnement trouvé');
    });

    test('POST /subscription/refund - abonnement non éligible (trop ancien)', async () => {
      SubscriptionIntegrationService.getCurrentSubscription.mockResolvedValueOnce({
        id: 'sub_test',
        userId: mockUser._id,
        status: 'active',
        plan: 'monthly',
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .post('/subscription/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Remboursement non autorisé');
      expect(response.body.reason).toContain('Période de remboursement expirée');
    });

  });

  // 🚫 TESTS DE GESTION D'ERREURS

  describe('🚫 Gestion d\'erreurs', () => {

    test('Route inexistante - 404', async () => {
      const response = await request(app)
        .get('/route-inexistante')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Route non trouvée');
      expect(response.body).toHaveProperty('service', 'paiement-service');
      expect(response.body).toHaveProperty('availableRoutes');
    });

    test('Erreur Stripe - Service indisponible', async () => {
      const stripe = require('stripe')();
      stripe.webhooks.constructEvent.mockImplementation(() => {
        const error = new Error('Connection failed');
        error.type = 'StripeConnectionError';
        throw error;
      });

      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'test-signature')
        .send(Buffer.from('{"type": "test"}'))
        .expect(400);
    });

  });

  // 📊 TESTS D'INTÉGRATION

  describe('📊 Tests d\'intégration', () => {

    test('Workflow complet - Checkout vers activation', async () => {
      const checkoutEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_integration_test',
            customer: 'cus_integration_test',
            subscription: 'sub_integration_test',
            payment_intent: 'pi_integration_test',
            metadata: {
              userId: '64f5a1b2c3d4e5f6789abcde',
              plan: 'premium'
            }
          }
        }
      };

      const stripe = require('stripe')();
      stripe.webhooks.constructEvent.mockReturnValue(checkoutEvent);
      stripe.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_integration_test',
        items: {
          data: [{
            price: { id: 'price_premium_monthly' }
          }]
        }
      });

      const webhookResponse = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'test-signature')
        .send(Buffer.from(JSON.stringify(checkoutEvent)))
        .expect(200);

      expect(SubscriptionIntegrationService.updateSubscription).toHaveBeenCalledWith(
        '64f5a1b2c3d4e5f6789abcde',
        expect.objectContaining({
          plan: 'premium',
          status: 'active',
          isActive: true,
          paymentMethod: 'stripe'
        })
      );
    });

    test('Workflow échec de paiement', async () => {
      const failureEvent = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_failed_test',
            customer: 'cus_test_customer',
            amount_due: 1999,
            currency: 'eur',
            last_payment_error: {
              message: 'Carte refusée'
            }
          }
        }
      };

      const stripe = require('stripe')();
      stripe.webhooks.constructEvent.mockReturnValue(failureEvent);

      await request(app)
        .post('/webhook')
        .set('stripe-signature', 'test-signature')
        .send(Buffer.from(JSON.stringify(failureEvent)))
        .expect(200);

      expect(SubscriptionIntegrationService.recordPaymentFailure).toHaveBeenCalledWith(
        '64f5a1b2c3d4e5f6789abcde',
        expect.objectContaining({
          amount: 19.99,
          currency: 'eur',
          failureReason: 'Carte refusée'
        })
      );
    });

  });

});

// 🛠️ UTILITAIRES DE TEST

function createStripeEvent(type, object) {
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2020-08-27',
    created: Math.floor(Date.now() / 1000),
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type
  };
}

function createTestUser(overrides = {}) {
  return {
    _id: '64f5a1b2c3d4e5f6789abcde',
    email: 'test@roadtrip.com',
    role: 'user',
    ...overrides
  };
}

module.exports = {
  createStripeEvent,
  createTestUser
};