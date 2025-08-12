# 🔐 Auth Service - ROADTRIP MVP

> **Microservice d'Authentification OAuth 2.0 sécurisé pour l'écosystème ROADTRIP**  
> *Projet M2 - MVP Microservices - Certification RNCP39583*

## 📋 Vue d'ensemble

Service Node.js implémentant **OAuth 2.0 / OpenID Connect** avec Google et Facebook, gestion JWT sécurisée, fallback MongoDB et monitoring Prometheus spécialisé sécurité.

### 🎯 Fonctionnalités MVP

- ✅ **OAuth 2.0 Multi-Provider** : Google + Facebook avec OpenID Connect
- ✅ **JWT Sécurisé** : Génération/validation tokens avec refresh automatique
- ✅ **Fallback Robuste** : MongoDB local si data-service indisponible
- ✅ **Sécurité OWASP** : Protection CSRF, rate limiting, Helmet CSP
- ✅ **Session Management** : Sessions sécurisées avec cookies httpOnly
- ✅ **Monitoring Sécurité** : Métriques dédiées + alertes sécurité
- ✅ **Audit Trail** : Logs sécurisés pour toutes les tentatives auth

---

## 🚀 Installation & Démarrage

### Prérequis
```bash
Node.js 20+
npm ou yarn
MongoDB (optionnel - fallback)
Google OAuth credentials
Facebook OAuth credentials
```

### Configuration
```bash
# Cloner et installer
git clone <repo>
cd auth-service
npm install

# Configurer l'environnement
cp .env.example .env
```

### Variables d'environnement
```env
SERVICE_NAME=auth-service
PORT=5001
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_FILE_LOGGING=true

# Data Service
DATA_SERVICE_URL=http://localhost:5002

# MongoDB Fallback
MONGODB_URI=mongodb://localhost:27017/roadtrip

# JWT Configuration
JWT_SECRET=your-super-secure-secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Session Security
SESSION_SECRET=your-session-secret

# CORS
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5001/auth/oauth/google/callback

# Facebook OAuth
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:5001/auth/oauth/facebook/callback
```

### Lancement
```bash
# Développement
npm run dev

# Production
npm start

# Tests avec coverage
npm test
```

---

## 📡 API Endpoints

### 🔐 Authentification OAuth

#### Initiation Google OAuth
```http
GET /auth/oauth/google
# Redirige vers Google OAuth avec scopes : profile, email
```

#### Callback Google OAuth
```http
GET /auth/oauth/google/callback?code=xxx&state=xxx
# Traite le retour Google et génère JWT
```

#### Initiation Facebook OAuth
```http
GET /auth/oauth/facebook
# Redirige vers Facebook OAuth avec scopes : email, public_profile
```

#### Callback Facebook OAuth
```http
GET /auth/oauth/facebook/callback?code=xxx&state=xxx
# Traite le retour Facebook et génère JWT
```

**Réponse OAuth Success (API Client) :**
```json
{
  "message": "Authentification OAuth réussie",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "avatar": null
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "auth-service-12345"
}
```

**Réponse OAuth Success (Web Client) :**
```http
302 Redirect
Location: http://localhost:3000/oauth-callback?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 🔓 Session Management
```http
# Déconnexion
POST /auth/logout
# Détruit la session et clear les cookies

