const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/* Middleware d'authentification unifié */
const authMiddleware = (req, res, next) => {
  // Bypass pour les requêtes inter-services
  if (req.isServiceRequest) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const tokenFromCookie = req.cookies?.token;
  const tokenFromQuery = req.query.token;

  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (tokenFromCookie) {
    token = tokenFromCookie;
  } else if (tokenFromQuery) {
    token = tokenFromQuery;
  }

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentification requise'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user'
    };

    logger.info(`🔐 Utilisateur authentifié: ${decoded.email} (${decoded.role})`);
    next();
  } catch (error) {
    logger.warn(`❌ Token invalide: ${error.message}`);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Session expirée, veuillez vous reconnecter',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({ 
      success: false,
      message: 'Authentification invalide',
      code: 'INVALID_TOKEN'
    });
  }
};

/* Middleware pour vérifier les rôles (admin, premium, etc.) */
const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentification requise'
      });
    }

    // Bypass pour les requêtes inter-services
    if (req.isServiceRequest) {
      return next();
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      logger.warn(`🚫 Accès refusé: ${req.user.email} (${req.user.role}) -> ${req.path}`);

      return res.status(403).json({ 
        success: false,
        message: `Accès refusé - Rôle ${allowedRoles.join(' ou ')} requis`,
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    logger.info(`✅ Accès autorisé: ${req.user.email} (${req.user.role}) -> ${req.path}`);
    next();
  };
};

/* Middleware admin simplifié */
const adminMiddleware = (req, res, next) => {
  return roleMiddleware(['admin'])(req, res, next);
};

/* Middleware premium (pour contenu payant) */
const premiumMiddleware = (req, res, next) => {
  return roleMiddleware(['premium', 'admin'])(req, res, next);
};

/* Middleware optionnel (ajoute req.user si token présent) */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role || 'user'
      };
      logger.info(`🔐 Auth optionnelle: ${decoded.email}`);
    } catch (error) {
      logger.info('🔓 Token optionnel invalide, continue sans auth');
    }
  }

  next();
};

module.exports = {
  authMiddleware,
  roleMiddleware,
  adminMiddleware,
  premiumMiddleware,
  optionalAuth
};