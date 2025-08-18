const axios = require('axios');
const logger = require('../utils/logger');

const SmsService = {
  
  // Envoie un SMS via l'API Free Mobile
  sendSMS: async (username, apiKey, message) => {
    logger.info("Tentative d'envoi de SMS via Free Mobile", {
      type: 'sms',
      provider: 'freemobile',
      username
    });

    if (!username || !apiKey) {
      logger.error("Identifiants Free Mobile manquants", {
        type: 'sms',
        provider: 'freemobile',
        username
      });
      throw new Error('Identifiants Free Mobile manquants');
    }

    const url = `https://smsapi.free-mobile.fr/sendmsg`;
    const params = {
      user: username,
      pass: apiKey,
      msg: message
    };

    try {
      const response = await axios.get(url, { params });

      if (response.status !== 200) {
        logger.warn("Réponse inattendue de l'API Free Mobile", {
          type: 'sms',
          provider: 'freemobile',
          username,
          status: response.status
        });
        throw new Error(`API Free Mobile retourne: ${response.status}`);
      }

      logger.info("SMS envoyé avec succès via Free Mobile", {
        type: 'sms',
        provider: 'freemobile',
        username,
        status: response.status
      });

      return { success: true, status: response.status };

    } catch (error) {
      const logData = {
        type: 'sms',
        provider: 'freemobile',
        username,
        error: error.message
      };

      if (error.response) {
        logData.status = error.response.status;
        logData.responseData = error.response.data;

        logger.error("Erreur réponse API Free Mobile", logData);

        switch (error.response.status) {
          case 400:
            throw new Error('Paramètres manquants ou incorrects');
          case 402:
            throw new Error('Trop de SMS envoyés ou crédits insuffisants');
          case 403:
            throw new Error('Service non activé ou identifiants incorrects');
          case 500:
            throw new Error('Erreur serveur Free Mobile');
          default:
            throw new Error(`Erreur Free Mobile: ${error.response.status}`);
        }
      }

      logger.error("Erreur réseau lors de l'envoi SMS", logData);
      throw new Error(`Erreur réseau: ${error.message}`);
    }
  },

  // Envoie un SMS de réinitialisation de mot de passe
  sendPasswordResetCode: async (username, apiKey, code) => {
    const message = `RoadTrip! - Votre code de réinitialisation est : ${code}`;
    return await SmsService.sendSMS(username, apiKey, message);
  }
};

module.exports = SmsService;