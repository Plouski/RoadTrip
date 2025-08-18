const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

/* ----------------------------- Utils internes ----------------------------- */

const escapeHtml = (str = "") =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const nl2br = (str = "") => escapeHtml(str).replace(/\n/g, "<br/>");

const resolveCategory = (categoryInfo = {}, formData = {}) => {
  const key =
    categoryInfo.key ||
    (formData.category ? String(formData.category).toLowerCase() : "") ||
    "other";

  const label =
    categoryInfo.label ||
    categoryInfo.name ||
    formData.categoryLabel ||
    formData.categoryName ||
    (key
      ? {
          problem: "Problème technique",
          info: "Demande d'information",
          suggestion: "Suggestion d'amélioration",
          feedback: "Retour d'expérience",
          other: "Autre",
        }[key] || "Autre"
      : "Autre");

  const emoji =
    categoryInfo.emoji ||
    {
      problem: "🐛",
      info: "ℹ️",
      suggestion: "⭐",
      feedback: "💚",
      other: "💬",
    }[key] ||
    "💬";

  return { key, label, emoji };
};

const fmtDateFR = (iso) => {
  try {
    return new Date(iso || Date.now()).toLocaleString("fr-FR");
  } catch {
    return new Date().toLocaleString("fr-FR");
  }
};

/* -------------------------- Logs config Mailjet --------------------------- */

logger.info("🔍 Vérification configuration Mailjet", {
  hasApiKey: !!process.env.MAILJET_API_KEY,
  hasSecret: !!process.env.MAILJET_API_SECRET,
  apiKeyLength: process.env.MAILJET_API_KEY?.length || 0,
  secretLength: process.env.MAILJET_API_SECRET?.length || 0,
});

if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_API_SECRET) {
  logger.warn("❌ Mailjet non configuré - les emails seront simulés");
}

let transporter = null;

if (process.env.MAILJET_API_KEY && process.env.MAILJET_API_SECRET) {
  try {
    logger.info("🔧 Création du transporter SMTP Mailjet...");

    transporter = nodemailer.createTransport({
      host: "in-v3.mailjet.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAILJET_API_KEY,
        pass: process.env.MAILJET_API_SECRET,
      },
    });

    logger.info("✅ Transporter SMTP Mailjet créé avec succès");

    transporter.verify((error, success) => {
      if (error) {
        logger.error("❌ Erreur vérification SMTP Mailjet", {
          error: error.message,
          code: error.code,
          command: error.command,
        });
      } else {
        logger.info("✅ Vérification SMTP Mailjet réussie", { success });
      }
    });
  } catch (error) {
    logger.error("❌ Erreur création transporter SMTP Mailjet", {
      error: error.message,
      stack: error.stack,
    });
    transporter = null;
  }
}

/* ------------------------------ Timeout util ----------------------------- */

const withTimeout = (promise, timeoutMs = 30000, operation = "operation") => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        logger.error(`⏰ Timeout ${operation} après ${timeoutMs}ms`);
        reject(new Error(`Timeout ${operation} après ${timeoutMs}ms`));
      }, timeoutMs);

      promise.finally(() => clearTimeout(timeoutId));
    }),
  ]);
};

/* ------------------------------- Templates -------------------------------- */

const createConfirmationEmail = (token) => {
  const base = process.env.FRONTEND_URL?.replace(/\/+$/, "") || "";
  const link = `${base}/confirm-account?token=${encodeURIComponent(token)}`;

  return {
    subject: "Confirmez votre compte - RoadTrip!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #E30613;">Bienvenue sur RoadTrip!</h1>
        <p>Cliquez sur le lien ci-dessous pour confirmer votre compte :</p>
        <a href="${link}" style="background: #E30613; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Confirmer mon compte
        </a>
        <p style="margin-top: 20px; font-size: 14px; color: #666;">
          Si le bouton ne fonctionne pas, copiez ce lien : ${escapeHtml(link)}
        </p>
        <p style="margin-top: 20px; font-size: 12px; color: #999;">
          Ce lien expire dans 24 heures.
        </p>
      </div>
    `,
  };
};

const createResetEmail = (code) => {
  return {
    subject: "Code de réinitialisation - RoadTrip!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #E30613;">Réinitialisation de mot de passe</h1>
        <p>Voici votre code de réinitialisation :</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #E30613;">
            ${escapeHtml(code)}
          </span>
        </div>
        <p style="color: #666;">Ce code expire dans 1 heure.</p>
        <p style="font-size: 12px; color: #999;">
          Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        </p>
      </div>
    `,
  };
};

