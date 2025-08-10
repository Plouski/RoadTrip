const { generateRoadtripAdvisor } = require("../services/aiService.js");
const dataService = require("../services/dataService");
const logger = require("../utils/logger.js");

/* Demande à l'IA un conseil personnalisé de roadtrip */
const askRoadtripAdvisor = async (req, res) => {
try {
    const { prompt, ...params } = req.body;

    const result = await generateRoadtripAdvisor({
      query: prompt,
      ...params,
    });

    res.json(result);
  } catch (error) {
    console.error("❌ Erreur askRoadtripAdvisor:", error);

    // Fallback propre, pas de 500 brutal
    res.status(200).json({
      type: "error",
      message: "Impossible de générer l’itinéraire pour le moment.",
      details: error.message,
    });
  }
};

/* Sauvegarde un message de conversation */
const saveConversation = async (req, res) => {
  const { role, content, conversationId } = req.body;
  const userId = req.user?.userId;

  if (!role || !content || !conversationId) {
    logger.warn("Tentative de sauvegarde avec données incomplètes", {
      userId,
      conversationId,
      hasRole: !!role,
      hasContent: !!content,
      hasConversationId: !!conversationId,
      requestId: req.id,
    });
    return res
      .status(400)
      .json({ error: "Données de conversation incomplètes." });
  }

  logger.info("💾 Sauvegarde message conversation", {
    userId,
    conversationId,
    role,
    contentLength: content.length,
    requestId: req.id,
  });

  try {
    const message = await dataService.createMessage({
      role,
      content,
      userId,
      conversationId,
    });

    logger.info("✅ Message sauvegardé avec succès", {
      userId,
      conversationId,
      messageId: message.id,
      role,
      requestId: req.id,
    });

    res.status(201).json({ success: true, message });
  } catch (error) {
    logger.error("💥 Erreur saveConversation", {
      userId,
      conversationId,
      role,
      error: {
        message: error.message,
        stack: error.stack,
      },
      requestId: req.id,
    });

    res.status(500).json({ error: "Erreur serveur." });
  }
};

/* Récupère tout l'historique des conversations utilisateur */
const getHistory = async (req, res) => {
  const userId = req.user?.userId;

  logger.info("📚 Récupération historique utilisateur", {
    userId,
    requestId: req.id,
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

    logger.info("✅ Historique récupéré avec succès", {
      userId,
      conversationsCount,
      totalMessages,
      requestId: req.id,
    });

    res.status(200).json(grouped);
  } catch (error) {
    logger.error("💥 Erreur getHistory", {
      userId,
      error: {
        message: error.message,
        stack: error.stack,
      },
      requestId: req.id,
    });

    res.status(500).json({ error: "Erreur serveur." });
  }
};

/* Supprime tout l'historique des conversations utilisateur */
const deleteHistory = async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    logger.security(
      "Tentative de suppression historique sans authentification",
      {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        requestId: req.id,
      }
    );
    return res.status(401).json({ error: "Non authentifié." });
  }

  logger.warn("🗑️ Suppression complète historique utilisateur", {
    userId,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    requestId: req.id,
  });

  try {
    const result = await dataService.deleteMessagesByUser(userId);

    logger.info(`✅ Historique supprimé avec succès`, {
      userId,
      deletedCount: result.deletedCount || "unknown",
      requestId: req.id,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error("💥 Erreur deleteHistory", {
      userId,
      error: {
        message: error.message,
        stack: error.stack,
      },
      requestId: req.id,
    });

    res.status(500).json({ error: "Erreur serveur." });
  }
};

/* Récupère une conversation spécifique par ID */
const getConversationById = async (req, res) => {
  const { id: conversationId } = req.params;
  const userId = req.user?.userId;

  if (!conversationId) {
    logger.warn("Récupération conversation sans ID", {
      userId,
      requestId: req.id,
    });
    return res.status(400).json({ error: "ID de conversation manquant." });
  }

  logger.info("📖 Récupération conversation spécifique", {
    userId,
    conversationId,
    requestId: req.id,
  });

  try {
    const messages = await dataService.getMessagesByConversation(
      userId,
      conversationId
    );

    logger.info("✅ Conversation récupérée avec succès", {
      userId,
      conversationId,
      messagesCount: messages.length,
      requestId: req.id,
    });

    res.status(200).json(messages);
  } catch (error) {
    logger.error("💥 Erreur getConversationById", {
      userId,
      conversationId,
      error: {
        message: error.message,
        stack: error.stack,
      },
      requestId: req.id,
    });

    res.status(500).json({ error: "Erreur serveur." });
  }
};

/* Supprime une conversation spécifique */
const deleteConversation = async (req, res) => {
  const { id: conversationId } = req.params;
  const userId = req.user?.userId;

  if (!conversationId) {
    logger.warn("Suppression conversation sans ID", {
      userId,
      requestId: req.id,
    });
    return res.status(400).json({ error: "ID de conversation manquant." });
  }

  if (!userId) {
    logger.security(
      "Tentative de suppression conversation sans authentification",
      {
        conversationId,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        requestId: req.id,
      }
    );
    return res.status(401).json({ error: "Non authentifié." });
  }

  logger.warn("🗑️ Suppression conversation spécifique", {
    userId,
    conversationId,
    ip: req.ip,
    requestId: req.id,
  });

  try {
    const result = await dataService.deleteConversation(userId, conversationId);

    logger.info(`✅ Conversation supprimée avec succès`, {
      userId,
      conversationId,
      deletedCount: result.deletedCount || "unknown",
      requestId: req.id,
    });

    res.status(200).json({
      success: true,
      message: "Conversation supprimée avec succès.",
    });
  } catch (error) {
    logger.error("💥 Erreur deleteConversation", {
      userId,
      conversationId,
      error: {
        message: error.message,
        stack: error.stack,
      },
      requestId: req.id,
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