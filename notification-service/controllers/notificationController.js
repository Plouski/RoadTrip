const EmailService = require("../services/emailService");
const FreeSmsService = require("../services/freeSmsService");
const logger = require("../utils/logger");

const NotificationController = {
  // Envoie un e-mail en fonction du type spécifié
  sendEmail: async (req, res) => {
    const { type, email, tokenOrCode } = req.body;

    try {
      switch (type) {
        case "confirm":
          await EmailService.sendConfirmationEmail(email, tokenOrCode);
          break;
        case "reset":
          await EmailService.sendPasswordResetEmail(email, tokenOrCode);
          break;
        case "welcome":
          await EmailService.sendWelcomeEmail(email, tokenOrCode);
          break;
        default:
          return res.status(400).json({ error: "Type d'e-mail inconnu" });
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      logger.error("❌ Erreur dans sendEmail :", err.message);


      return res.status(500).json({ error: err.message });
    }
  },

  // Envoie un SMS via le service Free Mobile
  sendSMS: async (req, res) => {
    const start = process.hrtime();
    
    logger.info("📨 Requête SMS reçue : " + JSON.stringify(req.body));

    try {
      const { username, apiKey, code, type } = req.body;

      if (!username || !apiKey) {
        return res.status(400).json({
          success: false,
          message: "Identifiants Free Mobile requis",
        });
      }

      if (type === "reset") {
        if (!code) {
          return res.status(400).json({
            success: false,
            message: "Code requis pour la réinitialisation",
          });
        }

        logger.info(
          `🔄 Tentative d'envoi SMS de réinitialisation avec code ${code}`
        );

        await FreeSmsService.sendPasswordResetCode(username, apiKey, code);

        const duration = process.hrtime(start);
        const seconds = duration[0] + duration[1] / 1e9;

        logger.info("✅ SMS envoyé avec succès");
        
        return res.status(200).json({
          success: true,
          message: "SMS envoyé avec succès",
          deliveryTime: `${seconds.toFixed(2)}s`
        });
      } else {
        logger.warn("⚠️ Type de SMS non pris en charge pour l'instant :", type);
        return res.status(400).json({
          success: false,
          message: `Type de SMS non pris en charge: ${type}`
        });
      }

    } catch (error) {

      logger.error("❌ Erreur de traitement SMS :", {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
      });
      
      return res.status(500).json({
        success: false,
        message: `Erreur d'envoi : ${error.message}`,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  // Envoie une notification push via Firebase
  // sendPush: async (req, res) => {
  //   const { token, title, body } = req.body;
  //   const start = process.hrtime();

  //   try {
  //     const message = {
  //       token,
  //       notification: { title, body },
  //       data: {
  //         title: title.toString(),
  //         body: (body || "").toString(),
  //         timestamp: Date.now().toString(),
  //       },
  //     };

  //     await messaging.send(message);
      
  //     const duration = process.hrtime(start);
  //     const seconds = duration[0] + duration[1] / 1e9;
      
  //     notificationDeliveryTime.observe({ type: "push" }, seconds);
  //     notificationsSentTotal.inc({ type: "push", status: "success" });
      
  //     return res.status(200).json({ success: true });
  //   } catch (err) {
  //     logger.error("❌ Erreur dans sendPush :", err.message);
  //     notificationsSentTotal.inc({ type: "push", status: "failed" });
  //     return res.status(500).json({ error: err.message });
  //   }
  // },
};

module.exports = NotificationController;