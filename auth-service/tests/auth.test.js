process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "test-session";
process.env.JWT_SECRET = "jwt-test-secret";
process.env.JWT_EXPIRES_IN = "1h";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.DATA_SERVICE_URL = "http://localhost:5002";

let spyErr, spyWarn, spyInfo;
beforeAll(() => {
  spyErr = jest.spyOn(console, "error").mockImplementation(() => {});
  spyWarn = jest.spyOn(console, "warn").mockImplementation(() => {});
  spyInfo = jest.spyOn(console, "info").mockImplementation(() => {});
});
afterAll(() => {
  spyErr?.mockRestore();
  spyWarn?.mockRestore();
  spyInfo?.mockRestore();
});

jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  performance: jest.fn(),
  security: jest.fn(),
  auth: jest.fn(),
  user: jest.fn(),
}));

jest.mock("axios", () => {
  const mockGet = jest.fn();
  const mockPost = jest.fn();
  const mockDelete = jest.fn();
  const mockPut = jest.fn();
  const client = {
    get: mockGet,
    post: mockPost,
    delete: mockDelete,
    put: mockPut,
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  };
  const mockCreate = jest.fn(() => client);
  return {
    get: mockGet,
    post: mockPost,
    delete: mockDelete,
    put: mockPut,
    create: mockCreate,
    __mock: {
      get: mockGet,
      post: mockPost,
      delete: mockDelete,
      put: mockPut,
      client,
      create: mockCreate,
    },
  };
});

const mockHelmet = jest.fn(() => (_req, _res, next) => next());
jest.mock(
  "helmet",
  () =>
    (...args) =>
      mockHelmet(...args)
);

const mockRate = jest.fn(() => (_req, _res, next) => next());
jest.mock("express-rate-limit", () => () => mockRate());

const mockSession = jest.fn(() => (_req, _res, next) => next());
jest.mock(
  "express-session",
  () =>
    (...args) =>
      mockSession(...args)
);

const mockPassportInitialize = jest.fn(() => (_req, _res, next) => next());
const mockPassportSession = jest.fn(() => (_req, _res, next) => next());
jest.mock("passport", () => {
  const api = {
    initialize: () => mockPassportInitialize(),
    session: () => mockPassportSession(),
  };
  return api;
});

const mockInitStrategies = jest.fn();
jest.mock("../config/passportConfig", () => ({
  initializeStrategies: mockInitStrategies,
}));

// applySecurity
describe("loaders/security.applySecurity", () => {
  beforeEach(() => jest.clearAllMocks());

  test("branche Helmet, rate-limit, session, Passport", () => {
    const calls = [];
    const app = { use: (...mws) => calls.push(...mws) };
    const { applySecurity } = require("../loaders/security");

    applySecurity(app);

    expect(mockHelmet).toHaveBeenCalledTimes(1);
    const helmetOpts = mockHelmet.mock.calls[0][0];
    expect(helmetOpts.contentSecurityPolicy).toBeDefined();

    expect(mockRate).toHaveBeenCalledTimes(2);
    expect(mockSession).toHaveBeenCalledTimes(1);
    const sessCfg = mockSession.mock.calls[0][0];
    expect(sessCfg.secret).toBe("test-session");

    expect(mockPassportInitialize).toHaveBeenCalledTimes(1);
    expect(mockPassportSession).toHaveBeenCalledTimes(1);
    expect(mockInitStrategies).toHaveBeenCalledTimes(1);

    expect(calls.length).toBeGreaterThanOrEqual(5);
  });
});

// JWT config
describe("config/jwtConfig", () => {
  const Jwt = require("../config/jwtConfig");

  test("generateAccessToken + verifyToken", () => {
    const token = Jwt.generateAccessToken({
      _id: "u1",
      email: "a@b.com",
      role: "user",
    });
    const decoded = Jwt.verifyToken(token);
    expect(decoded.userId).toBe("u1");
    expect(decoded.email).toBe("a@b.com");
    expect(decoded.role).toBe("user");
  });

  test("generateRefreshToken + refreshToken -> nouveau access token", () => {
    const refresh = Jwt.generateRefreshToken({ _id: "u2", email: "c@d.com" });
    const newAccess = Jwt.refreshToken(refresh);
    const decoded = Jwt.verifyToken(newAccess);
    expect(decoded.userId).toBe("u2");
    expect(decoded.email).toBe("c@d.com");
  });

  test("verifyToken -> Token invalide/expiré", () => {
    const bad = "bad.token.here";
    expect(() => Jwt.verifyToken(bad)).toThrow("Token invalide");
  });
});

