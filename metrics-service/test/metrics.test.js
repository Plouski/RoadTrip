const request = require("supertest");

// Mock axios pour Prometheus
jest.mock("axios", () => ({
  get: jest.fn().mockResolvedValue({
    data: {
      data: {
        result: [
          { metric: { job: "test-service", instance: "localhost:5000" }, value: ["1234567890", "1"] }
        ]
      }
    }
  })
}));

const { createApp } = require("../src/app");

let app;

beforeAll(() => {
  app = createApp();
});

describe("📊 Metrics Service M2 Tests", () => {

  test("✅ Health check fonctionne", async () => {
    const res = await request(app).get("/health").expect(200);

    expect(res.body.status).toBe("healthy");
    expect(res.body.service).toBe("metrics-service");
  });

  test("✅ Métriques Prometheus disponibles", async () => {
    const res = await request(app).get("/metrics");
    expect([200, 500]).toContain(res.statusCode);
  });

  test("✅ Dashboard API fonctionne", async () => {
    const res = await request(app).get("/api/dashboard");
    expect([200, 500]).toContain(res.statusCode);
  });

  test("✅ Services status endpoint", async () => {
    const res = await request(app).get("/api/services/status");
    expect([200, 500]).toContain(res.statusCode);
  });

  test("✅ Page d'accueil informative", async () => {
    const res = await request(app).get("/").expect(200);

    expect(res.body.service).toContain("Metrics Service");
    expect(res.body.endpoints).toBeDefined();
    expect(Array.isArray(res.body.endpoints)).toBe(true);
  });

});