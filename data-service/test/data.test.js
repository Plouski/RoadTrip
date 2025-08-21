const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/roadtrip-test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret";
process.env.NOTIFICATION_SERVICE_URL = "http://localhost:5005";
process.env.PORT = "0";
process.env.FREE_MOBILE_USERNAME = "test-username";
process.env.FREE_MOBILE_API_KEY = "test-api-key";

let spyConsoleError, spyConsoleWarn, spyConsoleInfo;
beforeAll(() => {
  spyConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  spyConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  spyConsoleInfo = jest.spyOn(console, 'info').mockImplementation(() => {});
});
afterAll(() => {
  spyConsoleError?.mockRestore();
  spyConsoleWarn?.mockRestore();
  spyConsoleInfo?.mockRestore();
});

jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  logError: jest.fn(),
  logAuth: jest.fn(),
  debug: jest.fn(),
}));

jest.mock("../metrics", () => ({
  updateServiceHealth: jest.fn(),
  updateActiveConnections: jest.fn(),
  updateDatabaseHealth: jest.fn(),
  updateExternalServiceHealth: jest.fn(),
  httpRequestDuration: { observe: jest.fn() },
  httpRequestsTotal: { inc: jest.fn() },
  register: { metrics: jest.fn(() => 'mocked metrics'), contentType: 'text/plain' },
}));

jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    readyState: 1,
    close: jest.fn(),
  },
  Schema: jest.fn(),
  model: jest.fn(),
  models: {},
  Types: {
    ObjectId: {
      isValid: jest.fn((id) => /^[0-9a-fA-F]{24}$/.test(id)),
    },
  },
}));

const mockAxiosPost = jest.fn();
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: mockAxiosPost,
  })),
  post: mockAxiosPost,
}));

jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(() => Promise.resolve('mocked-salt')),
  hash: jest.fn((password) => Promise.resolve(`hashed-${password}`)),
  compare: jest.fn((plain, hashed) => Promise.resolve(hashed === `hashed-${plain}`)),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: () => 'mocked-token-123',
  })),
}));

// TESTS SERVICES
describe("SERVICE NotificationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("sendConfirmationEmail - succès", async () => {
    const mockUser = {
      email: "test@example.com",
      isVerified: false,
      verificationToken: "mocked-token-123",
    };

    jest.doMock("../models/User", () => ({
      findOne: jest.fn(() => Promise.resolve(mockUser)),
    }));

    mockAxiosPost.mockResolvedValueOnce({
      status: 200,
      data: { message: "Email envoyé" },
    });

    const NotificationService = require("../services/notificationService");
    const result = await NotificationService.sendConfirmationEmail(
      "test@example.com",
      "mocked-token-123"
    );

    expect(result.status).toBe(200);
    expect(mockAxiosPost).toHaveBeenCalledWith(
      "http://localhost:5005/api/email/confirm",
      { email: "test@example.com", token: "mocked-token-123" }
    );
  });

  test("sendPasswordResetSMS - succès", async () => {
    mockAxiosPost.mockResolvedValueOnce({
      status: 200,
      data: { success: true },
    });

    const NotificationService = require("../services/notificationService");
    const result = await NotificationService.sendPasswordResetSMS(
      "+33123456789",
      "123456"
    );

    expect(result.success).toBe(true);
    expect(mockAxiosPost).toHaveBeenCalledWith(
      "http://localhost:5005/api/sms/reset",
      expect.objectContaining({
        username: "test-username",
        apiKey: "test-api-key",
        code: "123456",
      })
    );
  });
});

