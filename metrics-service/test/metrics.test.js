// test/metrics.test.js
// =====================================================================
// ENV
// =====================================================================
process.env.NODE_ENV = "test";

// =====================================================================
// Mocks
// =====================================================================

// config centralisé
jest.mock("../src/config", () => ({
  SERVICE_NAME: "metrics-service",
  SERVICE_VERSION: "1.0.0-test",
  NODE_ENV: "test",
  FRONTEND_URL: "http://localhost:3000",
  PROMETHEUS_URL: "http://prometheus.local:9090",
}));

// logger silencieux + middleware no-op
jest.mock("../utils/logger", () => {
  const mw = () => (req, _res, next) => {
    req.id = req.id || "req-test";
    next();
  };
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    performance: jest.fn(),
    middleware: () => mw(),
  };
});

// prom-client mock sûr (pas de state global réel)
jest.mock("prom-client", () => {
  const registerCalls = [];
  const fakeRegister = {
    registerMetric: jest.fn((m) => registerCalls.push(m)),
    metrics: jest.fn(
      async () =>
        "# HELP test_metric Help text\n# TYPE test_metric counter\ntest_metric{} 1\n"
    ),
    contentType: "text/plain; version=0.0.4; charset=utf-8",
  };

  class FakeMetric {
    constructor(cfg) {
      this.cfg = cfg;
      this.inc = jest.fn();
      this.observe = jest.fn();
      this.set = jest.fn();
      this.labels = jest.fn(() => this);
    }
  }

  return {
    Registry: jest.fn(() => fakeRegister),
    Counter: FakeMetric,
    Histogram: FakeMetric,
    Gauge: FakeMetric,
    collectDefaultMetrics: jest.fn(),
    register: fakeRegister,
    __mock: { registerCalls, fakeRegister },
  };
});

// axios mocké pour les appels Prometheus
jest.mock("axios", () => {
  return {
    get: jest.fn(),
    __mock: { get: jest.fn() },
  };
});

const promClient = require("prom-client");
const axios = require("axios");
const logger = require("../utils/logger");

// =====================================================================
// 1) Core metrics: createMetrics
// =====================================================================
describe("metrics.createMetrics", () => {
  beforeEach(() => jest.clearAllMocks());

  test("crée register + 4 métriques + collectDefaultMetrics", async () => {
    const { createMetrics } = require("../src/metrics");

    const { register, metrics } = createMetrics();

    expect(promClient.collectDefaultMetrics).toHaveBeenCalledTimes(1);
    expect(promClient.collectDefaultMetrics).toHaveBeenCalledWith({ register });

    // 4 registerMetric calls
    expect(register.registerMetric).toHaveBeenCalledTimes(4);

    // noms & labels attendus
    expect(metrics.httpRequestDuration.cfg.name).toBe(
      "http_request_duration_seconds"
    );
    expect(metrics.httpRequestsTotal.cfg.name).toBe("http_requests_total");
    expect(metrics.prometheusConnectionsGauge.cfg.name).toBe(
      "prometheus_connections_active"
    );
    expect(metrics.servicesStatusGauge.cfg.name).toBe(
      "monitored_services_status"
    );

    expect(metrics.httpRequestDuration.cfg.labelNames).toEqual([
      "method",
      "route",
      "status_code",
    ]);
    expect(metrics.httpRequestsTotal.cfg.labelNames).toEqual([
      "method",
      "route",
      "status_code",
    ]);
  });
});

// =====================================================================
// 2) Middleware: metricsLogger
// =====================================================================
describe("middlewares/metricsLogger", () => {
  beforeEach(() => jest.clearAllMocks());

  const getReqResNext = (overReq = {}, overRes = {}) => {
    const EventEmitter = require("events");
    const req = {
      method: "GET",
      path: "/ping",
      route: { path: "/ping" },
      id: "req-1",
      ip: "127.0.0.1",
      get: (h) => (h === "User-Agent" ? "jest" : undefined),
      app: {
        locals: {
          metrics: {
            httpRequestDuration: { observe: jest.fn() },
            httpRequestsTotal: { inc: jest.fn() },
          },
          currentConnections: 0,
        },
      },
      ...overReq,
    };
    const res = new EventEmitter();
    res.statusCode = 200;
    Object.assign(res, overRes);
    const next = jest.fn();
    return { req, res, next };
  };

  test("observe + inc appelés avec bons labels + connexions décrémentées", () => {
    const mw = require("../src/middlewares/metricsLogger")(logger);
    const { req, res, next } = getReqResNext();

    const nowSpy = jest
      .spyOn(Date, "now")
      .mockReturnValueOnce(1000) // start
      .mockReturnValueOnce(1100); // finish -> 100ms

    mw(req, res, next);
    expect(next).toHaveBeenCalled();

    res.emit("finish");

    const labels = { method: "GET", route: "/ping", status_code: 200 };
    expect(req.app.locals.metrics.httpRequestsTotal.inc).toHaveBeenCalledWith(
      labels
    );
    expect(
      req.app.locals.metrics.httpRequestDuration.observe
    ).toHaveBeenCalledTimes(1);

    const [obsLabels, duration] =
      req.app.locals.metrics.httpRequestDuration.observe.mock.calls[0];
    expect(obsLabels).toEqual(labels);
    expect(typeof duration).toBe("number");

    expect(req.app.locals.currentConnections).toBe(0);
    nowSpy.mockRestore();
  });

  test("log performance si durée > 1s", () => {
    const mw = require("../src/middlewares/metricsLogger")(logger);
    const { req, res, next } = getReqResNext();

    const nowSpy = jest
      .spyOn(Date, "now")
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2500); // 1.5s

    mw(req, res, next);
    res.emit("finish");

    expect(logger.performance).toHaveBeenCalledTimes(1);
    const perfPayload = logger.performance.mock.calls[0][1];
    expect(perfPayload.method).toBe("GET");
    expect(perfPayload.path).toBe("/ping");
    expect(perfPayload.statusCode).toBe(200);

    nowSpy.mockRestore();
  });
});

