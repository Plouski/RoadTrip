const { roadtripAdvisorService } = require("../services/aiService.js");
const dataService = require("../services/dataService");
const logger = require("../utils/logger.js");

/* Demande à l'IA un conseil personnalisé de roadtrip */
const askRoadtripAdvisor = async (req, res) => {
  const { prompt, query, ...params } = req.body;
  const input = prompt || query;

  if (!input) {
    logger.warn('Requête IA sans prompt', {
      userId: params.userId,
      conversationId: params.conversationId,
      requestId: req.id,
      ip: req.ip
    });
    return res.status(400).json({ error: "Le champ 'prompt' est requis." });
  }

  const start = process.hrtime();
  
  logger.ai('🤖 Nouvelle demande roadtrip advisor', {
    userId: params.userId,
    conversationId: params.conversationId,
    promptLength: input.length,
    location: params.location,
    duration: params.duration,
    budget: params.budget,
    travelStyle: params.travelStyle,
    interests: params.interests?.length || 0,
    includeWeather: params.includeWeather,
    requestId: req.id
  });
  
  try {
    const result = await roadtripAdvisorService({ query: input, ...params });

    // Calculer le temps de traitement
    const [seconds, nanoseconds] = process.hrtime(start);
    const processingTime = seconds * 1000 + nanoseconds / 1000000;

    if (result.type === 'error') {
      if (result.max_duration && result.requested_duration) {
        logger.warn('Demande roadtrip avec durée excessive', {
          userId: params.userId,
          conversationId: params.conversationId,
          requestedDuration: result.requested_duration,
          maxDuration: result.max_duration,
          processingTime: Math.round(processingTime),
          errorType: 'validation_duration',
          requestId: req.id
        });

        return res.status(200).json({
          role: 'assistant',
          content: result.message,
          userId: params.userId,
          conversationId: params.conversationId,
          error: true,
          errorType: 'validation_duration',
          details: result
        });
      } else if (result.error_type === 'invalid_topic') {
        logger.security('Tentative de requête hors-sujet détectée', {
          userId: params.userId,
          conversationId: params.conversationId,
          prompt: input.substring(0, 100) + '...',
          processingTime: Math.round(processingTime),
          errorType: 'invalid_topic',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          requestId: req.id
        });
        
        return res.status(200).json({
          role: 'assistant',
          content: result.message,
          userId: params.userId,
          conversationId: params.conversationId,
          error: true,
          errorType: 'invalid_topic',
          details: result
        });
      } else {
        logger.error("💥 Erreur technique dans roadtripAdvisorService", {
          userId: params.userId,
          conversationId: params.conversationId,
          error: result,
          processingTime: Math.round(processingTime),
          requestId: req.id
        });
        return res.status(500).json(result);
      }
    }

    const formattedContent = formatRoadtripResponse(result);
    
    logger.ai('✅ Roadtrip généré avec succès', {
      userId: params.userId,
      conversationId: params.conversationId,
      destination: result.destination,
      duration: result.duree_recommandee,
      budgetEstimate: result.budget_estime?.montant,
      itineraryDays: result.itineraire?.length || 0,
      hasWeatherData: !!result.meteo_actuelle,
      processingTime: Math.round(processingTime),
      contentLength: formattedContent.length,
      requestId: req.id
    });

    if (processingTime > 5000) {
      logger.performance('Génération IA lente détectée', {
        userId: params.userId,
        conversationId: params.conversationId,
        processingTime: Math.round(processingTime),
        promptLength: input.length,
        destination: result.destination,
        requestId: req.id
      });
    }
    
    const response = {
      role: 'assistant',
      content: formattedContent,
      userId: params.userId,
      conversationId: params.conversationId
    };

    res.status(200).json(response);

  } catch (error) {
    const [seconds, nanoseconds] = process.hrtime(start);
    const processingTime = seconds * 1000 + nanoseconds / 1000000;

    logger.error("💥 Erreur IA critique", {
      userId: params.userId,
      conversationId: params.conversationId,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      processingTime: Math.round(processingTime),
      promptLength: input.length,
      requestId: req.id
    });

    res.status(500).json({ error: "Erreur serveur IA." });
  }
};