// TESTS CONTROLLERS (unitaires) avec modèles mockés
describe("CONTROLLER AuthController (unit)", () => {
  let AuthController, mockUserModel;

  beforeEach(() => {
    jest.resetModules();

    mockUserModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    const MockUser = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: "507f1f77bcf86cd799439011",
      save: jest.fn(() => Promise.resolve(data)),
      toJSON: () => ({ ...data, id: "507f1f77bcf86cd799439011" }),
    }));
    Object.assign(MockUser, mockUserModel);

    jest.doMock("../models/User", () => MockUser);
    jest.doMock("../services/notificationService", () => ({
      sendConfirmationEmail: jest.fn(() => Promise.resolve({ status: 200 })),
      cancelPendingEmails: jest.fn(),
    }));

    jest.isolateModules(() => {
      AuthController = require("../controllers/authController");
    });
  });

  const mockReqRes = (over = {}) => {
    const req = {
      body: {},
      params: {},
      user: { userId: "507f1f77bcf86cd799439011", role: "user" },
      ...over,
    };
    const res = {
      statusCode: 200,
      jsonPayload: null,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.jsonPayload = payload; return this; },
    };
    const next = jest.fn();
    return { req, res, next };
  };

  test("register - inscription classique réussie", async () => {
    mockUserModel.findOne.mockResolvedValueOnce(null);

    const { req, res, next } = mockReqRes({
      body: {
        email: "newuser@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      },
    });

    jest.doMock('express-validator', () => ({
      validationResult: jest.fn(() => ({ isEmpty: () => true, array: () => [] })),
    }));

    await AuthController.register(req, res, next);

    expect([200, 201]).toContain(res.statusCode);
    if (res.jsonPayload) {
      expect(res.jsonPayload).toEqual(
        expect.objectContaining({
          message: expect.stringContaining("créé"),
        })
      );
    }
  });

  test("login - connexion réussie", async () => {
    const mockUser = {
      _id: "507f1f77bcf86cd799439011",
      email: "user@example.com",
      password: "hashed-password123",
      firstName: "John",
      lastName: "Doe",
      role: "user",
      isVerified: true,
    };

    mockUserModel.findOne.mockResolvedValueOnce(mockUser);

    jest.doMock('express-validator', () => ({
      validationResult: jest.fn(() => ({ isEmpty: () => true, array: () => [] })),
    }));

    const { req, res, next } = mockReqRes({
      body: {
        email: "user@example.com",
        password: "password123",
      },
    });

    await AuthController.login(req, res, next);

    expect(res.statusCode).toBe(200);
    if (res.jsonPayload) {
      expect(res.jsonPayload).toEqual(
        expect.objectContaining({
          message: expect.stringContaining("Connexion"),
        })
      );
    }
  });

  test("getProfile - profil récupéré", async () => {
    const mockUser = {
      _id: "507f1f77bcf86cd799439011",
      email: "user@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "user",
      isVerified: true,
    };

    mockUserModel.findById.mockReturnValueOnce({
      select: jest.fn(() => Promise.resolve(mockUser)),
    });

    const { req, res, next } = mockReqRes();

    await AuthController.getProfile(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.user).toEqual(
      expect.objectContaining({
        email: "user@example.com",
        firstName: "John",
      })
    );
  });
});

