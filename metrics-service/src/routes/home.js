const { SERVICE_NAME } = require("../config");

module.exports = (logger) => (req, res) => {
  logger.info("🏠 Page d'accueil consultée", { requestId: req.id });

  const homeData = {
    service: "Metrics Service API",
    version: "1.0.0",
    endpoints: [
      "GET /health - Service health",
      "GET /vitals - Service vitals",
      "GET /metrics - Prometheus metrics",
      "GET /ping - Service ping",
      "GET /api/dashboard - Dashboard simple",
      "GET /api/services/status - Services status",
    ],
    grafana: "http://localhost:3100",
    prometheus: req.app.locals.prometheusUrl,
    requestId: req.id,
  };

  logger.debug("📋 Informations service envoyées", {
    endpoints: homeData.endpoints.length,
    version: homeData.version,
    requestId: req.id,
  });

  res.json(homeData);
};