const axios = require('axios'); // <- nécessaire pour axios.__mock

process.env.NODE_ENV = "test";
process.env.OPENAI_API_KEY = "test-key";
process.env.PORT = "0"; // ports aléatoires pour éviter les conflits
process.env.METRICS_PORT = "0";
process.env.FRONTEND_URL = "http://localhost:3000";

let spyConsoleError, spyConsoleWarn, spyConsoleInfo;
beforeAll(() => {
  spyConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  spyConsoleWarn  = jest.spyOn(console, 'warn').mockImplementation(() => {});
  spyConsoleInfo  = jest.spyOn(console, 'info').mockImplementation(() => {});
});
afterAll(() => {
  spyConsoleError?.mockRestore();
  spyConsoleWarn?.mockRestore();
  spyConsoleInfo?.mockRestore();
});


// ------------------------------------------------------------
// Mocks globaux communs à tout le fichier
// (déclarés avant tout require/import pour que Jest les "hoiste")
// ------------------------------------------------------------
jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  performance: jest.fn(),
  security: jest.fn(),
  middleware: () => (req, _res, next) => {
    req.id = req.id || "test-req";
    next();
  },
}));

jest.mock("../metrics", () => ({
  updateServiceHealth: jest.fn(),
  updateActiveConnections: jest.fn(),
  updateExternalServiceHealth: jest.fn(),
  httpRequestDuration: { observe: jest.fn() },
}));

// Mock OpenAI: objet avec chat.completions.create
const mockCreate = jest.fn();
jest.mock("openai", () => {
  return function OpenAI() {
    return {
      chat: { completions: { create: mockCreate } },
    };
  };
});

// --- MOCK AXIOS (SAFE) ---
jest.mock('axios', () => {
  const mockAxiosGet = jest.fn();
  const mockAxiosPost = jest.fn();
  const mockAxiosDelete = jest.fn();
  const mockAxiosClient = {
    post: mockAxiosPost,
    get: mockAxiosGet,
    delete: mockAxiosDelete,
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  };
  const mockCreate = jest.fn(() => mockAxiosClient);
  return {
    get: mockAxiosGet,
    create: mockCreate,
    __mock: { get: mockAxiosGet, post: mockAxiosPost, delete: mockAxiosDelete, client: mockAxiosClient, create: mockCreate },
  };
});

// Mock cacheKey: clé constante pour tester le cache facilement
jest.mock("../utils/cacheKey", () => ({
  generateCacheKey: jest.fn(() => "cache:key:abc"),
}));

// ------------------------------------------------------------
// 1) TESTS UTILS (réels) : durationExtractor & roadtripValidation
// ------------------------------------------------------------
describe("UTILS", () => {
  const { extractDurationFromQuery } = require("../utils/durationExtractor");
  const {
    stripDiacritics,
    isRoadtripRelated,
  } = require("../utils/roadtripValidation");

  test("extractDurationFromQuery - cas de base jours/semaines, limites et mois", () => {
    expect(extractDurationFromQuery("Voyage de 7 jours en Italie")).toEqual({
      days: 7,
      error: null,
    });
    expect(extractDurationFromQuery("roadtrip 1 j au Portugal")).toEqual({
      days: 1,
      error: null,
    });
    expect(extractDurationFromQuery("trip for 5 days")).toEqual({
      days: 5,
      error: null,
    });
    expect(extractDurationFromQuery("2 semaines au Japon")).toEqual({
      days: 14,
      error: null,
    });
    expect(extractDurationFromQuery("1 week in Greece")).toEqual({
      days: 7,
      error: null,
    });
    expect(extractDurationFromQuery("16 jours au Maroc")).toEqual({
      days: null,
      error: "⛔ Les itinéraires sont limités à 15 jours maximum.",
    });

    const msg =
      "⛔ Les itinéraires sont limités à 15 jours maximum. Indiquez un nombre de jours ou de semaines (ex: 10 jours, 2 semaines).";
    expect(extractDurationFromQuery("1 mois en Thaïlande")).toEqual({
      days: null,
      error: msg,
    });
    expect(extractDurationFromQuery("2 months in USA")).toEqual({
      days: null,
      error: msg,
    });
  });

  test("stripDiacritics", () => {
    expect(stripDiacritics("Àççents Éléphants São Tomé")).toBe(
      "Accents Elephants Sao Tome"
    );
  });

  test("isRoadtripRelated", () => {
    expect(isRoadtripRelated("Road trip de 10 jours en Italie")).toBe(true);
    expect(isRoadtripRelated("Voyage 2 semaines au Japon")).toBe(true);
    expect(isRoadtripRelated("Trip for 5 days in Spain")).toBe(true);
    expect(isRoadtripRelated("je veux de l’aide technique")).toBe(false);
    expect(isRoadtripRelated("Itinéraire de 7 jours à Montréal")).toBe(true);
  });
});

