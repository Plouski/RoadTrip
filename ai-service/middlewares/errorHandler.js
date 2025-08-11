const logger = require("../utils/logger");

module.exports = (err, req, res, next) => {
  logger.error(`💥 Erreur:`, {
    error: err,
    method: req.method,
    path: req.path,
    requestId: req.id
  });

  res.status(500).json({
    error: "Erreur serveur",
    service: "ai-service",
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
};