require("dotenv").config();
const { createApp } = require("./app");
const logger = require("./utils/logger");
const mongoose = require("mongoose");
const { updateServiceHealth, updateActiveConnections, updateExternalServiceHealth } = require("./metrics");

const SERVICE_NAME = process.env.SERVICE_NAME || "auth-service";
const PORT = parseInt(process.env.PORT || "5001", 10);
const NODE_ENV = process.env.NODE_ENV || "development";

const app = createApp();
let server;

if (NODE_ENV !== "test") {
  server = app.listen(PORT, () => {
    logger.info(`✅ ${SERVICE_NAME} démarré`, { port: PORT, env: NODE_ENV });

    const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    if (googleConfigured) updateExternalServiceHealth("google_oauth", true);

    const facebookConfigured = !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET);
    if (facebookConfigured) updateExternalServiceHealth("facebook_oauth", true);

    const mongoStatus = mongoose.connection.readyState === 1;
    logger.info("🗄️ MongoDB", { connected: mongoStatus, readyState: mongoose.connection.readyState });

    updateServiceHealth(SERVICE_NAME, true);
  });
}

function shutdown(signal) {
  logger.info(`🔄 Arrêt ${SERVICE_NAME}`, { signal, uptime: process.uptime() });
  updateServiceHealth(SERVICE_NAME, false);
  updateActiveConnections(0);

  if (server) {
    server.close(() => {
      if (mongoose.connection.readyState === 1) {
        mongoose.connection.close(() => process.exit(0));
      } else {
        process.exit(0);
      }
    });
  } else {
    process.exit(0);
  }

  setTimeout(() => {
    logger.error("⏰ Timeout arrêt, arrêt forcé");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", { reason: String(reason), promise: String(promise) });
  updateServiceHealth(SERVICE_NAME, false);
});
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", { message: error.message, stack: error.stack });
  updateServiceHealth(SERVICE_NAME, false);
  setTimeout(() => process.exit(1), 1000);
});

module.exports = NODE_ENV === "test" ? app : { app, server };