const { NODE_ENV } = require("../config");

module.exports = (logger) => (req, res) => {
  const vitals = {
    service: "metrics-service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    status: "running",
    active_connections: req.app.locals.currentConnections || 0,
    environment: NODE_ENV,
    prometheus_url: req.app.locals.prometheusUrl,
  };

  logger.debug("Vitals requested", {
    memory: vitals.memory.heapUsed,
    connections: vitals.active_connections,
    requestId: req.id,
  });

  res.json(vitals);
};