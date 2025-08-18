const express = require("express");
const cors = require("cors");
const { PROMETHEUS_URL } = require("./config");
const logger = require("../utils/logger");
const { createMetrics } = require("./metrics");
const routes = require("./routes");
const metricsLogger = require("./middlewares/metricsLogger");
const { notFound, global } = require("./middlewares/errorHandler")(logger);

const alertRoutes = require("./routes/alerts.js");
const { AlertManager } = require("./alerting/alertManager.js");

function createApp() {
  const app = express();

  const { register, metrics } = createMetrics();

  app.locals.register = register;
  app.locals.metrics = metrics;
  app.locals.prometheusUrl = PROMETHEUS_URL;
  app.locals.currentConnections = 0;

  const allowedOrigins = [
    "https://road-trip-iota.vercel.app",
    "http://localhost:3000",
    "https://localhost:3000",
    "http://localhost:3001",
    "https://localhost:3001",
    /^http:\/\/localhost:\d+$/,
    /^https:\/\/localhost:\d+$/
  ];

  const corsOptions = {
    origin: function (origin, callback) {
      console.log("🌐 CORS Origin reçu:", origin);
      
      if (!origin) {
        console.log("✅ CORS: Pas d'origin - autorisé");
        return callback(null, true);
      }
      
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return allowed === origin;
        }
        return allowed.test(origin);
      });
      
      if (isAllowed) {
        console.log("✅ CORS: Origin autorisé -", origin);
        return callback(null, true);
      }
      
      console.log("❌ CORS: Origin refusé -", origin);
      return callback(new Error(`CORS: Origin ${origin} non autorisé`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "x-api-key"
    ],
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 200
  };

  app.use(cors(corsOptions));
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