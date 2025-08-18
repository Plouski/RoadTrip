require("dotenv").config();
const express = require("express");
const cors = require("cors");
const logger = require("./utils/logger");
const { updateServiceHealth, updateActiveConnections, updateExternalServiceHealth } = require("./metrics");

const aiRoutes = require("./routes/aiRoutes");
const systemRoutes = require("./routes/systemRoutes");
const metricsLogger = require("./middlewares/metricsLogger");
const errorHandler = require("./middlewares/errorHandler");

const app = express();
const PORT = process.env.PORT || 5003;
const METRICS_PORT = process.env.METRICS_PORT || 9090;
const SERVICE_NAME = "ai-service";

logger.info(`🔥 Lancement du ${SERVICE_NAME}...`, { port: PORT });

if (!process.env.OPENAI_API_KEY && process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'production') {
  logger.warn("⚠️ OPENAI_API_KEY manquante - mode fallback activé", { service: SERVICE_NAME });
  updateExternalServiceHealth("openai", false);
} else {
  updateExternalServiceHealth("openai", true);
}

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
    "x-access-token"
  ],
  credentials: true,
  maxAge: 86400,
  optionsSuccessStatus: 200
};

// 
app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(logger.middleware());
app.use(metricsLogger);

app.use(systemRoutes);
app.use("/api/ai", aiRoutes);

app.use(errorHandler);

const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info(`🤖 ${SERVICE_NAME} démarré sur le port ${PORT}`);
  updateServiceHealth(SERVICE_NAME, true);
});

const metricsApp = express();
metricsApp.use(systemRoutes);
const metricsServer = metricsApp.listen(METRICS_PORT, () => {
  logger.info(`📊 Metrics server running sur ${METRICS_PORT}`);
});

function shutdown(signal) {
  logger.info(`🔄 Arrêt ${SERVICE_NAME}`, { signal });
  updateServiceHealth(SERVICE_NAME, false);
  updateActiveConnections(0);
  Promise.all([
    new Promise(res => server.close(res)),
    new Promise(res => metricsServer.close(res))
  ]).then(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

module.exports = { app, server, metricsServer };