require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const PassportConfig = require("./config/passportConfig");
const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5001;
const SERVICE_NAME = "auth-service";

console.log(`🚀 Démarrage ${SERVICE_NAME}...`);

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

    // MIDDLEWARES ESSENTIELS
    app.use(cors({
      origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }));

    app.use(express.json({ limit: "1mb" }));
    app.use(express.urlencoded({ extended: true, limit: "1mb" }));

    // LOGGING SIMPLE
    app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
      });
      next();
    });

    // Session
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

    // HEALTH CHECK AMÉLIORÉ
    app.get("/health", (req, res) => {
      const health = {
        status: "healthy",
        service: SERVICE_NAME,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: "1.0.0"
      };

      // Test configuration et dépendances
      health.config = {
        session: !!process.env.SESSION_SECRET,
        mongodb: mongoose.connection.readyState === 1,
        google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        facebook: !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
        cors: !!process.env.CORS_ORIGIN,
        port: PORT
      };

      // Déterminer le statut global
      const hasBasicConfig = health.config.session;
      const hasOAuthProvider = health.config.google || health.config.facebook;
      
      if (!hasBasicConfig || !hasOAuthProvider) {
        health.status = "degraded";
      }

      const statusCode = health.status === "healthy" ? 200 : 503;
      res.status(statusCode).json(health);
    });

    // DOCUMENTATION API
    app.get("/docs", (req, res) => {
      res.json({
        service: SERVICE_NAME,
        version: "1.0.0",
        description: "Service d'authentification OAuth MVP",
        endpoints: {
          "GET /auth/oauth/google": {
            description: "Initie l'authentification Google OAuth"
          },
          "GET /auth/oauth/google/callback": {
            description: "Callback Google OAuth"
          },
          "GET /auth/oauth/facebook": {
            description: "Initie l'authentification Facebook OAuth"
          },
          "GET /auth/oauth/facebook/callback": {
            description: "Callback Facebook OAuth"
          },
          "POST /auth/logout": {
            description: "Déconnexion utilisateur"
          },
          "GET /auth/providers": {
            description: "Liste des providers OAuth disponibles"
          },
          "GET /health": {
            description: "Status du service + configuration"
          }
        },
        configuration: {
          required: {
            SESSION_SECRET: "Clé secrète pour les sessions",
            GOOGLE_CLIENT_ID: "Client ID Google OAuth",
            GOOGLE_CLIENT_SECRET: "Client Secret Google OAuth",
            GOOGLE_CALLBACK_URL: "URL de callback Google"
          },
          optional: {
            FACEBOOK_CLIENT_ID: "Client ID Facebook OAuth",
            FACEBOOK_CLIENT_SECRET: "Client Secret Facebook OAuth", 
            FACEBOOK_CALLBACK_URL: "URL de callback Facebook",
            MONGODB_URI: "URL de connexion MongoDB",
            CORS_ORIGIN: "Origines CORS autorisées (défaut: http://localhost:3000)",
            FRONTEND_URL: "URL du frontend pour les redirections"
          }
        },
        oauth_urls: {
          google: `http://localhost:${PORT}/auth/oauth/google`,
          facebook: `http://localhost:${PORT}/auth/oauth/facebook`
        }
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
        totalAvailable: availableProviders.length
      });
    });

    // GESTION D'ERREURS SIMPLE
    app.use((req, res) => {
      res.status(404).json({
        error: "Route non trouvée",
        service: SERVICE_NAME,
        availableRoutes: [
          "/health", "/docs", "/providers", 
          "/auth/oauth/google", "/auth/oauth/facebook"
        ]
      });
    });

    app.use((err, req, res, next) => {
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
      console.log(`✅ ${SERVICE_NAME} démarré sur le port ${PORT}`);
      console.log(`📋 Documentation: http://localhost:${PORT}/docs`);
      console.log(`❤️ Health check: http://localhost:${PORT}/health`);
      console.log(`📊 Providers: http://localhost:${PORT}/providers`);
      
      // Info configuration OAuth
      const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
      console.log(`🔑 Google OAuth: ${googleConfigured ? 'CONFIGURÉ' : 'NON CONFIGURÉ'}`);
      if (googleConfigured) {
        console.log(`   ↳ http://localhost:${PORT}/auth/oauth/google`);
      }
      
      const facebookConfigured = !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET);
      console.log(`🔑 Facebook OAuth: ${facebookConfigured ? 'CONFIGURÉ' : 'NON CONFIGURÉ'}`);
      if (facebookConfigured) {
        console.log(`   ↳ http://localhost:${PORT}/auth/oauth/facebook`);
      }

      // Info base de données
      const mongoStatus = mongoose.connection.readyState === 1 ? 'CONNECTÉ' : 'NON CONNECTÉ';
      console.log(`🗄️ MongoDB: ${mongoStatus}`);
      
      // Avertissements
      if (!googleConfigured && !facebookConfigured) {
        console.log(`⚠️ ATTENTION: Aucun provider OAuth configuré!`);
      }
      
      if (!process.env.SESSION_SECRET) {
        console.log(`⚠️ ATTENTION: SESSION_SECRET non défini, utilisation d'une clé par défaut`);
      }
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