const createContactSupportEmail = (formData, categoryInfoInput) => {
  const { label, emoji } = resolveCategory(categoryInfoInput, formData);

  return {
    subject: `[${emoji} ${label}] ${formData.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #E30613;">Nouveau message de contact - RoadTrip!</h1>
        <p><strong>Catégorie :</strong> ${emoji} ${escapeHtml(label)}</p>
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        
        <p><strong>Nom :</strong> ${escapeHtml(formData.name)}</p>
        <p><strong>Email :</strong> ${escapeHtml(formData.email)}</p>
        <p><strong>Sujet :</strong> ${escapeHtml(formData.subject)}</p>
        <p><strong>Date :</strong> ${fmtDateFR(formData.timestamp)}</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Message :</h3>
          <p style="margin-bottom: 0;">${nl2br(formData.message)}</p>
        </div>
        
        <p style="font-size: 12px; color: #999;">
          Répondez directement à cette adresse : ${escapeHtml(formData.email)}
        </p>
      </div>
    `,
  };
};

const createContactConfirmationEmail = (formData, categoryInfoInput) => {
  const { label } = resolveCategory(categoryInfoInput, formData);

  return {
    subject: `Message reçu — ${label} - RoadTrip!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #E30613;">Message bien reçu !</h1>
        <p>Bonjour <strong>${escapeHtml(formData.name)}</strong>,</p>
        <p>Nous avons bien reçu votre message concernant :</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <strong>"${escapeHtml(formData.subject)}"</strong> — ${escapeHtml(label)}
        </div>
        
        <p>Notre équipe va examiner votre demande et vous répondra rapidement à cette adresse email.</p>
        <p>Merci de faire confiance à <strong>RoadTrip!</strong></p>
        
        <p style="margin-top: 20px; font-size: 12px; color: #999;">
          Envoyé le : ${fmtDateFR(formData.timestamp)}
        </p>
      </div>
    `,
  };
};

const createAlertEmail = (alert = {}) => {
  const colors = {
    CRITICAL: "#ff0000",
    WARNING: "#ffaa00",
    INFO: "#00aa00",
  };

  const severity = String(alert.severity || "INFO").toUpperCase();
  const color = colors[severity] || "#cccccc";

  return {
    subject: `RoadTrip! Alert: ${severity} - ${alert.service || "unknown"}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${color}; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h1 style="margin: 0; color: white;">🚨 ${escapeHtml(severity)} Alert</h1>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Service :</strong> ${escapeHtml(alert.service || "unknown")}</p>
          <p><strong>Problème :</strong> ${escapeHtml(alert.message || "n/a")}</p>
          <p><strong>Heure :</strong> ${escapeHtml(alert.timestamp || new Date().toISOString())}</p>
          <p><strong>Sévérité :</strong> ${escapeHtml(severity)}</p>
        </div>

        <p>Vérifiez le dashboard : <a href="${escapeHtml(
          process.env.GRAFANA_URL || "http://localhost:3100"
        )}" style="color: #E30613;">Grafana</a></p>
        
        <p style="font-size: 12px; color: #999;">
          Alerte automatique générée par RoadTrip! Monitoring
        </p>
      </div>
    `,
  };
};

/* ------------------------------- Service ---------------------------------- */