const formatRoadtripResponse = (result) => {
  if (result.type === 'error') {
    return result.message;
  }
  
  let formatted = `\n✨ **ROADTRIP : ${result.destination?.toUpperCase()}**\n`;
  formatted += `🗓️ Durée recommandée : **${result.duree_recommandee}**\n`;
  formatted += `📅 Saison idéale : **${result.saison_ideale}**\n`;
  formatted += `💰 Budget estimé : **${result.budget_estime?.montant}**\n\n`;
  
  if (result.meteo_actuelle) {
    formatted += `🌤️ **Météo à ${result.meteo_actuelle.lieu}**\n`;
    formatted += `   🌤️ ${result.meteo_actuelle.condition}, ${result.meteo_actuelle.temperature}\n\n`;
  }
  
  if (result.budget_estime?.details) {
    formatted += `📊 **Répartition du budget :**\n`;
    formatted += `   🏨 Hébergement : ${result.budget_estime.details.hebergement}\n`;
    formatted += `   🍽️ Nourriture : ${result.budget_estime.details.nourriture}\n`;
    formatted += `   ⛽ Carburant : ${result.budget_estime.details.carburant}\n`;
    formatted += `   🎯 Activités : ${result.budget_estime.details.activites}\n\n`;
  }
  
  formatted += `🗺️ **ITINÉRAIRE DÉTAILLÉ**\n───\n\n`;
  
  if (result.itineraire && Array.isArray(result.itineraire)) {
    result.itineraire.forEach((jour) => {
      formatted += `📍 **Jour ${jour.jour} :** ${jour.trajet}\n`;
      formatted += `   📏 Distance : ${jour.distance}\n`;
      
      if (jour.etapes_recommandees && Array.isArray(jour.etapes_recommandees)) {
        formatted += `   🎯 Étapes recommandées :\n`;
        jour.etapes_recommandees.forEach(etape => {
          formatted += `     • ${etape}\n`;
        });
      }
      
      if (jour.activites && Array.isArray(jour.activites)) {
        formatted += `   🎨 Activités proposées :\n`;
        jour.activites.forEach(activite => {
          formatted += `     • ${activite}\n`;
        });
      }
      
      formatted += `   🏨 Hébergement suggéré : ${jour.hebergement}\n`;
      formatted += `\n🔸🔸🔸\n\n`;
    });
  }
  
  if (result.conseils_route && Array.isArray(result.conseils_route)) {
    formatted += `💡 **CONSEILS PRATIQUES**\n───\n`;
    result.conseils_route.forEach(conseil => {
      formatted += `🔸 ${conseil}\n`;
    });
    formatted += `\n`;
  }
  
  if (result.equipement_essentiel && Array.isArray(result.equipement_essentiel)) {
    formatted += `🎒 **ÉQUIPEMENT ESSENTIEL**\n───\n`;
    result.equipement_essentiel.forEach(equipement => {
      formatted += `✅ ${equipement}\n`;
    });
  }
  
  return formatted;
};

/* Sauvegarde un message de conversation */
const saveConversation = async (req, res) => {
  const { role, content, conversationId } = req.body;
  const userId = req.user?.userId;

  if (!role || !content || !conversationId) {
    logger.warn('Tentative de sauvegarde avec données incomplètes', {
      userId,
      conversationId,
      hasRole: !!role,
      hasContent: !!content,
      hasConversationId: !!conversationId,
      requestId: req.id
    });
    return res.status(400).json({ error: "Données de conversation incomplètes." });
  }

  logger.info('💾 Sauvegarde message conversation', {
    userId,
    conversationId,
    role,
    contentLength: content.length,
    requestId: req.id
  });

  try {
    const message = await dataService.createMessage({ 
      role, 
      content,
      userId, 
      conversationId 
    });

    logger.info('✅ Message sauvegardé avec succès', {
      userId,
      conversationId,
      messageId: message.id,
      role,
      requestId: req.id
    });

    res.status(201).json({ success: true, message });

  } catch (error) {
    logger.error("💥 Erreur saveConversation", {
      userId,
      conversationId,
      role,
      error: {
        message: error.message,
        stack: error.stack
      },
      requestId: req.id
    });
    
    res.status(500).json({ error: "Erreur serveur." });
  }
};

