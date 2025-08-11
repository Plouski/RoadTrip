require("dotenv").config();
const express = require("express");
const { createApp } = require("./app");
const logger = require("./utils/logger");
const mongoose = require("mongoose");
const { register, updateServiceHealth, updateActiveConnections, updateExternalServiceHealth } = require("./metrics");

const SERVICE_NAME = process.env.SERVICE_NAME || "paiement-service";
const PORT = parseInt(process.env.PORT || "5004", 10);
const METRICS_PORT = parseInt(process.env.METRICS_PORT || "9004", 10);
const NODE_ENV = process.env.NODE_ENV || "development";

const app = createApp();
let server, metricsServer;

// Démarrage seulement hors test
if (NODE_ENV !== "test") {
  logger.info(`🚀 Démarrage du ${SERVICE_NAME}...`);

  server = app.listen(PORT, () => {
    logger.info(`💳 ${SERVICE_NAME} démarré sur le port ${PORT}`);
    const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;
    updateExternalServiceHealth("stripe", stripeConfigured);
    updateServiceHealth(SERVICE_NAME, true);
  });

  // Serveur métriques séparé
  const metricsApp = express();
  metricsApp.get("/metrics", async (_req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  });
  metricsApp.get("/health", (_req, res) => {
    res.json({ status: "healthy", service: `${SERVICE_NAME}-metrics` });
  });
  metricsServer = metricsApp.listen(METRICS_PORT, () => {
    logger.info(`📊 Serveur de métriques actif sur ${METRICS_PORT}`);
  });
}

// Arrêt
function shutdown(signal) {
  logger.warn(`🛑 Arrêt ${SERVICE_NAME} suite à ${signal}`);
  updateServiceHealth(SERVICE_NAME, false);
  updateActiveConnections(0);

  const finish = () => {
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close(() => process.exit(0));
    } else {
      process.exit(0);
    }
  };

  if (server) server.close(() => {
    if (metricsServer) metricsServer.close(() => finish());
    else finish();
  });
  else finish();

  setTimeout(() => {
    logger.error("⏰ Timeout arrêt, arrêt forcé");
    process.exit(1);
  }, 10000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => logger.error("Unhandled Rejection:", reason));
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});

module.exports = NODE_ENV === "test" ? (require("./app").createApp()) : { app, server, metricsServer };