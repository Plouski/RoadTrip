const axios = require("axios");
const logger = require("../utils/logger");
const User = require("../models/User");

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:5005";
const FREE_MOBILE_USERNAME = process.env.FREE_MOBILE_USERNAME;
const FREE_MOBILE_API_KEY = process.env.FREE_MOBILE_API_KEY;

const createAxiosInstance = () => {
  return axios.create({
    timeout: 60000,
    headers: { 
      "Content-Type": "application/json",
      "x-api-key": process.env.NOTIFICATION_API_KEY || "test-api-key-123"
    },
  });
};

const NotificationService = {
  // Envoie un email de confirmation
  sendConfirmationEmail: async (email, token) => {
    try {
      const user = await User.findOne({ email });
      if (!user || user.isVerified || user.verificationToken !== token) {
        logger.info("🚫 Utilisateur déjà vérifié ou token invalide", { email });
        return {
          status: 200,
          data: { message: "Utilisateur déjà vérifié ou token invalide" },
        };
      }

      console.log(`📧 Envoi email confirmation à ${email} via ${NOTIFICATION_SERVICE_URL}`);

      const axiosInstance = createAxiosInstance();
      
      // ✅ CORRECTION: Utiliser la bonne URL du notification-service
      const res = await axiosInstance.post(
        `${NOTIFICATION_SERVICE_URL}/api/email/confirm`,
        { 
          email, 
          token 
        }
      );

      console.log("✅ Email de confirmation envoyé avec succès");
      return res;
    } catch (error) {
      console.error("❌ Erreur envoi email confirmation:", {
        email,
        error: error.message,
        url: `${NOTIFICATION_SERVICE_URL}/api/email/confirm`,
        status: error.response?.status
      });
      throw error;
    }
  },

  // Envoie un email de réinitialisation avec vérification directe
  sendPasswordResetEmail: async (email, code, retryCount = 0) => {
    try {
      const user = await User.findOne({
        email,
        resetCode: code,
        resetCodeExpires: { $gt: Date.now() },
      });

      if (!user) {
        console.log("🚫 Code de reset invalide ou expiré", { email, code });
        return { status: 200, data: { message: "Code invalide ou expiré" } };
      }

      console.log(`📧 Envoi email reset à ${email} via ${NOTIFICATION_SERVICE_URL}`);

      const axiosInstance = createAxiosInstance();
      
      // ✅ CORRECTION: Utiliser la bonne URL du notification-service
      const res = await axiosInstance.post(
        `${NOTIFICATION_SERVICE_URL}/api/email/reset`,
        { 
          email, 
          code 
        }
      );

      console.log("✅ Email de réinitialisation envoyé");
      return res;
    } catch (error) {
      console.error("❌ Erreur envoi email reset:", {
        email,
        error: error.message,
        url: `${NOTIFICATION_SERVICE_URL}/api/email/reset`
      });

      const user = await User.findOne({
        email,
        resetCode: code,
        resetCodeExpires: { $gt: Date.now() },
      });

      if (!user) {
        console.log("🚫 Code devenu invalide pendant l'erreur", { email });
        return { status: 200, data: { message: "Code invalide" } };
      }

      if (retryCount < 1) {
        console.log("🔄 Retry envoi email");
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return NotificationService.sendPasswordResetEmail(
          email,
          code,
          retryCount + 1
        );
      }

      throw error;
    }
  },

  // Envoie un SMS de réinitialisation
  sendPasswordResetSMS: async (phoneNumber, code) => {
    try {
      if (!FREE_MOBILE_USERNAME || !FREE_MOBILE_API_KEY) {
        throw new Error("Configuration Free Mobile manquante");
      }

      console.log(`📱 Envoi SMS reset via ${NOTIFICATION_SERVICE_URL}`);

      const axiosInstance = createAxiosInstance();
      
      // ✅ CORRECTION: Utiliser la bonne URL du notification-service
      const response = await axiosInstance.post(
        `${NOTIFICATION_SERVICE_URL}/api/sms/reset`,
        {
          username: FREE_MOBILE_USERNAME,
          apiKey: FREE_MOBILE_API_KEY,
          code: code,
        }
      );

      if (response.status === 500) {
        console.log("⚠️ SMS possiblement envoyé malgré erreur 500");
        return { success: true, message: "SMS possiblement envoyé" };
      }

      console.log("✅ SMS envoyé avec succès");
      return { success: true, message: "SMS envoyé" };
    } catch (error) {
      console.error("❌ Erreur envoi SMS:", { 
        error: error.message,
        url: `${NOTIFICATION_SERVICE_URL}/api/sms/reset`
      });
      return { success: false, message: "Erreur SMS" };
    }
  },

  // Plus d'annulation, juste un log
  cancelPendingEmails: (email) => {
    console.log("🚫 Demande d'annulation", { email });
  },
};

module.exports = NotificationService;