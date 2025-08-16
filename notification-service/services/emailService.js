const nodemailer = require("nodemailer");
const mailjetTransport = require("nodemailer-mailjet-transport");
const logger = require("../utils/logger");

logger.info("🔍 Vérification configuration Mailjet", {
  hasApiKey: !!process.env.MAILJET_API_KEY,
  hasSecret: !!process.env.MAILJET_API_SECRET,
  apiKeyLength: process.env.MAILJET_API_KEY?.length || 0,
  secretLength: process.env.MAILJET_API_SECRET?.length || 0
});

if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_API_SECRET) {
  logger.warn("❌ Mailjet non configuré - les emails seront simulés");
}

let transporter = null;

if (process.env.MAILJET_API_KEY && process.env.MAILJET_API_SECRET) {
  try {
    logger.info("🔧 Création du transporter Mailjet...");
    
    const transportConfig = {
      auth: {
        apiKey: process.env.MAILJET_API_KEY,
        apiSecret: process.env.MAILJET_API_SECRET,
      },
      pool: false,
      maxConnections: 1,
      maxMessages: 1,
      rateLimit: 1000,
    };

    logger.info("🔧 Configuration transport:", {
      hasApiKey: !!transportConfig.auth.apiKey,
      hasSecret: !!transportConfig.auth.apiSecret,
      pool: transportConfig.pool,
      maxConnections: transportConfig.maxConnections
    });

    transporter = nodemailer.createTransport(mailjetTransport(transportConfig));
    
    logger.info("✅ Transporter Mailjet créé avec succès");
    
    transporter.verify((error, success) => {
      if (error) {
        logger.error("❌ Erreur vérification Mailjet", { 
          error: error.message,
          code: error.code,
          command: error.command 
        });
      } else {
        logger.info("✅ Vérification Mailjet réussie", { success });
      }
    });
    
  } catch (error) {
    logger.error("❌ Erreur création transporter Mailjet", { 
      error: error.message,
      stack: error.stack 
    });
    transporter = null;
  }
}

const withTimeout = (promise, timeoutMs = 30000, operation = "operation") => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        logger.error(`⏰ Timeout ${operation} après ${timeoutMs}ms`);
        reject(new Error(`Timeout ${operation} après ${timeoutMs}ms`));
      }, timeoutMs);
      
      promise.finally(() => clearTimeout(timeoutId));
    })
  ]);
};

const createConfirmationEmail = (token) => {
  const link = `${process.env.FRONTEND_URL}/confirm-account?token=${token}`;
  
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
          Si le bouton ne fonctionne pas, copiez ce lien : ${link}
        </p>
        <p style="margin-top: 20px; font-size: 12px; color: #999;">
          Ce lien expire dans 24 heures.
        </p>
      </div>
    `
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
            ${code}
          </span>
        </div>
        <p style="color: #666;">Ce code expire dans 1 heure.</p>
        <p style="font-size: 12px; color: #999;">
          Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        </p>
      </div>
    `
  };
};

const createContactSupportEmail = (formData, category_info) => {
  return {
    subject: `[${category_info.emoji}${formData.category.toUpperCase()}] ${formData.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #E30613;">Nouveau message de contact - RoadTrip!</h1>
        <p><strong>Catégorie :</strong> ${category_info.emoji} ${category_info.name}</p>
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        
        <p><strong>Nom :</strong> ${formData.name}</p>
        <p><strong>Email :</strong> ${formData.email}</p>
        <p><strong>Sujet :</strong> ${formData.subject}</p>
        <p><strong>Date :</strong> ${new Date(formData.timestamp).toLocaleString('fr-FR')}</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Message :</h3>
          <p style="white-space: pre-wrap; margin-bottom: 0;">${formData.message}</p>
        </div>
        
        <p style="font-size: 12px; color: #999;">
          Répondez directement à cette adresse : ${formData.email}
        </p>
      </div>
    `
  };
};

