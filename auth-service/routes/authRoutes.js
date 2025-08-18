const express = require('express');
const passport = require('passport');
const AuthController = require('../controllers/authController');

const router = express.Router();

//  Routes OAuth Google 
router.get('/oauth/google', 
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

router.get('/oauth/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth?error=oauth_failed`,
    session: false 
  }),
  (req, res, next) => AuthController.handleOAuthSuccess(req, res, next)
);

//  Routes OAuth Facebook 
router.get('/oauth/facebook',
  passport.authenticate('facebook', {
    scope: ['email', 'public_profile']
  })
);

router.get('/oauth/facebook/callback',
  passport.authenticate('facebook', { 
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth?error=oauth_failed`,
    session: false 
  }),
  (req, res, next) => AuthController.handleOAuthSuccess(req, res, next)
);

//  Route de déconnexion 
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('❌ Erreur lors de la déconnexion', { error: err.message });
      return res.status(500).json({
        error: 'Erreur de déconnexion'
      });
    }
    
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Erreur destruction session', { error: err.message });
      }
      
      res.clearCookie('auth.session.id');
      res.status(200).json({
        message: 'Déconnexion réussie'
      });
    });
  });
});

//  Route d'information 
router.get('/providers', (req, res) => {
  res.json({
    providers: {
      google: {
        available: !!process.env.GOOGLE_CLIENT_ID,
        url: '/auth/oauth/google'
      },
      facebook: {
        available: !!process.env.FACEBOOK_CLIENT_ID,
        url: '/auth/oauth/facebook'
      }
    }
  });
});

module.exports = router;