/* Récupère tout l'historique des conversations utilisateur */
const getHistory = async (req, res) => {
  const userId = req.user?.userId;

  logger.info('📚 Récupération historique utilisateur', {
    userId,
    requestId: req.id
  });

  try {
    const messages = await dataService.getMessagesByUser(userId);

    const grouped = messages.reduce((acc, msg) => {
      const id = msg.conversationId || "default";
      acc[id] = acc[id] || [];
      acc[id].push(msg);
      return acc;
    }, {});

    const conversationsCount = Object.keys(grouped).length;
    const totalMessages = messages.length;

    logger.info('✅ Historique récupéré avec succès', {
      userId,
      conversationsCount,
      totalMessages,
      requestId: req.id
    });

    res.status(200).json(grouped);

  } catch (error) {
    logger.error("💥 Erreur getHistory", {
      userId,
      error: {
        message: error.message,
        stack: error.stack
      },
      requestId: req.id
    });
    
    res.status(500).json({ error: "Erreur serveur." });
  }
};

/* Supprime tout l'historique des conversations utilisateur */
const deleteHistory = async (req, res) => {
  const userId = req.user?.userId;
  
  if (!userId) {
    logger.security('Tentative de suppression historique sans authentification', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.id
    });
    return res.status(401).json({ error: "Non authentifié." });
  }

  logger.warn('🗑️ Suppression complète historique utilisateur', {
    userId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id
  });

  try {
    const result = await dataService.deleteMessagesByUser(userId);
    
    logger.info(`✅ Historique supprimé avec succès`, {
      userId,
      deletedCount: result.deletedCount || 'unknown',
      requestId: req.id
    });
    
    res.status(200).json({ success: true });

  } catch (error) {
    logger.error("💥 Erreur deleteHistory", {
      userId,
      error: {
        message: error.message,
        stack: error.stack
      },
      requestId: req.id
    });
    
    res.status(500).json({ error: "Erreur serveur." });
  }
};

/* Récupère une conversation spécifique par ID */
const getConversationById = async (req, res) => {
  const { id: conversationId } = req.params;
  const userId = req.user?.userId;

  if (!conversationId) {
    logger.warn('Récupération conversation sans ID', {
      userId,
      requestId: req.id
    });
    return res.status(400).json({ error: "ID de conversation manquant." });
  }

  logger.info('📖 Récupération conversation spécifique', {
    userId,
    conversationId,
    requestId: req.id
  });

  try {
    const messages = await dataService.getMessagesByConversation(userId, conversationId);
    
    logger.info('✅ Conversation récupérée avec succès', {
      userId,
      conversationId,
      messagesCount: messages.length,
      requestId: req.id
    });
    
    res.status(200).json(messages);

  } catch (error) {
    logger.error("💥 Erreur getConversationById", {
      userId,
      conversationId,
      error: {
        message: error.message,
        stack: error.stack
      },
      requestId: req.id
    });
    
    res.status(500).json({ error: "Erreur serveur." });
  }
};

/* Supprime une conversation spécifique */
const deleteConversation = async (req, res) => {
  const { id: conversationId } = req.params;
  const userId = req.user?.userId;

  if (!conversationId) {
    logger.warn('Suppression conversation sans ID', {
      userId,
      requestId: req.id
    });
    return res.status(400).json({ error: "ID de conversation manquant." });
  }
  
  if (!userId) {
    logger.security('Tentative de suppression conversation sans authentification', {
      conversationId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.id
    });
    return res.status(401).json({ error: "Non authentifié." });
  }

  logger.warn('🗑️ Suppression conversation spécifique', {
    userId,
    conversationId,
    ip: req.ip,
    requestId: req.id
  });

  try {
    const result = await dataService.deleteConversation(userId, conversationId);
    
    logger.info(`✅ Conversation supprimée avec succès`, {
      userId,
      conversationId,
      deletedCount: result.deletedCount || 'unknown',
      requestId: req.id
    });
    
    res.status(200).json({ 
      success: true, 
      message: "Conversation supprimée avec succès." 
    });

  } catch (error) {
    logger.error("💥 Erreur deleteConversation", {
      userId,
      conversationId,
      error: {
        message: error.message,
        stack: error.stack
      },
      requestId: req.id
    });
    
    res.status(500).json({ error: "Erreur serveur." });
  }
};

module.exports = {
  askRoadtripAdvisor,
  saveConversation,
  getHistory,
  deleteHistory,
  getConversationById,
  deleteConversation,
};