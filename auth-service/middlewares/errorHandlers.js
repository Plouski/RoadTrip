const logger = require("../utils/logger");
const SERVICE_NAME = process.env.SERVICE_NAME || "auth-service";

module.exports = {
  notFound: (req, res) => {
    logger.warn("❌ Route non trouvée", {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      requestId: req.id,
    });

    res.status(404).json({
      error: "Route non trouvée",
      service: SERVICE_NAME,
      requestId: req.id,
      availableRoutes: [
        "/health",
        "/vitals",
        "/metrics",
        "/providers",
        "/auth/oauth/google",
        "/auth/oauth/facebook",
      ],
    });
  },

  global: (err, req, res, _next) => {
    logger.error(`❌ Erreur ${SERVICE_NAME}`, {
      error: { message: err.message, stack: err.stack, name: err.name },
      method: req.method,
      path: req.path,
      statusCode: err.statusCode || 500,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      requestId: req.id,
    });

    res.status(err.statusCode || 500).json({
      error: "Erreur serveur",
      service: SERVICE_NAME,
      requestId: req.id,
      message: process.env.NODE_ENV === "production" ? "Une erreur est survenue" : err.message,
      timestamp: new Date().toISOString(),
    });
  },
};