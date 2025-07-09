const twilio = require("twilio");
const { logger } = require("../utils/transporter");

const SmsService = {

  // Envoie un SMS contenant un code de réinitialisation de mot de passe
  sendPasswordResetCode: async (phoneNumber, code) => {
    try {
      let formattedPhone = phoneNumber;
      if (phoneNumber.startsWith("0")) {
        formattedPhone = "+33" + phoneNumber.substring(1);
      } else if (!phoneNumber.startsWith("+")) {
        formattedPhone = "+" + phoneNumber;
      }

      logger.log("🔍 Vérification configuration Twilio :", {
        sid: process.env.TWILIO_SID ? "Défini" : "Non défini",
        auth: process.env.TWILIO_AUTH ? "Défini" : "Non défini",
        from: process.env.TWILIO_PHONE,
        to: formattedPhone,
      });

      if (
        !process.env.TWILIO_SID ||
        !process.env.TWILIO_AUTH ||
        !process.env.TWILIO_PHONE
      ) {
        throw new Error(
          "Configuration Twilio incomplète : SID, AUTH ou PHONE manquant"
        );
      }

      let client;
      try {
        client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
        logger.log("✅ Client Twilio initialisé avec succès");
      } catch (initError) {
        logger.error(
          "❌ Erreur d'initialisation du client Twilio :",
          initError
        );
        throw new Error(`Échec d'initialisation Twilio : ${initError.message}`);
      }

      logger.log("📤 Envoi du SMS via Twilio");
      const result = await client.messages.create({
        body: `Code de réinitialisation RoadTrip : ${code}`,
        from: process.env.TWILIO_PHONE,
        to: formattedPhone,
      });

      logger.log("📨 Réponse Twilio :", {
        sid: result.sid,
        status: result.status,
        dateCreated: result.dateCreated,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      });

      return result;
    } catch (error) {
      logger.error("❌ Erreur détaillée lors de l'envoi du SMS :", {
        message: error.message,
        code: error.code,
        moreInfo: error.moreInfo,
        status: error.status,
        details: error.details,
      });
      throw error;
    }
  },

  // Envoie un SMS générique avec un message libre
  sendSMS: async (phoneNumber, message, type = "general") => {
    try {
      let formattedPhone = phoneNumber;
      if (phoneNumber.startsWith("0")) {
        formattedPhone = "+33" + phoneNumber.substring(1);
      } else if (!phoneNumber.startsWith("+")) {
        formattedPhone = "+" + phoneNumber;
      }

      if (
        !process.env.TWILIO_SID ||
        !process.env.TWILIO_AUTH ||
        !process.env.TWILIO_PHONE
      ) {
        throw new Error("Configuration Twilio incomplète");
      }

      const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE,
        to: formattedPhone,
      });

      logger.log(`✅ SMS de type "${type}" envoyé :`, {
        to: formattedPhone,
        status: result.status,
        sid: result.sid,
      });

      return result;
    } catch (error) {
      logger.error(`❌ Erreur lors de l'envoi d'un SMS de type "${type}" :`, {
        to: phoneNumber,
        message: error.message,
        code: error.code,
      });
      throw error;
    }
  },
};

module.exports = SmsService;
