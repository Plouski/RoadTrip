const jwt = require('jsonwebtoken');

class JwtConfig {
  // Générer un token d'accès
  static generateAccessToken(user) {
    try {
      return jwt.sign(
        { 
          userId: user._id, 
          email: user.email,
          role: user.role 
        },
        process.env.JWT_SECRET,
        { 
          expiresIn: process.env.JWT_EXPIRES_IN || '1h' 
        }
      );
    } catch (error) {
      console.error('Erreur lors de la génération du token', error);
      throw error;
    }
  }

  // Générer un token de rafraîchissement
  static generateRefreshToken(user) {
    try {
      return jwt.sign(
        { 
          userId: user._id, 
          email: user.email 
        },
        process.env.JWT_SECRET,
        { 
          expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' 
        }
      );
    } catch (error) {
      console.error('Erreur lors de la génération du token de rafraîchissement', error);
      throw error;
    }
  }

  // Vérifier et décoder un token
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.warn('Token expiré');
        throw new Error('Token expiré');
      }
      if (error.name === 'JsonWebTokenError') {
        console.warn('Token invalide');
        throw new Error('Token invalide');
      }
      throw error;
    }
  }

  // Rafraîchir le token
  static refreshToken(refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken);
      
      const accessToken = this.generateAccessToken({
        _id: decoded.userId,
        email: decoded.email,
        role: decoded.role
      });

      return accessToken;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du token', error);
      throw error;
    }
  }
}

module.exports = JwtConfig;