// =====================================================================
// 3) Middlewares: errorHandler (notFound + global)
// =====================================================================
describe("middlewares/errorHandler", () => {
  beforeEach(() => jest.clearAllMocks());

  const getReqRes = (overReq = {}) => {
    const req = {
      method: "GET",
      path: "/unknown",
      id: "req-42",
      ip: "127.0.0.1",
      get: (h) => (h === "User-Agent" ? "jest" : undefined),
      ...overReq,
    };
    const res = {
      statusCode: 200,
      body: null,
      status(c) {
        this.statusCode = c;
        return this;
      },
      json(p) {
        this.body = p;
        return this;
      },
    };
    return { req, res };
  };

  test("notFound -> 404 + body clair", () => {
    const factory = require("../src/middlewares/errorHandler");
    const { notFound } = factory(logger);

    const { req, res } = getReqRes();
    notFound(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/Route non trouvée/);
    expect(res.body.service).toBe("metrics-service");
    expect(Array.isArray(res.body.availableRoutes)).toBe(true);
  });

  test("global -> 500 + message en mode test", () => {
    const factory = require("../src/middlewares/errorHandler");
    const { global } = factory(logger);

    const { req, res } = getReqRes();
    const err = new Error("BOOM");
    global(err, req, res, () => {});

    expect(res.statusCode).toBe(500);
    expect(res.body.service).toBe("metrics-service");
    expect(res.body.message).toBe("BOOM");
  });
});

// =====================================================================
// 4) Routes + App (Supertest)
// =====================================================================
describe("routes + app (supertest)", () => {
  let app;
  const request = require("supertest");

  beforeEach(() => {
    jest.clearAllMocks();

    const axios = require("axios");
    axios.get.mockReset();
    axios.get.mockResolvedValue({ data: { data: { result: [] } } });

    const { createApp } = require("../src/app");
    app = createApp();
  });

  test("GET /metrics -> 200 + text/plain + HELP", async () => {
    const res = await request(app).get("/metrics");
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/plain/);
    expect(res.text).toMatch(/# HELP/);
  });

  test("GET /health -> 200 + payload", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.service).toBe("metrics-service");
  });

  test("GET /vitals -> 200 + payload", async () => {
    const res = await request(app).get("/vitals");
    expect(res.statusCode).toBe(200);
    expect(res.body.service).toBe("metrics-service");
    expect(typeof res.body.uptime).toBe("number");
    expect(typeof res.body.memory).toBe("object");
  });

  test("GET /ping -> 200 + pong", async () => {
    const res = await request(app).get("/ping");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toMatch(/pong/);
    expect(res.body.service).toBe("metrics-service");
  });

  test("GET / -> 200 + home json", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.body.service).toMatch(/Metrics Service/);
    expect(Array.isArray(res.body.endpoints)).toBe(true);
  });

  test("GET /api/dashboard -> succès (Prometheus OK)", async () => {
    // 1ère requête: up
    axios.get
      .mockResolvedValueOnce({
        data: {
          data: {
            result: [
              {
                metric: { job: "service-a", instance: "a:1" },
                value: [0, "1"],
              },
              {
                metric: { job: "service-b", instance: "b:1" },
                value: [0, "0"],
              },
            ],
          },
        },
      })
      // 2ème requête: rate(http_requests_total[5m])
      .mockResolvedValueOnce({
        data: {
          data: {
            result: [
              { metric: { job: "service-a" }, value: [0, "3.14"] },
              { metric: { job: "service-b" }, value: [0, "1.00"] },
            ],
          },
        },
      });

    const res = await request(app).get("/api/dashboard");
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.services.up).toBe(1);
    expect(res.body.data.services.down).toBe(1);
    expect(res.body.data.requests.totalPerSecond).toBe("4.14");
    // détail
    expect(res.body.data.details.length).toBe(2);
  });

  test("GET /api/dashboard -> tolère erreurs Prometheus (fallback)", async () => {
    // up -> throw ; rate -> OK vide
    axios.get
      .mockRejectedValueOnce(new Error("prometheus down"))
      .mockResolvedValueOnce({ data: { data: { result: [] } } });

    const res = await request(app).get("/api/dashboard");
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.services.up).toBe(0);
  });

  test("GET /api/services/status -> succès", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: {
          result: [
            { metric: { job: "svc-a", instance: "a:1" }, value: [0, "1"] },
            { metric: { job: "svc-b", instance: "b:1" }, value: [0, "0"] },
          ],
        },
      },
    });
    const res = await request(app).get("/api/services/status");
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.services.length).toBe(2);
    expect(res.body.services[0]).toHaveProperty("name");
    expect(res.body.services[0]).toHaveProperty("status");
  });

  test("GET /api/services/status -> erreur 500 quand Prometheus KO", async () => {
    axios.get.mockRejectedValueOnce(new Error("boom"));
    const res = await request(app).get("/api/services/status");
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
