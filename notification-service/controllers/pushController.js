const messaging = require("../config/firebase-admin");
const dataService = require("../services/dataService");
const logger = require("../utils/logger");

exports.savePushToken = async (req, res) => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ message: "userId et token sont requis" });
  }

  try {
    await messaging.send({
      token,
      notification: {
        title: "Bienvenue à ROADTRIP!",
        body: "Vous êtes admin",
      },
    });
  } catch (tokenError) {
    if (tokenError?.code === "messaging/registration-token-not-registered") {
      return res.status(400).json({
        message: "Token de notification invalide",
        error: "TOKEN_INVALID",
      });
    }
    logger.warn("⚠️ Erreur de validation token:", tokenError?.code);
  }

  try {
    const updatedUser = await dataService.updateUser(userId, {
      pushToken: token,
      pushTokenUpdatedAt: new Date(),
      pushTokenValid: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    res.status(200).json({ message: "Token enregistré avec succès" });
  } catch (err) {
    logger.error("❌ Erreur côté data-service:", err.message);
    res.status(500).json({ message: "Erreur côté data-service" });
  }
};

// Envoie une notification push personnalisée à un utilisateur
exports.sendPushNotification = async (req, res) => {
  const { userId, title, body = {} } = req.body;

  logger.log("📱 Requête d'envoi de notification :", {
    userId,
    title,
    bodyLength: body?.length,
  });

  if (!userId || !title) {
    return res.status(400).json({ message: "userId et title sont requis" });
  }

  try {
    const user = await dataService.getUserById(userId);
    logger.log(
      "🔍 Utilisateur trouvé via data-service :",
      user
        ? `ID: ${user._id}, Token valid: ${user.pushTokenValid}`
        : "Non trouvé"
    );

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    if (!user.pushToken) {
      logger.warn(`⚠️ Token push non enregistré pour l'utilisateur ${userId}`);
      return res
        .status(404)
        .json({ message: "Token push non enregistré pour cet utilisateur" });
    }

    const message = {
      token: user.pushToken,
      notification: {
        title,
        body: body || "",
      },
      data: {
        title: title.toString(),
        body: (body || "").toString(),
        timestamp: Date.now().toString(),
      },
    };

    try {
      const messageId = await messaging.send(message);
      logger.log(
        `✅ Notification envoyée à ${userId}, messageId : ${messageId}`
      );

      await dataService.updateUser(userId, {
        pushTokenValid: true,
        lastNotificationSent: new Date(),
      });

      res.status(200).json({
        message: "Notification envoyée avec succès",
        messageId,
      });
    } catch (fcmError) {
      logger.error("❌ Erreur Firebase FCM :", fcmError);

      if (fcmError?.code === "messaging/registration-token-not-registered") {
        logger.warn(`⚠️ Token invalide détecté pour l'utilisateur ${userId}`);

        await dataService.updateUser(userId, {
          pushTokenValid: false,
        });

        return res.status(400).json({
          message: "Token de notification invalide ou expiré",
          error: "TOKEN_INVALID",
        });
      }

      throw fcmError;
    }
  } catch (error) {
    logger.error(
      "❌ Erreur lors de l'envoi de la notification :",
      error.message
    );
    res.status(500).json({
      message: "Erreur lors de l'envoi de la notification",
      error: error?.code || "UNKNOWN_ERROR",
    });
  }
};