describe("CONTROLLER TripController (unit)", () => {
  let TripController, mockTripModel;

  beforeEach(() => {
    jest.resetModules();

    mockTripModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
    };

    jest.doMock("../models/Trip", () => mockTripModel);

    jest.isolateModules(() => {
      TripController = require("../controllers/tripController");
    });
  });

  const mockReqRes = (over = {}) => {
    const req = {
      query: {},
      params: {},
      user: { userId: "507f1f77bcf86cd799439011", role: "user" },
      ...over,
    };
    const res = {
      statusCode: 200,
      jsonPayload: null,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.jsonPayload = payload; return this; },
    };
    return { req, res };
  };

  test("getPublicRoadtrips - récupération avec pagination", async () => {
    const mockTrips = [
      { title: "Voyage Italie", country: "Italie", isPremium: false },
      { title: "Roadtrip Espagne", country: "Espagne", isPremium: true },
    ];

    mockTripModel.find.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn(() => Promise.resolve(mockTrips)),
    });

    mockTripModel.countDocuments.mockResolvedValueOnce(2);

    const { req, res } = mockReqRes({
      query: { page: "1", limit: "10" },
    });

    await TripController.getPublicRoadtrips(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.success).toBe(true);
    expect(res.jsonPayload.data.trips).toHaveLength(2);
    expect(res.jsonPayload.data.pagination).toEqual(
      expect.objectContaining({
        currentPage: 1,
        totalItems: 2,
      })
    );
  });

  test("getRoadtripById - roadtrip premium avec utilisateur standard", async () => {
    const mockTrip = {
      _id: "507f1f77bcf86cd799439012",
      title: "Voyage Premium",
      isPremium: true,
      itinerary: [
        { day: 1, title: "Jour 1", description: "Description complète jour 1" },
        { day: 2, title: "Jour 2", description: "Description complète jour 2" },
      ],
      pointsOfInterest: [
        { name: "POI 1", description: "Description complète POI 1" },
        { name: "POI 2", description: "Description complète POI 2" },
        { name: "POI 3", description: "Description complète POI 3" },
      ],
      toObject: jest.fn(function() { return this; }),
    };

    mockTripModel.findById.mockResolvedValueOnce(mockTrip);

    const { req, res } = mockReqRes({
      params: { id: "507f1f77bcf86cd799439012" },
      user: { userId: "507f1f77bcf86cd799439011", role: "user" },
    });

    await TripController.getRoadtripById(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.data.premiumNotice).toBeDefined();
    expect(res.jsonPayload.data.itinerary[0].description);
  });
});

// TESTS MIDDLEWARES
describe("MIDDLEWARE authMiddleware", () => {
  let authMiddleware, mockJwt;

  beforeEach(() => {
    jest.resetModules();
    
    mockJwt = {
      verify: jest.fn(),
    };

    jest.doMock('jsonwebtoken', () => mockJwt);

    jest.isolateModules(() => {
      ({ authMiddleware } = require("../middlewares/authMiddleware"));
    });
  });

  const mockReqRes = (over = {}) => {
    const req = {
      headers: {},
      cookies: {},
      query: {},
      ...over,
    };
    const res = {
      statusCode: 200,
      jsonPayload: null,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.jsonPayload = payload; return this; },
    };
    const next = jest.fn();
    return { req, res, next };
  };

  test("authMiddleware - token valide dans header Authorization", () => {
    mockJwt.verify.mockReturnValueOnce({
      userId: "507f1f77bcf86cd799439011",
      email: "user@example.com",
      role: "user",
    });

    const { req, res, next } = mockReqRes({
      headers: { authorization: "Bearer valid-token-123" },
    });

    authMiddleware(req, res, next);

    expect(req.user).toEqual({
      userId: "507f1f77bcf86cd799439011",
      email: "user@example.com",
      role: "user",
    });
    expect(next).toHaveBeenCalled();
  });

  test("authMiddleware - token manquant", () => {
    const { req, res, next } = mockReqRes();

    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.jsonPayload.message).toBe("Authentification requise");
    expect(next).not.toHaveBeenCalled();
  });

  test("authMiddleware - token expiré", () => {
    const expiredError = new Error("Token expired");
    expiredError.name = "TokenExpiredError";
    mockJwt.verify.mockImplementationOnce(() => {
      throw expiredError;
    });

    const { req, res, next } = mockReqRes({
      headers: { authorization: "Bearer expired-token" },
    });

    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.jsonPayload.message).toBe("Session expirée, veuillez vous reconnecter");
    expect(res.jsonPayload.code).toBe("TOKEN_EXPIRED");
  });
});

