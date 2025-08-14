const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class JwtConfig {
  
  // ───────────── Générer un token d'accès ─────────────
  static generateAccessToken(user) {
    try {
      return jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        }
      );
    } catch (error) {
      logger.error('💥 Erreur lors de la génération du token d\'accès :', error);
      throw error;
    }
  }

  // ───────────── Générer un token de rafraîchissement ─────────────
  static generateRefreshToken(user) {
    try {
      return jwt.sign(
        {
          userId: user._id,
          email: user.email,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        }
      );
    } catch (error) {
      logger.error('💥 Erreur lors de la génération du token de rafraîchissement :', error);
      throw error;
    }
  }

  // ───────────── Vérifier un token ─────────────
  static verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }
}

module.exports = JwtConfig;