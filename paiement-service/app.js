require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const mongoose = require("mongoose");
const logger = require("./utils/logger");
const { updateDatabaseHealth } = require("./metrics");
const { jsonAndUrlencodedExceptWebhook, rawForWebhook } = require("./middlewares/bodyParser");
const requestMetrics = require("./middlewares/requestMetrics");
const systemRoutes = require("./routes/systemRoutes");
const WebhookController = require("./controllers/webhookController");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const connectToDatabase = require("./config/db");

const SERVICE_NAME = process.env.SERVICE_NAME || "paiement-service";

function createApp() {
  const app = express();

  // Logger
  app.use(logger.middleware());

  // Sécurité
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS
  app.use(
    cors({
      origin: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
      maxAge: 86400,
    })
  );

  // Parsers sauf pour /webhook
  app.use(jsonAndUrlencodedExceptWebhook);

  // métriques Prometheus + log perf
  app.use(requestMetrics);

  // Routes système: /metrics /health /vitals /ping
  app.use(systemRoutes);

  // Webhook Stripe (RAW)
  app.post("/webhook", rawForWebhook, (req, res, next) => {
    logger.payment("📥 Webhook Stripe reçu", {
      eventType: req.headers["stripe-event"] || "unknown",
    });
    next();
  }, WebhookController.handleStripeWebhook);

  // Abonnements
  app.use("/subscription", subscriptionRoutes);

  // 404
  app.use((req, res) => {
    res.status(404).json({
      error: "Route non trouvée",
      service: SERVICE_NAME,
      method: req.method,
      path: req.path,
      availableRoutes: [
        "/ping",
        "/vitals",
        "/metrics",
        "/health",
        "/webhook",
        "/subscription",
      ],
    });
  });

  // Gestion d'erreurs
  app.use((err, req, res, _next) => {
    logger.error("💥 Erreur serveur", err);

    if (err?.type === "StripeConnectionError") {
      return res.status(503).json({
        error: "Service de paiement indisponible",
        message: "Stripe est temporairement indisponible",
      });
    }
    if (err?.name === "PaymentError") {
      return res.status(400).json({ error: "Erreur de paiement", message: err.message });
    }
    if (err?.name === "MongoError" || err?.name === "MongoServerError") {
      updateDatabaseHealth("mongodb", false);
      return res.status(503).json({
        error: "Erreur base de données",
        message: "Service temporairement indisponible",
      });
    }

    res.status(err.statusCode || 500).json({
      error: "Erreur interne du serveur",
      message: err.message || "Erreur inconnue",
    });
  });

  // Connexion DB
  if (process.env.NODE_ENV !== "test") {
    connectToDatabase()
      .then(() => updateDatabaseHealth("mongodb", true))
      .catch(() => updateDatabaseHealth("mongodb", false));

    mongoose.connection.on("connected", () => {
      logger.info("✅ MongoDB connecté");
      updateDatabaseHealth("mongodb", true);
    });
    mongoose.connection.on("error", (err) => {
      logger.error("❌ Erreur MongoDB", err);
      updateDatabaseHealth("mongodb", false);
    });
    mongoose.connection.on("disconnected", () => {
      logger.warn("⚠️ MongoDB déconnecté");
      updateDatabaseHealth("mongodb", false);
    });
  } else {
    updateDatabaseHealth("mongodb", true);
  }

  return app;
}

module.exports = { createApp };