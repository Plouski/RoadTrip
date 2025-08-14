# 🔐 Auth Service - RoadTrip! 

> **Passerelle d’authentification & OAuth (Google/Facebook) pour l'écosystème RoadTrip!**  
> _Projet M2 -  Microservices - Certification RNCP39583_

## 📋 Vue d'ensemble

Service **Node.js/Express** avec **Passport** (Google & Facebook) qui :
- gère les **logins OAuth** et renvoie des **JWT** (access + refresh),
- maintient une **session** pour le flow OAuth (server-side),
- expose **/health /vitals /metrics /providers /ping**,
- publie des **métriques Prometheus** et des logs structurés,
- se connecte à **MongoDB**.

---

## 💡 Points forts

- OAuth 2.0 Google & Facebook (Passport).
- Réponses JSON pour clients API ou redirections front prêtes à l’emploi.
- Helmet + CSP, Rate limiting (global + endpoints OAuth), sessions sécurisées. 
- Prometheus: latence, compteurs, connexions actives, santé DB.
- Fallback Mongo si le data-service ne répond pas.

---

## 🚀 Installation & Démarrage

### Prérequis

```bash
Node.js 20+
MongoDB (local/cloud)
Identifiants OAuth Google & Facebook
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
# Service
NODE_ENV=development
SERVICE_NAME=auth-service
PORT=5001
LOG_LEVEL=info
ENABLE_FILE_LOGGING=false

# Frontend
FRONTEND_URL=http://localhost:3000

# Sessions (nécessaire au flow OAuth)
SESSION_SECRET=super-secret-session-key

# MongoDB
MONGODB_URI=mongodb://localhost:27017/roadtrip_auth

# JWT
JWT_SECRET=your_access_secret

# CORS
CORS_ORIGIN=http://localhost:3000

# OAuth Google
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxx
GOOGLE_CALLBACK_URL=http://localhost:5001/auth/oauth/google/callback

# OAuth Facebook
FACEBOOK_CLIENT_ID=xxxxxxxxxxxxxxx
FACEBOOK_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxx
FACEBOOK_CALLBACK_URL=http://localhost:5001/auth/oauth/facebook/callback

METRICS_PORT=9090
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

### 🔧 Système (routes/systemRoutes.js)

- GET /metrics : Métriques Prometheus (content-type exposé par register.contentType).
- GET /health : État du service + config active (Mongo, providers), taux d’erreur & de succès OAuth.
Renvoie 200 (healthy) ou 503 (degraded). Met à jour la gauge Prometheus.
- GET /vitals : Uptime, mémoire, CPU, statut running.
- GET /providers : Liste des providers disponibles selon l’ENV :
```json
{
  "service": "auth-service",
  "availableProviders": ["google","facebook"],
  "providers": {
    "google": { "available": true, "url": "/auth/oauth/google", "callback": "..." },
    "facebook": { "available": true, "url": "/auth/oauth/facebook", "callback": "..." }
  },
  "totalAvailable": 2
}
```

### 🔑 OAuth (routes/authRoutes.js)

- GET /auth/oauth/google → démarre le flow OAuth Google (scope: profile,email)
- GET /auth/oauth/google/callback
- - En cas d’échec : redirige vers ${FRONTEND_URL}/auth?error=oauth_failed
- - En cas de succès : AuthController.handleOAuthSuccess
- - - si client API (Accept: application/json) → JSON :
```json
{
  "message": "Authentification OAuth réussie",
  "user": { "id": "...", "email": "...", "firstName": "...", "lastName": "...", "role": "...", "avatar": null },
  "tokens": { "accessToken": "...", "refreshToken": "..." }
}
```
- - - sinon → redirection front : ${FRONTEND_URL}/oauth-callback?token=<accessToken>

- GET /auth/oauth/facebook → démarre le flow OAuth Facebook (scope: email, public_profile)
- GET /auth/oauth/facebook/callback → même comportement que Google

- POST /auth/logout : Détruit la session, efface le cookie auth.session.id et renvoie { message: "Déconnexion réussie" }.

---

## 🔗 Intégrations

- **data-service** : lookup/création/mise à jour d’utilisateurs durant OAuth.
Si indisponible → **fallback Mongo** (models/User.js) pour ne pas bloquer la connexion.

- **frontend** : redirections vers
- - /oauth-callback?token=... (succès)
- - /auth?error=oauth_failed (échec)

---

## 🏗 Structure Projet

```
auth-service/
├── app.js
├── index.js
├── metrics.js
├── config/
│   ├── jwtConfig.js
│   └── passportConfig.js
├── controllers/
│   └── authController.js
├── loaders/
│   ├── mongo.js
│   └── security.js
├── middlewares/
│   ├── errorHandlers.js
│   └── metricsLogger.js
├── models/
│   └── User.js
├── routes/
│   ├── authRoutes.js
│   └── systemRoutes.js
├── services/
│   └── dataService.js 
├── utils/
│   └── logger.js
├── tests/
│   └── auth.test.js
├── Dockerfile
├── package.json
└── README.md
```

---

## 🔒 Sécurité

- **Helmet + CSP** (autorise providers Google/Facebook).
- **Rate limiting** global + **limiteur dédié OAuth**.
- **Session** httpOnly ; secure & sameSite=strict en prod.
- **JWT** signés avec JWT_SECRET (durées via JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN).
- **Logs** de sécurité & d’audit (tentatives OAuth, userAgent, IP, requestId).

---

## 📈 Prometheus
Exposé via /metrics. Métriques standards (préfixe normalisé, ex. auth_service_):
- *_http_request_duration_seconds{method,route,status_code} (Histogram)
- *_http_requests_total{method,route,status_code} (Counter)
- *_active_connections (Gauge)
- *_service_health_status{service_name} (Gauge)
- *_database_status{database_type} (Gauge)

---

## 🧪 Tests

```bash
npm test
```

- Tester success/échec pour Google et Facebook (JSON vs redirection).
- Vérifier /health, /vitals, /metrics, /providers.
- Tester le rate limit OAuth (trop de tentatives → message dédié).

---

## 🐳 Docker

```bash
# Build
docker build -t auth-service .

# Run
docker run -p 5001:5001 --env-file .env auth-service
```

---

## 🐛 Troubleshooting

| Problème                               | Cause probable                      | Solution                                                                        |
| -------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| Redirection vers `?error=oauth_failed` | Erreur provider / callback mismatch | Vérifie `*_CALLBACK_URL` côté provider + `.env`                                 |
| `401/403` côté front après callback    | Token absent/expiré côté front      | Récupère le token depuis `/oauth-callback?token=...` ou utilise la réponse JSON |
| `Mongo disconnected`                   | URI invalide ou DB down             | Vérifie `MONGODB_URI`                                                           |
| `SESSION_SECRET non défini` (warning)  | Env manquante                       | Définir `SESSION_SECRET` (obligatoire en prod)                                  |
| CORS bloqué                            | Origine non autorisée               | Ajuste `CORS_ORIGIN`                                                            |
| `/metrics` vide                        | Pas de trafic                       | Effectuer quelques hits (OAuth, /health, etc.)                                  |

---

## 👥 Contexte

**Projet M2** - Développement d'un microservice pour plateforme de roadtrip  
**Certification** : RNCP39583 - Expert en Développement Logiciel  
**Technologies** : Node.js, Express, Passport, JWT, MongoDB, Prometheus, Docker
**Auteur** : Inès GERVAIS