// Modèle User : isAdmin + toJSON
describe("models/User methods", () => {
  test("isAdmin / toJSON", () => {
    const mongoose = require("mongoose");
    const User = require("../models/User");

    const doc = new User({
      email: "x@y.z",
      role: "admin",
      password: "secret",
      verificationToken: "tok",
      resetCode: "123",
      resetCodeExpires: new Date(),
    });
    expect(doc.isAdmin()).toBe(true);

    const json = doc.toJSON();
    expect(json.password).toBeUndefined();
    expect(json.verificationToken).toBeUndefined();
    expect(json.resetCode).toBeUndefined();
    expect(json.resetCodeExpires).toBeUndefined();
    expect(json.email).toBe("x@y.z");

    const doc2 = new User({ role: "user" });
    expect(doc2.isAdmin()).toBe(false);
  });
});

// Controller OAuth (unitaires)
describe("controllers/authController OAuth", () => {
  const dataService = require("../services/dataService");
  const AuthController = require("../controllers/authController");

  beforeEach(() => {
    jest.clearAllMocks();
    dataService.logOAuthAttempt = jest.fn().mockResolvedValue({ ok: true });
  });

  const mockReqRes = (over = {}) => {
    const req = {
      user: null,
      ip: "127.0.0.1",
      id: "req-1",
      sessionID: "sess-1",
      get: (h) =>
        h === "User-Agent" ? "jest" : h === "Accept" ? "*/*" : undefined,
      query: {},
      path: "/auth/oauth/google/callback",
      ...over,
    };
    const res = {
      statusCode: 200,
      headers: {},
      body: null,
      _redirect: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
      redirect(url) {
        this._redirect = url;
        return this;
      },
    };
    const next = jest.fn();
    return { req, res, next };
  };

  test("handleOAuthSuccess → 401 si pas de req.user", async () => {
    const { req, res, next } = mockReqRes();
    await AuthController.handleOAuthSuccess(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body?.message).toMatch(/Authentification OAuth échouée/);
  });

  test("handleOAuthSuccess → JSON si Accept: application/json", async () => {
    const { req, res, next } = mockReqRes({
      get: (h) =>
        h === "User-Agent"
          ? "jest"
          : h === "Accept"
          ? "application/json"
          : undefined,
      user: {
        user: {
          _id: "u1",
          email: "a@b.com",
          firstName: "A",
          lastName: "B",
          role: "user",
          avatar: null,
          oauth: { provider: "google" },
        },
        accessToken: "acc",
        refreshToken: "ref",
      },
    });
    await AuthController.handleOAuthSuccess(req, res, next);
    expect(res.statusCode).toBe(200);
    expect(res.body?.user?.id).toBe("u1");
    expect(res.body?.tokens?.accessToken).toBe("acc");
    expect(next).not.toHaveBeenCalled();
  });

  test("handleOAuthSuccess → redirect sinon", async () => {
    const { req, res, next } = mockReqRes({
      user: {
        user: {
          _id: "u2",
          email: "c@d.com",
          firstName: "C",
          lastName: "D",
          role: "user",
          avatar: null,
          oauth: { provider: "google" },
        },
        accessToken: "acc2",
        refreshToken: "ref2",
      },
    });
    await AuthController.handleOAuthSuccess(req, res, next);
    expect(res._redirect).toMatch(/\/oauth-callback\?token=acc2/);
  });

  test("handleOAuthError → redirect avec params", async () => {
    const { req, res, next } = mockReqRes({
      path: "/auth/oauth/google/error",
      query: {
        error: "access_denied",
        error_description: "desc",
        state: "xyz",
      },
    });
    await AuthController.handleOAuthError(req, res, next);
    expect(res._redirect).toMatch(
      /\/oauth-error\?error=access_denied&provider=google/
    );
  });
});

