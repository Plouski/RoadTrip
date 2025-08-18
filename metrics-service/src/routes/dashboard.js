const axios = require("axios");

module.exports = (logger) => async (req, res) => {
  const startTime = Date.now();
  const prometheusUrl = req.app.locals.prometheusUrl;
  const { prometheusConnectionsGauge, servicesStatusGauge } = req.app.locals.metrics;

  logger.info("🎯 Génération dashboard demandée", { requestId: req.id });

  try {
    logger.debug("🔍 Requêtes vers Prometheus", {
      prometheusUrl,
      queries: ["up", "rate(http_requests_total[5m])"],
      requestId: req.id,
    });

    const [upResponse, requestsResponse] = await Promise.all([
      axios.get(`${prometheusUrl}/api/v1/query?query=up`).catch((error) => {
        logger.warn("⚠️ Erreur requête UP vers Prometheus", {
          error: error.message,
          url: `${prometheusUrl}/api/v1/query?query=up`,
          requestId: req.id,
        });
        prometheusConnectionsGauge.set(0);
        return { data: { data: { result: [] } } };
      }),
      axios.get(`${prometheusUrl}/api/v1/query?query=rate(http_requests_total[5m])`).catch((error) => {
        logger.warn("⚠️ Erreur requête RATE vers Prometheus", {
          error: error.message,
          url: `${prometheusUrl}/api/v1/query?query=rate(http_requests_total[5m])`,
          requestId: req.id,
        });
        return { data: { data: { result: [] } } };
      }),
    ]);

    const upMetrics = upResponse.data.data.result || [];
    const requestMetrics = requestsResponse.data.data.result || [];

    prometheusConnectionsGauge.set(upMetrics.length > 0 ? 1 : 0);
    upMetrics.forEach((metric) => {
      servicesStatusGauge.set(
        { service: metric.metric.job, instance: metric.metric.instance },
        metric.value[1] === "1" ? 1 : 0
      );
    });

    const servicesUp = upMetrics.filter((m) => m.value[1] === "1").length;
    const servicesDown = upMetrics.filter((m) => m.value[1] === "0").length;
    const totalRequestsPerSecond = requestMetrics.reduce(
      (sum, m) => sum + parseFloat(m.value[1] || 0),
      0
    );

    const dashboard = {
      timestamp: new Date().toISOString(),
      services: {
        total: 5,
        up: servicesUp,
        down: servicesDown,
      },
      requests: {
        totalPerSecond: totalRequestsPerSecond.toFixed(2),
      },
      details: upMetrics.map((metric) => ({
        service: metric.metric.job,
        status: metric.value[1] === "1" ? "UP" : "DOWN",
        instance: metric.metric.instance,
      })),
    };

    const duration = Date.now() - startTime;
    logger.info("✅ Dashboard généré avec succès", {
      servicesUp,
      servicesDown,
      totalServices: 5,
      requestsPerSecond: totalRequestsPerSecond.toFixed(2),
      duration,
      prometheusConnected: upMetrics.length > 0 || requestMetrics.length > 0,
      requestId: req.id,
    });

    res.json({ success: true, data: dashboard });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error("❌ Erreur lors de la génération du dashboard", {
      error: error.message,
      stack: error.stack,
      duration,
      prometheusUrl,
      requestId: req.id,
    });

    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des métriques",
      requestId: req.id,
    });
  }
};
