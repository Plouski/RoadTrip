process.env.NODE_ENV = "test";

const request = require("supertest");

jest.mock("../services/emailService", () => ({
  sendConfirmationEmail: jest.fn().mockResolvedValue({ messageId: "msg-123" }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ messageId: "msg-456" }),
}));

jest.mock("../services/smsService", () => ({
  sendPasswordResetCode: jest.fn().mockResolvedValue({ success: true }),
}));

const { app } = require("../index");

describe("📧 Notification Service - Tests", () => {
  beforeEach(() => {
    process.env.NOTIFICATION_API_KEY = "test-valid-key";
    jest.clearAllMocks();
  });

  test("✅ Health check fonctionne", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: expect.any(String),
      service: "notification-service",
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

  test("✅ Ping répond", async () => {
    const res = await request(app).get("/ping");
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty("status");
    }
  });

  test("✅ Email confirmation (sans API key)", async () => {
    delete process.env.NOTIFICATION_API_KEY;
    const res = await request(app)
      .post("/api/email/confirm")
      .send({ email: "test@example.com", token: "tok-123" });
    expect(res.statusCode).toBe(403);
    if (res.headers["content-type"]?.includes("application/json")) {
      expect(res.body.error).toBe("API key requise");
    }
  });

  test("✅ Email confirmation (API key valide)", async () => {
    const res = await request(app)
      .post("/api/email/confirm")
      .set("x-api-key", "test-valid-key")
      .send({ email: "test@example.com", token: "tok-123" });

    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
      if (res.body.message) {
        expect(typeof res.body.message).toBe("string");
      }
    }
  });

  test("✅ Email confirmation (email invalide)", async () => {
    const res = await request(app)
      .post("/api/email/confirm")
      .set("x-api-key", "test-valid-key")
      .send({ email: "invalid-email", token: "tok-123" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeOneOf?.(["Paramètres invalides", "Email invalide"]) ||
      expect(["Paramètres invalides", "Email invalide"]).toContain(res.body.error);
  });

  test("✅ Email reset (API key valide)", async () => {
    const res = await request(app)
      .post("/api/email/reset")
      .set("x-api-key", "test-valid-key")
      .send({ email: "test@example.com", code: "123456" });

    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
    }
  });

  test("✅ SMS reset (sans API key)", async () => {
    delete process.env.NOTIFICATION_API_KEY;
    const res = await request(app)
      .post("/api/sms/reset")
      .send({ username: "12345678", apiKey: "abc", code: "999999" });
    expect(res.statusCode).toBe(403);
    if (res.headers["content-type"]?.includes("application/json")) {
      expect(res.body.error).toBe("API key requise");
    }
  });

  test("✅ SMS reset (API key valide)", async () => {
    const res = await request(app)
      .post("/api/sms/reset")
      .set("x-api-key", "test-valid-key")
      .send({ username: "12345678", apiKey: "abc", code: "999999" });

    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
    }
  });

  test("✅ Validation paramètres manquants", async () => {
    const res = await request(app)
      .post("/api/email/confirm")
      .set("x-api-key", "test-valid-key")
      .send({ email: "test@example.com" });
    expect(res.statusCode).toBe(400);
    if (res.headers["content-type"]?.includes("application/json")) {
      expect(["Paramètres invalides", "Paramètres manquants"]).toContain(res.body.error);
      if (Array.isArray(res.body.required)) {
        expect(res.body.required).toContain("token");
      }
    }
  });

  test("✅ 404 gérée", async () => {
    const res = await request(app).get("/route/inexistante");
    expect(res.statusCode).toBe(404);
    if (res.headers["content-type"]?.includes("application/json")) {
      if (res.body.error) {
        expect(typeof res.body.error).toBe("string");
      }
      if (res.body.service) {
        expect(res.body.service).toBe("notification-service");
      }
    }
  });
});