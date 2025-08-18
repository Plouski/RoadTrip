const express = require("express");
const cors = require("cors");
const { register, updateServiceHealth } = require("./metrics");
const EmailService = require("./services/emailService");
const SmsService = require("./services/smsService");
const logger = require("./utils/logger");

const router = express.Router();
const SERVICE_NAME = "notification-service";

const allowedOrigins = [
  "https://road-trip-gamma.vercel.app",
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
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With", 
    "Content-Type", 
    "Accept",
    "Authorization",
    "x-api-key"
  ],
  credentials: false,
  maxAge: 86400,
  optionsSuccessStatus: 200
};

router.use(cors(corsOptions));

router.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    origin: req.get('origin'),
    'user-agent': req.get('user-agent')?.substring(0, 50),
    'content-type': req.get('content-type')
  });
  next();
});

const requireApiKey = (req, res, next) => {
  if (req.method === "OPTIONS") {
    console.log("⚡ OPTIONS request - passthrough");
    return next();
  }

  const apiKey = req.headers["x-api-key"];
  
  if (!apiKey) {
    logger.warn("❌ API key manquante", {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    return res.status(401).json({ 
      success: false,
      error: "API key requise",
      code: "MISSING_API_KEY"
    });
  }

  if (apiKey !== process.env.NOTIFICATION_API_KEY) {
    logger.warn("❌ API key invalide", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      providedKey: apiKey?.substring(0, 8) + "..."
    });
    return res.status(403).json({ 
      success: false,
      error: "API key invalide",
      code: "INVALID_API_KEY"
    });
  }

  console.log("✅ API key valide");
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
    uptime: Math.floor(process.uptime()),
  });
});

router.get("/vitals", (req, res) => {
  res.json({
    status: "running",
    service: SERVICE_NAME,
    memory: process.memoryUsage(),
    version: process.env.SERVICE_VERSION || "1.0.0",
    node: process.version,
  });
});

router.get("/ping", (req, res) => {
  console.log("🏓 Ping reçu");
  res.json({ 
    status: "pong ✅", 
    timestamp: new Date().toISOString(),
    cors: "enabled"
  });
});

router.post("/api/contact/send", requireApiKey, async (req, res) => {
  console.log("📧 Réception demande de contact", {
    body: !!req.body,
    contentType: req.get('content-type')
  });

  const startTime = Date.now();
  const {
    name,
    email,
    subject,
    category,
    message,
    timestamp,
    userAgent,
    source,
  } = req.body;

  const errors = [];
  if (!name || name.trim().length < 2)
    errors.push("Le nom doit contenir au moins 2 caractères");
  if (!email || !validateEmail(email)) errors.push("Email invalide");
  if (!subject || subject.trim().length < 5)
    errors.push("Le sujet doit contenir au moins 5 caractères");
  if (!message || message.trim().length < 10)
    errors.push("Le message doit contenir au moins 10 caractères");

  if (errors.length > 0) {
    console.log("❌ Validation échouée:", errors);
    return res.status(400).json({
      success: false,
      message: "Données invalides",
      errors,
    });
  }

  const allowed = ["problem", "info", "suggestion", "feedback", "other"];
  const normalizedCategory = allowed.includes(String(category || "").toLowerCase())
    ? String(category).toLowerCase()
    : "other";

  const categoryMap = {
    problem: {
      key: "problem",
      label: "Problème technique",
      name: "Problème technique",
      emoji: "🐛",
      color: "#ef4444",
      priority: "high",
    },
    info: {
      key: "info",
      label: "Demande d'information",
      name: "Demande d'information",
      emoji: "ℹ️",
      color: "#3b82f6",
      priority: "normal",
    },
    suggestion: {
      key: "suggestion",
      label: "Suggestion d'amélioration",
      name: "Suggestion d'amélioration",
      emoji: "⭐",
      color: "#eab308",
      priority: "low",
    },
    feedback: {
      key: "feedback",
      label: "Retour d'expérience",
      name: "Retour d'expérience",
      emoji: "💚",
      color: "#22c55e",
      priority: "normal",
    },
    other: {
      key: "other",
      label: "Autre",
      name: "Autre",
      emoji: "💬",
      color: "#6b7280",
      priority: "normal",
    },
  };

  const categoryInfo = categoryMap[normalizedCategory];

  const formData = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    subject: subject.trim(),
    category: categoryInfo.key,
    categoryLabel: categoryInfo.label,
    categoryName: categoryInfo.name,
    message: message.trim(),
    timestamp: timestamp || new Date().toISOString(),
    userAgent: userAgent || "Non disponible",
    source: source || "contact-form",
    priority: categoryInfo.priority,
  };

  const duration = Date.now() - startTime;
  console.log("✅ Formulaire validé, envoi en cours...");

  res.json({
    success: true,
    message: "Votre message a été reçu et est en cours de traitement. Vous recevrez une confirmation par email.",
    messageId: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    duration: `${duration}ms`,
    status: "processing",
  });

  process.nextTick(async () => {
    try {
      await EmailService.sendContactSupportEmail(formData, categoryInfo);
      await EmailService.sendContactConfirmationEmail(formData, categoryInfo);
      console.log("✅ Emails de contact envoyés avec succès");
    } catch (err) {
      console.error("❌ Erreur envoi emails de contact:", err.message);
    }
  });
});

router.post("/api/email/confirm", requireApiKey, async (req, res) => {
  const { email, token } = req.body;
  if (!email || !token || !validateEmail(email)) {
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
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.post("/api/email/reset", requireApiKey, async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code || !validateEmail(email)) {
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
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.post("/api/sms/reset", requireApiKey, async (req, res) => {
  const { username, apiKey, code } = req.body;
  if (!username || !apiKey || !code) {
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
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.post("/api/alert", requireApiKey, async (req, res) => {
  try {
    const { email, username, apiKey, alert } = req.body;

    logger.info("📨 Réception demande d'alerte", {
      email: email ? "***" : undefined,
      username: username ? "***" : undefined,
      severity: alert?.severity,
      service: alert?.service,
    });

    const results = {};

    if (email) {
      try {
        const result = await EmailService.sendAlertEmail(email, alert);
        results.email = { success: true, messageId: result.messageId };
        logger.info("✅ Email d'alerte envoyé", {
          email: "***",
          messageId: result.messageId,
        });
      } catch (error) {
        results.email = { success: false, error: error.message };
        logger.error("❌ Erreur envoi email d'alerte", {
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: "Alerte traitée",
      results,
    });
  } catch (error) {
    logger.error("💥 Erreur traitement alerte", { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
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
      error: error.message,
    });
  }
});

module.exports = router;