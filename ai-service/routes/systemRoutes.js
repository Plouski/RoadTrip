const express = require("express");
const { register, updateServiceHealth } = require("../metrics");
const logger = require("../utils/logger");

const router = express.Router();
const SERVICE_NAME = "ai-service";

router.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

router.get("/health", (req, res) => {
  const status = process.env.OPENAI_API_KEY ? "healthy" : "unhealthy";
  updateServiceHealth(SERVICE_NAME, status === "healthy");
  res.status(status === "healthy" ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME
  });
});

router.get("/vitals", (req, res) => {
  res.json({
    service: SERVICE_NAME,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  });
});

router.get("/ping", (req, res) => res.json({ status: "pong ✅" }));

module.exports = router;