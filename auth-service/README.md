# Auth Service - OAuth Authentication

> Service d'authentification OAuth pour connexions Google et Facebook

## Démarrage rapide

```bash
# Installation
npm install

# Variables d'environnement (créer .env)
SERVICE_NAME=auth-service
PORT=5001
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_FILE_LOGGING=true
DATA_SERVICE_URL=http://localhost:5002
MONGODB_URI=
JWT_SECRET=your-secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
SESSION_SECRET=une_chaine_super_secrete
CORS_ORIGIN=http://localhost:3000,http://localhost:3000
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
FACEBOOK_CALLBACK_URL=

# Lancement
npm run dev
```

## API Endpoints

### OAuth Authentication

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/auth/oauth/google` | GET | Connexion Google OAuth |
| `/auth/oauth/facebook` | GET | Connexion Facebook OAuth |
| `/auth/logout` | POST | Déconnexion utilisateur |
| `/providers` | GET | Info providers disponibles |

### Monitoring

| Endpoint | Description |
|----------|-------------|
| `/health` | Status du service |
| `/metrics` | Métriques Prometheus |
| `/vitals` | Informations système |
| `/ping` | Test de réponse |

## Configuration OAuth

### Google OAuth
1. [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials
3. OAuth 2.0 Client ID
4. Redirect URI: `http://localhost:5001/auth/oauth/google/callback`

### Facebook OAuth
1. [Facebook Developers](https://developers.facebook.com/)
2. Créer une app → Facebook Login
3. Valid OAuth Redirect URIs: `http://localhost:5001/auth/oauth/facebook/callback`

## Tests

```bash
# Lancer les tests
npm test

# Mode watch
npm run test:watch
```

## Architecture

```
auth-service/
├── config/          # Configuration JWT + Passport
├── controllers/     # Logique OAuth
├── services/        # Communication data-service
├── routes/          # Routes OAuth
├── utils/           # Logger + helpers
└── tests/          # Tests automatisés
```

## Stack technique

- **Node.js** + Express
- **Passport.js** (OAuth Google/Facebook)
- **JWT** pour les tokens
- **Helmet** + Rate limiting (sécurité)
- **Prometheus** pour les métriques
- **Winston** pour les logs
- **Jest** pour les tests

## Monitoring

- **Métriques** : `http://localhost:5001/metrics`
- **Health check** : `http://localhost:5001/health`
- **Logs** : Fichiers dans `../logs/auth-service/`

## Sécurité

- **OAuth 2.0** + OpenID Connect
- **Rate limiting** (200 req/15min général, 10 req/15min OAuth)
- **Headers sécurisés** (Helmet + CSP)
- **Sessions sécurisées** (HttpOnly, Secure)
- **CORS** configuré

## Flux OAuth

```
1. GET /auth/oauth/google → Redirection Google
2. Utilisateur s'authentifie
3. Google callback → /auth/oauth/google/callback
4. Génération JWT tokens
5. Redirection frontend avec token
```