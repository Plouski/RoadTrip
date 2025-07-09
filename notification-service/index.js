require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const logger = require("./utils/logger");
const notificationRoutes = require("./routes/notificationRoutes");
const dataService = require("./services/dataService");
const basicLimiter = require("./middlewares/rateLimiter");
const {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  updateServiceHealth,
  updateActiveConnections,
  updateExternalServiceHealth,
} = require("./metrics");
const app = express();
const PORT = process.env.PORT || 5005;
const METRICS_PORT = process.env.METRICS_PORT || 9005;
const SERVICE_NAME = "notification-service";

console.log(`🔥 Lancement du ${SERVICE_NAME}...`);

// INITIALISATION ASYNC

(async () => {
  try {
    // Vérification data-service
    logger.info("🔍 Vérification de la connexion au data-service...");
    try {
      await dataService.checkHealth();
      logger.info("✅ Data-service disponible");
      updateExternalServiceHealth("data-service", true);
    } catch (error) {
      if (error.response?.status === 404) {
        logger.info(
          "✅ Data-service disponible (test user non trouvé = normal)"
        );
        updateExternalServiceHealth("data-service", true);
      } else {
        logger.error("❌ Data-service indisponible:", error.message);
        logger.warn("⚠️ Démarrage en mode dégradé");
        updateExternalServiceHealth("data-service", false);
      }
    }

    // MIDDLEWARES SPÉCIFIQUES NOTIFICATION

    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "https://fcm.googleapis.com"],
          },
        },
      })
    );

    app.use(basicLimiter);

    const corsOptions = {
      origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "x-api-key"],
      credentials: true,
      optionsSuccessStatus: 200,
    };

    app.use(cors(corsOptions));
    app.use(express.json({ limit: "1mb", strict: true }));
    app.use(express.urlencoded({ extended: true, limit: "1mb" }));

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

        logger.info(
          `${req.method} ${req.path} - ${res.statusCode} - ${Math.round(
            duration * 1000
          )}ms`
        );
      });

      next();
    });

    // ROUTES SPÉCIFIQUES NOTIFICATION

    app.use("/api/notifications", notificationRoutes);

    // ROUTES STANDARD

    // Métriques Prometheus
    app.get("/metrics", async (req, res) => {
      res.set("Content-Type", register.contentType);
      res.end(await register.metrics());
    });

    // Health check enrichi pour notification-service
    app.get("/health", async (req, res) => {
      const health = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: SERVICE_NAME,
        version: "1.0.0",
        dependencies: {},
      };

      // Vérifier data-service
      try {
        await dataService.checkHealth();
        health.dependencies.dataService = "healthy";
        updateExternalServiceHealth("data-service", true);
      } catch (error) {
        if (error.response?.status === 404) {
          health.dependencies.dataService = "healthy";
          updateExternalServiceHealth("data-service", true);
        } else {
          health.dependencies.dataService = "unhealthy";
          health.status = "degraded";
          updateExternalServiceHealth("data-service", false);
        }
      }

      // Vérifier Firebase
      if (process.env.FIREBASE_PROJECT_ID) {
        health.dependencies.firebase = "configured";
        updateExternalServiceHealth("firebase", true);
      } else {
        health.dependencies.firebase = "not_configured";
        updateExternalServiceHealth("firebase", false);
      }

      // Vérifier Email (Mailjet)
      if (process.env.MAILJET_API_KEY) {
        health.dependencies.email = "configured";
        updateExternalServiceHealth("mailjet", true);
      } else {
        health.dependencies.email = "not_configured";
        updateExternalServiceHealth("mailjet", false);
      }

      const isHealthy = health.status === "healthy";
      updateServiceHealth(SERVICE_NAME, isHealthy);

      const statusCode = isHealthy ? 200 : 503;
      res.status(statusCode).json(health);
    });

    // Vitals
    app.get("/vitals", (req, res) => {
      const vitals = {
        service: SERVICE_NAME,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        status: "running",
        active_connections: currentConnections,

        providers: {
          email: !!process.env.MAILJET_API_KEY,
          sms: !!process.env.SMS_API_KEY,
          firebase: !!process.env.FIREBASE_PROJECT_ID,
        },

        endpoints: [
          "POST /api/notifications/email",
          "POST /api/notifications/sms",
          "POST /api/notifications/push/token",
          "POST /api/notifications/push/send",
        ],
      };

      res.json(vitals);
    });

    // Ping
    app.get("/ping", (req, res) => {
      res.json({
        status: "pong ✅",
        service: SERVICE_NAME,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // GESTION D'ERREURS

    app.use((req, res) => {
      res.status(404).json({
        error: "Route non trouvée",
        service: SERVICE_NAME,
        message: `${req.method} ${req.path} n'existe pas`,
        availableRoutes: [
          "GET /health",
          "GET /vitals",
          "GET /metrics",
          "GET /ping",
          "POST /api/notifications/email",
          "POST /api/notifications/sms",
          "POST /api/notifications/push/token",
          "POST /api/notifications/push/send",
        ],
        timestamp: new Date().toISOString(),
      });
    });

    app.use((err, req, res, next) => {
      logger.error(`💥 Erreur ${SERVICE_NAME}:`, err.message);

      if (err.name === "ValidationError") {
        return res.status(400).json({
          error: "Erreur de validation",
          service: SERVICE_NAME,
          message: err.message,
          timestamp: new Date().toISOString(),
        });
      }

      if (err.status === 429) {
        return res.status(429).json({
          error: "Trop de requêtes",
          service: SERVICE_NAME,
          message: "Limite de taux dépassée",
          timestamp: new Date().toISOString(),
        });
      }

      if (err.code && err.code.startsWith("messaging/")) {
        return res.status(400).json({
          error: "Erreur Firebase",
          service: SERVICE_NAME,
          message: "Erreur lors de l'envoi de la notification push",
          timestamp: new Date().toISOString(),
        });
      }

      if (err.message && err.message.includes("data-service")) {
        updateExternalServiceHealth("data-service", false);
        return res.status(503).json({
          error: "Service temporairement indisponible",
          service: SERVICE_NAME,
          message: "Le data-service est actuellement indisponible",
          timestamp: new Date().toISOString(),
        });
      }

      res.status(err.statusCode || 500).json({
        error: "Erreur serveur",
        service: SERVICE_NAME,
        message: err.message || "Une erreur est survenue",
        timestamp: new Date().toISOString(),
      });
    });

    // DÉMARRAGE

    // Serveur principal
    app.listen(PORT, () => {
      console.log(`🔔 ${SERVICE_NAME} démarré sur le port ${PORT}`);
      console.log(`📊 Métriques: http://localhost:${PORT}/metrics`);
      console.log(`❤️ Health: http://localhost:${PORT}/health`);
      console.log(`📈 Vitals: http://localhost:${PORT}/vitals`);
      console.log(`🔔 API: http://localhost:${PORT}/api/notifications`);

      updateServiceHealth(SERVICE_NAME, true);
      logger.info(`✅ ${SERVICE_NAME} avec métriques démarré`);
    });

    // Serveur métriques séparé
    const metricsApp = express();
    metricsApp.get("/metrics", async (req, res) => {
      res.set("Content-Type", register.contentType);
      res.end(await register.metrics());
    });

    metricsApp.get("/health", (req, res) => {
      res.json({ status: "healthy", service: `${SERVICE_NAME}-metrics` });
    });

    metricsApp.listen(METRICS_PORT, () => {
      console.log(`📊 Metrics server running on port ${METRICS_PORT}`);
    });
  } catch (err) {
    console.error("❌ Erreur fatale au démarrage :", err.message);
    updateServiceHealth(SERVICE_NAME, false);
    process.exit(1);
  }
})();

// GRACEFUL SHUTDOWN

function gracefulShutdown(signal) {
  console.log(`🔄 Arrêt ${SERVICE_NAME} (${signal})...`);
  updateServiceHealth(SERVICE_NAME, false);
  updateExternalServiceHealth("data-service", false);
  updateExternalServiceHealth("firebase", false);
  updateExternalServiceHealth("mailjet", false);
  updateActiveConnections(0);

  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection:", reason);
  updateServiceHealth(SERVICE_NAME, false);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  updateServiceHealth(SERVICE_NAME, false);
  process.exit(1);
});

module.exports = app;
