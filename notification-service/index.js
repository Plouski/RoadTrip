require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const logger = require("./utils/logger");
const routes = require("./routes");
const {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  updateActiveConnections,
  updateExternalServiceHealth,
  updateServiceHealth,
} = require("./metrics");

const SERVICE_NAME = "notification-service";
const PORT = parseInt(process.env.PORT || "5005", 10);
const METRICS_PORT = parseInt(process.env.METRICS_PORT || "9005", 10);

/* App */
const app = express();

// Vérif providers externes -> maj métriques
const mailjetConfigured = !!(process.env.MAILJET_API_KEY && process.env.MAILJET_API_SECRET);
const smsConfigured = !!(process.env.FREE_MOBILE_USERNAME && process.env.FREE_MOBILE_API_KEY);
updateExternalServiceHealth("mailjet", mailjetConfigured);
updateExternalServiceHealth("free_mobile", smsConfigured);

// Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "x-api-key"],
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(logger.middleware());

// Métriques de requêtes
let currentConnections = 0;
app.use((req, res, next) => {
  const start = Date.now();
  currentConnections++;
  updateActiveConnections(currentConnections);

  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    currentConnections--;
    updateActiveConnections(currentConnections);
    httpRequestDuration.observe({ method: req.method, route: req.path, status_code: res.statusCode }, duration);
    httpRequestsTotal.inc({ method: req.method, route: req.path, status_code: res.statusCode });
  });
  next();
});

// Routes applicatives
app.use("/", routes);

/* Démarrage */
function startServer() {
  // Serveur principal
  const server = app.listen(PORT, () => {
    logger.info(`✅ ${SERVICE_NAME} démarré`, {
      port: PORT,
      environment: process.env.NODE_ENV || "development",
      logLevel: logger.level,
    });
    logger.info(`❤️ Health:  http://localhost:${PORT}/health`);
    logger.info(`📈 Vitals:  http://localhost:${PORT}/vitals`);
    logger.info(`📊 Metrics: http://localhost:${PORT}/metrics`);
    updateServiceHealth(SERVICE_NAME, true);
  });

  // Serveur dédié metrics
  const metricsApp = express();
  metricsApp.get("/metrics", async (_req, res) => {
    try {
      res.set("Content-Type", register.contentType);
      res.end(await register.metrics());
    } catch (err) {
      logger.error("Erreur génération métriques", err);
      res.status(500).json({ error: "Failed to generate metrics" });
    }
  });
  metricsApp.get("/health", (_req, res) =>
    res.json({ status: "healthy", service: `${SERVICE_NAME}-metrics` })
  );

  const metricsServer = metricsApp.listen(METRICS_PORT, () => {
    logger.info(`📊 Metrics server running`, { port: METRICS_PORT });
  });

  // Arrêt
  function gracefulShutdown(signal) {
    logger.info(`🔄 Arrêt ${SERVICE_NAME}`, { signal });
    updateServiceHealth(SERVICE_NAME, false);
    updateActiveConnections(0);

    Promise.all([
      new Promise((r) => server.close(() => { logger.info("📴 Serveur principal fermé"); r(); })),
      new Promise((r) => metricsServer.close(() => { logger.info("📴 Serveur métriques fermé"); r(); })),
    ])
      .then(() => { logger.info(`✅ ${SERVICE_NAME} arrêté proprement`); process.exit(0); })
      .catch((err) => { logger.error("Erreur lors de l'arrêt", err); process.exit(1); });

    setTimeout(() => { logger.error("Timeout d'arrêt, arrêt forcé"); process.exit(1); }, 10000);
  }

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  return { server, metricsServer };
}

module.exports = { app, startServer, SERVICE_NAME, PORT, METRICS_PORT };

if (process.env.NODE_ENV !== "test") {
  startServer();
}