const createContactConfirmationEmail = (formData) => {
  return {
    subject: "Message reçu - RoadTrip!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #E30613;">Message bien reçu !</h1>
        <p>Bonjour <strong>${formData.name}</strong>,</p>
        <p>Nous avons bien reçu votre message concernant :</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <strong>"${formData.subject}"</strong>
        </div>
        
        <p>Notre équipe va examiner votre demande et vous répondra rapidement à cette adresse email.</p>
        <p>Merci de faire confiance à <strong>RoadTrip!</strong></p>
        
        <p style="margin-top: 20px; font-size: 12px; color: #999;">
          Si vous avez une urgence, contactez-nous au +33 1 23 45 67 89
        </p>
      </div>
    `
  };
};

const createAlertEmail = (alert) => {
  const colors = {
    'CRITICAL': '#ff0000',
    'WARNING': '#ffaa00', 
    'INFO': '#00aa00'
  };

  const color = colors[alert.severity] || '#cccccc';

  return {
    subject: `RoadTrip! Alert: ${alert.severity} - ${alert.service}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${color}; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h1 style="margin: 0; color: white;">🚨 ${alert.severity} Alert</h1>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Service :</strong> ${alert.service}</p>
          <p><strong>Problème :</strong> ${alert.message}</p>
          <p><strong>Heure :</strong> ${alert.timestamp}</p>
          <p><strong>Sévérité :</strong> ${alert.severity}</p>
        </div>

        <p>Vérifiez le dashboard : <a href="${process.env.GRAFANA_URL || 'http://localhost:3100'}" style="color: #E30613;">Grafana</a></p>
        
        <p style="font-size: 12px; color: #999;">
          Alert automatique générée par RoadTrip! Monitoring
        </p>
      </div>
    `
  };
};

const EmailService = {
  sendEmail: async ({ to, subject, html, from, text, timeout = 60000 }) => {
    const startTime = Date.now();
    const operationId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    logger.info("🚀 Début envoi email", {
      operationId,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      timeout: `${timeout}ms`,
      hasTransporter: !!transporter,
      transporterType: transporter ? 'mailjet' : 'simulation'
    });
    
    if (!transporter) {
      logger.warn("📧 Mode simulation - Mailjet non configuré", {
        operationId,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject 
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const duration = Date.now() - startTime;
      return {
        messageId: `simulated-${operationId}`,
        accepted: [to],
        response: "250 Message simulated",
        duration,
        simulated: true
      };
    }

    try {
      const mailOptions = {
        from: from || `"${process.env.EMAIL_FROM_NAME || 'RoadTrip! Support'}" <${process.env.EMAIL_FROM_ADDRESS || 'noreply@roadtrip.fr'}>`,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        html
      };

      if (text) {
        mailOptions.text = text;
      }

      logger.info("📤 Options email préparées", {
        operationId,
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        hasHtml: !!mailOptions.html,
        hasText: !!mailOptions.text,
        htmlLength: mailOptions.html?.length || 0
      });

      logger.info("📨 Lancement envoi email via Mailjet", { 
        operationId,
        timeout: `${timeout}ms`
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
                response: error.response
              });
              reject(error);
            } else {
              logger.info("✅ Callback sendMail réussi", {
                operationId,
                messageId: info.messageId,
                response: info.response,
                accepted: info.accepted?.length || 0,
                rejected: info.rejected?.length || 0
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
        response: result.response
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
        isTimeout: err.message.includes('Timeout'),
        errorCode: err.code,
        errorCommand: err.command,
        errorResponse: err.response
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
      timeout: 45000
    });
  },

  sendPasswordResetEmail: async (email, code) => {
    const { subject, html } = createResetEmail(code);
    return await EmailService.sendEmail({
      to: email,
      subject,
      html,
      timeout: 45000
    });
  },

  sendContactSupportEmail: async (formData, category_info) => {
    const { subject, html } = createContactSupportEmail(formData, category_info);
    return await EmailService.sendEmail({
      to: process.env.CONTACT_RECEIVE_EMAIL || "contact@roadtrip.com",
      subject,
      html,
      timeout: 45000
    });
  },

  sendContactConfirmationEmail: async (formData) => {
    const { subject, html } = createContactConfirmationEmail(formData);
    return await EmailService.sendEmail({
      to: formData.email,
      subject,
      html,
      timeout: 30000
    });
  },

  sendAlertEmail: async (email, alert) => {
    const { subject, html } = createAlertEmail(alert);
    return await EmailService.sendEmail({
      to: email,
      subject,
      html,
      timeout: 30000
    });
  },

  testMailjetConnection: async () => {
    if (!transporter) {
      return { 
        success: false, 
        message: "Mailjet non configuré - mode simulation actif",
        details: {
          hasApiKey: !!process.env.MAILJET_API_KEY,
          hasSecret: !!process.env.MAILJET_API_SECRET
        }
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
        result 
      });
      
      return { 
        success: true, 
        message: "Configuration Mailjet OK",
        duration: `${duration}ms`,
        details: result
      };
    } catch (error) {
      logger.error("❌ Test Mailjet échoué", { 
        error: error.message,
        code: error.code,
        command: error.command
      });
      
      return { 
        success: false, 
        message: `Test Mailjet échoué: ${error.message}`,
        error: {
          message: error.message,
          code: error.code,
          command: error.command
        }
      };
    }
  }
};

module.exports = EmailService;