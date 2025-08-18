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

  app.use(logger.middleware());

  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  const allowedOrigins = [
    "https://road-trip-gamma.vercel.app",
    "http://localhost:3000",
    "https://localhost:3000",
    "http://localhost:3001",
    "https://localhost:3001",
    /^http:\/\/localhost:\d+$/,
    /^https:\/\/localhost:\d+$/
  ];

  const corsOptions = {
    origin: function (origin, callback) {
      console.log("🌐 CORS Origin reçu:", origin);
      
      if (!origin) {
        console.log("✅ CORS: Pas d'origin - autorisé");
        return callback(null, true);
      }
      
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return allowed === origin;
        }
        return allowed.test(origin);
      });
      
      if (isAllowed) {
        console.log("✅ CORS: Origin autorisé -", origin);
        return callback(null, true);
      }
      
      console.log("❌ CORS: Origin refusé -", origin);
      return callback(new Error(`CORS: Origin ${origin} non autorisé`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept", 
      "Authorization",
      "x-api-key",
      "stripe-signature"
    ],
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 200
  };

  app.use(cors(corsOptions));

  app.use(jsonAndUrlencodedExceptWebhook);

  app.use(requestMetrics);

  app.use(systemRoutes);

  app.post("/webhook", rawForWebhook, (req, res, next) => {
    logger.payment("📥 Webhook Stripe reçu", {
      eventType: req.headers["stripe-event"] || "unknown",
    });
    next();
  }, WebhookController.handleStripeWebhook);

  app.use("/subscription", subscriptionRoutes);

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