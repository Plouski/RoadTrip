const express = require("express");
const cors = require("cors");
const { FRONTEND_URL, PROMETHEUS_URL } = require("./config");
const logger = require("../utils/logger");
const { createMetrics } = require("./metrics");
const routes = require("./routes");
const metricsLogger = require("./middlewares/metricsLogger");
const { notFound, global } = require("./middlewares/errorHandler")(logger);

const alertRoutes = require("./routes/alerts.js");           // ✅ Mais commenté car le fichier n'existe pas encore
const { AlertManager } = require("./alerting/alertManager.js"); // ✅ Mais commenté car le fichier n'existe pas encore

function createApp() {
  const app = express();

  const { register, metrics } = createMetrics();

  app.locals.register = register;
  app.locals.metrics = metrics;
  app.locals.prometheusUrl = PROMETHEUS_URL;
  app.locals.currentConnections = 0;

  app.use(cors({ origin: FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(logger.middleware());
  app.use(metricsLogger(logger));

  app.get("/metrics", async (req, res) => {
    try {
      res.set("Content-Type", app.locals.register.contentType);
      res.end(await app.locals.register.metrics());
      logger.debug("Metrics endpoint accessed", { requestId: req.id });
    } catch (error) {
      logger.error("Error serving metrics", error);
      res.status(500).json({ error: "Failed to generate metrics" });
    }
  });

  app.use("/", routes({ logger }));
  
  app.use("/api/alerts", alertRoutes);

  const alertManager = new AlertManager();
  setInterval(() => {
    alertManager.checkAlerts();
  }, 30000);

  app.use(notFound);
  app.use(global);

  return app;
}

module.exports = { createApp, logger };