const EmailService = {
  sendEmail: async ({
    to,
    subject,
    html,
    from,
    text,
    replyTo,
    timeout = 60000,
  }) => {
    const startTime = Date.now();
    const operationId = `email-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 6)}`;

    logger.info("🚀 Début envoi email", {
      operationId,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      timeout: `${timeout}ms`,
      hasTransporter: !!transporter,
      transporterType: transporter ? "mailjet" : "simulation",
    });

    if (!transporter) {
      logger.warn("📧 Mode simulation - Mailjet non configuré", {
        operationId,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const duration = Date.now() - startTime;
      return {
        messageId: `simulated-${operationId}`,
        accepted: [to],
        response: "250 Message simulated",
        duration,
        simulated: true,
      };
    }

    try {
      const mailOptions = {
        from:
          from ||
          `"${process.env.EMAIL_FROM_NAME || "RoadTrip! Support"}" <${
            process.env.EMAIL_FROM_ADDRESS || "noreply@roadtrip.fr"
          }>`,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        html,
      };

      if (text) mailOptions.text = text;
      if (replyTo) mailOptions.replyTo = replyTo;

      logger.info("📤 Options email préparées", {
        operationId,
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        hasHtml: !!mailOptions.html,
        hasText: !!mailOptions.text,
        replyTo: mailOptions.replyTo,
        htmlLength: mailOptions.html?.length || 0,
      });

      logger.info("📨 Lancement envoi email via Mailjet", {
        operationId,
        timeout: `${timeout}ms`,
      });

      const result = await withTimeout(
        new Promise((resolve, reject) => {
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              logger.error("❌ Erreur callback sendMail", {
                operationId,
                error: error.message,
                code: error.code,
                command: error.command,
                response: error.response,
              });
              reject(error);
            } else {
              logger.info("✅ Callback sendMail réussi", {
                operationId,
                messageId: info.messageId,
                response: info.response,
                accepted: info.accepted?.length || 0,
                rejected: info.rejected?.length || 0,
              });
              resolve(info);
            }
          });
        }),
        timeout,
        "envoi email"
      );

      const duration = Date.now() - startTime;

      logger.info("🎉 Email envoyé avec succès", {
        operationId,
        to: mailOptions.to,
        subject: mailOptions.subject,
        messageId: result.messageId,
        duration: `${duration}ms`,
        accepted: result.accepted?.length || 0,
        rejected: result.rejected?.length || 0,
        response: result.response,
      });

      return { ...result, duration, operationId };
    } catch (err) {
      const duration = Date.now() - startTime;

      logger.error("💥 Erreur lors de l'envoi de l'email", {
        operationId,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        error: err.message,
        duration: `${duration}ms`,
        isTimeout: err.message.includes("Timeout"),
        errorCode: err.code,
        errorCommand: err.command,
        errorResponse: err.response,
      });

      throw err;
    }
  },

  sendConfirmationEmail: async (email, token) => {
    const { subject, html } = createConfirmationEmail(token);
    return await EmailService.sendEmail({
      to: email,
      subject,
      html,
      timeout: 45000,
    });
  },

  sendPasswordResetEmail: async (email, code) => {
    const { subject, html } = createResetEmail(code);
    return await EmailService.sendEmail({
      to: email,
      subject,
      html,
      timeout: 45000,
    });
  },

  sendContactSupportEmail: async (formData, categoryInfo) => {
    const { subject, html } = createContactSupportEmail(formData, categoryInfo);
    return await EmailService.sendEmail({
      to: process.env.CONTACT_RECEIVE_EMAIL || "contact@roadtrip.com",
      subject,
      html,
      replyTo: formData.email,
      timeout: 45000,
    });
  },

  sendContactConfirmationEmail: async (formData, categoryInfo) => {
    const { subject, html } = createContactConfirmationEmail(
      formData,
      categoryInfo
    );
    return await EmailService.sendEmail({
      to: formData.email,
      subject,
      html,
      timeout: 30000,
    });
  },

  sendAlertEmail: async (email, alert) => {
    const { subject, html } = createAlertEmail(alert);
    return await EmailService.sendEmail({
      to: email,
      subject,
      html,
      timeout: 30000,
    });
  },

  testMailjetConnection: async () => {
    if (!transporter) {
      return {
        success: false,
        message: "Mailjet non configuré - mode simulation actif",
        details: {
          hasApiKey: !!process.env.MAILJET_API_KEY,
          hasSecret: !!process.env.MAILJET_API_SECRET,
        },
      };
    }

    try {
      logger.info("🧪 Test connexion Mailjet détaillé...");
      const startTime = Date.now();

      const result = await withTimeout(
        new Promise((resolve, reject) => {
          transporter.verify((error, success) => {
            if (error) {
              reject(error);
            } else {
              resolve(success);
            }
          });
        }),
        15000,
        "test connexion"
      );

      const duration = Date.now() - startTime;

      logger.info("✅ Test Mailjet réussi", {
        duration: `${duration}ms`,
        result,
      });

      return {
        success: true,
        message: "Configuration Mailjet OK",
        duration: `${duration}ms`,
        details: result,
      };
    } catch (error) {
      logger.error("❌ Test Mailjet échoué", {
        error: error.message,
        code: error.code,
        command: error.command,
      });

      return {
        success: false,
        message: `Test Mailjet échoué: ${error.message}`,
        error: {
          message: error.message,
          code: error.code,
          command: error.command,
        },
      };
    }
  },
};

module.exports = EmailService;