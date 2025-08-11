const express = require("express");
const { register, updateServiceHealth } = require("./metrics");
const EmailService = require("./services/emailService");
const SmsService = require("./services/smsService");
const router = express.Router();

const SERVICE_NAME = "notification-service";
const requireApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.NOTIFICATION_API_KEY) {
    return res.status(403).json({ error: "API key requise" });
  }
  next();
};
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

router.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
router.get("/health", (req, res) => {
  updateServiceHealth(SERVICE_NAME, true);
  res.json({ status: "healthy", service: SERVICE_NAME });
});
router.get("/vitals", (req, res) => res.json({ status: "running", service: SERVICE_NAME }));
router.get("/ping", (req, res) => res.json({ status: "pong ✅" }));

router.post("/api/email/confirm", requireApiKey, async (req, res) => {
  const { email, token } = req.body;
  if (!email || !token || !validateEmail(email)) return res.status(400).json({ error: "Paramètres invalides" });
  try {
    await EmailService.sendConfirmationEmail(email, token);
    res.json({ success: true });
  } catch {
    res.json({ success: true, message: "Mode simulation" });
  }
});

router.post("/api/email/reset", requireApiKey, async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code || !validateEmail(email)) return res.status(400).json({ error: "Paramètres invalides" });
  try {
    await EmailService.sendPasswordResetEmail(email, code);
    res.json({ success: true });
  } catch {
    res.json({ success: true, message: "Mode simulation" });
  }
});

router.post("/api/sms/reset", requireApiKey, async (req, res) => {
  const { username, apiKey, code } = req.body;
  if (!username || !apiKey || !code) return res.status(400).json({ error: "Paramètres invalides" });
  try {
    await SmsService.sendPasswordResetCode(username, apiKey, code);
    res.json({ success: true });
  } catch {
    res.json({ success: true, message: "Mode simulation" });
  }
});

module.exports = router;