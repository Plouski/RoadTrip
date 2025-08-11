const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const passport = require("passport");
const PassportConfig = require("../config/passportConfig");
const logger = require("../utils/logger");

function applySecurity(app) {
  // Helmet + CSP
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "https://accounts.google.com", "https://connect.facebook.net"],
          connectSrc: ["'self'", "https://accounts.google.com", "https://graph.facebook.com"],
        },
      },
    })
  );
  logger.info("🛡️ Helmet configuré");

  // Rate limit
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
  logger.info("🚦 Rate limiting configuré");

  // Session
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
  logger.info("🔐 Session configurée", { secure: sessionConfig.cookie.secure });

  if (!process.env.SESSION_SECRET) {
    logger.security("⚠️ SESSION_SECRET non défini - clé par défaut");
  }

  // Passport
  app.use(passport.initialize());
  app.use(passport.session());
  PassportConfig.initializeStrategies();
  logger.info("🎫 Passport initialisé");
}

module.exports = { applySecurity };