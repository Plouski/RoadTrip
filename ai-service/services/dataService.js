const axios = require("axios");
const logger = require("../utils/logger");

const DATA_SERVICE_URL =
  process.env.DATA_SERVICE_URL || "http://localhost:5002";
const REQUEST_TIMEOUT = parseInt(process.env.DATA_SERVICE_TIMEOUT || "10000");

// Configuration Axios avec logging automatique
const dataServiceClient = axios.create({
  baseURL: DATA_SERVICE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "ai-service/1.0.0",
  },
});

// Intercepteur de requête
dataServiceClient.interceptors.request.use(
  (config) => {
    const requestId = Math.random().toString(36).substr(2, 9);
    config.metadata = { startTime: Date.now(), requestId };

    logger.debug("→ Requête vers data-service", {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      timeout: config.timeout,
      requestId,
      hasData: !!config.data,
    });

    return config;
  },
  (error) => {
    logger.error("❌ Erreur configuration requête data-service", {
      error: error.message,
    });
    return Promise.reject(error);
  }
);

// Intercepteur de réponse
dataServiceClient.interceptors.response.use(
  (response) => {
    const { config } = response;
    const duration = Date.now() - config.metadata.startTime;

    logger.info("✅ Réponse data-service", {
      method: config.method?.toUpperCase(),
      url: config.url,
      statusCode: response.status,
      duration,
      requestId: config.metadata.requestId,
      responseSize: JSON.stringify(response.data).length,
    });

    if (duration > 3000) {
      logger.performance("Requête data-service lente", {
        method: config.method?.toUpperCase(),
        url: config.url,
        duration,
        requestId: config.metadata.requestId,
      });
    }

    return response;
  },
  (error) => {
    const { config } = error;
    const duration = config?.metadata
      ? Date.now() - config.metadata.startTime
      : null;

    if (error.code === "ECONNABORTED") {
      logger.warn("⏰ Timeout data-service", {
        method: config?.method?.toUpperCase(),
        url: config?.url,
        timeout: REQUEST_TIMEOUT,
        duration,
        requestId: config?.metadata?.requestId,
      });
    } else if (error.response) {
      logger.error("❌ Erreur HTTP data-service", {
        method: config?.method?.toUpperCase(),
        url: config?.url,
        statusCode: error.response.status,
        statusText: error.response.statusText,
        duration,
        requestId: config?.metadata?.requestId,
        responseData: error.response.data,
      });
    } else if (error.request) {
      logger.error("❌ Pas de réponse data-service", {
        method: config?.method?.toUpperCase(),
        url: config?.url,
        duration,
        requestId: config?.metadata?.requestId,
        error: error.message,
      });
    } else {
      logger.error("❌ Erreur inconnue data-service", {
        error: error.message,
        requestId: config?.metadata?.requestId,
      });
    }

    return Promise.reject(error);
  }
);

logger.info("🔗 Service Data initialisé", {
  dataServiceUrl: DATA_SERVICE_URL,
  timeout: REQUEST_TIMEOUT,
  userAgent: "ai-service/1.0.0",
});

// Créer un nouveau message
const createMessage = async (messageData) => {
  const startTime = Date.now();

  try {
    logger.info("💾 Création message", {
      userId: messageData.userId,
      conversationId: messageData.conversationId,
      role: messageData.role,
      contentLength: messageData.content?.length || 0,
    });

    const response = await dataServiceClient.post("/api/messages", messageData);

    logger.info("✅ Message créé avec succès", {
      userId: messageData.userId,
      conversationId: messageData.conversationId,
      messageId: response.data.id,
      processingTime: Date.now() - startTime,
    });

    return response.data;
  } catch (error) {
    logger.error("❌ Erreur création message", {
      userId: messageData.userId,
      conversationId: messageData.conversationId,
      error: {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      },
      processingTime: Date.now() - startTime,
    });

    const enhancedError = new Error(
      `Impossible de créer le message: ${error.message}`
    );
    enhancedError.originalError = error;
    enhancedError.statusCode = error.response?.status || 500;
    throw enhancedError;
  }
};

