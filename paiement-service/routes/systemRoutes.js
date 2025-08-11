const express = require("express");
const mongoose = require("mongoose");
const { register, updateServiceHealth, updateExternalServiceHealth, updateDatabaseHealth } = require("../metrics");

const router = express.Router();
const SERVICE_NAME = process.env.SERVICE_NAME || "paiement-service";

router.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

router.get("/health", async (_req, res) => {
  const isMongoOk = process.env.NODE_ENV === "test" || mongoose.connection.readyState === 1;
  const isStripeOk = process.env.NODE_ENV === "test" || !!process.env.STRIPE_SECRET_KEY;

  updateDatabaseHealth("mongodb", isMongoOk);
  updateExternalServiceHealth("stripe", isStripeOk);

  const health = {
    status: isMongoOk && isStripeOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: SERVICE_NAME,
    dependencies: {
      mongodb: isMongoOk ? "healthy" : "unhealthy",
      stripe: isStripeOk ? "configured" : "not_configured",
    },
  };

  updateServiceHealth(SERVICE_NAME, health.status === "healthy");
  res.status(health.status === "healthy" ? 200 : 503).json(health);
});

router.get("/vitals", (_req, res) => {
  res.json({
    service: SERVICE_NAME,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: "running",
    active_connections: 0,
    database: {
      mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    },
    payment: {
      providers: { stripe: !!process.env.STRIPE_SECRET_KEY },
      currencies_supported: ["EUR", "USD"],
      webhook_endpoints: ["/webhook"],
    },
  });
});

router.get("/ping", (_req, res) => {
  res.json({ status: "pong ✅", service: SERVICE_NAME });
});

module.exports = router;