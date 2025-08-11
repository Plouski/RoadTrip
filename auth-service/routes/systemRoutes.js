const express = require("express");
const mongoose = require("mongoose");
const logger = require("../utils/logger");
const { register, updateServiceHealth } = require("../metrics");

const router = express.Router();
const SERVICE_NAME = process.env.SERVICE_NAME || "auth-service";

let counters = {
  requestCount: 0,
  errorCount: 0,
  authSuccessCount: 0,
  authFailureCount: 0,
  startTime: Date.now(),
};

router.use((req, res, next) => {
  counters.requestCount++;
  next();
});

// /metrics
router.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
    logger.debug("📊 Métriques servies", { requestId: req.id });
  } catch (e) {
    logger.error("❌ Erreur métriques", { message: e.message, requestId: req.id });
    res.status(500).json({ error: "Erreur génération métriques" });
  }
});

// /health
router.get("/health", (req, res) => {
  const uptimeMs = Date.now() - counters.startTime;
  const errorRate = counters.requestCount > 0 ? counters.errorCount / counters.requestCount : 0;
  const authTotal = counters.authSuccessCount + counters.authFailureCount;
  const authSuccessRate = authTotal > 0 ? counters.authSuccessCount / authTotal : 0;

  const health = {
    status: "healthy",
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: Math.round(uptimeMs / 1000),
    version: "1.0.0",
    metrics: {
      totalRequests: counters.requestCount,
      totalErrors: counters.errorCount,
      errorRate: Math.round(errorRate * 10000) / 100,
      authSuccess: counters.authSuccessCount,
      authFailures: counters.authFailureCount,
      authSuccessRate: Math.round(authSuccessRate * 10000) / 100,
      activeConnections: undefined,
    },
    config: {
      session: !!process.env.SESSION_SECRET,
      mongodb: mongoose.connection.readyState === 1,
      google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      facebook: !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
      cors: !!process.env.CORS_ORIGIN,
      port: process.env.PORT || 5001,
      environment: process.env.NODE_ENV || "development",
    },
    security: { helmet: true, rateLimit: true, httpsOnly: process.env.NODE_ENV === "production", secureSession: true, csrf: true },
  };

  const hasBasicConfig = health.config.session;
  const hasOAuthProvider = health.config.google || health.config.facebook;
  const isHighErrorRate = errorRate > 0.05;

  if (!hasBasicConfig || !hasOAuthProvider || isHighErrorRate) {
    health.status = "degraded";
  }

  const isHealthy = health.status === "healthy";
  updateServiceHealth(SERVICE_NAME, isHealthy);

  logger.info("🏥 Health check", { status: health.status, errorRate: health.metrics.errorRate, requestId: req.id });
  res.status(isHealthy ? 200 : 503).json(health);
});

// /vitals
router.get("/vitals", (req, res) => {
  const vitals = {
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    status: "running",
  };
  logger.debug("📈 Vitals requested", { uptime: vitals.uptime, requestId: req.id });
  res.json(vitals);
});

// /providers
router.get("/providers", (req, res) => {
  const providers = {
    google: {
      available: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      url: "/auth/oauth/google",
      callback: process.env.GOOGLE_CALLBACK_URL,
    },
    facebook: {
      available: !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
      url: "/auth/oauth/facebook",
      callback: process.env.FACEBOOK_CALLBACK_URL,
    },
  };

  const availableProviders = Object.entries(providers)
    .filter(([, cfg]) => cfg.available)
    .map(([name]) => name);

  logger.info("🔧 Providers info requested", {
    availableProviders,
    totalAvailable: availableProviders.length,
    requestId: req.id,
  });

  res.json({
    service: SERVICE_NAME,
    availableProviders,
    providers,
    totalAvailable: availableProviders.length,
  });
});

module.exports = { router, counters };