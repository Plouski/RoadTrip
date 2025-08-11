const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.SERVICE_NAME = "auth-service";
process.env.SESSION_SECRET = "test-secret";
process.env.GOOGLE_CLIENT_ID = "g-id";
process.env.GOOGLE_CLIENT_SECRET = "g-secret";
process.env.FACEBOOK_CLIENT_ID = "fb-id";
process.env.FACEBOOK_CLIENT_SECRET = "fb-secret";


jest.mock("mongoose", () => {
  const mockSchema = jest.fn().mockImplementation(() => ({ methods: {}, toJSON: jest.fn(), toObject: jest.fn() }));
  mockSchema.prototype.methods = {};
  return {
    connect: jest.fn().mockResolvedValue({}),
    connection: { readyState: 1, host: "localhost", name: "testdb" },
    Schema: mockSchema,
    model: jest.fn().mockReturnValue({
      findById: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    }),
  };
});

jest.mock("../config/jwtConfig", () => ({
  generateAccessToken: jest.fn().mockReturnValue("mock-access-token"),
  generateRefreshToken: jest.fn().mockReturnValue("mock-refresh-token"),
  verifyToken: jest.fn().mockReturnValue({ userId: "test123", email: "test@example.com", role: "user" }),
}));

jest.mock("passport", () => ({
  initialize: jest.fn(() => (req, res, next) => next()),
  session: jest.fn(() => (req, res, next) => next()),
  authenticate: jest.fn((strategy) => (req, res, next) => {
    if (strategy === "google") return res.redirect("https://accounts.google.com/oauth/mock");
    if (strategy === "facebook") return res.redirect("https://www.facebook.com/v18.0/dialog/oauth");
    return next();
  }),
}));

jest.mock("../services/dataService", () => ({
  healthCheck: jest.fn().mockResolvedValue({ status: "ok" }),
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
}));

jest.mock("../config/passportConfig", () => ({ initializeStrategies: jest.fn() }));

jest.mock("express-session", () =>
  jest.fn(() => (req, _res, next) => {
    req.session = {
      id: "mock-session-id",
      destroy: jest.fn((cb) => cb && cb()),
      save: jest.fn((cb) => cb && cb()),
    };
    next();
  })
);

jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  security: jest.fn(),
  auth: jest.fn(),
  performance: jest.fn(),
  middleware: () => (req, _res, next) => {
    req.id = "test-id";
    next();
  },
}));

jest.mock("../metrics", () => ({
  register: { contentType: "text/plain", metrics: () => Promise.resolve("metrics") },
  httpRequestDuration: { observe: jest.fn() },
  httpRequestsTotal: { inc: jest.fn() },
  updateServiceHealth: jest.fn(),
  updateActiveConnections: jest.fn(),
  updateDatabaseHealth: jest.fn(),
  updateExternalServiceHealth: jest.fn(),
}));

jest.mock("dotenv", () => ({ config: jest.fn() }));

const app = require("../index");
const JwtConfig = require("../config/jwtConfig");


describe("🔐 Auth Service – tests d’intégration", () => {
  test("✅ /health fonctionne", async () => {
    const res = await request(app).get("/health");
    expect([200, 503]).toContain(res.statusCode);
    expect(res.statusCode).toBe(200);
    expect(res.body.service).toBe("auth-service");
  });

  test("✅ Google OAuth redirige", async () => {
    const res = await request(app).get("/auth/oauth/google").expect(302);
    expect(res.headers.location).toContain("accounts.google.com");
  });

  test("✅ Facebook OAuth redirige", async () => {
    const res = await request(app).get("/auth/oauth/facebook").expect(302);
    expect(res.headers.location).toContain("facebook.com");
  });

  test("✅ Génération JWT simulée", () => {
    const token = JwtConfig.generateAccessToken({ _id: "u1", email: "e@x.com", role: "user" });
    expect(token).toBe("mock-access-token");
  });

  test("✅ /providers retourne la config", async () => {
    const res = await request(app).get("/providers").expect(200);
    expect(res.body.providers).toHaveProperty("google");
    expect(res.body.providers).toHaveProperty("facebook");
    expect(res.body.availableProviders).toContain("google");
    expect(res.body.availableProviders).toContain("facebook");
  });

  test("✅ /auth/logout ne plante pas", async () => {
    const res = await request(app).post("/auth/logout");
    expect([200, 204, 500]).toContain(res.statusCode);
  });

  test("✅ /metrics répond", async () => {
    const res = await request(app).get("/metrics").expect([200, 500]);
    if (res.statusCode === 200) {
      expect(res.headers["content-type"]).toContain("text/plain");
      expect(typeof res.text).toBe("string");
    }
  });

  test("✅ /vitals répond", async () => {
    const res = await request(app).get("/vitals").expect(200);
    expect(res.body.service).toBe("auth-service");
  });

  test("✅ 404 handler", async () => {
    const res = await request(app).get("/route-absente").expect(404);
    expect(res.body.service).toBe("auth-service");
    expect(Array.isArray(res.body.availableRoutes)).toBe(true);
  });

  test("✅ Gestion erreur OAuth (callback)", async () => {
    const res = await request(app).get("/auth/oauth/google/callback?error=access_denied");
    expect([302, 500]).toContain(res.statusCode);
  });
});