// Récupérer tous les messages d'un utilisateur
const getMessagesByUser = async (userId) => {
  const startTime = Date.now();

  try {
    if (!userId) {
      throw new Error("userId est requis");
    }

    logger.info("📚 Récupération messages utilisateur", {
      userId,
    });

    const response = await dataServiceClient.get(
      `/api/messages/user/${userId}`
    );
    const messages = response.data;

    logger.info("✅ Messages utilisateur récupérés", {
      userId,
      messagesCount: messages.length,
      processingTime: Date.now() - startTime,
    });

    return messages;
  } catch (error) {
    logger.error("❌ Erreur récupération messages utilisateur", {
      userId,
      error: {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      },
      processingTime: Date.now() - startTime,
    });

    const enhancedError = new Error(
      `Impossible de récupérer les messages: ${error.message}`
    );
    enhancedError.originalError = error;
    enhancedError.statusCode = error.response?.status || 500;
    throw enhancedError;
  }
};

// Récupérer tous les messages d'une conversation spécifique
const getMessagesByConversation = async (userId, conversationId) => {
  const startTime = Date.now();

  try {
    if (!userId || !conversationId) {
      throw new Error("userId et conversationId sont requis");
    }

    logger.info("📖 Récupération messages conversation", {
      userId,
      conversationId,
    });

    const response = await dataServiceClient.get(
      `/api/messages/conversation/${conversationId}`,
      {
        params: { userId },
      }
    );
    const messages = response.data;

    logger.info("✅ Messages conversation récupérés", {
      userId,
      conversationId,
      messagesCount: messages.length,
      processingTime: Date.now() - startTime,
    });

    return messages;
  } catch (error) {
    logger.error("❌ Erreur récupération messages conversation", {
      userId,
      conversationId,
      error: {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      },
      processingTime: Date.now() - startTime,
    });

    const enhancedError = new Error(
      `Impossible de récupérer la conversation: ${error.message}`
    );
    enhancedError.originalError = error;
    enhancedError.statusCode = error.response?.status || 500;
    throw enhancedError;
  }
};

// Supprimer tous les messages d'un utilisateur
const deleteMessagesByUser = async (userId) => {
  const startTime = Date.now();

  try {
    if (!userId) {
      throw new Error("userId est requis");
    }

    logger.warn("🗑️ Suppression tous messages utilisateur", {
      userId,
    });

    const response = await dataServiceClient.delete(
      `/api/messages/user/${userId}`
    );
    const result = response.data;

    logger.info("✅ Messages utilisateur supprimés", {
      userId,
      deletedCount: result.deletedCount || "unknown",
      processingTime: Date.now() - startTime,
    });

    return result;
  } catch (error) {
    logger.error("❌ Erreur suppression messages utilisateur", {
      userId,
      error: {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      },
      processingTime: Date.now() - startTime,
    });

    const enhancedError = new Error(
      `Impossible de supprimer les messages: ${error.message}`
    );
    enhancedError.originalError = error;
    enhancedError.statusCode = error.response?.status || 500;
    throw enhancedError;
  }
};

// Supprimer tous les messages d'une conversation spécifique
const deleteConversation = async (userId, conversationId) => {
  const startTime = Date.now();

  try {
    if (!userId || !conversationId) {
      throw new Error("userId et conversationId sont requis");
    }

    logger.warn("🗑️ Suppression conversation", {
      userId,
      conversationId,
    });

    const response = await dataServiceClient.delete(
      `/api/messages/conversation/${conversationId}`,
      {
        params: { userId },
      }
    );
    const result = response.data;

    logger.info("✅ Conversation supprimée", {
      userId,
      conversationId,
      deletedCount: result.deletedCount || "unknown",
      processingTime: Date.now() - startTime,
    });

    return result;
  } catch (error) {
    logger.error("❌ Erreur suppression conversation", {
      userId,
      conversationId,
      error: {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      },
      processingTime: Date.now() - startTime,
    });

    const enhancedError = new Error(
      `Impossible de supprimer la conversation: ${error.message}`
    );
    enhancedError.originalError = error;
    enhancedError.statusCode = error.response?.status || 500;
    throw enhancedError;
  }
};

module.exports = {
  createMessage,
  getMessagesByUser,
  getMessagesByConversation,
  deleteMessagesByUser,
  deleteConversation,
};
