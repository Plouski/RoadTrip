const axios = require('axios');
const { logger } = require('../utils/transporter');

const FreeSmsService = {

  // Envoie un SMS générique via l’API Free Mobile
  sendSMS: async (username, apiKey, message) => {
    logger.info(`📤 Envoi SMS via Free Mobile: username=${username.substring(0, 2)}*****, message="${message}"`);

    if (!username || !apiKey) {
      logger.error("❌ Identifiants Free Mobile manquants");
      throw new Error('Identifiants Free Mobile manquants');
    }

    const url = `https://smsapi.free-mobile.fr/sendmsg?user=${username}&pass=${apiKey}&msg=${encodeURIComponent(message)}`;

    try {
      const response = await axios.get(url);

      if (response.status !== 200) {
        logger.warn(`⚠️ Réponse inattendue: ${response.status}`);
        throw new Error(`L'API Free a renvoyé un statut ${response.status}`);
      }

      logger.info('✅ SMS envoyé avec succès via Free Mobile');
      return { success: true };

    } catch (error) {
      logger.error('❌ Échec de l’envoi du SMS Free Mobile');

      if (error.response) {
        logger.error(`📡 Code HTTP : ${error.response.status}`);
        logger.error(`📄 Message API : ${error.response.data}`);
      }

      logger.error(`📛 Erreur technique : ${error.message}`);
      throw new Error(`Erreur SMS Free Mobile : ${error.response?.data || error.message}`);
    }
  },

  // Envoie un SMS contenant un code de réinitialisation
  sendPasswordResetCode: async (username, apiKey, code) => {
    return await FreeSmsService.sendSMS(
      username,
      apiKey,
      `ROADTRIP! 🔑 Votre code de réinitialisation est : ${code}`
    );
  }
};

module.exports = FreeSmsService;