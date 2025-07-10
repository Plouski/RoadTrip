require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');

// Routes
const tripRoutes = require('./routes/tripRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 5002;
const SERVICE_NAME = "data-service";

console.log(`🚀 Démarrage du ${SERVICE_NAME}...`);

// VALIDATION VARIABLES D'ENVIRONNEMENT
const requiredEnvVars = {
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Variables d\'environnement manquantes:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 Créez un fichier .env avec ces variables:');
  console.error('   MONGO_URI=mongodb://localhost:27017/roadtrip-dev');
  console.error('   JWT_SECRET=your-secret-key-here');
  console.error('   JWT_REFRESH_SECRET=your-refresh-secret-here');
  process.exit(1);
}

console.log('✅ Variables d\'environnement validées');

// MIDDLEWARES BASIQUES
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// LOGGING SIMPLE
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// ROUTES API (avec liens vers autres services)
app.use('/api/roadtrips', tripRoutes);        // Business logic
app.use('/api/favorites', favoriteRoutes);    // Fonctionnalités utilisateur
app.use('/api/messages', messageRoutes);      // 🔗 LIEN AI SERVICE
app.use('/api/admin', adminRoutes);           // Admin panel
app.use('/api/auth', authRoutes);             // 🔗 LIEN NOTIFICATION SERVICE  
app.use('/api/users', userRoutes);            // 🔗 LIEN PAYMENT SERVICE

// HEALTH CHECK SIMPLE
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
  } else {
    health.dependencies.mongodb = 'disconnected';
    health.status = 'degraded';
  }

  // Vérifier Notification Service (lien critique)
  try {
    const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5005';
    const response = await fetch(`${notificationUrl}/health`, { 
      signal: AbortSignal.timeout(2000) 
    });
    health.dependencies.notificationService = response.ok ? 'healthy' : 'unhealthy';
  } catch (error) {
    health.dependencies.notificationService = 'unreachable';
    if (health.status === 'healthy') health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
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
        endpoints: [
          'POST /api/messages → Sauvegarde conversations',
          'GET /api/messages/user/:id → Historique'
        ]
      },
      payment_service: {
        endpoints: [
          'POST /api/auth/refresh-user-data → Upgrade premium'
        ]
      }
    },
    
    main_endpoints: {
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

// VITALS SIMPLIFIÉ
app.get("/vitals", (req, res) => {
  const vitals = {
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    status: "running",
    
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
      'GDPR Compliance'
    ],
    
    integrations: [
      '🔗 Notification Service (emails/SMS)',
      '🔗 AI Service (conversations)',
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
      "/health", "/docs", "/vitals", "/ping",
      "/api/auth/*", "/api/roadtrips/*", "/api/favorites/*", 
      "/api/messages/* (🔗 ai)", "/api/admin/*"
    ]
  });
});

app.use((err, req, res, next) => {
  console.error(`❌ Erreur ${SERVICE_NAME}:`, err.message);
  
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

// DÉMARRAGE
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connecté');

    app.listen(PORT, () => {
      console.log(`💾 ${SERVICE_NAME} démarré sur le port ${PORT}`);
      console.log(`📋 Documentation: http://localhost:${PORT}/docs`);
      console.log(`❤️ Health check: http://localhost:${PORT}/health`);
      console.log(`📈 Vitals: http://localhost:${PORT}/vitals`);
      console.log(`🔗 Intégrations: Notification (${process.env.NOTIFICATION_SERVICE_URL || '5005'}), AI, Payment`);
    });

  } catch (error) {
    console.error('❌ Erreur démarrage:', error);
    process.exit(1);
  }
}

// ARRÊT GRACIEUX
async function gracefulShutdown(signal) {
  console.log(`🔄 Arrêt ${SERVICE_NAME} (${signal})...`);
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB fermé proprement');
  } catch (error) {
    console.error('❌ Erreur fermeture MongoDB:', error);
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();

module.exports = app;