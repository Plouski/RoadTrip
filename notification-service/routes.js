const express = require("express");
const cors = require("cors");
const { register, updateServiceHealth } = require("./metrics");
const EmailService = require("./services/emailService");
const SmsService = require("./services/smsService");
const logger = require("./utils/logger");

const router = express.Router();
const SERVICE_NAME = "notification-service";

// --- Configuration CORS ---
const allowedOrigins = [
  "https://road-trip-iota.vercel.app", // prod
  "http://localhost:3000", // dev
  // Ajoute ici tes URLs de preview Vercel si besoin
];

const corsOptions = {
  origin: (origin, cb) => {
    // Autorise aussi les requêtes sans Origin (curl/monitoring)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-api-key"],
  credentials: false, // Explicitement défini
  maxAge: 86400,
  preflightContinue: false, // Passe le contrôle au handler suivant
  optionsSuccessStatus: 204 // Certains navigateurs anciens ont des problèmes avec 200
};

// Active CORS pour toutes les routes du router - AVANT toute autre middleware
router.use(cors(corsOptions));

// SUPPRIMÉ : Le middleware OPTIONS redondant qui causait le conflit
// router.use((req, res, next) => {
//   if (req.method === "OPTIONS") return res.sendStatus(204);
//   next();
// });

// --- Middleware API Key (modifié pour mieux gérer OPTIONS) ---
const requireApiKey = (req, res, next) => {
  // Ignore la vérification de l'API key pour les requêtes preflight - le middleware CORS s'en occupe
  if (req.method === "OPTIONS") {
    return next();
  }

  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.NOTIFICATION_API_KEY) {
    logger.warn("❌ Tentative d'accès sans API key valide", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      providedKey: apiKey ? "present" : "missing",
    });
    return res.status(403).json({ error: "API key requise" });
  }
  next();
};

// --- Validation email simple ---
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ---------------- Routes publiques (monitoring) ----------------
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
  res.json({ status: "pong ✅", timestamp: new Date().toISOString() });
});

// ---------------- Routes protégées par API key ----------------
router.post("/api/email/confirm", requireApiKey, async (req, res) => {
  const { email, token } = req.body;
  if (!email || !token || !validateEmail(email)) {
    logger.warn("❌ Paramètres invalides pour confirmation email", {
      email,
      hasToken: !!token,
    });
    return res.status(400).json({ error: "Paramètres invalides" });
  }
  try {
    await EmailService.sendConfirmationEmail(email, token);
    res.json({ success: true, message: "Email de confirmation envoyé" });
  } catch (error) {
    logger.error("❌ Erreur envoi email confirmation", {
      email,
      error: error.message,
    });
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
    logger.warn("❌ Paramètres invalides pour reset email", {
      email,
      hasCode: !!code,
    });
    return res.status(400).json({ error: "Paramètres invalides" });
  }
  try {
    await EmailService.sendPasswordResetEmail(email, code);
    res.json({ success: true, message: "Email de réinitialisation envoyé" });
  } catch (error) {
    logger.error("❌ Erreur envoi email reset", {
      email,
      error: error.message,
    });
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
    logger.warn("❌ Paramètres invalides pour reset SMS", {
      username,
      hasApiKey: !!apiKey,
      hasCode: !!code,
    });
    return res.status(400).json({ error: "Paramètres invalides" });
  }
  try {
    await SmsService.sendPasswordResetCode(username, apiKey, code);
    res.json({ success: true, message: "SMS de réinitialisation envoyé" });
  } catch (error) {
    logger.error("❌ Erreur envoi SMS reset", {
      username,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'envoi",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.post("/api/contact/send", requireApiKey, async (req, res) => {
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

  // 🔒 Liste blanche des catégories acceptées
  const allowed = ["problem", "info", "suggestion", "feedback", "other"];

  // 🧹 Normalisation + fallback
  const normalizedCategory = allowed.includes(
    String(category || "").toLowerCase()
  )
    ? String(category).toLowerCase()
    : "other";

  // 📚 Dictionnaire lisible + meta
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

  logger.info("📧 Nouvelle demande de contact", {
    type: "contact",
    email,
    category: categoryInfo.key,
    subject: subject?.substring(0, 50) + (subject?.length > 50 ? "..." : ""),
  });

  const errors = [];
  if (!name || name.trim().length < 2)
    errors.push("Le nom doit contenir au moins 2 caractères");
  if (!email || !validateEmail(email)) errors.push("Email invalide");
  if (!subject || subject.trim().length < 5)
    errors.push("Le sujet doit contenir au moins 5 caractères");
  if (!message || message.trim().length < 10)
    errors.push("Le message doit contenir au moins 10 caractères");

  if (errors.length > 0) {
    logger.warn("❌ Validation échouée pour demande de contact", {
      type: "contact",
      email,
      errors,
    });
    return res.status(400).json({
      success: false,
      message: "Données invalides",
      errors,
    });
  }

  const formData = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    subject: subject.trim(),
    category: categoryInfo.key,
    categoryLabel: categoryInfo.label, // lisible
    categoryName: categoryInfo.name,
    message: message.trim(),
    timestamp: timestamp || new Date().toISOString(),
    userAgent: userAgent || "Non disponible",
    source: source || "contact-form",
    priority: categoryInfo.priority,
  };

  const duration = Date.now() - startTime;
  logger.info("✅ Demande de contact acceptée - traitement en cours", {
    type: "contact",
    email: formData.email,
    category: formData.category,
    duration: `${duration}ms`,
  });

  res.json({
    success: true,
    message:
      "Votre message a été reçu et est en cours de traitement. Vous recevrez une confirmation par email.",
    messageId: `contact-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 6)}`,
    duration: `${duration}ms`,
    status: "processing",
  });

  process.nextTick(async () => {
    try {
      // ✅ Passe la catégorie normalisée + label à l'EmailService
      await EmailService.sendContactSupportEmail(formData, categoryInfo);
      await EmailService.sendContactConfirmationEmail(formData, categoryInfo);
      logger.info("✅ Emails de contact envoyés avec succès", {
        email: formData.email,
      });
    } catch (err) {
      logger.error("❌ Erreur envoi emails de contact", { error: err.message });
    }
  });
});

// Route pour les alertes (appelée par metrics-service)
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