# Information providers disponibles
GET /providers
```

**Réponse /providers :**
```json
{
  "service": "auth-service",
  "availableProviders": ["google", "facebook"],
  "providers": {
    "google": {
      "available": true,
      "url": "/auth/oauth/google",
      "callback": "http://localhost:5001/auth/oauth/google/callback"
    },
    "facebook": {
      "available": true,
      "url": "/auth/oauth/facebook", 
      "callback": "http://localhost:5001/auth/oauth/facebook/callback"
    }
  },
  "totalAvailable": 2
}
```

### 🔧 Système & Monitoring
```http
GET /health          # État sécurisé du service
GET /metrics         # Métriques Prometheus sécurité
GET /vitals          # Statistiques système
```

---

## 🏗️ Architecture

### Structure Projet
```
auth-service/
├── controllers/         # Logique métier
│   └── authController.js
├── services/           # Services externes
│   └── dataService.js  # Communication data-service
├── config/            # Configuration sécurisée
│   ├── jwtConfig.js    # Gestion JWT
│   └── passportConfig.js # Stratégies OAuth
├── middlewares/        # Middlewares Express
│   ├── errorHandlers.js
│   └── metricsLogger.js
├── routes/            # Définition routes
│   ├── authRoutes.js
│   └── systemRoutes.js
├── models/            # Modèles MongoDB fallback
│   └── User.js
├── loaders/           # Initialisation
│   ├── mongo.js
│   └── security.js
├── utils/             # Utilitaires
│   └── logger.js
├── tests/             # Tests sécurité
│   └── auth.test.js
├── metrics.js         # Métriques Prometheus
├── app.js             # Configuration Express
└── index.js           # Point d'entrée
```

### Flow OAuth Sécurisé
```mermaid
graph LR
    A[Client] --> B[/auth/oauth/google]
    B --> C[Passport Strategy]
    C --> D[Google OAuth]
    D --> E[Callback Handler]
    E --> F{Data Service?}
    F -->|OK| G[Create/Update User]
    F -->|KO| H[MongoDB Fallback]
    G --> I[Generate JWT]
    H --> I
    I --> J[Security Logs]
    J --> K[Return Tokens]
```

---

## 🔒 Sécurité & Authentification

### OAuth 2.0 / OpenID Connect
- **Providers** : Google, Facebook avec validation OpenID
- **Scopes** : profile, email avec validation claims
- **CSRF Protection** : State parameter obligatoire
- **PKCE** : Proof Key for Code Exchange (si supporté)

### JWT Security
```javascript
// Configuration JWT sécurisée
const jwtConfig = {
  algorithm: 'HS256',
  expiresIn: '1h',
  issuer: 'roadtrip-auth-service',
  audience: 'roadtrip-clients'
};

// Validation claims OpenID
const validateOpenIDToken = async (subjectId, profileId) => {
  if (subjectId && subjectId !== profileId) {
    throw new Error("Token OpenID invalide: subject mismatch");
  }
  return true;
};
```

### Sécurité OWASP Top 10
```javascript
// Protection CSRF avec Helmet
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://accounts.google.com"],
      frameSrc: ["https://accounts.google.com"]
    }
  }
};

// Rate Limiting anti-brute force
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives OAuth max
  message: 'Trop de tentatives de connexion'
});