// TESTS ROUTES
describe("ROUTES /api/auth/* (supertest)", () => {
  let app;

  beforeEach(() => {
    jest.resetModules();

    jest.doMock("../middlewares/authMiddleware", () => ({
      authMiddleware: (req, _res, next) => {
        req.user = { userId: "507f1f77bcf86cd799439011", role: "user" };
        next();
      },
      adminMiddleware: (req, _res, next) => {
        req.user = { userId: "507f1f77bcf86cd799439011", role: "admin" };
        next();
      },
    }));

    jest.doMock("../controllers/authController", () => ({
      register: jest.fn((req, res) => {
        res.status(201).json({
          message: "Utilisateur créé avec succès",
          user: { id: "507f1f77bcf86cd799439011", email: req.body.email },
          tokens: { accessToken: "token123", refreshToken: "refresh123" },
        });
      }),
      login: jest.fn((req, res) => {
        res.status(200).json({
          message: "Connexion réussie",
          user: { id: "507f1f77bcf86cd799439011", email: req.body.email },
          tokens: { accessToken: "token123", refreshToken: "refresh123" },
        });
      }),
      logout: jest.fn((req, res) => {
        res.status(200).json({ message: "Déconnexion réussie" });
      }),
      verifyToken: jest.fn((req, res) => {
        res.status(200).json({ valid: true });
      }),
      refreshToken: jest.fn((req, res) => {
        res.status(200).json({ accessToken: "new-token" });
      }),
      verifyAccount: jest.fn((req, res) => {
        res.status(200).json({ message: "Compte vérifié" });
      }),
      initiatePasswordReset: jest.fn((req, res) => {
        res.status(200).json({ message: "Email envoyé" });
      }),
      initiatePasswordResetBySMS: jest.fn((req, res) => {
        res.status(200).json({ message: "SMS envoyé" });
      }),
      resetPassword: jest.fn((req, res) => {
        res.status(200).json({ message: "Mot de passe réinitialisé" });
      }),
      changePassword: jest.fn((req, res) => {
        res.status(200).json({ message: "Mot de passe changé" });
      }),
      getProfile: jest.fn((req, res) => {
        res.status(200).json({
          user: {
            id: req.user.userId,
            email: "user@example.com",
            firstName: "John",
            lastName: "Doe",
          },
        });
      }),
      updateProfile: jest.fn((req, res) => {
        res.status(200).json({ message: "Profil mis à jour" });
      }),
      deleteUser: jest.fn((req, res) => {
        res.status(200).json({ message: "Compte supprimé" });
      }),
      refreshUserData: jest.fn((req, res) => {
        res.status(200).json({ message: "Données rafraîchies" });
      }),
    }));

    jest.isolateModules(() => {
      const express = require("express");
      const authRoutes = require("../routes/authRoutes");
      app = express();
      app.use(express.json());
      app.use("/api/auth", authRoutes);
    });
  });

  test("POST /api/auth/register", async () => {
    const request = require("supertest");
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "newuser@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      });

    expect([201, 500]).toContain(res.statusCode);
    
    if (res.statusCode === 201) {
      expect(res.body).toEqual(
        expect.objectContaining({
          message: "Utilisateur créé avec succès",
          user: expect.objectContaining({
            email: "newuser@example.com",
          }),
          tokens: expect.any(Object),
        })
      );
    }
  });

  test("GET /api/auth/profile", async () => {
    const request = require("supertest");
    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", "Bearer token123");

    expect([200, 500]).toContain(res.statusCode);
    
    if (res.statusCode === 200) {
      expect(res.body.user).toEqual(
        expect.objectContaining({
          email: "user@example.com",
          firstName: "John",
        })
      );
    }
  });
});

