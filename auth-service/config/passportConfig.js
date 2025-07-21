const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const JwtConfig = require('../config/jwtConfig');
const User = require('../models/User');
const logger = require('../utils/logger');

// Tentative de connexion au data-service
let dataService;
try {
  dataService = require('../services/dataService');
  logger.info('✅ Data-service connecté');
} catch (error) {
  logger.warn('⚠️ Data-service non disponible, fallback MongoDB');
  logger.debug('Erreur require dataService :', error);
}

class PassportConfig {
  static initializeStrategies() {
    logger.info('📦 Initialisation des stratégies Passport');

    // Google Strategy
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL,
          passReqToCallback: true,
          scope: ['profile', 'email', 'openid'],
        },
        async (req, accessToken, refreshToken, profile, done) => {
          logger.auth('🔄 Connexion via Google');
          try {
            await PassportConfig.validateOpenIDToken(profile._json?.sub, profile.id);

            const user = await PassportConfig.handleOAuth('google', profile, {
              accessToken,
              refreshToken,
              idToken: profile._json,
            });
            return done(null, user);
          } catch (err) {
            return PassportConfig.handleOAuthError('google', err, done);
          }
        },
      ),
    );

    // Facebook Strategy
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_CLIENT_ID,
          clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
          callbackURL: process.env.FACEBOOK_CALLBACK_URL,
          profileFields: ['id', 'emails', 'name'],
          enableProof: true,
        },
        async (req, accessToken, refreshToken, profile, done) => {
          logger.auth('🔄 Connexion via Facebook');
          try {
            const user = await PassportConfig.handleOAuth('facebook', profile, {
              accessToken,
              refreshToken,
            });
            return done(null, user);
          } catch (err) {
            return PassportConfig.handleOAuthError('facebook', err, done);
          }
        },
      ),
    );

    passport.serializeUser((user, done) => {
      done(null, user.user._id || user.user.id);
    });

    passport.deserializeUser(async (id, done) => {
      try {
        let user;
        if (dataService) {
          try {
            user = await dataService.findUserById(id);
          } catch (error) {
            logger.warn('⚠️ Data-service indisponible, fallback MongoDB');
            logger.debug('Erreur complète :', error);
            user = await User.findById(id).select('-password');
          }
        } else {
          user = await User.findById(id).select('-password');
        }
        done(null, user);
      } catch (error) {
        done(error);
      }
    });
  }

  static async validateOpenIDToken(subjectId, profileId) {
    try {
      if (subjectId && subjectId !== profileId) {
        throw new Error('Token OpenID invalide: subject mismatch');
      }
      logger.auth('✅ Token OpenID Connect validé', { subjectId });
      return true;
    } catch (error) {
      logger.error('❌ Erreur validation OpenID Connect', { error });
      throw new Error('Token OpenID Connect invalide');
    }
  }

  static async handleOAuth(provider, profile, tokens = {}) {
    let email = null;

    email =
      Array.isArray(profile.emails) && profile.emails.length > 0
        ? profile.emails.find(e => e.verified)?.value || profile.emails[0].value
        : null;

    if (!email) {
      email = `oauth_${provider}_${profile.id}@fake.email`;
      logger.warn(`[OAuth] Email manquant pour ${provider}, email généré`, { email });
    }

    const displayName = profile.displayName || '';
    const [firstSplit, ...restSplit] = displayName.trim().split(' ');

    const rawFirstName = profile.name?.givenName || firstSplit || null;
    const rawLastName = profile.name?.familyName || restSplit.join(' ') || null;

    const clean = str => (typeof str === 'string' && str.trim() !== '' ? str.trim() : null);

    const firstName = clean(rawFirstName) || 'Utilisateur';
    const lastName = clean(rawLastName) || 'OAuth';

    let user = null;
    let isNewUser = false;

    try {
      if (dataService) {
        try {
          user = await dataService.findUserByEmail(email);

          if (!user) {
            isNewUser = true;
            user = await dataService.createUser({
              email,
              firstName,
              lastName,
              isVerified: true,
              oauth: {
                provider,
                providerId: profile.id,
              },
            });

            await dataService.logAuthEvent({
              event: 'oauth_registration',
              provider,
              userId: user.id,
              email,
            });
          } else if (!user.oauth || user.oauth.providerId !== profile.id) {
            user = await dataService.updateUser(user.id, {
              oauth: {
                provider,
                providerId: profile.id,
              },
            });
          }

          await dataService.logAuthEvent({
            event: 'oauth_login',
            provider,
            userId: user.id,
            email,
          });
        } catch (dataServiceError) {
          logger.warn('⚠️ Data-service indisponible, fallback MongoDB', { error: dataServiceError.message });
          throw dataServiceError;
        }
      } else {
        throw new Error('Data-service non disponible');
      }
    } catch (error) {
      logger.info('🔄 Utilisation du fallback MongoDB pour OAuth');
      logger.debug('Erreur complète :', error);

      user = await User.findOne({ email });

      if (!user) {
        isNewUser = true;
        try {
          user = new User({
            email,
            firstName,
            lastName,
            isVerified: true,
            oauth: {
              provider,
              providerId: profile.id,
            },
            createdAt: new Date(),
          });
          await user.save();

          logger.auth('👤 Nouvel utilisateur créé via MongoDB fallback', { email, provider });
        } catch (err) {
          if (err.code === 11000) {
            user = await User.findOne({ email });
            isNewUser = false;
          } else {
            throw err;
          }
        }
      } else if (!user.oauth || user.oauth.providerId !== profile.id) {
        user.oauth = {
          provider,
          providerId: profile.id,
        };
        await user.save();
      }

      logger.auth('🔐 Connexion OAuth via MongoDB fallback', { email, provider, isNewUser });
    }

    const accessToken = JwtConfig.generateAccessToken(user);
    const refreshToken = JwtConfig.generateRefreshToken(user);

    return {
      user: {
        ...(user.toJSON ? user.toJSON() : user),
        isNewUser,
      },
      accessToken,
      refreshToken,
    };
  }

  static handleOAuthError(provider, error, done) {
    logger.error(`❌ Erreur OAuth ${provider}`, { error });
    return done(error, false);
  }
}

module.exports = PassportConfig;