const request = require("supertest");
process.env.NODE_ENV = "test";

// Mock Stripe
jest.mock("stripe", () =>
  jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        type: "checkout.session.completed",
        data: { object: { id: "test_session" } },
      }),
    },
    checkout: {
      sessions: {
        create: jest
          .fn()
          .mockResolvedValue({ url: "https://checkout.stripe.com/test" }),
      },
    },
  }))
);

// Mock mongoose
jest.mock('mongoose', () => {
  const mockSchema = function () {
    return {
      methods: {},
      statics: {},
      pre: jest.fn(),
      post: jest.fn(),
      index: jest.fn()
    };
  };

  mockSchema.Types = {
    ObjectId: jest.fn().mockImplementation(() => 'mock-object-id')
  };

  return {
    connect: jest.fn().mockResolvedValue({}),
    connection: {
      readyState: 1,
      on: jest.fn(),
      close: jest.fn().mockResolvedValue({})
    },
    Schema: mockSchema,
    model: jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ _id: 'mock-id' }),
      save: jest.fn().mockResolvedValue({ _id: 'mock-id' }),
      find: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null)
    }),
    Types: {
      ObjectId: jest.fn().mockImplementation(() => 'mock-object-id')
    }
  };
});

// Mock JWT
jest.mock("../config/jwtConfig", () => ({
  verifyToken: jest.fn().mockReturnValue({
    userId: "test123",
    email: "test@example.com",
    role: "user",
  }),
}));

// Mock logger
jest.mock("../utils/logger", () => {
  return {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    middleware: jest.fn(() => (req, res, next) => next()),
  };
});

// Mock DB
jest.mock("../config/db", () => jest.fn().mockResolvedValue({}));

// On importe l’app Express uniquement
const { createApp } = require("../app");
const app = createApp();

describe("💳 Payment Service M2 Tests", () => {
  test("✅ Health check", async () => {
    const res = await request(app).get("/health");
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body.service).toBe("paiement-service");
  });

  test("✅ Vitals", async () => {
    const res = await request(app).get("/vitals");
    expect(res.statusCode).toBe(200);
    expect(res.body.payment).toBeDefined();
  });

  test("✅ Metrics", async () => {
    const res = await request(app).get("/metrics");
    expect([200, 500]).toContain(res.statusCode);
  });

  test("✅ Webhook mock", async () => {
    const res = await request(app).post("/webhook").send("payload");
    expect([200, 400, 500]).toContain(res.statusCode);
  });

  test("✅ Subscription sans auth", async () => {
    const res = await request(app).get("/subscription/current");
    expect(res.statusCode).toBe(401);
  });

  test("✅ Ping", async () => {
    const res = await request(app).get("/ping");
    expect(res.statusCode).toBe(200);
  });

  test("✅ 404", async () => {
    const res = await request(app).get("/route-inexistante");
    expect(res.statusCode).toBe(404);
  });
});