// ------------------------------------------------------------
// 2) TESTS SERVICE AI (réel) avec OpenAI/axios mockés
// ------------------------------------------------------------
describe("SERVICE aiService.generateRoadtripAdvisor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("erreur si requête non liée au roadtrip", async () => {
    // On force isRoadtripRelated à false
    jest
      .spyOn(require("../utils/roadtripValidation"), "isRoadtripRelated")
      .mockReturnValueOnce(false);
    const { generateRoadtripAdvisor } = require("../services/aiService");
    const res = await generateRoadtripAdvisor({ query: "aide technique" });
    expect(res).toEqual({
      type: "error",
      message: "Requête non liée à un roadtrip.",
    });
  });

  test("erreur si durée > 15 jours", async () => {
    jest
      .spyOn(require("../utils/roadtripValidation"), "isRoadtripRelated")
      .mockReturnValue(true);
    jest
      .spyOn(require("../utils/durationExtractor"), "extractDurationFromQuery")
      .mockReturnValueOnce({ days: 21, error: null });
    const { generateRoadtripAdvisor } = require("../services/aiService");
    const res = await generateRoadtripAdvisor({ query: "voyage 3 weeks" });
    expect(res).toEqual({
      type: "error",
      message: "⛔ Les itinéraires sont limités à 15 jours maximum.",
    });
  });

  test("succès OpenAI + météo + cache", async () => {
    jest
      .spyOn(require("../utils/roadtripValidation"), "isRoadtripRelated")
      .mockReturnValue(true);
    jest
      .spyOn(require("../utils/durationExtractor"), "extractDurationFromQuery")
      .mockReturnValue({ days: 7, error: null });

    // OpenAI -> JSON valide
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              type: "roadtrip_itinerary",
              destination: "Italie",
              duree_recommandee: "7 jours",
              budget_estime: {
                total: "1000€",
                transport: "200€",
                hebergement: "400€",
                nourriture: "300€",
                activites: "100€",
              },
              saison_ideale: "Printemps",
              points_interet: ["Rome", "Florence"],
              itineraire: [
                {
                  jour: 1,
                  lieu: "Rome",
                  description: "Colisée",
                  activites: ["Colisée"],
                  distance: "0 km",
                  temps_conduite: "0h",
                  hebergement: "Hôtel",
                },
              ],
              conseils: ["Réserver à l’avance"],
            }),
          },
        },
      ],
    });

    // axios.get: 1) geocoding 2) forecast
    axios.__mock.get
      .mockResolvedValueOnce({
        data: { results: [{ latitude: 41.9, longitude: 12.5 }] },
      })
      .mockResolvedValueOnce({
        data: {
          daily: {
            temperature_2m_max: [25],
            temperature_2m_min: [16],
            precipitation_sum: [2],
          },
        },
      });

    const { generateRoadtripAdvisor } = require("../services/aiService");

    // 1er appel => OpenAI + 2 appels axios.get
    const res1 = await generateRoadtripAdvisor({
      query: "Roadtrip 7 jours en Italie",
    });
    expect(res1.type).toBe("roadtrip_itinerary");
    expect(res1.destination).toBe("Italie");
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(axios.__mock.get).toHaveBeenCalledTimes(2);

    // 2e appel (même query) => cache (pas d’appel OpenAI en plus)
    const res2 = await generateRoadtripAdvisor({
      query: "Roadtrip 7 jours en Italie",
    });
    expect(res2.destination).toBe("Italie");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

