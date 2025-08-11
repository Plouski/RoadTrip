const axios = require("axios");

module.exports = (logger) => async (req, res) => {
  const startTime = Date.now();
  const prometheusUrl = req.app.locals.prometheusUrl;

  logger.info("🔍 Status des services demandé", { requestId: req.id });

  try {
    logger.debug("🔍 Requête status services vers Prometheus", {
      prometheusUrl,
      query: "up",
      requestId: req.id,
    });

    const response = await axios.get(`${prometheusUrl}/api/v1/query?query=up`);

    const services = (response.data.data.result || []).map((metric) => ({
      name: metric.metric.job,
      status: metric.value[1] === "1" ? "healthy" : "down",
      instance: metric.metric.instance,
      lastCheck: new Date().toISOString(),
    }));

    const duration = Date.now() - startTime;
    const healthyCount = services.filter((s) => s.status === "healthy").length;
    const downCount = services.filter((s) => s.status === "down").length;

    logger.info("✅ Status des services récupéré", {
      totalServices: services.length,
      healthyServices: healthyCount,
      downServices: downCount,
      duration,
      services: services.map((s) => ({ name: s.name, status: s.status })),
      requestId: req.id,
    });

    res.json({ success: true, services });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error("❌ Erreur lors de la récupération du status des services", {
      error: error.message,
      stack: error.stack,
      duration,
      prometheusUrl,
      requestId: req.id,
    });

    res.status(500).json({
      success: false,
      error: "Erreur services status",
      requestId: req.id,
    });
  }
};