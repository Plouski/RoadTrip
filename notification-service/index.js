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

/* App */
const app = express();

const mailjetConfigured = !!(
  process.env.MAILJET_API_KEY && process.env.MAILJET_API_SECRET
);
const smsConfigured = !!(
  process.env.FREE_MOBILE_USERNAME && process.env.FREE_MOBILE_API_KEY
);
updateExternalServiceHealth("mailjet", mailjetConfigured);
updateExternalServiceHealth("free_mobile", smsConfigured);

app.use(helmet());
app.use(
  cors({
    origin: ["https://road-trip-iota.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "x-api-key"],
    credentials: false,
    optionsSuccessStatus: 200,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(logger.middleware());

let currentConnections = 0;
app.use((req, res, next) => {
  const start = Date.now();
  currentConnections++;
  updateActiveConnections(currentConnections);

  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    currentConnections--;
    updateActiveConnections(currentConnections);
    httpRequestDuration.observe(
      { method: req.method, route: req.path, status_code: res.statusCode },
      duration
    );
    httpRequestsTotal.inc({
      method: req.method,
      route: req.path,
      status_code: res.statusCode,
    });
  });
  next();
});

app.use("/", routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route inconnue",
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  logger.error("💥 Erreur non gérée", {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  if (err.message && err.message.includes("pathToRegexpError")) {
    return res.status(400).json({
      success: false,
      error: "URL invalide",
      details: err.message,
    });
  }

  res.status(500).json({
    success: false,
    error: "Erreur interne du serveur",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

/* Démarrage */
function startServer() {
  const server = app.listen(PORT, "0.0.0.0", () => {
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

  function gracefulShutdown(signal) {
    logger.info(`🔄 Arrêt ${SERVICE_NAME}`, { signal });
    updateServiceHealth(SERVICE_NAME, false);
    updateActiveConnections(0);

    server.close(() => {
      logger.info("📴 Serveur fermé");
      logger.info(`✅ ${SERVICE_NAME} arrêté proprement`);
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("Timeout d'arrêt, arrêt forcé");
      process.exit(1);
    }, 10000);
  }

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  return { server };
}

module.exports = { app, startServer, SERVICE_NAME, PORT };

if (process.env.NODE_ENV !== "test") {
  startServer();
}