require("dotenv").config();
const express = require("express");
const cors = require("cors");
const logger = require("./utils/logger");
const authRoutes = require("./routes/authRoutes");

const { applySecurity } = require("./loaders/security");
const { connectMongo } = require("./loaders/mongo");
const { router: systemRoutes, counters } = require("./routes/systemRoutes");
const metricsLogger = require("./middlewares/metricsLogger");
const { notFound, global } = require("./middlewares/errorHandlers");

function createApp() {
  const app = express();

  // DB
  connectMongo(process.env.MONGODB_URI);

  // CORS + body parsers + logs
  const corsOrigins = process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"];
  app.use(cors({ origin: corsOrigins, credentials: true, methods: ["GET", "POST", "OPTIONS"] }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(logger.middleware());

  // sécurité, sessions, passport
  applySecurity(app);

  // métriques requêtes
  app.use((req, res, next) => {
    res.on("finish", () => {
      if (req.path.includes("/auth/oauth")) {
        if (res.statusCode === 302) counters.authSuccessCount++;
        else if (res.statusCode >= 400) counters.authFailureCount++;
      }
      if (res.statusCode >= 400) counters.errorCount++;
    });
    next();
  });
  app.use(metricsLogger);

  // routes
  app.use(systemRoutes);
  app.use("/auth", authRoutes);

  // erreurs
  app.use(notFound);
  app.use(global);

  return app;
}

module.exports = { createApp };