// ------------------------------------------------------------
// 3) TESTS SERVICE dataService (réel) avec axios.create mocké
// ------------------------------------------------------------
describe("SERVICE dataService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const ds = require("../services/dataService");

  test("createMessage OK", async () => {
    axios.__mock.post.mockResolvedValueOnce({
      data: { id: "m1", content: "hello" },
    });
    const data = await ds.createMessage({
      userId: "u1",
      conversationId: "c1",
      role: "user",
      content: "hi",
    });
    expect(data).toEqual({ id: "m1", content: "hello" });
    expect(axios.__mock.post).toHaveBeenCalledWith(
      "/api/messages",
      expect.any(Object)
    );
  });

  test("createMessage -> erreur HTTP", async () => {
     axios.__mock.post.mockRejectedValueOnce({
      message: "BOOM",
      response: { status: 500, data: { err: true } },
    });
    await expect(
      ds.createMessage({
        userId: "u1",
        conversationId: "c1",
        role: "user",
        content: "x",
      })
    ).rejects.toThrow(/Impossible de créer le message/);
  });

  test("getMessagesByUser OK", async () => {
    axios.__mock.get.mockResolvedValueOnce({ data: [{ id: "m1" }] });
    const res = await ds.getMessagesByUser("u1");
    expect(res).toEqual([{ id: "m1" }]);
    expect(axios.__mock.get).toHaveBeenCalledWith("/api/messages/user/u1");
  });

  test("getMessagesByConversation OK", async () => {
    axios.__mock.get.mockResolvedValueOnce({ data: [{ id: "m2" }] });
    const res = await ds.getMessagesByConversation("u1", "c1");
    expect(res).toEqual([{ id: "m2" }]);
    expect(axios.__mock.get).toHaveBeenCalledWith(
      "/api/messages/conversation/c1",
      { params: { userId: "u1" } }
    );
  });

  test("deleteMessagesByUser OK", async () => {
    axios.__mock.delete.mockResolvedValueOnce({ data: { deletedCount: 3 } });
    const res = await ds.deleteMessagesByUser("u1");
    expect(res).toEqual({ deletedCount: 3 });
    expect(axios.__mock.delete).toHaveBeenCalledWith("/api/messages/user/u1");
  });

  test("deleteConversation OK", async () => {
    axios.__mock.delete.mockResolvedValueOnce({ data: { deletedCount: 2 } });
    const res = await ds.deleteConversation("u1", "c1");
    expect(res).toEqual({ deletedCount: 2 });
    expect(axios.__mock.delete).toHaveBeenCalledWith(
      "/api/messages/conversation/c1",
      { params: { userId: "u1" } }
    );
  });
});

// ------------------------------------------------------------
// 4) TESTS CONTROLEUR (unitaires) avec services mockés
//    → on utilise isolateModules + doMock pour importer un contrôleur
//      avec ses dépendances déjà mockées
// ------------------------------------------------------------
describe("CONTROLLER aiController (unit)", () => {
  let aiController, generateRoadtripAdvisorMock, dataServiceMock;

  beforeEach(() => {
    jest.resetModules();

    generateRoadtripAdvisorMock = jest.fn();
    dataServiceMock = {
      createMessage: jest.fn(),
      getMessagesByUser: jest.fn(),
      getMessagesByConversation: jest.fn(),
      deleteMessagesByUser: jest.fn(),
      deleteConversation: jest.fn(),
    };

    jest.doMock("../services/aiService.js", () => ({
      generateRoadtripAdvisor: generateRoadtripAdvisorMock,
    }));
    jest.doMock("../services/dataService", () => dataServiceMock);

    jest.isolateModules(() => {
      aiController = require("../controllers/aiController");
    });
  });

  const mockReqRes = (over = {}) => {
    const req = {
      body: {},
      params: {},
      user: { userId: "u1", role: "premium" },
      id: "req-123",
      ip: "127.0.0.1",
      get: () => "jest",
      ...over,
    };
    const res = {
      statusCode: 200,
      jsonPayload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.jsonPayload = payload;
        return this;
      },
    };
    return { req, res };
  };

  test("askRoadtripAdvisor OK", async () => {
    generateRoadtripAdvisorMock.mockResolvedValueOnce({
      type: "roadtrip_itinerary",
      destination: "Italie",
    });
    const { req, res } = mockReqRes({
      body: { prompt: "Roadtrip 7 jours Italie" },
    });
    await aiController.askRoadtripAdvisor(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload).toEqual({
      type: "roadtrip_itinerary",
      destination: "Italie",
    });
  });

  test("askRoadtripAdvisor -> erreur mais renvoie status 200 + type error", async () => {
    generateRoadtripAdvisorMock.mockRejectedValueOnce(new Error("OpenAI KO"));
    const { req, res } = mockReqRes({ body: { prompt: "..." } });
    await aiController.askRoadtripAdvisor(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.type).toBe("error");
  });

  test("saveConversation 400 si data incomplètes", async () => {
    const { req, res } = mockReqRes({ body: { role: "user", content: "hi" } }); // pas de conversationId
    await aiController.saveConversation(req, res);
    expect(res.statusCode).toBe(400);
  });

  test("saveConversation 201 si OK", async () => {
    dataServiceMock.createMessage.mockResolvedValueOnce({ id: "m1" });
    const { req, res } = mockReqRes({
      body: { role: "user", content: "hi", conversationId: "c1" },
    });
    await aiController.saveConversation(req, res);
    expect(res.statusCode).toBe(201);
    expect(res.jsonPayload).toEqual({ success: true, message: { id: "m1" } });
  });

  test("getHistory 200 + groupement", async () => {
    dataServiceMock.getMessagesByUser.mockResolvedValueOnce([
      { id: "m1", conversationId: "c1" },
      { id: "m2", conversationId: "c1" },
      { id: "m3", conversationId: "c2" },
    ]);
    const { req, res } = mockReqRes();
    await aiController.getHistory(req, res);
    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.jsonPayload)).toEqual(["c1", "c2"]);
  });

  test("deleteHistory 401 si pas user", async () => {
    const { req, res } = mockReqRes({ user: null });
    await aiController.deleteHistory(req, res);
    expect(res.statusCode).toBe(401);
  });

  test("getConversationById 400 si id manquant", async () => {
    const { req, res } = mockReqRes({ params: {} });
    await aiController.getConversationById(req, res);
    expect(res.statusCode).toBe(400);
  });

  test("deleteConversation 401 si non auth", async () => {
    const { req, res } = mockReqRes({ params: { id: "c1" }, user: null });
    await aiController.deleteConversation(req, res);
    expect(res.statusCode).toBe(401);
  });
});

