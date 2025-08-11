const { SERVICE_NAME, NODE_ENV } = require("../config");

module.exports = (logger) => ({
  notFound: (req, res) => {
    logger.warn("Route not found", {
      method: req.method,
      path: req.path,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      requestId: req.id,
    });

    res.status(404).json({
      error: "Route non trouvée",
      service: SERVICE_NAME,
      requestId: req.id,
      availableRoutes: [
        "GET /health",
        "GET /vitals",
        "GET /metrics",
        "GET /ping",
        "GET /api/dashboard",
        "GET /api/services/status",
        "GET /",
      ],
    });
  },

  global: (err, req, res, _next) => {
    logger.error(`💥 Erreur ${SERVICE_NAME}:`, {
      error: err,
      method: req.method,
      path: req.path,
      requestId: req.id,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
    });

    res.status(500).json({
      error: "Erreur serveur",
      service: SERVICE_NAME,
      requestId: req.id,
      message: NODE_ENV === "production" ? "Internal server error" : err.message,
    });
  },
});