// DataService
describe("services/dataService", () => {
  const axios = require("axios");
  const dataService = require("../services/dataService");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("createUser OK", async () => {
    axios.__mock.post.mockResolvedValueOnce({ data: { id: "u1" } });
    const res = await dataService.createUser({ email: "a@b.com" });
    expect(res).toEqual({ id: "u1" });
    expect(axios.__mock.post).toHaveBeenCalledWith(
      "/users",
      expect.any(Object)
    );
  });

  test("createUser erreur", async () => {
    axios.__mock.post.mockRejectedValueOnce({
      message: "BOOM",
      response: { status: 500, data: { message: "x" } },
    });
    await expect(dataService.createUser({ email: "a@b.com" })).rejects.toThrow(
      /Erreur création utilisateur/
    );
  });

  test("findUserByEmail OK", async () => {
    axios.__mock.get.mockResolvedValueOnce({
      data: { id: "u2", role: "user" },
    });
    const res = await dataService.findUserByEmail("x@y.z");
    expect(res.id).toBe("u2");
    expect(axios.__mock.get).toHaveBeenCalledWith("/users/email/x%40y.z");
  });

  test("findUserByEmail 404 → null", async () => {
    axios.__mock.get.mockRejectedValueOnce({ response: { status: 404 } });
    const res = await dataService.findUserByEmail("none@none.com");
    expect(res).toBeNull();
  });

  test("findUserById OK", async () => {
    axios.__mock.get.mockResolvedValueOnce({
      data: { id: "u3", email: "z@z.z" },
    });
    const res = await dataService.findUserById("u3");
    expect(res.email).toBe("z@z.z");
    expect(axios.__mock.get).toHaveBeenCalledWith("/users/u3");
  });

  test("findUserById 404 → null", async () => {
    axios.__mock.get.mockRejectedValueOnce({ response: { status: 404 } });
    const res = await dataService.findUserById("missing");
    expect(res).toBeNull();
  });

  test("updateUser OK", async () => {
    axios.__mock.put.mockResolvedValueOnce({ data: { id: "u4", name: "ok" } });
    const res = await dataService.updateUser("u4", { name: "ok" });
    expect(res.id).toBe("u4");
    expect(axios.__mock.put).toHaveBeenCalledWith("/users/u4", { name: "ok" });
  });

  test("healthCheck healthy", async () => {
    axios.__mock.get.mockResolvedValueOnce({
      status: 200,
      data: { status: "ok" },
    });
    const res = await dataService.healthCheck();
    expect(res.status).toBe("healthy");
  });

  test("healthCheck unhealthy (throw)", async () => {
    axios.__mock.get.mockRejectedValueOnce({
      message: "down",
      response: { status: 500 },
    });
    await expect(dataService.healthCheck()).rejects.toThrow(
      /Data-service non disponible/
    );
  });

  test("testConnection OK", async () => {
    axios.__mock.get.mockResolvedValueOnce({ status: 200 });
    const res = await dataService.testConnection();
    expect(res.connected).toBe(true);
  });

  test("testConnection FAIL", async () => {
    axios.__mock.get.mockRejectedValueOnce({
      message: "timeout",
      code: "ECONNABORTED",
    });
    const res = await dataService.testConnection();
    expect(res.connected).toBe(false);
    expect(res.error).toBe("timeout");
  });
});

// Routes
describe("routes/authRoutes (supertest)", () => {
  beforeEach(() => jest.resetModules());

  test("GET /auth/oauth/google/callback → JSON via handleOAuthSuccess", async () => {
    jest.doMock("passport", () => ({
      initialize: () => (_req, _res, next) => next(),
      session: () => (_req, _res, next) => next(),
      authenticate: (_strategy, _opts) => (req, _res, next) => {
        req.user = {
          user: {
            _id: "u9",
            email: "g@o.o",
            firstName: "G",
            lastName: "O",
            role: "user",
            avatar: null,
            oauth: { provider: "google" },
          },
          accessToken: "accG",
          refreshToken: "refG",
        };
        next();
      },
    }));

    const express = require("express");
    const routes = require("../routes/authRoutes");
    const request = require("supertest");

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.logout = (cb) => cb();
      req.session = { destroy: (cb) => cb() };
      next();
    });
    app.use("/auth", routes);

    const res = await request(app)
      .get("/auth/oauth/google/callback")
      .set("Accept", "application/json");

    expect(res.statusCode).toBe(200);
    expect(res.body?.user?.id).toBe("u9");
    expect(res.body?.tokens?.accessToken).toBe("accG");
  });

  test("GET /auth/providers", async () => {
    const express = require("express");
    const routes = require("../routes/authRoutes");
    const request = require("supertest");

    const app = express();
    app.use("/auth", routes);

    const res = await request(app).get("/auth/providers");
    expect(res.statusCode).toBe(200);
    expect(res.body.providers.google.url).toBe("/auth/oauth/google");
  });

  test("POST /auth/logout", async () => {
    const express = require("express");
    const routes = require("../routes/authRoutes");
    const request = require("supertest");

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.logout = (cb) => cb();
      req.session = { destroy: (cb) => cb() };
      next();
    });
    app.use("/auth", routes);

    const res = await request(app).post("/auth/logout");
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/Déconnexion réussie/);
  });
});
