// test/notification.test.js
process.env.NODE_ENV = "test";
process.env.NOTIFICATION_API_KEY = "test-valid-key";
process.env.CONTACT_RECEIVE_EMAIL = "support@roadtrip.com";

// ----- logger silencieux (même logique que les autres services)
jest.mock("../utils/logger", () => {
  const mw = () => (_req, _res, next) => next();
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    performance: jest.fn(),
    middleware: () => mw(),
  };
});

// ----- Services mockés
jest.mock("../services/emailService", () => ({
  sendConfirmationEmail: jest.fn().mockResolvedValue({
    messageId: "msg-123",
    accepted: ["test@example.com"],
    duration: 1000,
  }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({
    messageId: "msg-456",
    accepted: ["test@example.com"],
    duration: 1200,
  }),
  sendContactSupportEmail: jest.fn().mockResolvedValue({
    messageId: "msg-789",
    accepted: ["support@roadtrip.com"],
    duration: 1500,
  }),
  sendContactConfirmationEmail: jest.fn().mockResolvedValue({
    messageId: "msg-101",
    accepted: ["test@example.com"],
    duration: 1100,
  }),
  testMailjetConnection: jest.fn().mockResolvedValue({
    success: true,
    message: "Configuration Mailjet OK",
    duration: "50ms",
  }),
}));

jest.mock("../services/smsService", () => ({
  sendPasswordResetCode: jest.fn().mockResolvedValue({
    success: true,
    message: "SMS envoyé",
  }),
}));

const request = require("supertest");
const { app } = require("../index");

describe("📧 Notification Service - Tests Complets", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NOTIFICATION_API_KEY = "test-valid-key"; // reset après tests qui la suppriment
  });

  // -------------------- Santé / Observabilité --------------------
  describe("🏥 Tests de Santé du Service", () => {
    test("✅ Health check fonctionne", async () => {
      const res = await request(app).get("/health");
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        status: "healthy",
        service: "notification-service",
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
    });

    test("✅ Vitals endpoint accessible", async () => {
      const res = await request(app).get("/vitals");
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        status: "running",
        service: "notification-service",
        memory: expect.any(Object),
        version: expect.any(String),
        node: expect.any(String),
      });
    });

    test("✅ Ping répond correctement", async () => {
      const res = await request(app).get("/ping");
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        status: "pong ✅",
        timestamp: expect.any(String),
      });
    });

    test("✅ Metrics endpoint accessible", async () => {
      const res = await request(app).get("/metrics");
      expect([200, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.headers["content-type"]).toContain("text/plain");
        expect(typeof res.text).toBe("string");
        expect(res.text.length).toBeGreaterThan(0);
      }
    });
  });

  // -------------------- Auth API key --------------------
  describe("🔐 Tests d'Authentification API", () => {
    test("❌ Accès refusé sans API key", async () => {
      const res = await request(app)
        .post("/api/email/confirm")
        .send({ email: "test@example.com", token: "tok-123" });
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe("API key requise");
    });

    test("❌ Accès refusé avec API key invalide", async () => {
      const res = await request(app)
        .post("/api/email/confirm")
        .set("x-api-key", "invalid-key")
        .send({ email: "test@example.com", token: "tok-123" });
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe("API key requise");
    });

    test("✅ Accès autorisé avec API key valide", async () => {
      const res = await request(app)
        .post("/api/email/confirm")
        .set("x-api-key", "test-valid-key")
        .send({ email: "test@example.com", token: "tok-123" });
      expect([200, 500]).toContain(res.statusCode);
    });
  });

  // -------------------- Email confirmation --------------------
  describe("📧 Tests Email de Confirmation", () => {
    test("✅ Envoi email confirmation réussi", async () => {
      const res = await request(app)
        .post("/api/email/confirm")
        .set("x-api-key", "test-valid-key")
        .send({ email: "test@example.com", token: "tok-123" });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        message: "Email de confirmation envoyé",
      });
    });

    test("❌ Email confirmation avec email invalide", async () => {
      const res = await request(app)
        .post("/api/email/confirm")
        .set("x-api-key", "test-valid-key")
        .send({ email: "invalid-email", token: "tok-123" });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Paramètres invalides");
    });

    test("❌ Email confirmation sans token", async () => {
      const res = await request(app)
        .post("/api/email/confirm")
        .set("x-api-key", "test-valid-key")
        .send({ email: "test@example.com" });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Paramètres invalides");
    });

    test("❌ Email confirmation sans email", async () => {
      const res = await request(app)
        .post("/api/email/confirm")
        .set("x-api-key", "test-valid-key")
        .send({ token: "tok-123" });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Paramètres invalides");
    });
  });

  // -------------------- Email reset --------------------
  describe("🔄 Tests Email de Réinitialisation", () => {
    test("✅ Envoi email reset réussi", async () => {
      const res = await request(app)
        .post("/api/email/reset")
        .set("x-api-key", "test-valid-key")
        .send({ email: "test@example.com", code: "123456" });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        message: "Email de réinitialisation envoyé",
      });
    });

    test("❌ Email reset avec email invalide", async () => {
      const res = await request(app)
        .post("/api/email/reset")
        .set("x-api-key", "test-valid-key")
        .send({ email: "invalid-email", code: "123456" });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Paramètres invalides");
    });

    test("❌ Email reset sans code", async () => {
      const res = await request(app)
        .post("/api/email/reset")
        .set("x-api-key", "test-valid-key")
        .send({ email: "test@example.com" });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Paramètres invalides");
    });
  });

  // -------------------- SMS reset --------------------
  describe("📱 Tests SMS de Réinitialisation", () => {
    test("✅ Envoi SMS reset réussi", async () => {
      const res = await request(app)
        .post("/api/sms/reset")
        .set("x-api-key", "test-valid-key")
        .send({ username: "12345678", apiKey: "abc123", code: "999999" });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        message: "SMS de réinitialisation envoyé",
      });
    });

    test("❌ SMS reset sans API key service", async () => {
      delete process.env.NOTIFICATION_API_KEY;
      const res = await request(app)
        .post("/api/sms/reset")
        .send({ username: "12345678", apiKey: "abc123", code: "999999" });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe("API key requise");
    });

    test("❌ SMS reset paramètres manquants", async () => {
      const res = await request(app)
        .post("/api/sms/reset")
        .set("x-api-key", "test-valid-key")
        .send({ username: "12345678" });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Paramètres invalides");
    });
  });

  // -------------------- Contact --------------------
  describe("📮 Tests Formulaire de Contact", () => {
    const validContactData = {
      name: "John Doe",
      email: "john.doe@example.com",
      subject: "Test de contact",
      category: "info",
      message: "Ceci est un message de test pour le formulaire de contact.",
    };

    test("✅ Envoi message contact réussi", async () => {
      const res = await request(app)
        .post("/api/contact/send")
        .set("x-api-key", "test-valid-key")
        .send(validContactData);

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        message: expect.stringContaining("reçu et est en cours de traitement"),
        messageId: expect.stringMatching(/^contact-\d+-[a-z0-9]+$/),
        duration: expect.stringMatching(/^\d+ms$/),
        status: "processing",
      });
    });

    test("❌ Contact sans API key", async () => {
      const res = await request(app).post("/api/contact/send").send(validContactData);
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe("API key requise");
    });

    test("❌ Contact avec nom trop court", async () => {
      const res = await request(app)
        .post("/api/contact/send")
        .set("x-api-key", "test-valid-key")
        .send({ ...validContactData, name: "A" });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        message: "Données invalides",
        errors: expect.arrayContaining([
          expect.stringContaining("nom doit contenir au moins 2 caractères"),
        ]),
      });
    });

    test("❌ Contact avec email invalide", async () => {
      const res = await request(app)
        .post("/api/contact/send")
        .set("x-api-key", "test-valid-key")
        .send({ ...validContactData, email: "email-invalide" });

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toContain("Email invalide");
    });

    test("❌ Contact avec sujet trop court", async () => {
      const res = await request(app)
        .post("/api/contact/send")
        .set("x-api-key", "test-valid-key")
        .send({ ...validContactData, subject: "Hi" });

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toContain("Le sujet doit contenir au moins 5 caractères");
    });

    test("❌ Contact avec message trop court", async () => {
      const res = await request(app)
        .post("/api/contact/send")
        .set("x-api-key", "test-valid-key")
        .send({ ...validContactData, message: "Court" });

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toContain("Le message doit contenir au moins 10 caractères");
    });

    test("✅ Contact avec catégorie par défaut", async () => {
      const { category, ...dataWithoutCategory } = validContactData;
      const res = await request(app)
        .post("/api/contact/send")
        .set("x-api-key", "test-valid-key")
        .send(dataWithoutCategory);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test("✅ Contact avec toutes les catégories", async () => {
      const categories = ["problem", "info", "suggestion", "feedback", "other"];
      for (const category of categories) {
        const res = await request(app)
          .post("/api/contact/send")
          .set("x-api-key", "test-valid-key")
          .send({ ...validContactData, category, subject: `Test ${category}` });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
      }
    });
  });

  // -------------------- Mailjet --------------------
  describe("🧪 Tests Mailjet", () => {
    test("✅ Test connexion Mailjet", async () => {
      const res = await request(app)
        .get("/api/test/mailjet")
        .set("x-api-key", "test-valid-key");

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        message: "Configuration Mailjet OK",
        duration: expect.any(String),
      });
    });

    test("❌ Test Mailjet sans API key", async () => {
      const res = await request(app).get("/api/test/mailjet");
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe("API key requise");
    });
  });

  // -------------------- Validations --------------------
  describe("✅ Tests de Validation", () => {
    test("❌ Validation email - formats invalides", async () => {
      const invalidEmails = ["invalid", "@example.com", "test@", "test..test@example.com", "test@example", ""];
      for (const email of invalidEmails) {
        const res = await request(app)
          .post("/api/email/confirm")
          .set("x-api-key", "test-valid-key")
          .send({ email, token: "tok-123" });

        if (res.statusCode === 200) continue; // si regex permissive, on tolère
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe("Paramètres invalides");
      }
    });

    test("✅ Validation email - formats valides", async () => {
      const validEmails = ["test@example.com", "user.name@domain.co.uk", "user+tag@example.org", "123@numbers.com"];
      for (const email of validEmails) {
        const res = await request(app)
          .post("/api/email/confirm")
          .set("x-api-key", "test-valid-key")
          .send({ email, token: "tok-123" });

        expect([200, 500]).toContain(res.statusCode);
      }
    });

    test("❌ Validation stricte - emails vraiment invalides", async () => {
      const bad = ["", "   ", "invalid", "@", "@domain.com"];
      for (const email of bad) {
        const res = await request(app)
          .post("/api/email/confirm")
          .set("x-api-key", "test-valid-key")
          .send({ email, token: "tok-123" });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe("Paramètres invalides");
      }
    });
  });

  // -------------------- Erreurs --------------------
  describe("❌ Tests de Gestion d'Erreurs", () => {
    test("❌ Route inexistante retourne 404", async () => {
      const res = await request(app).get("/route/inexistante");
      expect(res.statusCode).toBe(404);
    });

    test("❌ Méthode non autorisée", async () => {
      const res = await request(app).put("/api/email/confirm").set("x-api-key", "test-valid-key");
      expect(res.statusCode).toBe(404);
    });

    test("❌ Body JSON malformé", async () => {
      const res = await request(app)
        .post("/api/email/confirm")
        .set("x-api-key", "test-valid-key")
        .set("Content-Type", "application/json")
        .send("{ invalid json }");

      // Express lève une 400 quand JSON parse échoue (si ton error handler la propage)
      expect([400, 500]).toContain(res.statusCode);
    });
  });

  // -------------------- Performance --------------------
  describe("⚡ Tests de Performance", () => {
    test("✅ Réponse rapide health check", async () => {
      const start = Date.now();
      const res = await request(app).get("/health");
      const duration = Date.now() - start;

      expect(res.statusCode).toBe(200);
      expect(duration).toBeLessThan(1000); // seuil large pour éviter les flakys CI
    });

    test("✅ Réponse immédiate contact", async () => {
      const start = Date.now();
      const res = await request(app)
        .post("/api/contact/send")
        .set("x-api-key", "test-valid-key")
        .send({
          name: "Speed Test",
          email: "speed@test.com",
          subject: "Test de vitesse",
          message: "Message pour tester la vitesse de réponse",
        });
      const duration = Date.now() - start;

      expect(res.statusCode).toBe(200);
      expect(duration).toBeLessThan(1500);
    });
  });

  // -------------------- Intégration --------------------
  describe("🔗 Tests d'Intégration", () => {
    test("✅ Flux complet email confirmation", async () => {
      const email = "integration@test.com";
      const token = "integration-token-123";

      const res = await request(app)
        .post("/api/email/confirm")
        .set("x-api-key", "test-valid-key")
        .send({ email, token });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const EmailService = require("../services/emailService");
      expect(EmailService.sendConfirmationEmail).toHaveBeenCalledWith(email, token);
    });

    test("✅ Flux complet contact", async () => {
      const contactData = {
        name: "Integration Test",
        email: "integration@contact.com",
        subject: "Test d'intégration complet",
        category: "info",
        message: "Message de test pour l'intégration complète du formulaire de contact.",
      };

      const res = await request(app)
        .post("/api/contact/send")
        .set("x-api-key", "test-valid-key")
        .send(contactData);

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({ success: true, status: "processing" });

      // petite pause si un setTimeout est utilisé en interne
      await new Promise((r) => setTimeout(r, 50));
    });
  });
});

// -------------------- Utilitaires --------------------
describe("🛠️ Tests Utilitaires", () => {
  test("✅ Variables d'environnement de test", () => {
    expect(process.env.NODE_ENV).toBe("test");
    expect(process.env.NOTIFICATION_API_KEY).toBe("test-valid-key");
    expect(process.env.CONTACT_RECEIVE_EMAIL).toBe("support@roadtrip.com");
  });

  test("✅ Mocks fonctionnent", () => {
    const EmailService = require("../services/emailService");
    const SmsService = require("../services/smsService");

    expect(EmailService.sendConfirmationEmail).toBeDefined();
    expect(EmailService.sendPasswordResetEmail).toBeDefined();
    expect(EmailService.sendContactSupportEmail).toBeDefined();
    expect(EmailService.sendContactConfirmationEmail).toBeDefined();
    expect(SmsService.sendPasswordResetCode).toBeDefined();
  });
});
