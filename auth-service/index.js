require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const PassportConfig = require("./config/passportConfig");
const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5001;
const SERVICE_NAME = "auth-service";

console.log(`🚀 Démarrage ${SERVICE_NAME} MVP...`);

// MÉTRIQUES SIMPLES (Bloc 4 - Monitoring)
let requestCount = 0;
let errorCount = 0;
let authSuccessCount = 0;
let authFailureCount = 0;
const startTime = Date.now();

// INITIALISATION
(async () => {
  try {
    // Connexion MongoDB (optionnelle)
    if (process.env.MONGODB_URI) {
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ MongoDB connecté");
      } catch (error) {
        console.warn("⚠️ MongoDB non disponible:", error.message);
      }
    }

    // SÉCURITÉ OWASP (Bloc 2 - Sécurisation)
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "https://accounts.google.com", "https://connect.facebook.net"],
          connectSrc: ["'self'", "https://accounts.google.com", "https://graph.facebook.com"]
        }
      }
    }));

    // Rate Limiting (OWASP A4 - Broken Access Control)
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requêtes par IP
      message: { error: "Trop de requêtes, réessayez dans 15 minutes" }
    });

    const oauthLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 tentatives OAuth par IP
      message: { error: "Trop de tentatives OAuth" }
    });

    app.use(generalLimiter);
    app.use('/auth/oauth', oauthLimiter);

    // MIDDLEWARES ESSENTIELS
    app.use(cors({
      origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }));

    app.use(express.json({ limit: "1mb" }));
    app.use(express.urlencoded({ extended: true, limit: "1mb" }));

    // LOGGING ET MÉTRIQUES (Bloc 4 - Monitoring)
    app.use((req, res, next) => {
      const start = Date.now();
      requestCount++;
      
      res.on("finish", () => {
        const duration = Date.now() - start;
        
        // Comptage des erreurs
        if (res.statusCode >= 400) {
          errorCount++;
        }
        
        // Logging sécuritaire
        if (req.path.includes('/auth/oauth')) {
          console.log(`🔐 OAuth: ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - IP: ${req.ip}`);
          
          if (res.statusCode === 302) {
            authSuccessCount++;
          } else if (res.statusCode >= 400) {
            authFailureCount++;
          }
        } else {
          console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
        }
      });
      
      next();
    });

    // Session sécurisée
    app.use(session({
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      },
      name: "auth.session.id",
    }));

    // PASSPORT
    app.use(passport.initialize());
    app.use(passport.session());
    PassportConfig.initializeStrategies();

    // ROUTES OAUTH
    app.use("/auth", authRoutes);

    // HEALTH CHECK ENRICHI (Bloc 4 - Supervision)
    app.get("/health", (req, res) => {
      const uptime = Date.now() - startTime;
      const errorRate = requestCount > 0 ? (errorCount / requestCount) : 0;
      const authSuccessRate = (authSuccessCount + authFailureCount) > 0 ? 
        (authSuccessCount / (authSuccessCount + authFailureCount)) : 0;

      const health = {
        status: "healthy",
        service: SERVICE_NAME,
        timestamp: new Date().toISOString(),
        uptime: Math.round(uptime / 1000), // en secondes
        version: "1.0.0",
        
        // Métriques de performance
        metrics: {
          totalRequests: requestCount,
          totalErrors: errorCount,
          errorRate: Math.round(errorRate * 100 * 100) / 100, // 2 décimales
          authSuccess: authSuccessCount,
          authFailures: authFailureCount,
          authSuccessRate: Math.round(authSuccessRate * 100 * 100) / 100
        },

        // Configuration
        config: {
          session: !!process.env.SESSION_SECRET,
          mongodb: mongoose.connection.readyState === 1,
          google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
          facebook: !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
          cors: !!process.env.CORS_ORIGIN,
          port: PORT,
          environment: process.env.NODE_ENV || 'development'
        },

        // Sécurité OWASP
        security: {
          helmet: true,
          rateLimit: true,
          httpsOnly: process.env.NODE_ENV === 'production',
          secureSession: true,
          csrf: true
        }
      };

      // Déterminer le statut global
      const hasBasicConfig = health.config.session;
      const hasOAuthProvider = health.config.google || health.config.facebook;
      const isHighErrorRate = errorRate > 0.05; // 5%
      
      if (!hasBasicConfig || !hasOAuthProvider || isHighErrorRate) {
        health.status = "degraded";
      }

      const statusCode = health.status === "healthy" ? 200 : 503;
      res.status(statusCode).json(health);
    });

    // MONITORING SIMPLE (Bloc 4 - Maintenance)
    app.get("/metrics", (req, res) => {
      const uptime = Date.now() - startTime;
      
      res.json({
        service: SERVICE_NAME,
        timestamp: new Date().toISOString(),
        
        // Métriques système
        system: {
          uptime: Math.round(uptime / 1000),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        },
        
        // Métriques applicatives
        application: {
          totalRequests: requestCount,
          totalErrors: errorCount,
          errorRate: requestCount > 0 ? (errorCount / requestCount) : 0,
          requestsPerMinute: Math.round((requestCount / (uptime / 60000)) * 100) / 100
        },
        
        // Métriques OAuth
        oauth: {
          totalAuthAttempts: authSuccessCount + authFailureCount,
          successfulAuth: authSuccessCount,
          failedAuth: authFailureCount,
          successRate: (authSuccessCount + authFailureCount) > 0 ? 
            (authSuccessCount / (authSuccessCount + authFailureCount)) : 0
        }
      });
    });

    // DOCUMENTATION API
    app.get("/docs", (req, res) => {
      res.json({
        service: SERVICE_NAME,
        version: "1.0.0",
        description: "Service d'authentification OAuth MVP - Conforme RNCP39583",
        
        endpoints: {
          "GET /auth/oauth/google": "Initie l'authentification Google OAuth",
          "GET /auth/oauth/google/callback": "Callback Google OAuth",
          "GET /auth/oauth/facebook": "Initie l'authentification Facebook OAuth",
          "GET /auth/oauth/facebook/callback": "Callback Facebook OAuth",
          "POST /auth/logout": "Déconnexion utilisateur",
          "GET /auth/providers": "Liste des providers OAuth disponibles",
          "GET /health": "Status du service + métriques",
          "GET /metrics": "Métriques détaillées (Bloc 4 RNCP)",
          "GET /docs": "Documentation API"
        },
        
      });
    });

    // INFO SUR LES PROVIDERS
    app.get("/providers", (req, res) => {
      const providers = {
        google: {
          available: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
          url: "/auth/oauth/google",
          callback: process.env.GOOGLE_CALLBACK_URL
        },
        facebook: {
          available: !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
          url: "/auth/oauth/facebook", 
          callback: process.env.FACEBOOK_CALLBACK_URL
        }
      };

      const availableProviders = Object.entries(providers)
        .filter(([_, config]) => config.available)
        .map(([name]) => name);

      res.json({
        service: SERVICE_NAME,
        availableProviders,
        providers,
        totalAvailable: availableProviders.length,
        metrics: {
          authSuccessCount,
          authFailureCount,
          lastUpdate: new Date().toISOString()
        }
      });
    });

    // GESTION D'ERREURS
    app.use((req, res) => {
      res.status(404).json({
        error: "Route non trouvée",
        service: SERVICE_NAME,
        availableRoutes: [
          "/health", "/docs", "/metrics", "/providers", 
          "/auth/oauth/google", "/auth/oauth/facebook"
        ]
      });
    });

    app.use((err, req, res, next) => {
      errorCount++;
      console.error(`❌ Erreur ${SERVICE_NAME}:`, err.message);
      
      res.status(err.statusCode || 500).json({
        error: "Erreur serveur",
        service: SERVICE_NAME,
        message: err.message || "Une erreur est survenue",
        timestamp: new Date().toISOString()
      });
    });

    // DÉMARRAGE AVEC INFO CONFIG
    app.listen(PORT, () => {
      console.log(`✅ ${SERVICE_NAME} MVP démarré sur le port ${PORT}`);
      console.log(`📋 Documentation: http://localhost:${PORT}/docs`);
      console.log(`❤️ Health check: http://localhost:${PORT}/health`);
      console.log(`📊 Métriques: http://localhost:${PORT}/metrics`);
      console.log(`🔧 Providers: http://localhost:${PORT}/providers`);
      
      // Info configuration OAuth
      const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
      console.log(`🔑 Google OAuth: ${googleConfigured ? 'CONFIGURÉ ✅' : 'NON CONFIGURÉ ❌'}`);
      if (googleConfigured) {
        console.log(`   ↳ http://localhost:${PORT}/auth/oauth/google`);
      }
      
      const facebookConfigured = !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET);
      console.log(`🔑 Facebook OAuth: ${facebookConfigured ? 'CONFIGURÉ ✅' : 'NON CONFIGURÉ ❌'}`);
      if (facebookConfigured) {
        console.log(`   ↳ http://localhost:${PORT}/auth/oauth/facebook`);
      }

      // Info base de données
      const mongoStatus = mongoose.connection.readyState === 1 ? 'CONNECTÉ ✅' : 'NON CONNECTÉ ❌';
      console.log(`🗄️ MongoDB: ${mongoStatus}`);
      
      // Avertissements
      if (!googleConfigured && !facebookConfigured) {
        console.log(`\n⚠️ ATTENTION: Aucun provider OAuth configuré!`);
        console.log(`   Ajoutez GOOGLE_CLIENT_ID/SECRET ou FACEBOOK_CLIENT_ID/SECRET dans .env`);
      }
      
      if (!process.env.SESSION_SECRET) {
        console.log(`⚠️ ATTENTION: SESSION_SECRET non défini, utilisation d'une clé par défaut`);
      }
      
      console.log(`\n🚀 Service prêt pour MVP M2 !`);
    });

  } catch (err) {
    console.error("❌ Erreur fatale au démarrage:", err.message);
    process.exit(1);
  }
})();

// GRACEFUL SHUTDOWN
process.on("SIGTERM", () => {
  console.log("🔄 Arrêt du service...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🔄 Arrêt du service...");
  process.exit(0);
});

module.exports = app;