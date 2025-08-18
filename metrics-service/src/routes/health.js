const { SERVICE_NAME, SERVICE_VERSION } = require("../config");

module.exports = (logger) => (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
  };

  logger.info("Health check", { status: health.status, uptime: health.uptime, requestId: req.id });
  res.status(200).json(health);
};