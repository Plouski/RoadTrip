require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");

const {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  updateServiceHealth,
  updateActiveConnections,
  updateDatabaseHealth,
  updateExternalServiceHealth
} = require('./metrics');

const app = express();
const PORT = process.env.PORT || 5004;
const METRICS_PORT = process.env.METRICS_PORT || 9004;
const SERVICE_NAME = "paiement-service";

console.log(`🔥 Lancement du ${SERVICE_NAME}...`);

// INITIALISATION ASYNC
(async () => {
  try {
    // Connexion MongoDB (seulement si pas en test)
    if (process.env.NODE_ENV !== 'test') {
      const connectToDatabase = require("./config/db");
      const { logger, stream } = require("./utils/logger");
      
      await connectToDatabase();
      console.log("✅ MongoDB connecté");
      updateDatabaseHealth('mongodb', true);

      const logsDir = path.join(__dirname, "logs");
      if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);
    } else {
      // En mode test, simuler MongoDB connecté
      updateDatabaseHealth('mongodb', true);
    }

    // MIDDLEWARES SPÉCIFIQUES PAIEMENT

    // Sécurité HTTP
    app.use(helmet({
      contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }));

    // CORS
    app.use(cors({
      origin: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
      maxAge: 86400,
    }));

    // Logger HTTP (seulement si pas en test)
    if (process.env.NODE_ENV !== 'test') {
      const { stream } = require("./utils/logger");
      app.use(morgan("combined", { stream }));
    }

    // MIDDLEWARE DE MÉTRIQUES STANDARDISÉ
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
          {
            method: req.method,
            route: req.route?.path || req.path,
            status_code: res.statusCode,
          },
          duration
        );

        httpRequestsTotal.inc({
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode,
        });

        if (process.env.NODE_ENV !== 'test') {
          const { logger } = require("./utils/logger");
          logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${Math.round(duration * 1000)}ms`);
        }
      });

      next();
    });

    // MIDDLEWARES SPÉCIAUX POUR WEBHOOKS

    // Middleware JSON sauf pour /webhook
    app.use((req, res, next) => {
      const isRawRoute = req.path === "/webhook" || req.path === "/webhooks/stripe";
      if (!isRawRoute) express.json({ limit: "1mb" })(req, res, next);
      else next();
    });

    // Middleware URL-encoded sauf pour /webhook
    app.use((req, res, next) => {
      const isRawRoute = req.path === "/webhook" || req.path === "/webhooks/stripe";
      if (!isRawRoute) express.urlencoded({ extended: true })(req, res, next);
      else next();
    });

    // MONITORING MONGODB (seulement si pas en test)
    if (process.env.NODE_ENV !== 'test') {
      const { logger } = require("./utils/logger");
      
      mongoose.connection.on('connected', () => {
        logger.info('✅ MongoDB connecté');
        updateDatabaseHealth('mongodb', true);
      });

      mongoose.connection.on('error', (err) => {
        logger.error('❌ Erreur MongoDB:', err);
        updateDatabaseHealth('mongodb', false);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️ MongoDB déconnecté');
        updateDatabaseHealth('mongodb', false);
      });
    }

    // ROUTES SPÉCIFIQUES PAIEMENT (import conditionnel)
    if (process.env.NODE_ENV !== 'test') {
      const WebhookController = require("./controllers/webhookController");
      const subscriptionRoutes = require("./routes/subscriptionRoutes");
      
      // Route de webhook Stripe (spéciale avec raw body)
      app.post("/webhook", 
        express.raw({ type: "application/json" }),
        (req, res, next) => {
          const { logger } = require("./utils/logger");
          logger.info(`Webhook Stripe reçu: ${req.headers['stripe-event'] || 'unknown'}`);
          next();
        },
        WebhookController.handleStripeWebhook
      );

      // Routes principales
      app.use("/subscription", subscriptionRoutes);
    } else {
      // Routes mockées pour les tests
      app.post("/webhook", (req, res) => {
        res.json({ status: 'webhook_received', mock: true });
      });

      app.use("/subscription", (req, res) => {
        if (!req.headers.authorization) {
          return res.status(401).json({ message: 'Authentification requise.' });
        }
        res.json({ status: 'mock', data: [] });
      });
    }

    // ROUTES STANDARD

    // Métriques Prometheus
    app.get("/metrics", async (req, res) => {
      res.set("Content-Type", register.contentType);
      res.end(await register.metrics());
    });

    // Health check enrichi pour paiement-service
    app.get("/health", async (req, res) => {
      const health = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: SERVICE_NAME,
        version: "1.0.0",
        dependencies: {}
      };

      // Vérifier MongoDB
      if (process.env.NODE_ENV === 'test' || mongoose.connection.readyState === 1) {
        health.dependencies.mongodb = "healthy";
        updateDatabaseHealth('mongodb', true);
      } else {
        health.dependencies.mongodb = "unhealthy";
        health.status = "degraded";
        updateDatabaseHealth('mongodb', false);
      }

      // Vérifier Stripe
      if (process.env.NODE_ENV === 'test' || process.env.STRIPE_SECRET_KEY) {
        health.dependencies.stripe = "configured";
        updateExternalServiceHealth('stripe', true);
      } else {
        health.dependencies.stripe = "not_configured";
        health.status = "degraded";
        updateExternalServiceHealth('stripe', false);
      }

      const isHealthy = health.status === "healthy";
      updateServiceHealth(SERVICE_NAME, isHealthy);

      const statusCode = isHealthy ? 200 : 503;
      res.status(statusCode).json(health);
    });

    // Vitals
    app.get("/vitals", async (req, res) => {
      const vitals = {
        service: SERVICE_NAME,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        status: "running",
        active_connections: currentConnections,
        
        payment: {
          providers: {
            stripe: process.env.NODE_ENV === 'test' || !!process.env.STRIPE_SECRET_KEY
          },
          webhook_endpoints: [
            "/webhook"
          ],
          currencies_supported: ["EUR", "USD"]
        },
        
        database: {
          mongodb: {
            status: process.env.NODE_ENV === 'test' || mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            host: mongoose.connection.host || 'localhost',
            name: mongoose.connection.name || 'test'
          }
        },
        
        api: {
          endpoints: [
            "/subscription",
            "/webhook"
          ]
        }
      };

      res.json(vitals);
    });

    // Ping
    app.get("/ping", (req, res) => {
      res.json({
        status: "pong ✅",
        service: SERVICE_NAME,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // GESTION D'ERREURS
    app.use((req, res) => {
      res.status(404).json({
        error: "Route non trouvée",
        service: SERVICE_NAME,
        message: `${req.method} ${req.path} n'existe pas`,
        availableRoutes: [
          "GET /health", "GET /vitals", "GET /metrics", "GET /ping",
          "POST /webhook", "GET /subscription"
        ],
      });
    });

    app.use((err, req, res, next) => {
      if (process.env.NODE_ENV !== 'test') {
        const { logger } = require("./utils/logger");
        logger.error(`💥 Erreur ${SERVICE_NAME}:`, err.message);
      }

      if (err.type === 'StripeConnectionError') {
        updateExternalServiceHealth('stripe', false);
        return res.status(503).json({
          error: "Service de paiement indisponible",
          service: SERVICE_NAME,
          message: "Stripe est temporairement indisponible",
        });
      }

      if (err.name === 'PaymentError') {
        return res.status(400).json({
          error: "Erreur de paiement",
          service: SERVICE_NAME,
          message: err.message,
        });
      }

      if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        updateDatabaseHealth('mongodb', false);
        return res.status(503).json({
          error: "Erreur base de données",
          service: SERVICE_NAME,
          message: "Service temporairement indisponible",
        });
      }

      res.status(err.statusCode || 500).json({
        error: "Erreur serveur",
        service: SERVICE_NAME,
        message: err.message || "Erreur interne du serveur",
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
      });
    });

    // DÉMARRAGE SEULEMENT SI PAS EN MODE TEST
    if (process.env.NODE_ENV !== 'test') {
      // Serveur principal
      const server = app.listen(PORT, () => {
        console.log(`💳 ${SERVICE_NAME} démarré sur le port ${PORT}`);
        console.log(`📊 Métriques: http://localhost:${PORT}/metrics`);
        console.log(`❤️ Health: http://localhost:${PORT}/health`);
        console.log(`📈 Vitals: http://localhost:${PORT}/vitals`);
        console.log(`💰 Webhook: http://localhost:${PORT}/webhook`);
        
        updateServiceHealth(SERVICE_NAME, true);
        const { logger } = require("./utils/logger");
        logger.info(`✅ ${SERVICE_NAME} avec métriques démarré`);
      });

      // Serveur métriques séparé
      const metricsApp = express();
      metricsApp.get('/metrics', async (req, res) => {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
      });

      metricsApp.get('/health', (req, res) => {
        res.json({ status: 'healthy', service: `${SERVICE_NAME}-metrics` });
      });

      const metricsServer = metricsApp.listen(METRICS_PORT, () => {
        console.log(`📊 Metrics server running on port ${METRICS_PORT}`);
      });

      // GRACEFUL SHUTDOWN
      function gracefulShutdown(signal) {
        console.log(`🔄 Arrêt ${SERVICE_NAME} (${signal})...`);
        updateServiceHealth(SERVICE_NAME, false);
        updateDatabaseHealth('mongodb', false);
        updateExternalServiceHealth('stripe', false);
        updateActiveConnections(0);
        
        if (server) server.close();
        if (metricsServer) metricsServer.close();
        
        setTimeout(() => {
          process.exit(0);
        }, 1000);
      }

      process.on("SIGTERM", gracefulShutdown);
      process.on("SIGINT", gracefulShutdown);

      process.on('unhandledRejection', (reason, promise) => {
        const { logger } = require("./utils/logger");
        logger.error('Unhandled Rejection:', reason);
        updateServiceHealth(SERVICE_NAME, false);
      });

      process.on('uncaughtException', (error) => {
        const { logger } = require("./utils/logger");
        logger.error('Uncaught Exception:', error);
        updateServiceHealth(SERVICE_NAME, false);
        process.exit(1);
      });

      module.exports = { app, server, metricsServer };
    } else {
      module.exports = app;
    }

  } catch (err) {
    console.error("❌ Erreur fatale au démarrage :", err.message);
    updateServiceHealth(SERVICE_NAME, false);
    updateDatabaseHealth('mongodb', false);
    process.exit(1);
  }
})();