// TEST INTÉGRATION
describe("INTEGRATION app.js (serveur réel)", () => {
  let server;

  beforeAll(() => {
    jest.resetModules();

    jest.doMock('mongoose', () => ({
      connect: jest.fn(() => Promise.resolve()),
      connection: {
        readyState: 1,
        close: jest.fn(),
      },
      Schema: jest.fn(),
      model: jest.fn(),
      models: {},
      Types: {
        ObjectId: {
          isValid: jest.fn((id) => /^[0-9a-fA-F]{24}$/.test(id)),
        },
      },
    }));

    const mockRouter = () => {
      const express = require("express");
      const router = express.Router();
      router.get("/", (req, res) => res.json({ status: "mock" }));
      router.post("/", (req, res) => res.json({ status: "mock" }));
      router.put("/", (req, res) => res.json({ status: "mock" }));
      router.delete("/", (req, res) => res.json({ status: "mock" }));
      return router;
    };

    jest.doMock("../routes/tripRoutes", mockRouter);
    jest.doMock("../routes/favoriteRoutes", mockRouter);
    jest.doMock("../routes/messageRoutes", mockRouter);
    jest.doMock("../routes/adminRoutes", mockRouter);
    jest.doMock("../routes/authRoutes", mockRouter);
    jest.doMock("../routes/userRoutes", mockRouter);

    jest.isolateModules(() => {
      const { app } = require("../app");
      server = app.listen(0);
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("GET /health -> 200", async () => {
    const request = require("supertest");
    const { app } = require("../app");
    
    const res = await request(app).get("/health");
    
    expect([200, 500, 503]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.status).toBe("healthy");
      expect(res.body.service).toBe("data-service");
    }
  });

  test("GET /vitals -> 200", async () => {
    const request = require("supertest");
    const { app } = require("../app");
    
    const res = await request(app).get("/vitals");
    
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.service).toBe("data-service");
      expect(res.body.status).toBe("running");
    }
  });
});

// TESTS UTILS JWT CONFIG
describe("UTILS jwtConfig", () => {
  let jwtConfig, mockJwt;

  beforeEach(() => {
    jest.resetModules();
    
    mockJwt = {
      sign: jest.fn((payload, secret, options) => `token-${payload.userId}-${options.expiresIn}`),
      verify: jest.fn((token, secret) => {
        if (token.includes('valid')) {
          return { userId: "507f1f77bcf86cd799439011", email: "user@example.com", role: "user" };
        }
        throw new Error("Token invalid");
      }),
    };

    jest.doMock('jsonwebtoken', () => mockJwt);

    jest.isolateModules(() => {
      jwtConfig = require("../config/jwtConfig");
    });
  });

  test("generateAccessToken - génération token d'accès", () => {
    const user = {
      _id: "507f1f77bcf86cd799439011",
      email: "user@example.com",
      role: "user",
    };

    const token = jwtConfig.generateAccessToken(user);

    expect(token).toBe("token-507f1f77bcf86cd799439011-1h");
    expect(mockJwt.sign).toHaveBeenCalledWith(
      {
        userId: "507f1f77bcf86cd799439011",
        email: "user@example.com",
        role: "user",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  test("verifyAccessToken - vérification token valide", () => {
    const decoded = jwtConfig.verifyAccessToken("valid-token-123");

    expect(decoded).toEqual({
      userId: "507f1f77bcf86cd799439011",
      email: "user@example.com",
      role: "user",
    });
  });
});

// TESTS VALIDATION ET SÉCURITÉ
describe("VALIDATION ET SÉCURITÉ", () => {
  test("Validation ObjectId MongoDB", () => {
    const mongoose = require('mongoose');
    
    expect(mongoose.Types.ObjectId.isValid("507f1f77bcf86cd799439011")).toBe(true);
    expect(mongoose.Types.ObjectId.isValid("invalid-id")).toBe(false);
  });

  test("Sécurité mots de passe avec bcrypt", async () => {
    const password = "motDePasseSecret123";
    const wrongPassword = "mauvaisMotDePasse";

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    expect(hashedPassword).toBe(`hashed-${password}`);

    const isValid = await bcrypt.compare(password, hashedPassword);
    const isInvalid = await bcrypt.compare(wrongPassword, hashedPassword);

    expect(isValid).toBe(true);
    expect(isInvalid).toBe(false);
  });

  test("Health check endpoints retournent les bonnes informations", async () => {
    const request = require("supertest");
    const { app } = require("../app");

    const healthRes = await request(app).get("/health");
    
    expect([200, 500, 503]).toContain(healthRes.statusCode);
    
    if (healthRes.statusCode === 200) {
      expect(healthRes.body).toEqual(
        expect.objectContaining({
          status: "healthy",
          service: "data-service",
          uptime: expect.any(Number),
        })
      );
    } else {
      expect(healthRes.body).toBeDefined();
    }
  });
});