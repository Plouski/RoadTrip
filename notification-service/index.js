require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

// 🔥 IMPORT DES VRAIS SERVICES
const EmailService = require("./services/emailService");
const SmsService = require("./services/smsService");
const logger = require("./utils/logger");

// Import des métriques générales
const {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  updateServiceHealth,
  updateActiveConnections,
  updateExternalServiceHealth
} = require("./metrics");

const app = express();
const PORT = process.env.PORT || 5005;
const METRICS_PORT = process.env.METRICS_PORT || 9005;
const SERVICE_NAME = "notification-service";

logger.info(`🚀 Lancement du ${SERVICE_NAME}...`, { port: PORT });

// CONFIGURATION DE BASE

// Vérifications des services externes
const checkExternalServices = () => {
  const mailjetConfigured = !!(process.env.MAILJET_API_KEY && process.env.MAILJET_API_SECRET);
  const smsConfigured = !!(process.env.FREE_MOBILE_USERNAME && process.env.FREE_MOBILE_API_KEY);
  
  if (!process.env.NOTIFICATION_API_KEY) {
    logger.error("❌ NOTIFICATION_API_KEY manquante!", { service: SERVICE_NAME });
    updateServiceHealth(SERVICE_NAME, false);
    process.exit(1);
  }

  logger.info("Configuration services externes", {
    mailjet: mailjetConfigured ? "✅ Configuré" : "⚠️ Mode simulation",
    freeMobile: smsConfigured ? "✅ Configuré" : "⚠️ Mode simulation",
    apiKey: "✅ Configuré"
  });

  // Mettre à jour les métriques des services externes
  updateExternalServiceHealth('mailjet', mailjetConfigured);
  updateExternalServiceHealth('free_mobile', smsConfigured);

  return { mailjetConfigured, smsConfigured };
};

const { mailjetConfigured, smsConfigured } = checkExternalServices();

// MIDDLEWARES BASIQUES
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "x-api-key"],
  credentials: true
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// MIDDLEWARE DE LOGGING - Doit être AVANT les autres middlewares
app.use(logger.middleware());

// MIDDLEWARE DE MÉTRIQUES PROMETHEUS
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

// MIDDLEWARE D'AUTHENTIFICATION SIMPLE
const requireApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.NOTIFICATION_API_KEY) {
    logger.security("API key authentication failed", {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      hasApiKey: !!apiKey
    });
    
    return res.status(403).json({ 
      error: "API key requise",
      message: "Ajoutez l'en-tête x-api-key",
      requestId: req.id
    });
  }
  
  logger.debug("API key authentication successful", { requestId: req.id });
  next();
};

// VALIDATION SIMPLE
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// ROUTES STANDARD

// MÉTRIQUES PROMETHEUS
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

// HEALTH CHECK ENRICHI
app.get("/health", (req, res) => {
  const health = {
    status: "healthy",
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.SERVICE_VERSION || "1.0.0"
  };

  // Test configuration
  health.config = {
    auth: !!process.env.NOTIFICATION_API_KEY,
    mailjet: mailjetConfigured,
    freeMobile: smsConfigured,
    port: PORT
  };

  // Vérifier la santé globale
  if (!process.env.NOTIFICATION_API_KEY) {
    health.status = "unhealthy";
    health.issues = ["Missing NOTIFICATION_API_KEY"];
  }

  const isHealthy = health.status === "healthy";
  updateServiceHealth(SERVICE_NAME, isHealthy);

  const statusCode = isHealthy ? 200 : 503;
  
  logger.info("Health check", { 
    status: health.status, 
    uptime: health.uptime,
    requestId: req.id,
    config: health.config
  });

  res.status(statusCode).json(health);
});

// VITALS ENRICHI
app.get("/vitals", (req, res) => {
  const vitals = {
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    status: "running",
    active_connections: currentConnections,
    environment: process.env.NODE_ENV || "development",
    
    features: [
      'Email Notifications (Mailjet)',
      'SMS Notifications (Free Mobile)',
      'API Key Authentication',
      'Fallback Simulation Mode',
      'Prometheus Metrics',
      'Advanced Logging'
    ],
    
    providers: {
      mailjet: {
        configured: mailjetConfigured,
        status: mailjetConfigured ? 'Email provider active' : 'Simulation mode'
      },
      freeMobile: {
        configured: smsConfigured,
        status: smsConfigured ? 'SMS provider active' : 'Simulation mode'
      }
    }
  };

  logger.debug("Vitals requested", { 
    memory: vitals.memory.heapUsed, 
    connections: currentConnections,
    requestId: req.id 
  });

  res.json(vitals);
});

