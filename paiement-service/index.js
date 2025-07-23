require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { logger, middleware } = require("./utils/logger");

const {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  updateServiceHealth,
  updateActiveConnections,
  updateDatabaseHealth,
  updateExternalServiceHealth,
} = require("./metrics");

const app = express();
const PORT = process.env.PORT || 5004;
const METRICS_PORT = process.env.METRICS_PORT || 9004;
const SERVICE_NAME = "paiement-service";

app.use(middleware());

logger.info(`🚀 Démarrage du ${SERVICE_NAME}...`);

(async () => {
  try {
    if (process.env.NODE_ENV !== "test") {
      const connectToDatabase = require("./config/db");
      await connectToDatabase();
      updateDatabaseHealth("mongodb", true);
    } else {
      updateDatabaseHealth("mongodb", true);
    }

    // Middlewares sécurité
    app.use(
      helmet({
        contentSecurityPolicy:
          process.env.NODE_ENV === "production" ? undefined : false,
        crossOriginEmbedderPolicy: false,
      })
    );

    app.use(
      cors({
        origin: process.env.CORS_ORIGINS?.split(",") || [
          "http://localhost:3000",
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
        maxAge: 86400,
      })
    );

    app.use(logger.middleware());

    // Middlewares JSON sauf pour /webhook
    app.use((req, res, next) => {
      const isRaw = ["/webhook", "/webhooks/stripe"].includes(req.path);
      if (!isRaw) express.json({ limit: "1mb" })(req, res, next);
      else next();
    });

    app.use((req, res, next) => {
      const isRaw = ["/webhook", "/webhooks/stripe"].includes(req.path);
      if (!isRaw) express.urlencoded({ extended: true })(req, res, next);
      else next();
    });

    // Suivi MongoDB
    if (process.env.NODE_ENV !== "test") {
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
    }

    // Routes
    if (process.env.NODE_ENV !== "test") {
      const WebhookController = require("./controllers/webhookController");
      const subscriptionRoutes = require("./routes/subscriptionRoutes");

      app.post(
        "/webhook",
        express.raw({ type: "application/json" }),
        (req, res, next) => {
          logger.payment("📥 Webhook Stripe reçu", {
            eventType: req.headers["stripe-event"] || "unknown",
          });
          next();
        },
        WebhookController.handleStripeWebhook
      );

      app.use("/subscription", subscriptionRoutes);
    } else {
      app.post("/webhook", (req, res) => {
        res.json({ status: "webhook_received", mock: true });
      });

      app.use("/subscription", (req, res) => {
        if (!req.headers.authorization) {
          return res.status(401).json({ message: "Authentification requise." });
        }
        res.json({ status: "mock", data: [] });
      });
    }

    // Routes standard
    app.get("/metrics", async (req, res) => {
      res.set("Content-Type", register.contentType);
      res.end(await register.metrics());
    });

    app.get("/health", async (req, res) => {
      const isMongoOk =
        process.env.NODE_ENV === "test" || mongoose.connection.readyState === 1;
      const isStripeOk =
        process.env.NODE_ENV === "test" || !!process.env.STRIPE_SECRET_KEY;

      updateDatabaseHealth("mongodb", isMongoOk);
      updateExternalServiceHealth("stripe", isStripeOk);

      const health = {
        status: isMongoOk && isStripeOk ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: SERVICE_NAME,
        dependencies: {
          mongodb: isMongoOk ? "healthy" : "unhealthy",
          stripe: isStripeOk ? "configured" : "not_configured",
        },
      };

      updateServiceHealth(SERVICE_NAME, health.status === "healthy");
      res.status(health.status === "healthy" ? 200 : 503).json(health);
    });

    app.get("/vitals", (req, res) => {
      res.json({
        service: SERVICE_NAME,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        status: "running",
        active_connections: 0,
        database: {
          mongodb:
            mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        },
        payment: {
          providers: {
            stripe: !!process.env.STRIPE_SECRET_KEY,
          },
          currencies_supported: ["EUR", "USD"],
          webhook_endpoints: ["/webhook"], // ✅ ajoute ceci
        },
      });
    });

    app.get("/ping", (req, res) => {
      res.json({ status: "pong ✅", service: SERVICE_NAME });
    });

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

    // Gestion des erreurs
    app.use((err, req, res, next) => {
      logger.error("💥 Erreur serveur", err);

      if (err.type === "StripeConnectionError") {
        updateExternalServiceHealth("stripe", false);
        return res.status(503).json({
          error: "Service de paiement indisponible",
          message: "Stripe est temporairement indisponible",
        });
      }

      if (err.name === "PaymentError") {
        return res.status(400).json({
          error: "Erreur de paiement",
          message: err.message,
        });
      }

      if (err.name === "MongoError" || err.name === "MongoServerError") {
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
      const server = app.listen(PORT, () => {
        logger.info(`💳 ${SERVICE_NAME} démarré sur le port ${PORT}`);
      });

      const metricsApp = express();
      metricsApp.get("/metrics", async (req, res) => {
        res.set("Content-Type", register.contentType);
        res.end(await register.metrics());
      });

      metricsApp.get("/health", (req, res) => {
        res.json({ status: "healthy", service: `${SERVICE_NAME}-metrics` });
      });

      const metricsServer = metricsApp.listen(METRICS_PORT, () => {
        logger.info(`📊 Serveur de métriques actif sur ${METRICS_PORT}`);
      });

      const shutdown = (signal) => {
        logger.warn(`🛑 Arrêt ${SERVICE_NAME} suite à ${signal}`);
        updateServiceHealth(SERVICE_NAME, false);
        server.close();
        metricsServer.close();
        setTimeout(() => process.exit(0), 1000);
      };

      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);

      process.on("unhandledRejection", (reason) => {
        logger.error("Unhandled Rejection:", reason);
      });

      process.on("uncaughtException", (err) => {
        logger.error("Uncaught Exception:", err);
        process.exit(1);
      });

      module.exports = { app, server, metricsServer };
    } else {
      module.exports = app;
    }
  } catch (err) {
    logger.error("❌ Erreur fatale au démarrage", err);
    updateServiceHealth(SERVICE_NAME, false);

    if (process.env.NODE_ENV === "test") {
      throw err; // ✅ Jest pourra le gérer
    } else {
      process.exit(1); // ✅ seulement en prod/dev
    }
  }
})();
