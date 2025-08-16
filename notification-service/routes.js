const express = require("express");
const { register, updateServiceHealth } = require("./metrics");
const EmailService = require("./services/emailService");
const SmsService = require("./services/smsService");
const logger = require("./utils/logger");
const router = express.Router();

const SERVICE_NAME = "notification-service";

const requireApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.NOTIFICATION_API_KEY) {
    logger.warn("❌ Tentative d'accès sans API key valide", {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      providedKey: apiKey ? 'present' : 'missing'
    });
    return res.status(403).json({ error: "API key requise" });
  }
  next();
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

router.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error("Erreur génération métriques", { error: error.message });
    res.status(500).json({ error: "Erreur génération métriques" });
  }
});

router.get("/health", (req, res) => {
  updateServiceHealth(SERVICE_NAME, true);
  res.json({ 
    status: "healthy", 
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

router.get("/vitals", (req, res) => {
  res.json({ 
    status: "running", 
    service: SERVICE_NAME,
    memory: process.memoryUsage(),
    version: process.env.SERVICE_VERSION || "1.0.0",
    node: process.version
  });
});

router.get("/ping", (req, res) => {
  res.json({ status: "pong ✅", timestamp: new Date().toISOString() });
});

router.post("/api/email/confirm", requireApiKey, async (req, res) => {
  const { email, token } = req.body;
  if (!email || !token || !validateEmail(email)) {
    logger.warn("❌ Paramètres invalides pour confirmation email", { email, hasToken: !!token });
    return res.status(400).json({ error: "Paramètres invalides" });
  }
  try {
    await EmailService.sendConfirmationEmail(email, token);
    res.json({ success: true, message: "Email de confirmation envoyé" });
  } catch (error) {
    logger.error("❌ Erreur envoi email confirmation", { email, error: error.message });
    res.status(500).json({ 
      success: false, 
      message: "Erreur lors de l'envoi",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.post("/api/email/reset", requireApiKey, async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code || !validateEmail(email)) {
    logger.warn("❌ Paramètres invalides pour reset email", { email, hasCode: !!code });
    return res.status(400).json({ error: "Paramètres invalides" });
  }
  try {
    await EmailService.sendPasswordResetEmail(email, code);
    res.json({ success: true, message: "Email de réinitialisation envoyé" });
  } catch (error) {
    logger.error("❌ Erreur envoi email reset", { email, error: error.message });
    res.status(500).json({ 
      success: false, 
      message: "Erreur lors de l'envoi",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.post("/api/sms/reset", requireApiKey, async (req, res) => {
  const { username, apiKey, code } = req.body;
  if (!username || !apiKey || !code) {
    logger.warn("❌ Paramètres invalides pour reset SMS", { username, hasApiKey: !!apiKey, hasCode: !!code });
    return res.status(400).json({ error: "Paramètres invalides" });
  }
  try {
    await SmsService.sendPasswordResetCode(username, apiKey, code);
    res.json({ success: true, message: "SMS de réinitialisation envoyé" });
  } catch (error) {
    logger.error("❌ Erreur envoi SMS reset", { username, error: error.message });
    res.status(500).json({ 
      success: false, 
      message: "Erreur lors de l'envoi",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.post("/api/contact/send", requireApiKey, async (req, res) => {
  const startTime = Date.now();
  const { name, email, subject, category, message, timestamp, userAgent, source } = req.body;
  
  logger.info("📧 Nouvelle demande de contact", {
    type: 'contact',
    email: email,
    category: category || 'other',
    subject: subject?.substring(0, 50) + (subject?.length > 50 ? '...' : '')
  });
  
  const errors = [];
  if (!name || name.trim().length < 2) errors.push('Le nom doit contenir au moins 2 caractères');
  if (!email || !validateEmail(email)) errors.push('Email invalide');
  if (!subject || subject.trim().length < 5) errors.push('Le sujet doit contenir au moins 5 caractères');
  if (!message || message.trim().length < 10) errors.push('Le message doit contenir au moins 10 caractères');
  
  if (errors.length > 0) {
    logger.warn("❌ Validation échouée pour demande de contact", {
      type: 'contact',
      email,
      errors
    });
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors
    });
  }

  const formData = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    subject: subject.trim(),
    category: category || 'other',
    message: message.trim(),
    timestamp: timestamp || new Date().toISOString(),
    userAgent: userAgent || 'Non disponible',
    source: source || 'contact-form'
  };

  const duration = Date.now() - startTime;
  logger.info("✅ Demande de contact acceptée - traitement en cours", {
    type: 'contact',
    email: formData.email,
    category: formData.category,
    duration: `${duration}ms`
  });

  res.json({
    success: true,
    message: 'Votre message a été reçu et est en cours de traitement. Vous recevrez une confirmation par email.',
    messageId: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    duration: `${duration}ms`,
    status: 'processing'
  });

  process.nextTick(async () => {
    try {
      logger.info("🚀 Démarrage traitement asynchrone emails de contact", {
        type: 'contact',
        email: formData.email,
        category: formData.category
      });

      const categoryMap = {
        problem: { name: 'Problème technique', color: '#ef4444', emoji: '🐛', priority: 'high' },
        info: { name: 'Demande d\'information', color: '#3b82f6', emoji: 'ℹ️', priority: 'normal' },
        suggestion: { name: 'Suggestion d\'amélioration', color: '#eab308', emoji: '⭐', priority: 'low' },
        feedback: { name: 'Retour d\'expérience', color: '#22c55e', emoji: '💚', priority: 'normal' },
        other: { name: 'Autre', color: '#6b7280', emoji: '💬', priority: 'normal' }
      };
      const category_info = categoryMap[formData.category] || categoryMap.other;

      try {
        logger.info("📤 Tentative envoi email support", {
          type: 'contact',
          email: formData.email,
          to: process.env.CONTACT_RECEIVE_EMAIL || "contact@roadtrip.com"
        });

        const supportResult = await EmailService.sendContactSupportEmail(formData, category_info);

        logger.info("✅ Email support envoyé avec succès", {
          type: 'contact',
          email: formData.email,
          messageId: supportResult?.messageId,
          duration: supportResult?.duration
        });
      } catch (supportError) {
        logger.error("❌ Erreur envoi email support", {
          type: 'contact',
          email: formData.email,
          error: supportError.message,
          isTimeout: supportError.message.includes('Timeout')
        });
      }

      try {
        logger.info("📤 Tentative envoi email confirmation utilisateur", {
          type: 'contact',
          email: formData.email
        });

        const confirmationResult = await EmailService.sendContactConfirmationEmail(formData);

        logger.info("✅ Email confirmation envoyé avec succès", {
          type: 'contact',
          email: formData.email,
          messageId: confirmationResult?.messageId,
          duration: confirmationResult?.duration
        });
      } catch (confirmationError) {
        logger.error("❌ Erreur envoi email confirmation", {
          type: 'contact',
          email: formData.email,
          error: confirmationError.message,
          isTimeout: confirmationError.message.includes('Timeout')
        });
      }

      logger.info("🏁 Traitement contact terminé", {
        type: 'contact',
        email: formData.email,
        category: formData.category
      });

    } catch (error) {
      logger.error("❌ Erreur critique lors du traitement asynchrone de contact", {
        type: 'contact',
        email: formData.email,
        error: error.message,
        stack: error.stack
      });
    }
  });
});

// Route pour les alertes (appelée par metrics-service)
router.post('/api/alert', requireApiKey, async (req, res) => {  // ✅ requireApiKey au lieu de authenticateApiKey
  try {
    const { email, username, apiKey, alert } = req.body;

    logger.info("📨 Réception demande d'alerte", {
      email: email ? '***' : undefined,
      username: username ? '***' : undefined,
      severity: alert.severity,
      service: alert.service
    });

    const results = {};

    // Envoi email si demandé
    if (email) {
      try {
        const result = await EmailService.sendAlertEmail(email, alert);
        results.email = { success: true, messageId: result.messageId };
        logger.info("✅ Email d'alerte envoyé", { email: '***', messageId: result.messageId });
      } catch (error) {
        results.email = { success: false, error: error.message };
        logger.error("❌ Erreur envoi email d'alerte", { error: error.message });
      }
    }

    res.json({
      success: true,
      message: "Alerte traitée",
      results
    });

  } catch (error) {
    logger.error("💥 Erreur traitement alerte", { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get("/api/test/mailjet", requireApiKey, async (req, res) => {
  try {
    logger.info("🧪 Test de configuration Mailjet demandé");
    const result = await EmailService.testMailjetConnection();
    res.json(result);
  } catch (error) {
    logger.error("❌ Erreur test Mailjet", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Test Mailjet échoué",
      error: error.message
    });
  }
});

module.exports = router;