// PING
app.get("/ping", (req, res) => {
  res.json({
    status: "pong ✅",
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 🔥 VRAIES ROUTES AVEC VRAIS SERVICES

app.post("/api/email/confirm", requireApiKey, async (req, res) => {
  try {
    const { email, token } = req.body;

    logger.info("Email confirmation request", {
      email: email ? email.replace(/(.{3}).*@/, '$1***@') : 'missing', // Masquer l'email pour la sécurité
      hasToken: !!token,
      requestId: req.id
    });

    if (!email || !token) {
      logger.warn("Missing parameters for email confirmation", {
        hasEmail: !!email,
        hasToken: !!token,
        requestId: req.id
      });
      
      return res.status(400).json({
        error: "Paramètres manquants",
        required: ["email", "token"],
        requestId: req.id
      });
    }

    if (!validateEmail(email)) {
      logger.warn("Invalid email format", {
        email: email.replace(/(.{3}).*@/, '$1***@'),
        requestId: req.id
      });
      
      return res.status(400).json({
        error: "Email invalide",
        requestId: req.id
      });
    }

    try {
      // 🔥 UTILISATION DU VRAI SERVICE EMAIL
      await EmailService.sendConfirmationEmail(email, token);
      
      logger.info("Email confirmation sent successfully", {
        email: email.replace(/(.{3}).*@/, '$1***@'),
        provider: 'mailjet',
        requestId: req.id
      });
      
      res.json({
        success: true,
        message: "Email de confirmation envoyé avec Mailjet ✅",
        requestId: req.id
      });
    } catch (error) {
      // Si Mailjet pas configuré, mode simulation
      if (error.message.includes('Configuration Mailjet manquante')) {
        logger.info("Email confirmation fallback to simulation", {
          email: email.replace(/(.{3}).*@/, '$1***@'),
          reason: 'mailjet_not_configured',
          requestId: req.id
        });
        
        return res.json({
          success: true,
          message: "Email simulé - Configurez Mailjet pour de vrais emails",
          note: "Ajoutez MAILJET_API_KEY et MAILJET_API_SECRET dans .env",
          requestId: req.id
        });
      }
      throw error;
    }

  } catch (error) {
    logger.error("Error sending email confirmation", {
      error: error.message,
      requestId: req.id,
      stack: error.stack
    });
    
    res.status(500).json({
      error: "Erreur d'envoi email",
      message: error.message,
      requestId: req.id
    });
  }
});

app.post("/api/email/reset", requireApiKey, async (req, res) => {
  try {
    const { email, code } = req.body;

    logger.info("Email reset request", {
      email: email ? email.replace(/(.{3}).*@/, '$1***@') : 'missing',
      hasCode: !!code,
      requestId: req.id
    });

    if (!email || !code) {
      logger.warn("Missing parameters for email reset", {
        hasEmail: !!email,
        hasCode: !!code,
        requestId: req.id
      });
      
      return res.status(400).json({
        error: "Paramètres manquants",
        required: ["email", "code"],
        requestId: req.id
      });
    }

    if (!validateEmail(email)) {
      logger.warn("Invalid email format for reset", {
        email: email.replace(/(.{3}).*@/, '$1***@'),
        requestId: req.id
      });
      
      return res.status(400).json({
        error: "Email invalide",
        requestId: req.id
      });
    }

    try {
      // 🔥 UTILISATION DU VRAI SERVICE EMAIL
      await EmailService.sendPasswordResetEmail(email, code);
      
      logger.info("Email reset sent successfully", {
        email: email.replace(/(.{3}).*@/, '$1***@'),
        provider: 'mailjet',
        requestId: req.id
      });
      
      res.json({
        success: true,
        message: "Email de reset envoyé avec Mailjet ✅",
        requestId: req.id
      });
    } catch (error) {
      if (error.message.includes('Configuration Mailjet manquante')) {
        logger.info("Email reset fallback to simulation", {
          email: email.replace(/(.{3}).*@/, '$1***@'),
          reason: 'mailjet_not_configured',
          requestId: req.id
        });
        
        return res.json({
          success: true,
          message: "Email reset simulé - Configurez Mailjet",
          requestId: req.id
        });
      }
      throw error;
    }

  } catch (error) {
    logger.error("Error sending email reset", {
      error: error.message,
      requestId: req.id,
      stack: error.stack
    });
    
    res.status(500).json({
      error: "Erreur d'envoi email",
      message: error.message,
      requestId: req.id
    });
  }
});

app.post("/api/sms/reset", requireApiKey, async (req, res) => {
  try {
    const { username, apiKey, code } = req.body;

    logger.info("SMS reset request", {
      username: username ? `${username.substring(0, 3)}***` : 'missing',
      hasApiKey: !!apiKey,
      hasCode: !!code,
      requestId: req.id
    });

    if (!username || !apiKey || !code) {
      logger.warn("Missing parameters for SMS reset", {
        hasUsername: !!username,
        hasApiKey: !!apiKey,
        hasCode: !!code,
        requestId: req.id
      });
      
      return res.status(400).json({
        error: "Paramètres manquants",
        required: ["username", "apiKey", "code"],
        requestId: req.id
      });
    }
    
    try {
      // 🔥 UTILISATION DU VRAI SERVICE SMS
      await SmsService.sendPasswordResetCode(username, apiKey, code);
      
      logger.info("SMS reset sent successfully", {
        username: `${username.substring(0, 3)}***`,
        provider: 'free_mobile',
        requestId: req.id
      });
      
      res.json({
        success: true,
        message: "SMS de reset envoyé ✅",
        requestId: req.id
      });
    } catch (error) {
      logger.info("SMS reset fallback to simulation", {
        username: `${username.substring(0, 3)}***`,
        reason: 'free_mobile_error',
        requestId: req.id
      });
      
      res.json({
        success: true,
        message: "SMS simulé - Vérifiez la config Free Mobile",
        requestId: req.id
      });
    }

  } catch (error) {
    logger.error("Error sending SMS reset", {
      error: error.message,
      requestId: req.id,
      stack: error.stack
    });
    
    res.status(500).json({
      error: "Erreur d'envoi SMS",
      message: error.message,
      requestId: req.id
    });
  }
});

// DOCUMENTATION API
app.get("/docs", (req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: process.env.SERVICE_VERSION || "1.0.0",
    endpoints: {
      "GET /health": "Status du service + config",
      "GET /vitals": "Informations système détaillées",
      "GET /metrics": "Métriques Prometheus",
      "GET /ping": "Test de connectivité",
      "POST /api/email/confirm": {
        description: "Envoie un email de confirmation (Mailjet)",
        body: { email: "string", token: "string" },
        headers: { "x-api-key": "required" }
      },
      "POST /api/email/reset": {
        description: "Envoie un email de reset password (Mailjet)",
        body: { email: "string", code: "string" },
        headers: { "x-api-key": "required" }
      },
      "POST /api/sms/reset": {
        description: "Envoie un SMS de reset password (Free Mobile)",
        body: { username: "string", apiKey: "string", code: "string" },
        headers: { "x-api-key": "required" }
      }
    },
    authentication: {
      header: "x-api-key",
      value: "Required for all POST endpoints"
    },
    configuration: {
      required: {
        NOTIFICATION_API_KEY: "Pour authentifier les appels"
      },
      optional: {
        MAILJET_API_KEY: "Pour envoyer de vrais emails",
        MAILJET_API_SECRET: "Pour envoyer de vrais emails",
        FREE_MOBILE_USERNAME: "Pour envoyer de vrais SMS",
        FREE_MOBILE_API_KEY: "Pour envoyer de vrais SMS",
        CORS_ORIGIN: "Origins autorisées (défaut: http://localhost:3000)"
      }
    }
  });
});

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
      "GET /health", "GET /vitals", "GET /metrics", "GET /ping", "GET /docs",
      "POST /api/email/confirm", "POST /api/email/reset", "POST /api/sms/reset"
    ]
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
  
  res.status(err.statusCode || 500).json({
    error: "Erreur serveur",
    service: SERVICE_NAME,
    requestId: req.id,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString()
  });
});

// DÉMARRAGE SEULEMENT SI PAS EN MODE TEST
if (process.env.NODE_ENV !== 'test') {
  
  // Serveur principal
  const server = app.listen(PORT, () => {
    logger.info(`✅ ${SERVICE_NAME} démarré`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      logLevel: logger.level
    });
    
    logger.info(`📋 Documentation: http://localhost:${PORT}/docs`);
    logger.info(`❤️ Health check: http://localhost:${PORT}/health`);
    logger.info(`📈 Vitals: http://localhost:${PORT}/vitals`);
    logger.info(`📊 Métriques: http://localhost:${PORT}/metrics`);
    
    updateServiceHealth(SERVICE_NAME, true);
    
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
} else {
  module.exports = app;
}