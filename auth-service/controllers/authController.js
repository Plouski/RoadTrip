const logger = require('../utils/logger');

class AuthController {
  // Méthode pour gérer les connexions OAuth
  static async handleOAuthSuccess(req, res, next) {
    const startTime = Date.now();
    
    try {
      if (!req.user) {
        logger.security('OAuth success handler appelé sans utilisateur', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID,
          requestId: req.id
        });
        
        return res
          .status(401)
          .json({ 
            message: "Authentification OAuth échouée",
            requestId: req.id 
          });
      }

      const { user, accessToken, refreshToken } = req.user;
      const { _id, email, firstName, lastName, role, avatar } = user;

      // Log de succès OAuth avec détails utilisateur
      logger.auth('✅ OAuth success', {
        userId: _id,
        email,
        provider: user.oauth?.provider,
        role,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasAvatar: !!avatar,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID,
        requestId: req.id
      });

      // Enregistrer l'événement dans le data service
      try {
        const dataService = require('../services/dataService');
        await dataService.logOAuthAttempt(user.oauth?.provider, true, {
          id: _id,
          email,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
      } catch (logError) {
        logger.warn('⚠️ Impossible d\'enregistrer l\'événement OAuth', {
          userId: _id,
          provider: user.oauth?.provider,
          error: logError.message
        });
      }

      const isApiClient = req.get("Accept") === "application/json";

      if (isApiClient) {
        logger.auth('📱 Réponse OAuth pour client API', {
          userId: _id,
          email,
          provider: user.oauth?.provider,
          hasTokens: !!(accessToken && refreshToken),
          processingTime: Date.now() - startTime,
          requestId: req.id
        });

        return res.status(200).json({
          message: "Authentification OAuth réussie",
          user: {
            id: _id,
            email,
            firstName,
            lastName,
            role,
            avatar,
          },
          tokens: {
            accessToken,
            refreshToken,
          },
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }

      // Redirection pour client web
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:30005";
      const redirectUrl = new URL(frontendUrl);
      redirectUrl.pathname = "/oauth-callback";
      redirectUrl.searchParams.set("token", accessToken);

      logger.auth('🌐 Redirection OAuth vers frontend', {
        userId: _id,
        email,
        provider: user.oauth?.provider,
        redirectUrl: redirectUrl.toString(),
        frontendUrl,
        processingTime: Date.now() - startTime,
        requestId: req.id
      });

      return res.redirect(redirectUrl.toString());
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('❌ Erreur dans handleOAuthSuccess', {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        userId: req.user?._id || null,
        provider: req.user?.oauth?.provider || 'unknown',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID,
        processingTime,
        requestId: req.id
      });

      // Enregistrer l'échec OAuth
      try {
        const dataService = require('../services/dataService');
        await dataService.logOAuthAttempt(
          req.user?.oauth?.provider || 'unknown', 
          false,
          {
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            error: error.message
          }
        );
      } catch (logError) {
        logger.warn('⚠️ Impossible d\'enregistrer l\'échec OAuth', {
          error: logError.message
        });
      }

      next(error);
    }
  }

  // Méthode pour gérer les erreurs OAuth
  static async handleOAuthError(req, res, next) {
    const startTime = Date.now();
    
    try {
      const error = req.query.error;
      const errorDescription = req.query.error_description;
      const state = req.query.state;

      logger.security('❌ Erreur OAuth détectée', {
        error,
        errorDescription,
        state,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID,
        referer: req.get('Referer'),
        requestId: req.id
      });

      // Déterminer le provider depuis l'URL ou le state
      let provider = 'unknown';
      if (req.path.includes('google')) provider = 'google';
      else if (req.path.includes('facebook')) provider = 'facebook';

      // Enregistrer l'erreur OAuth
      try {
        const dataService = require('../services/dataService');
        await dataService.logOAuthAttempt(provider, false, {
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          error: error || 'oauth_error',
          errorDescription
        });
      } catch (logError) {
        logger.warn('⚠️ Impossible d\'enregistrer l\'erreur OAuth', {
          error: logError.message
        });
      }

      const processingTime = Date.now() - startTime;

      // Redirection vers le frontend avec l'erreur
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:30005";
      const redirectUrl = new URL(frontendUrl);
      redirectUrl.pathname = "/oauth-error";
      redirectUrl.searchParams.set("error", error || 'unknown_error');
      redirectUrl.searchParams.set("provider", provider);

      logger.auth('🔄 Redirection après erreur OAuth', {
        error,
        provider,
        redirectUrl: redirectUrl.toString(),
        processingTime,
        requestId: req.id
      });

      return res.redirect(redirectUrl.toString());
      
    } catch (handlerError) {
      logger.error('❌ Erreur dans handleOAuthError', {
        error: {
          message: handlerError.message,
          stack: handlerError.stack
        },
        originalError: req.query.error,
        processingTime: Date.now() - startTime,
        requestId: req.id
      });

      next(handlerError);
    }
  }

}

module.exports = AuthController;