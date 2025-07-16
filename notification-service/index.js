require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

// 🔥 IMPORT DES VRAIS SERVICES
const EmailService = require("./services/emailService");
const SmsService = require("./services/smsService");

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
const SERVICE_NAME = "notification-service";

console.log(`🚀 Démarrage ${SERVICE_NAME}...`);

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
    
    // Logging (silencieux en mode test)
    if (process.env.NODE_ENV !== 'test') {
      console.log(`${req.method} ${req.path} - ${res.statusCode} - ${Math.round(duration * 1000)}ms`);
    }
  });
  
  next();
});

// MIDDLEWARE D'AUTHENTIFICATION SIMPLE
const requireApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(403).json({ 
      error: "API key requise",
      message: "Ajoutez l'en-tête x-api-key" 
    });
  }
  next();
};

// VALIDATION SIMPLE
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// MÉTRIQUES PROMETHEUS
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// 🔥 VRAIES ROUTES AVEC VRAIS SERVICES
app.post("/api/email/confirm", requireApiKey, async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({
        error: "Paramètres manquants",
        required: ["email", "token"]
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        error: "Email invalide"
      });
    }

    if (process.env.NODE_ENV !== 'test') {
      console.log(`📧 Tentative envoi VRAI email de confirmation à ${email}`);
    }

    try {
      // 🔥 UTILISATION DU VRAI SERVICE EMAIL
      await EmailService.sendConfirmationEmail(email, token);
      
      res.json({
        success: true,
        message: "Email de confirmation envoyé avec Mailjet ✅"
      });
    } catch (error) {
      // Si Mailjet pas configuré, mode simulation
      if (error.message.includes('Configuration Mailjet manquante')) {
        if (process.env.NODE_ENV !== 'test') {
          console.log(`📧 [FALLBACK SIMULATION] Email confirmation pour ${email}`);
        }
        return res.json({
          success: true,
          message: "Email simulé - Configurez Mailjet pour de vrais emails",
          note: "Ajoutez MAILJET_API_KEY et MAILJET_API_SECRET dans .env"
        });
      }
      throw error;
    }

  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error("❌ Erreur email confirmation:", error.message);
    }
    res.status(500).json({
      error: "Erreur d'envoi email",
      message: error.message
    });
  }
});

app.post("/api/email/reset", requireApiKey, async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        error: "Paramètres manquants",
        required: ["email", "code"]
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        error: "Email invalide"
      });
    }

    if (process.env.NODE_ENV !== 'test') {
      console.log(`📧 Tentative envoi VRAI email reset à ${email}`);
    }

    try {
      // 🔥 UTILISATION DU VRAI SERVICE EMAIL
      await EmailService.sendPasswordResetEmail(email, code);
      
      res.json({
        success: true,
        message: "Email de reset envoyé avec Mailjet ✅"
      });
    } catch (error) {
      if (error.message.includes('Configuration Mailjet manquante')) {
        if (process.env.NODE_ENV !== 'test') {
          console.log(`📧 [FALLBACK SIMULATION] Email reset pour ${email}`);
        }
        return res.json({
          success: true,
          message: "Email reset simulé - Configurez Mailjet"
        });
      }
      throw error;
    }

  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error("❌ Erreur email reset:", error.message);
    }
    res.status(500).json({
      error: "Erreur d'envoi email",
      message: error.message
    });
  }
});

app.post("/api/sms/reset", requireApiKey, async (req, res) => {
  try {
    const { username, apiKey, code } = req.body;

    if (!username || !apiKey || !code) {
      return res.status(400).json({
        error: "Paramètres manquants",
        required: ["username", "apiKey", "code"]
      });
    }

    if (process.env.NODE_ENV !== 'test') {
      console.log(`📱 Tentative envoi VRAI SMS à ${username}`);
    }
    
    try {
      // 🔥 UTILISATION DU VRAI SERVICE SMS
      await SmsService.sendPasswordResetCode(username, apiKey, code);
      
      res.json({
        success: true,
        message: "SMS de reset envoyé ✅"
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`📱 [FALLBACK SIMULATION] SMS reset pour ${username}`);
      }
      res.json({
        success: true,
        message: "SMS simulé - Vérifiez la config Free Mobile"
      });
    }

  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error("❌ Erreur SMS reset:", error.message);
    }
    res.status(500).json({
      error: "Erreur d'envoi SMS",
      message: error.message
    });
  }
});