// ------------------------------------------------------------
// 5) TESTS ROUTES (supertest) avec services + middlewares mockés
// ------------------------------------------------------------
describe("ROUTES /api/ai/* (supertest)", () => {
  let app;

  beforeEach(() => {
    jest.resetModules();

    // Mocker les middlewares d'auth pour laisser passer
    jest.doMock("../middlewares/authMiddleware", () => ({
      authMiddleware: (req, _res, next) => {
        req.user = { userId: "u1", role: "premium" };
        next();
      },
      roleMiddleware: () => (_req, _res, next) => next(),
    }));

    // Mocker les services appelés par les handlers
    jest.doMock("../services/aiService.js", () => ({
      generateRoadtripAdvisor: jest
        .fn()
        .mockResolvedValue({
          type: "roadtrip_itinerary",
          destination: "Italie",
        }),
    }));
    jest.doMock("../services/dataService", () => ({
      createMessage: jest.fn().mockResolvedValue({ id: "m1" }),
      getMessagesByUser: jest.fn().mockResolvedValue([
        { id: "m1", conversationId: "c1" },
        { id: "m2", conversationId: "c2" },
      ]),
      getMessagesByConversation: jest.fn().mockResolvedValue([{ id: "m1" }]),
      deleteMessagesByUser: jest.fn().mockResolvedValue({ deletedCount: 3 }),
      deleteConversation: jest.fn().mockResolvedValue({ deletedCount: 2 }),
    }));

    jest.isolateModules(() => {
      const express = require("express");
      const aiRoutes = require("../routes/aiRoutes");
      app = express();
      app.use(express.json());
      app.use("/api/ai", aiRoutes);
    });
  });

  test("POST /api/ai/ask", async () => {
    const request = require("supertest");
    const res = await request(app)
      .post("/api/ai/ask")
      .send({ prompt: "Roadtrip 7 jours Italie" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      type: "roadtrip_itinerary",
      destination: "Italie",
    });
  });

  test("POST /api/ai/save", async () => {
    const request = require("supertest");
    const res = await request(app)
      .post("/api/ai/save")
      .send({ role: "user", content: "hello", conversationId: "c1" });
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true, message: { id: "m1" } });
  });

  test("GET /api/ai/history", async () => {
    const request = require("supertest");
    const res = await request(app).get("/api/ai/history");
    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(["c1", "c2"]);
  });

  test("GET /api/ai/conversation/:id", async () => {
    const request = require("supertest");
    const res = await request(app).get("/api/ai/conversation/c1");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: "m1" }]);
  });

  test("DELETE /api/ai/conversation/:id", async () => {
    const request = require("supertest");
    const res = await request(app).delete("/api/ai/conversation/c1");
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ------------------------------------------------------------
// 6) TEST INTÉGRATION "réel" sur index.js (serveurs réels, ports 0)
// ------------------------------------------------------------
describe("INTEGRATION index.js (app réelle)", () => {
  let app, server, metricsServer;

  beforeAll(() => {
    jest.resetModules();

    // bypass auth/role
    jest.doMock("../middlewares/authMiddleware", () => ({
      authMiddleware: (req, _res, next) => {
        req.user = { userId: "u1", role: "premium" };
        next();
      },
      roleMiddleware: () => (_req, _res, next) => next(),
    }));

    // mock du service IA pour contrôle
    jest.doMock("../services/aiService.js", () => ({
      generateRoadtripAdvisor: jest
        .fn()
        .mockResolvedValue({
          type: "roadtrip_itinerary",
          destination: "Italie",
        }),
    }));

    jest.doMock('../middlewares/metricsLogger', () => (req, res, next) => next());

    jest.isolateModules(() => {
      ({ app, server, metricsServer } = require("../index.js"));
    });
  });

  afterAll(async () => {
    await new Promise((res) => server.close(res));
    await new Promise((res) => metricsServer.close(res));
  });

  test("POST /api/ai/ask -> 200", async () => {
    const request = require("supertest");
    const res = await request(app)
      .post("/api/ai/ask")
      .send({ prompt: "Roadtrip 7 jours en Italie" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      type: "roadtrip_itinerary",
      destination: "Italie",
    });
  });
});
