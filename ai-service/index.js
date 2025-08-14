require("dotenv").config();
const express = require("express");
const cors = require("cors");
const logger = require("./utils/logger");
const { updateServiceHealth, updateActiveConnections, updateExternalServiceHealth } = require("./metrics");

const aiRoutes = require("./routes/aiRoutes");
const systemRoutes = require("./routes/systemRoutes");
const metricsLogger = require("./middlewares/metricsLogger");
const errorHandler = require("./middlewares/errorHandler");

const app = express();
const PORT = process.env.PORT || 5003;
const METRICS_PORT = process.env.METRICS_PORT || 9090;
const SERVICE_NAME = "ai-service";

logger.info(`🔥 Lancement du ${SERVICE_NAME}...`, { port: PORT });

// Vérification clé API
if (!process.env.OPENAI_API_KEY) {
  logger.error("❌ OPENAI_API_KEY manquante!", { service: SERVICE_NAME });
  updateServiceHealth(SERVICE_NAME, false);
  process.exit(1);
}

// Middlewares
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(logger.middleware());
app.use(metricsLogger);

// Routes
app.use(systemRoutes);
app.use("/api/ai", aiRoutes);

// Gestion erreurs
app.use(errorHandler);

// Serveur principal
const server = app.listen(PORT, () => {
  logger.info(`🤖 ${SERVICE_NAME} démarré sur le port ${PORT}`);
  updateServiceHealth(SERVICE_NAME, true);
  updateExternalServiceHealth("openai", true);
});

// Serveur métriques séparé
const metricsApp = express();
metricsApp.use(systemRoutes);
const metricsServer = metricsApp.listen(METRICS_PORT, () => {
  logger.info(`📊 Metrics server running sur ${METRICS_PORT}`);
});

// Arrêt
function shutdown(signal) {
  logger.info(`🔄 Arrêt ${SERVICE_NAME}`, { signal });
  updateServiceHealth(SERVICE_NAME, false);
  updateActiveConnections(0);
  Promise.all([
    new Promise(res => server.close(res)),
    new Promise(res => metricsServer.close(res))
  ]).then(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

module.exports = { app, server, metricsServer };