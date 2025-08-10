require("dotenv").config();
const express = require("express");
const cors = require("cors");
const aiRoutes = require("./routes/aiRoutes");
const logger = require("./utils/logger");
const {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  updateServiceHealth,
  updateActiveConnections,
  updateExternalServiceHealth
} = require("./metrics");

const app = express();
const PORT = process.env.PORT || 5003;
const METRICS_PORT = process.env.METRICS_PORT || 9003;
const SERVICE_NAME = "ai-service";

logger.info(`🔥 Lancement du ${SERVICE_NAME}...`, { port: PORT });

// CONFIGURATION DE BASE

// Vérifications
if (!process.env.OPENAI_API_KEY) {
  logger.error("❌ OPENAI_API_KEY manquante!", { service: SERVICE_NAME });
  updateServiceHealth(SERVICE_NAME, false);
  process.exit(1);
}

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

app.use(express.json({ limit: "2mb" }));

// MIDDLEWARE DE LOGGING - Doit être AVANT les autres middlewares
app.use(logger.middleware());

// MIDDLEWARE DE MÉTRIQUES
let currentConnections = 0;

app.use((req, res, next) => {
  const start = Date.now();
  currentConnections++;
  updateActiveConnections(currentConnections);

  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    currentConnections--;
    updateActiveConnections(currentConnections);

    // Métriques Prometheus
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

    // Log de performance si la requête est lente
    if (duration > 1) {
      logger.performance("Slow request detected", {
        method: req.method,
        path: req.path,
        duration: Math.round(duration * 1000),
        statusCode: res.statusCode,
        requestId: req.id
      });
    }
  });

  next();
});

// ROUTES STANDARD

// Métriques Prometheus
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
    logger.debug("Metrics endpoint accessed", { requestId: req.id });
  } catch (error) {
    logger.error("Error serving metrics", error);
    res.status(500).json({ error: "Failed to generate metrics" });
  }
});

// Health check
app.get("/health", (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: SERVICE_NAME,
    version: process.env.SERVICE_VERSION || "1.0.0"
  };

  if (!process.env.OPENAI_API_KEY) {
    health.status = "unhealthy";
    health.issues = ["Missing OPENAI_API_KEY"];
  }

  const isHealthy = health.status === "healthy";
  updateServiceHealth(SERVICE_NAME, isHealthy);

  const statusCode = isHealthy ? 200 : 503;
  
  logger.info("Health check", { 
    status: health.status, 
    uptime: health.uptime,
    requestId: req.id 
  });

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
    environment: process.env.NODE_ENV || "development"
  };

  logger.debug("Vitals requested", { 
    memory: vitals.memory.heapUsed, 
    connections: currentConnections,
    requestId: req.id 
  });

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

// ROUTES SPÉCIFIQUES AU SERVICE
app.use("/api/ai", aiRoutes);

// GESTION D'ERREURS

// 404 Handler
app.use((req, res) => {
  logger.warn("Route not found", {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    requestId: req.id
  });

  res.status(404).json({
    error: "Route non trouvée",
    service: SERVICE_NAME,
    requestId: req.id,
    availableRoutes: [
      "GET /health", "GET /vitals", "GET /metrics", "GET /ping",
      "POST /api/ai/ask"
    ],
  });
});

// Error Handler
app.use((err, req, res, next) => {
  logger.error(`💥 Erreur ${SERVICE_NAME}:`, {
    error: err,
    method: req.method,
    path: req.path,
    requestId: req.id,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  res.status(500).json({
    error: "Erreur serveur",
    service: SERVICE_NAME,
    requestId: req.id,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// DÉMARRAGE

// Serveur principal
const server = app.listen(PORT, () => {
  logger.info(`🤖 ${SERVICE_NAME} démarré`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    logLevel: logger.level
  });
  
  logger.info(`📊 Métriques: http://localhost:${PORT}/metrics`);
  logger.info(`❤️ Health: http://localhost:${PORT}/health`);
  logger.info(`📈 Vitals: http://localhost:${PORT}/vitals`);
  
  updateServiceHealth(SERVICE_NAME, true);
  updateExternalServiceHealth("openai", true);
  
  logger.info(`✅ ${SERVICE_NAME} démarré avec métriques et logging avancé`);
});

// Serveur métriques séparé (pour Prometheus)
const metricsApp = express();

metricsApp.use((req, res, next) => {
  logger.debug("Metrics server request", { 
    method: req.method, 
    path: req.path 
  });
  next();
});

metricsApp.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error("Error serving metrics from dedicated server", error);
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

metricsApp.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: `${SERVICE_NAME}-metrics` });
});

const metricsServer = metricsApp.listen(METRICS_PORT, () => {
  logger.info(`📊 Metrics server running`, { port: METRICS_PORT });
});

// GRACEFUL SHUTDOWN

function gracefulShutdown(signal) {
  logger.info(`🔄 Arrêt ${SERVICE_NAME}`, { signal });
  updateServiceHealth(SERVICE_NAME, false);
  updateActiveConnections(0);
  
  // Fermer les serveurs proprement
  const shutdownPromises = [];
  
  if (server) {
    shutdownPromises.push(new Promise(resolve => {
      server.close(() => {
        logger.info('📴 Serveur principal fermé');
        resolve();
      });
    }));
  }
  
  if (metricsServer) {
    shutdownPromises.push(new Promise(resolve => {
      metricsServer.close(() => {
        logger.info('📴 Serveur métriques fermé');
        resolve();
      });
    }));
  }
  
  Promise.all(shutdownPromises).then(() => {
    logger.info(`✅ ${SERVICE_NAME} arrêté proprement`);
    process.exit(0);
  }).catch(error => {
    logger.error("Erreur lors de l'arrêt", error);
    process.exit(1);
  });
  
  // Timeout de sécurité
  setTimeout(() => {
    logger.error("Timeout d'arrêt, arrêt forcé");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason.toString(),
    promise: promise.toString()
  });
  updateServiceHealth(SERVICE_NAME, false);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  updateServiceHealth(SERVICE_NAME, false);
  
  // Graceful shutdown après une exception critique
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Nettoyage périodique des logs (une fois par jour)
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    logger.cleanup();
  }, 24 * 60 * 60 * 1000);
}

module.exports = { app, server, metricsServer };