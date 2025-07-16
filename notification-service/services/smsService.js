const axios = require('axios');

const SmsService = {
  
  // Envoie un SMS via l'API Free Mobile
  sendSMS: async (username, apiKey, message) => {
    console.log(`📱 Envoi SMS via Free Mobile pour ${username}`);

    if (!username || !apiKey) {
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
        throw new Error(`API Free Mobile retourne: ${response.status}`);
      }

      console.log('✅ SMS envoyé avec succès via Free Mobile');
      return { success: true, status: response.status };

    } catch (error) {
      console.error('❌ Erreur envoi SMS Free Mobile:', error.message);
      
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data: ${error.response.data}`);
        
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