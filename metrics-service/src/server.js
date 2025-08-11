const express = require("express");
const { createApp, logger } = require("./app");
const { SERVICE_NAME, PORT, METRICS_PORT, NODE_ENV } = require("./config");

const isTest = NODE_ENV === "test";
const app = createApp();

let server, metricsServer;

logger.info(`🔥 Lancement du ${SERVICE_NAME}...`, { port: PORT });
logger.info("🔍 Tentative de démarrage du serveur", {
  nodeEnv: NODE_ENV,
  port: PORT,
  metricsPort: METRICS_PORT,
});

if (!isTest) {
  server = app.listen(PORT, () => {
    logger.info(`📊 ${SERVICE_NAME} démarré avec succès`, {
      port: PORT,
      environment: NODE_ENV,
      logLevel: logger.level,
    });
    logger.info(`📊 Métriques: http://localhost:${PORT}/metrics`);
    logger.info(`❤️ Health: http://localhost:${PORT}/health`);
    logger.info(`📈 Vitals: http://localhost:${PORT}/vitals`);
    logger.info(`🎯 Dashboard: http://localhost:${PORT}/api/dashboard`);
    logger.info(`🔍 Services Status: http://localhost:${PORT}/api/services/status`);
    logger.info(`✅ ${SERVICE_NAME} démarré avec métriques et logging avancé`);
  });

  const metricsApp = express();
  metricsApp.get("/metrics", async (_req, res) => {
    try {
      res.set("Content-Type", app.locals.register.contentType);
      res.end(await app.locals.register.metrics());
    } catch (error) {
      logger.error("Error serving metrics from dedicated server", error);
      res.status(500).json({ error: "Failed to generate metrics" });
    }
  });
  metricsApp.get("/health", (_req, res) => {
    res.json({ status: "healthy", service: `${SERVICE_NAME}-metrics` });
  });

  metricsServer = metricsApp.listen(METRICS_PORT, () => {
    logger.info(`📊 Serveur métriques démarré`, {
      port: METRICS_PORT,
      service: `${SERVICE_NAME}-metrics`,
    });
  });
}

function gracefulShutdown(signal) {
  logger.info(`🔄 Arrêt ${SERVICE_NAME}`, { signal });
  const tasks = [];

  if (server) {
    tasks.push(
      new Promise((resolve) => {
        server.close(() => {
          logger.info("📴 Serveur principal fermé");
          resolve();
        });
      })
    );
  }

  if (metricsServer) {
    tasks.push(
      new Promise((resolve) => {
        metricsServer.close(() => {
          logger.info("📴 Serveur métriques fermé");
          resolve();
        });
      })
    );
  }

  Promise.all(tasks)
    .then(() => {
      logger.info(`✅ ${SERVICE_NAME} arrêté proprement`);
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Erreur lors de l'arrêt", error);
      process.exit(1);
    });

  setTimeout(() => {
    logger.error("Timeout d'arrêt, arrêt forcé");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", { reason: String(reason), promise: String(promise) });
});
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", error);
  setTimeout(() => process.exit(1), 1000);
});

module.exports = isTest ? app : { app, server, metricsServer };