// Sessions sécurisées
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000 // 24h
};
```

---

## 📊 Monitoring & Métriques Sécurité

### Métriques Prometheus Spécialisées
- **Sécurité** : `auth_service_attempts_total` (tentatives par provider)
- **Anomalies** : `auth_service_suspicious_activity_total` 
- **Performance** : `auth_service_oauth_duration_seconds`
- **Santé** : `auth_service_service_health_status`

### Health Check Sécurisé
```bash
curl http://localhost:5001/health
# {
#   "status": "healthy",
#   "service": "auth-service",
#   "config": {
#     "google": true,
#     "facebook": true,
#     "mongodb": true,
#     "session": true
#   },
#   "security": {
#     "helmet": true,
#     "rateLimit": true,
#     "httpsOnly": true,
#     "secureSession": true
#   }
# }
```

### Alertes Sécurité Automatisées
- **🚨 Critique** : >50 échecs auth/min (possible attaque brute force)
- **⚠️ Warning** : Géolocalisation suspecte detected
- **📊 Monitoring** : Ratio success/failure par provider
- **🔍 Audit** : Tous les événements auth tracés avec anonymisation RGPD

---

## 🧪 Tests & Qualité

### Coverage Cible MVP Sécurité
```bash
npm test
# ✅ OAuth Flows (95% coverage)
# ✅ JWT Validation (98% coverage)
# ✅ Session Management (92% coverage) 
# ✅ Rate Limiting (90% coverage)
# ✅ Security Headers (100% coverage)
```

### Tests Sécurité Critiques
```javascript
describe('OAuth Security Tests', () => {
  test('Prevents CSRF attacks with state validation', async () => {
    const maliciousState = 'malicious-state';
    const response = await request(app)
      .get('/auth/oauth/google/callback')
      .query({ state: maliciousState, code: 'valid-code' });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid state parameter');
  });

  test('Rate limits OAuth attempts', async () => {
    // Simulate multiple rapid requests
    const requests = Array(12).fill().map(() => 
      request(app).get('/auth/oauth/google')
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

---

## 🐳 Déploiement Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5001 9001
CMD ["npm", "run", "dev"]
```

---

## 🔍 Validation RNCP39583

### Critères Respectés

| Critère RNCP | Implémentation | Status |
|--------------|----------------|---------|
| **C2.2.1 - Prototype OAuth** | Multi-provider avec OpenID Connect | ✅ |
| **C2.2.2 - Tests Sécurité** | Jest + security scenarios >95% | ✅ |
| **C2.2.3 - Sécurité OWASP** | Top 10 + JWT + rate limiting | ✅ |
| **C4.1.2 - Monitoring Sécurité** | Métriques + alertes temps réel | ✅ |
| **C4.2.1 - Audit Trail** | Logs sécurisés + anonymisation | ✅ |
| **C4.3.2 - Security Versioning** | CHANGELOG sécurité spécialisé | ✅ |

---

## 📈 Optimisations & Limitations MVP

### ✅ Optimisations Implémentées
- **Fallback MongoDB** : Continuité si data-service down
- **Dual Strategy** : Data-service primary + MongoDB secondary
- **Rate Limiting** : Protection anti-brute force par IP
- **Security Logging** : Audit trail complet avec anonymisation
- **OpenID Validation** : Validation claims subject/audience

### ⚠️ Limitations MVP
- **Providers** : Uniquement Google + Facebook (pas GitHub/Apple)
- **2FA** : Non implémenté (roadmap Phase 2)
- **Session Store** : En mémoire (pas Redis distribuée)
- **Geo-blocking** : Basique (pas de whitelist pays)

---

## 🚧 Roadmap Post-MVP

### Phase 2 (Production)
- [ ] **Redis Sessions** : Sessions distribuées
- [ ] **2FA/MFA** : Authentification multi-facteurs
- [ ] **Social Providers** : GitHub, Apple, Microsoft
- [ ] **SAML SSO** : Enterprise authentication
- [ ] **Geo-IP Security** : Détection pays suspects

### Phase 3 (Enterprise)
- [ ] **LDAP/AD Integration** : Entreprise SSO
- [ ] **Biometric Auth** : WebAuthn, FIDO2
- [ ] **Device Trust** : Device fingerprinting
- [ ] **Risk Scoring** : ML-based fraud detection
- [ ] **Compliance** : SOC2, ISO27001 ready

---

## 🐛 Troubleshooting

### Erreurs Courantes
```bash
# Clés OAuth manquantes
Error: OAuth providers not configured
# Solution: Configurer GOOGLE_CLIENT_ID/SECRET + FACEBOOK

# Data-service indisponible
Warning: Data-service unavailable, using MongoDB fallback
# Solution: Vérifier DATA_SERVICE_URL

# Session secret non définie
Warning: SESSION_SECRET non défini - clé par défaut
# Solution: Définir SESSION_SECRET sécurisé

# Callback URL mismatch
Error: redirect_uri_mismatch
# Solution: Vérifier URLs dans console OAuth providers
```

### Debug OAuth Flow
```bash
# Activer logs debug
LOG_LEVEL=debug npm run dev

# Tester providers disponibles
curl http://localhost:5001/providers

# Vérifier health complet
curl http://localhost:5001/health
```

---

## 👥 Contexte Projet

**Projet M2** - Développement d'un MVP microservices pour plateforme de roadtrip  
**Certification** : RNCP39583 - Expert en Développement Logiciel  
**Technologies** : Node.js, OAuth 2.0, JWT, Passport, MongoDB, Prometheus  
**Auteur** : Inès GERVAIS

---

## 📄 Licence

MIT License - Projet académique M2