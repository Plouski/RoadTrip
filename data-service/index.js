require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./utils/logger');

// Import des métriques générales
const {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  updateServiceHealth,
  updateActiveConnections,
  updateDatabaseHealth,
  updateExternalServiceHealth
} = require("./metrics");

const app = express();
const PORT = process.env.PORT || 5002;
const SERVICE_NAME = "data-service";

logger.info(`🚀 Démarrage du ${SERVICE_NAME}...`);

// VALIDATION VARIABLES D'ENVIRONNEMENT (seulement si pas en test)
if (process.env.NODE_ENV !== 'test') {
  const requiredEnvVars = {
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    logger.error('❌ Variables d\'environnement manquantes:');
    missingVars.forEach(varName => {
      logger.error(`   - ${varName}`);
    });
    logger.error('\n💡 Créez un fichier .env avec ces variables:');
    logger.error('   MONGODB_URI=mongodb://localhost:27017/roadtrip-dev');
    logger.error('   JWT_SECRET=your-secret-key-here');
    logger.error('   JWT_REFRESH_SECRET=your-refresh-secret-here');
    process.exit(1);
  }

  logger.info('✅ Variables d\'environnement validées');
}

// MIDDLEWARES BASIQUES
app.use(helmet());

const allowedOrigins = [
  "http://localhost:3000",
  "https://road-trip-iota.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.error("❌ Origin non autorisée par CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// MIDDLEWARE DE MÉTRIQUES PROMETHEUS
let currentConnections = 0;

app.use((req, res, next) => {
  const start = Date.now();
  currentConnections++;
  updateActiveConnections(currentConnections);
  
  res.on('finish', () => {
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
    
    // Logging (seulement si pas en test)
    if (process.env.NODE_ENV !== 'test') {
      logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${Math.round(duration * 1000)}ms`);
    }
  });
  
  next();
});

// ROUTES API (import conditionnel pour éviter les erreurs Mongoose en test)
if (process.env.NODE_ENV !== 'test') {
  const tripRoutes = require('./routes/tripRoutes');
  const favoriteRoutes = require('./routes/favoriteRoutes');
  const authRoutes = require('./routes/authRoutes');
  const userRoutes = require('./routes/userRoutes');
  const messageRoutes = require('./routes/messageRoutes');
  const adminRoutes = require("./routes/adminRoutes");

  app.use('/api/roadtrips', tripRoutes);        // Business logic
  app.use('/api/favorites', favoriteRoutes);    // Fonctionnalités utilisateur
  app.use('/api/messages', messageRoutes);      // 🔗 LIEN AI SERVICE
  app.use('/api/admin', adminRoutes);           // Admin panel
  app.use('/api/auth', authRoutes);             // 🔗 LIEN NOTIFICATION SERVICE  
  app.use('/api/users', userRoutes);            // 🔗 LIEN PAYMENT SERVICE
} else {
  // Routes mockées pour les tests
  app.use('/api/roadtrips', (req, res) => res.json({ status: 'mock', data: [] }));
  app.use('/api/favorites', (req, res) => res.json({ status: 'mock' }));
  app.use('/api/messages', (req, res) => res.json({ status: 'mock' }));
  app.use('/api/admin', (req, res) => res.json({ status: 'mock' }));
  app.use('/api/auth', (req, res) => res.json({ status: 'mock' }));
  app.use('/api/users', (req, res) => res.json({ status: 'mock' }));
}

// MÉTRIQUES PROMETHEUS
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// HEALTH CHECK ENRICHI
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    dependencies: {}
  };

  // Vérifier MongoDB
  const dbState = mongoose.connection.readyState;
  if (dbState === 1) {
    health.dependencies.mongodb = 'connected';
    updateDatabaseHealth('mongodb', true);
  } else {
    health.dependencies.mongodb = 'disconnected';
    health.status = 'degraded';
    updateDatabaseHealth('mongodb', false);
  }

  // En mode test, simuler les services externes
  if (process.env.NODE_ENV === 'test') {
    health.dependencies.notificationService = 'mocked';
    health.dependencies.aiService = 'mocked';
    health.dependencies.authService = 'mocked';
    updateExternalServiceHealth('notification_service', true);
    updateExternalServiceHealth('ai_service', true);
    updateExternalServiceHealth('auth_service', true);
  } else {
    // Vérifier Notification Service (lien critique)
    try {
      const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5005';
      const response = await fetch(`${notificationUrl}/health`, { 
        signal: AbortSignal.timeout(2000) 
      });
      const isHealthy = response.ok;
      health.dependencies.notificationService = isHealthy ? 'healthy' : 'unhealthy';
      updateExternalServiceHealth('notification_service', isHealthy);
    } catch (error) {
      health.dependencies.notificationService = 'unreachable';
      updateExternalServiceHealth('notification_service', false);
      if (health.status === 'healthy') health.status = 'degraded';
    }

    // Vérifier AI Service
    try {
      const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:5003';
      const response = await fetch(`${aiUrl}/health`, { 
        signal: AbortSignal.timeout(2000) 
      });
      const isHealthy = response.ok;
      health.dependencies.aiService = isHealthy ? 'healthy' : 'unhealthy';
      updateExternalServiceHealth('ai_service', isHealthy);
    } catch (error) {
      health.dependencies.aiService = 'unreachable';
      updateExternalServiceHealth('ai_service', false);
    }

    // Vérifier Auth Service
    try {
      const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
      const response = await fetch(`${authUrl}/health`, { 
        signal: AbortSignal.timeout(2000) 
      });
      const isHealthy = response.ok;
      health.dependencies.authService = isHealthy ? 'healthy' : 'unhealthy';
      updateExternalServiceHealth('auth_service', isHealthy);
    } catch (error) {
      health.dependencies.authService = 'unreachable';
      updateExternalServiceHealth('auth_service', false);
    }
  }

  // Mettre à jour la santé globale du service
  const isServiceHealthy = health.status === 'healthy';
  updateServiceHealth(SERVICE_NAME, isServiceHealthy);

  const statusCode = isServiceHealthy ? 200 : 503;
  res.status(statusCode).json(health);
});

// DOCUMENTATION API
app.get("/docs", (req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: "1.0.0",
    description: "Service de données avec intégrations AI, Notification et Payment",
    
    integrations: {
      notification_service: {
        url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5005',
        endpoints: [
          'POST /api/auth/register → Email confirmation',
          'POST /api/auth/reset-password → Email/SMS reset'
        ]
      },
      ai_service: {
        url: process.env.AI_SERVICE_URL || 'http://localhost:5003',
        endpoints: [
          'POST /api/messages → Sauvegarde conversations',
          'GET /api/messages/user/:id → Historique'
        ]
      },
      auth_service: {
        url: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
        endpoints: [
          'POST /api/auth/oauth/* → OAuth delegations'
        ]
      },
      payment_service: {
        endpoints: [
          'POST /api/auth/refresh-user-data → Upgrade premium'
        ]
      }
    },
    
    main_endpoints: {
      "GET /health": "Status du service + dépendances",
      "GET /vitals": "Informations système",
      "GET /metrics": "Métriques Prometheus",
      "POST /api/auth/register": "Inscription utilisateur",
      "POST /api/auth/login": "Connexion", 
      "GET /api/roadtrips": "Liste roadtrips publics",
      "GET /api/roadtrips/:id": "Détails roadtrip (logique premium)",
      "POST /api/favorites/toggle/:id": "Gérer favoris",
      "POST /api/messages": "Sauvegarder message IA",
      "GET /api/admin/stats": "Statistiques admin"
    },
    
    authentication: {
      type: "JWT Bearer Token",
      header: "Authorization: Bearer <token>",
      endpoints: {
        login: "POST /api/auth/login",
        refresh: "POST /api/auth/refresh-token"
      }
    }
  });
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
    
    database: {
      mongodb: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        collections: ['users', 'trips', 'favorites', 'aimessages', 'subscriptions']
      }
    },
    
    features: [
      'JWT Authentication',
      'MongoDB Persistence', 
      'Premium Content Logic',
      'Admin Panel',
      'GDPR Compliance',
      'Prometheus Metrics'
    ],
    
    integrations: [
      '🔗 Notification Service (emails/SMS)',
      '🔗 AI Service (conversations)',
      '🔗 Auth Service (OAuth)',
      '🔗 Payment Service (premium)'
    ]
  };

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

// GESTION D'ERREURS SIMPLE
app.use((req, res) => {
  res.status(404).json({
    error: "Route non trouvée",
    service: SERVICE_NAME,
    availableRoutes: [
      "/health", "/vitals", "/docs", "/metrics", "/ping",
      "/api/auth/*", "/api/roadtrips/*", "/api/favorites/*", 
      "/api/messages/* (🔗 ai)", "/api/admin/*"
    ]
  });
});

app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    logger.error(`❌ Erreur ${SERVICE_NAME}:`, err.message);
  }
  
  // Erreurs MongoDB
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    return res.status(503).json({
      error: "Erreur base de données",
      service: SERVICE_NAME,
      message: "Service temporairement indisponible"
    });
  }

  // Erreurs JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: "Token invalide",
      message: "Authentification requise"
    });
  }

  // Erreur générique
  res.status(err.statusCode || 500).json({
    error: "Erreur serveur",
    service: SERVICE_NAME,
    message: err.message || "Une erreur est survenue",
    timestamp: new Date().toISOString()
  });
});

// DÉMARRAGE SEULEMENT SI PAS EN MODE TEST
if (process.env.NODE_ENV !== 'test') {
  async function startServer() {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info('✅ MongoDB connecté');
      updateDatabaseHealth('mongodb', true);

      const server = app.listen(PORT, () => {
        logger.info(`💾 ${SERVICE_NAME} démarré sur le port ${PORT}`);
        logger.info(`📋 Documentation: http://localhost:${PORT}/docs`);
        logger.info(`❤️ Health check: http://localhost:${PORT}/health`);
        logger.info(`📈 Vitals: http://localhost:${PORT}/vitals`);
        logger.info(`📊 Métriques: http://localhost:${PORT}/metrics`);
        logger.info(`🔗 Intégrations: Notification (${process.env.NOTIFICATION_SERVICE_URL || '5005'}), AI, Payment`);
        
        // Initialisation des métriques
        updateServiceHealth(SERVICE_NAME, true);
        
        logger.info(`\n🚀 ${SERVICE_NAME} prêt !`);
      });

    } catch (error) {
      logger.error('❌ Erreur démarrage:', error);
      updateServiceHealth(SERVICE_NAME, false);
      process.exit(1);
    }
  }

  // ARRÊT GRACIEUX
  async function gracefulShutdown(signal) {
    logger.info(`🔄 Arrêt ${SERVICE_NAME} (${signal})...`);
    
    updateServiceHealth(SERVICE_NAME, false);
    updateActiveConnections(0);
    
    try {
      await mongoose.connection.close();
      logger.info('✅ MongoDB fermé proprement');
    } catch (error) {
      logger.error('❌ Erreur fermeture MongoDB:', error);
    }
    
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', reason);
    updateServiceHealth(SERVICE_NAME, false);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    updateServiceHealth(SERVICE_NAME, false);
    process.exit(1);
  });

  startServer();
}

// Export pour les tests
module.exports = app;