// HEALTH CHECK ENRICHI
app.get("/health", (req, res) => {
  const health = {
    status: "healthy",
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.0.0"
  };

  // Test configuration
  health.config = {
    auth: !!process.env.API_KEY,
    mailjet: !!(process.env.MAILJET_API_KEY && process.env.MAILJET_API_SECRET),
    freeMobile: !!(process.env.FREE_MOBILE_USERNAME && process.env.FREE_MOBILE_API_KEY),
    port: PORT
  };

  // Mettre à jour les métriques des services externes
  updateExternalServiceHealth('mailjet', health.config.mailjet);
  updateExternalServiceHealth('free_mobile', health.config.freeMobile);

  // Mettre à jour la santé globale du service
  const isHealthy = health.status === "healthy";
  updateServiceHealth(SERVICE_NAME, isHealthy);

  res.status(200).json(health);
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
    
    features: [
      'Email Notifications (Mailjet)',
      'SMS Notifications (Free Mobile)',
      'API Key Authentication',
      'Fallback Simulation Mode',
      'Prometheus Metrics'
    ],
    
    providers: {
      mailjet: {
        configured: !!(process.env.MAILJET_API_KEY && process.env.MAILJET_API_SECRET),
        status: 'Email provider for confirmations and resets'
      },
      freeMobile: {
        configured: !!(process.env.FREE_MOBILE_USERNAME && process.env.FREE_MOBILE_API_KEY),
        status: 'SMS provider for password resets'
      }
    }
  };

  res.json(vitals);
});

// DOCUMENTATION API
app.get("/docs", (req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: "1.0.0",
    endpoints: {
      "GET /health": "Status du service + config",
      "GET /vitals": "Informations système",
      "GET /metrics": "Métriques Prometheus",
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
        API_KEY: "Pour authentifier les appels",
        MAILJET_API_KEY: "Pour envoyer de vrais emails",
        MAILJET_API_SECRET: "Pour envoyer de vrais emails"
      },
      optional: {
        FREE_MOBILE_USERNAME: "Pour envoyer de vrais SMS",
        FREE_MOBILE_API_KEY: "Pour envoyer de vrais SMS",
        FRONTEND_URL: "URL du frontend (défaut: http://localhost:3000)"
      }
    }
  });
});

// GESTION D'ERREURS SIMPLE
app.use((req, res) => {
  res.status(404).json({
    error: "Route non trouvée",
    service: SERVICE_NAME,
    availableRoutes: ["/health", "/vitals", "/docs", "/metrics", "/api/email/*", "/api/sms/*"]
  });
});

app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error(`❌ Erreur ${SERVICE_NAME}:`, err.message);
  }
  
  res.status(err.statusCode || 500).json({
    error: "Erreur serveur",
    service: SERVICE_NAME,
    message: err.message || "Une erreur est survenue",
    timestamp: new Date().toISOString()
  });
});

// DÉMARRAGE SEULEMENT SI PAS EN MODE TEST
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`✅ ${SERVICE_NAME} démarré sur le port ${PORT}`);
    console.log(`📋 Documentation: http://localhost:${PORT}/docs`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
    console.log(`📈 Vitals: http://localhost:${PORT}/vitals`);
    console.log(`📊 Métriques: http://localhost:${PORT}/metrics`);
    console.log(`🔑 API Key configurée: ${process.env.API_KEY ? 'OUI' : 'NON'}`);
    
    // Info config
    const mailjetConfigured = !!(process.env.MAILJET_API_KEY && process.env.MAILJET_API_SECRET);
    console.log(`📧 Mailjet configuré: ${mailjetConfigured ? 'OUI - Emails réels' : 'NON - Mode simulation'}`);
    
    const smsConfigured = !!(process.env.FREE_MOBILE_USERNAME && process.env.FREE_MOBILE_API_KEY);
    console.log(`📱 Free Mobile configuré: ${smsConfigured ? 'OUI - SMS réels' : 'NON - Mode simulation'}`);

    // Initialisation des métriques
    updateServiceHealth(SERVICE_NAME, true);
    updateExternalServiceHealth('mailjet', mailjetConfigured);
    updateExternalServiceHealth('free_mobile', smsConfigured);
    
    console.log(`\n🚀 ${SERVICE_NAME} prêt !`);
  });

  // GRACEFUL SHUTDOWN
  function gracefulShutdown(signal) {
    console.log(`🔄 Arrêt du service (${signal})...`);
    updateServiceHealth(SERVICE_NAME, false);
    updateActiveConnections(0);
    
    if (server) {
      server.close(() => {
        console.log('📴 Serveur fermé');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);

  module.exports = { app, server };
} else {
  module.exports = app;
}