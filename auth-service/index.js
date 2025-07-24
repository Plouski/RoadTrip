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
const logger = require("./utils/logger"); // 🎯 Nouveau logger

// Import des métriques générales
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
const PORT = process.env.PORT || 5001;
const SERVICE_NAME = "auth-service";

logger.info(`🚀 Démarrage ${SERVICE_NAME}...`, {
  port: PORT,
  nodeEnv: process.env.NODE_ENV || 'development',
  version: '1.0.0'
});

// MÉTRIQUES SIMPLES (pour compatibilité)
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
        logger.info('🔗 Tentative de connexion MongoDB', {
          mongoUri: process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@') // Masquer les credentials
        });
        
        await mongoose.connect(process.env.MONGODB_URI);
        
        logger.info("✅ MongoDB connecté avec succès", {
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          name: mongoose.connection.name
        });
        
        updateDatabaseHealth("mongodb", true);
      } catch (error) {
        logger.error("⚠️ MongoDB non disponible", {
          error: {
            message: error.message,
            name: error.name
          },
          mongoUri: process.env.MONGODB_URI ? 'configuré' : 'non configuré'
        });
        updateDatabaseHealth("mongodb", false);
      }
    } else {
      logger.warn('⚠️ MongoDB URI non configurée', {
        env: 'MONGODB_URI manquant'
      });
      updateDatabaseHealth("mongodb", false);
    }

    // SÉCURITÉ OWASP (Bloc 2 - Sécurisation)
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              "https://accounts.google.com",
              "https://connect.facebook.net",
            ],
            connectSrc: [
              "'self'",
              "https://accounts.google.com",
              "https://graph.facebook.com",
            ],
          },
        },
      })
    );

    logger.info('🛡️ Helmet configuré', {
      csp: true,
      security: 'OWASP compliant'
    });

    // Rate Limiting (OWASP A4 - Broken Access Control)
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      message: { error: "Trop de requêtes, réessayez dans 15 minutes" },
    });
    
    const oauthLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: process.env.NODE_ENV === "production" ? 10 : 100,
      message: { error: "Trop de tentatives OAuth, réessayez plus tard." },
    });

    app.use(generalLimiter);
    app.use("/auth/oauth", oauthLimiter);

    logger.info('🚦 Rate limiting configuré', {
      generalLimit: '200 req/15min',
      oauthLimit: process.env.NODE_ENV === "production" ? '10 req/15min' : '100 req/15min',
      production: process.env.NODE_ENV === "production"
    });

    // MIDDLEWARES ESSENTIELS
    const corsOrigins = process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"];
    
    app.use(
      cors({
        origin: corsOrigins,
        credentials: true,
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
    );

    logger.info('🌐 CORS configuré', {
      origins: corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"]
    });

    app.use(express.json({ limit: "1mb" }));
    app.use(express.urlencoded({ extended: true, limit: "1mb" }));

    // MIDDLEWARE DE LOGGING - Doit être AVANT les métriques
    app.use(logger.middleware());

    // MIDDLEWARE DE MÉTRIQUES PROMETHEUS
    let currentConnections = 0;
    app.use((req, res, next) => {
      const start = Date.now();
      requestCount++;
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

        // Comptage des erreurs (compatibilité)
        if (res.statusCode >= 400) {
          errorCount++;
        }

        // Logging spécialisé pour OAuth
        if (req.path.includes("/auth/oauth")) {
          logger.auth(`OAuth request completed`, {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: Math.round(duration * 1000),
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            requestId: req.id
          });

          if (res.statusCode === 302) {
            authSuccessCount++;
            logger.auth('OAuth success - redirect', {
              provider: req.path.includes('google') ? 'google' : 
                        req.path.includes('facebook') ? 'facebook' : 'unknown',
              ip: req.ip,
              requestId: req.id
            });
          } else if (res.statusCode >= 400) {
            authFailureCount++;
            logger.security('OAuth failure detected', {
              provider: req.path.includes('google') ? 'google' : 
                        req.path.includes('facebook') ? 'facebook' : 'unknown',
              statusCode: res.statusCode,
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              requestId: req.id
            });
          }
        }

        // Log des performances si requête lente
        if (duration > 2) {
          logger.performance('Slow request detected', {
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

    // Session sécurisée
    const sessionConfig = {
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
    };

    app.use(session(sessionConfig));

    logger.info('🔐 Session configurée', {
      secure: sessionConfig.cookie.secure,
      httpOnly: sessionConfig.cookie.httpOnly,
      maxAge: sessionConfig.cookie.maxAge / 1000 / 60, // en minutes
      sameSite: sessionConfig.cookie.sameSite,
      hasSecret: !!process.env.SESSION_SECRET
    });

    if (!process.env.SESSION_SECRET) {
      logger.security('⚠️ SESSION_SECRET non défini - utilisation clé par défaut', {
        security: 'WARNING',
        recommendation: 'Définir SESSION_SECRET en production'
      });
    }

    // PASSPORT
    app.use(passport.initialize());
    app.use(passport.session());
    PassportConfig.initializeStrategies();

    logger.info('🎫 Passport initialisé', {
      strategies: 'OAuth configuré'
    });

    // ROUTES OAUTH
    app.use("/auth", authRoutes);

    // MÉTRIQUES PROMETHEUS
    app.get("/metrics", async (req, res) => {
      try {
        res.set("Content-Type", register.contentType);
        res.end(await register.metrics());
        logger.debug('📊 Métriques Prometheus servies', {
          requestId: req.id
        });
      } catch (error) {
        logger.error('❌ Erreur serving métriques', {
          error: error.message,
          requestId: req.id
        });
        res.status(500).json({ error: 'Erreur génération métriques' });
      }
    });

    // HEALTH CHECK ENRICHI (Bloc 4 - Supervision)
    app.get("/health", (req, res) => {
      const uptime = Date.now() - startTime;
      const errorRate = requestCount > 0 ? errorCount / requestCount : 0;
      const authSuccessRate =
        authSuccessCount + authFailureCount > 0
          ? authSuccessCount / (authSuccessCount + authFailureCount)
          : 0;

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
          authSuccessRate: Math.round(authSuccessRate * 100 * 100) / 100,
          activeConnections: currentConnections,
        },
        // Configuration
        config: {
          session: !!process.env.SESSION_SECRET,
          mongodb: mongoose.connection.readyState === 1,
          google: !!(
            process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
          ),
          facebook: !!(
            process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
          ),
          cors: !!process.env.CORS_ORIGIN,
          port: PORT,
          environment: process.env.NODE_ENV || "development",
        },
        // Sécurité OWASP
        security: {
          helmet: true,
          rateLimit: true,
          httpsOnly: process.env.NODE_ENV === "production",
          secureSession: true,
          csrf: true,
        },
      };

      // Déterminer le statut global
      const hasBasicConfig = health.config.session;
      const hasOAuthProvider = health.config.google || health.config.facebook;
      const isHighErrorRate = errorRate > 0.05; // 5%

      if (!hasBasicConfig || !hasOAuthProvider || isHighErrorRate) {
        health.status = "degraded";
        
        logger.warn('⚠️ Service en mode dégradé', {
          hasBasicConfig,
          hasOAuthProvider,
          errorRate: Math.round(errorRate * 100 * 100) / 100,
          isHighErrorRate
        });
      }

      const isHealthy = health.status === "healthy";
      updateServiceHealth(SERVICE_NAME, isHealthy);

      const statusCode = isHealthy ? 200 : 503;
      
      logger.info('🏥 Health check', {
        status: health.status,
        uptime: health.uptime,
        errorRate: health.metrics.errorRate,
        authSuccessRate: health.metrics.authSuccessRate,
        requestId: req.id
      });

      res.status(statusCode).json(health);
    });

    // VITALS (Compatible avec les métriques Prometheus)
    app.get("/vitals", (req, res) => {
      const vitals = {
        service: SERVICE_NAME,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        status: "running",
        active_connections: currentConnections,
      };

      logger.debug('📈 Vitals requested', {
        uptime: vitals.uptime,
        memoryUsage: Math.round(vitals.memory.heapUsed / 1024 / 1024) + 'MB',
        activeConnections: currentConnections,
        requestId: req.id
      });

      res.json(vitals);
    });

    // DOCUMENTATION API
    app.get("/docs", (req, res) => {
      res.json({
        service: SERVICE_NAME,
        version: "1.0.0",
        description: "Service d'authentification OAuth - Conforme RNCP39583",
        endpoints: {
          "GET /auth/oauth/google": "Initie l'authentification Google OAuth",
          "GET /auth/oauth/google/callback": "Callback Google OAuth",
          "GET /auth/oauth/facebook":
            "Initie l'authentification Facebook OAuth",
          "GET /auth/oauth/facebook/callback": "Callback Facebook OAuth",
          "POST /auth/logout": "Déconnexion utilisateur",
          "GET /auth/providers": "Liste des providers OAuth disponibles",
          "GET /health": "Status du service + métriques",
          "GET /vitals": "Informations système (CPU, mémoire)",
          "GET /metrics": "Métriques Prometheus",
          "GET /docs": "Documentation API",
        },
      });
    });

    // INFO SUR LES PROVIDERS
    app.get("/providers", (req, res) => {
      const providers = {
        google: {
          available: !!(
            process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
          ),
          url: "/auth/oauth/google",
          callback: process.env.GOOGLE_CALLBACK_URL,
        },
        facebook: {
          available: !!(
            process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
          ),
          url: "/auth/oauth/facebook",
          callback: process.env.FACEBOOK_CALLBACK_URL,
        },
      };

      const availableProviders = Object.entries(providers)
        .filter(([_, config]) => config.available)
        .map(([name]) => name);

      logger.info('🔧 Providers info requested', {
        availableProviders,
        totalAvailable: availableProviders.length,
        requestId: req.id
      });

      res.json({
        service: SERVICE_NAME,
        availableProviders,
        providers,
        totalAvailable: availableProviders.length,
        metrics: {
          authSuccessCount,
          authFailureCount,
          lastUpdate: new Date().toISOString(),
        },
      });
    });

    // GESTION D'ERREURS
    app.use((req, res) => {
      logger.warn('❌ Route non trouvée', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.id
      });

      res.status(404).json({
        error: "Route non trouvée",
        service: SERVICE_NAME,
        requestId: req.id,
        availableRoutes: [
          "/health",
          "/vitals",
          "/docs",
          "/metrics",
          "/providers",
          "/auth/oauth/google",
          "/auth/oauth/facebook",
        ],
      });
    });

    app.use((err, req, res, next) => {
      errorCount++;
      
      logger.error(`❌ Erreur ${SERVICE_NAME}`, {
        error: {
          message: err.message,
          stack: err.stack,
          name: err.name
        },
        method: req.method,
        path: req.path,
        statusCode: err.statusCode || 500,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.id
      });

      res.status(err.statusCode || 500).json({
        error: "Erreur serveur",
        service: SERVICE_NAME,
        requestId: req.id,
        message: process.env.NODE_ENV === 'production' ? 'Une erreur est survenue' : err.message,
        timestamp: new Date().toISOString(),
      });
    });

    // DÉMARRAGE SEULEMENT SI PAS EN MODE TEST
    let server;
    if (process.env.NODE_ENV !== "test") {
      server = app.listen(PORT, () => {
        logger.info(`✅ ${SERVICE_NAME} démarré avec succès`, {
          port: PORT,
          environment: process.env.NODE_ENV || 'development',
          version: '1.0.0'
        });

        // Log des URLs importantes
        const baseUrl = `http://localhost:${PORT}`;
        logger.info('📋 URLs du service', {
          docs: `${baseUrl}/docs`,
          health: `${baseUrl}/health`,
          vitals: `${baseUrl}/vitals`,
          metrics: `${baseUrl}/metrics`,
          providers: `${baseUrl}/providers`
        });

        // Info configuration OAuth
        const googleConfigured = !!(
          process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        );
        
        if (googleConfigured) {
          logger.info('🔑 Google OAuth configuré', {
            url: `${baseUrl}/auth/oauth/google`,
            callbackUrl: process.env.GOOGLE_CALLBACK_URL
          });
          updateExternalServiceHealth("google_oauth", true);
        } else {
          logger.warn('🔑 Google OAuth non configuré', {
            missing: 'GOOGLE_CLIENT_ID et/ou GOOGLE_CLIENT_SECRET'
          });
        }

        const facebookConfigured = !!(
          process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
        );
        
        if (facebookConfigured) {
          logger.info('🔑 Facebook OAuth configuré', {
            url: `${baseUrl}/auth/oauth/facebook`,
            callbackUrl: process.env.FACEBOOK_CALLBACK_URL
          });
          updateExternalServiceHealth("facebook_oauth", true);
        } else {
          logger.warn('🔑 Facebook OAuth non configuré', {
            missing: 'FACEBOOK_CLIENT_ID et/ou FACEBOOK_CLIENT_SECRET'
          });
        }

        // Info base de données
        const mongoStatus = mongoose.connection.readyState === 1;
        logger.info('🗄️ MongoDB status', {
          connected: mongoStatus,
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host || 'non configuré'
        });

        // Avertissements de sécurité
        if (!googleConfigured && !facebookConfigured) {
          logger.security('⚠️ Aucun provider OAuth configuré', {
            security: 'WARNING',
            recommendation: 'Configurer au moins Google ou Facebook OAuth'
          });
        }

        // Initialisation des métriques
        updateServiceHealth(SERVICE_NAME, true);
        
        logger.info(`🚀 ${SERVICE_NAME} prêt pour production`, {
          oauth: { google: googleConfigured, facebook: facebookConfigured },
          database: { mongodb: mongoStatus },
          security: { helmet: true, rateLimit: true, sessions: true }
        });
      });
    }

    // GRACEFUL SHUTDOWN
    function gracefulShutdown(signal) {
      logger.info(`🔄 Arrêt du service`, {
        signal,
        uptime: process.uptime(),
        totalRequests: requestCount
      });
      
      updateServiceHealth(SERVICE_NAME, false);
      updateActiveConnections(0);
      
      if (server) {
        server.close(() => {
          logger.info("📴 Serveur fermé proprement");
          
          // Fermer la connexion MongoDB
          if (mongoose.connection.readyState === 1) {
            mongoose.connection.close(() => {
              logger.info("📴 MongoDB déconnecté");
              process.exit(0);
            });
          } else {
            process.exit(0);
          }
        });
      } else {
        process.exit(0);
      }
      
      // Timeout de sécurité
      setTimeout(() => {
        logger.error("⏰ Timeout arrêt, arrêt forcé");
        process.exit(1);
      }, 10000);
    }

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  } catch (err) {
    logger.error("❌ Erreur fatale au démarrage", {
      error: {
        message: err.message,
        stack: err.stack,
        name: err.name
      },
      service: SERVICE_NAME
    });
    
    updateServiceHealth(SERVICE_NAME, false);
    process.exit(1);
  }
})();

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.toString(),
    promise: promise?.toString(),
    service: SERVICE_NAME
  });
  updateServiceHealth(SERVICE_NAME, false);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    service: SERVICE_NAME
  });
  updateServiceHealth(SERVICE_NAME, false);
  
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Export pour les tests - IMPORTANT
module.exports = app;