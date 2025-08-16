const express = require("express");
const { EmailChannel } = require("../alerting/notificationChannels");
const router = express.Router();

// Route de statut des alertes
router.get("/status", (req, res) => {
  res.json({
    service: "metrics-service",
    alerts: {
      enabled: process.env.ENABLE_ALERTS !== "false",
      channels: ["email"],
      lastCheck: new Date().toISOString(),
    },
    configuration: {
      hasNotificationService: !!process.env.NOTIFICATION_SERVICE_URL,
      hasApiKey: !!process.env.NOTIFICATION_API_KEY,
      hasAdminEmail: !!process.env.ADMIN_EMAIL,
    },
  });
});

// Route de test d'alerte RÉELLE
router.post("/test", async (req, res) => {
  try {
    const body = req.body || {};
    const { severity = "WARNING" } = body;

    const testAlert = {
      severity,
      service: "metrics-service",
      message: `Test depuis metrics-service - ${new Date().toLocaleString()}`,
      timestamp: new Date().toISOString(),
    };

    console.log("🧪 Test alerte réelle:", { severity });

    let result;

    const emailChannel = new EmailChannel();
    result = await emailChannel.send(testAlert);

    res.json({
      success: true,
      message: `Test alert sent`,
      alert: testAlert,
      result,
    });
  } catch (error) {
    console.error("❌ Erreur test alerte:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      service: "metrics-service",
    });
  }
});

module.exports = router;
