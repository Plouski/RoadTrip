# 🗂 Data Service - RoadTrip! 

> **Microservice de gestion des données RoadTrip! (Users, Trips, Favoris, IA, Subscriptions)**  
> _Projet M2 -  Microservices - Certification RNCP39583_

## 📋 Vue d'ensemble

Service **Node.js/Express** + **MongoDB (Mongoose)** qui expose une API REST sécurisée (JWT) pour :
- **Utilisateurs** (auth, profil, reset password),
- **Roadtrips** (publics, populaires, détails, vues),
- **Favoris** (toggle + liste),
- **Messages IA** (historique, suppression),
- **Administration** (stats, CRUD simplifié),
- **Métriques Prometheus + health/vitals**,
- **Intégration notification-service** (emails + SMS).

---

## 💡 Points forts

- Auth **JWT** (access + refresh) + middlewares roles (user/premium/admin)
- **Prometheus**: /metrics (latence, compteurs, DB, connexions, services externes)
- **Health endpoints**: /health, /vitals, /ping
- **CORS** strict (localhost + vercel)
- **Logs Winston** structurés (JSON en prod, colorés en dev)
- Nettoyage **RGPD** lors de la suppression d’un utilisateur
- Intégration **notification-service** (Mailjet / Free Mobile) via x-api-key

---

## 🚀 Installation & Démarrage

### Prérequis

```bash
Node.js 20+
MongoDB (local/cloud)
```

### Configuration

```bash
# Cloner et installer
git clone <repo>
cd data-service
npm install

# Configurer l'environnement
cp .env.example .env
```

### Variables d'environnement

```env
NODE_ENV=development
SERVICE_NAME=data-service

PORT=5002
SERVER_TIMEOUT=60000
MAX_REQUEST_BODY_SIZE=1mb

# MongoDB (OBLIGATOIRE)
MONGODB_URI=

# JWT (OBLIGATOIRE)
JWT_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

# CORS
CORS_ORIGIN=http://localhost:3000

# notification-service
NOTIFICATION_SERVICE_URL=http://localhost:5005
NOTIFICATION_API_KEY=test-api-key-123

# SMS (Free Mobile)
FREE_MOBILE_USERNAME=
FREE_MOBILE_API_KEY=

LOG_LEVEL=info
```

### Lancement

```bash
# Développement
npm run dev

# Production
npm start

# Tests avec coverage
npm test

# Health check
npm run health
```

---

## 📡 API Endpoints

### Système (publics)
- GET /metrics → métriques Prometheus
- GET /health → statut + dépendances (Mongo + services externes)
- GET /vitals → uptime, mémoire, CPU, connexions
- GET /ping → pong

### Auth & Profil (routes/authRoutes.js)
- POST /api/auth/register – inscription (local ou OAuth si provider)
- POST /api/auth/login – connexion (JWT)
- POST /api/auth/logout – déconnexion (auth requise)
- POST /api/auth/verify-token – vérifier un access token
- POST /api/auth/refresh-token – refresh tokens
- POST /api/auth/verify-account – vérifier un compte (token mail)
- POST /api/auth/initiate-password-reset – init reset par email (envoi code)
- POST /api/auth/initiate-password-reset-sms – init reset par SMS
- POST /api/auth/reset-password – reset via code {email, resetCode, newPassword}
- PUT /api/auth/change-password – changer mot de passe (auth)
- GET /api/auth/profile – profil courant (auth)
- PUT /api/auth/profile – update profil (auth)
- DELETE /api/auth/account – supprimer son compte (auth + RGPD)
- POST /api/auth/refresh-user-data – recharger user + regénérer tokens (auth)

### Utilisateurs (routes/userRoutes.js)
- GET /api/users/email/:email – vérifier si un user existe (sans mdp)
- POST /api/users – créer un user (passe par AuthController.register)
- GET /api/users/:id – récupérer un user (auth)
- PUT /api/users/:id – mettre à jour un user (auth)

### Roadtrips publics (routes/tripRoutes.js)
- GET /api/roadtrips – liste publiée (+ filtres : country, isPremium, page, limit)
- GET /api/roadtrips/popular?limit=3 – top par vues
- GET /api/roadtrips/:id – détails; si isPremium et user non premium/admin → aperçu limité
- POST /api/roadtrips/:id/views – incrémenter vues

### Favoris (routes/favoriteRoutes.js) (auth)
- POST /api/favorites/toggle/:tripId – ajouter/retirer
- GET /api/favorites – liste de ses favoris (trips intégrés)

### Messages IA (routes/messageRoutes.js)
- POST /api/messages – créer un message
- GET /api/messages/user/:userId – historique par user
- GET /api/messages/conversation/:conversationId?userId=... – messages d’une conversation
- DELETE /api/messages/user/:userId – supprimer tous les messages d’un user
- DELETE /api/messages/conversation/:conversationId?userId=... – supprimer une conversation

### Admin (routes/adminRoutes.js) (auth + admin)
- Dashboard
-- GET /api/admin/stats
-- GET /api/admin/users/recent
-- GET /api/admin/roadtrips/recent

- Users
-- GET /api/admin/users – pagination & recherche (page, limit, search)
-- GET /api/admin/users/:id
-- PUT /api/admin/users/:id
-- PUT /api/admin/users/status/:id – isVerified, role
-- GET /api/admin/users/:id/subscription
-- DELETE /api/admin/users/:id – RGPD : supprime user + données liées

- Roadtrips
-- GET /api/admin/roadtrips – pagination & recherche
-- GET /api/admin/roadtrips/:id
-- POST /api/admin/roadtrips
-- PUT /api/admin/roadtrips/:id
-- PATCH /api/admin/roadtrips/status/:id – isPublished, isPremium
-- DELETE /api/admin/roadtrips/:id
---

## 🏗 Structure Projet

```
data-service/
├── app.js
├── index.js
├── metrics.js
├── config/
│   └── jwtConfig.js
├── controllers/
│   ├── adminController.js
│   ├── authController.js
│   ├── favoriteController.js
│   ├── messageController.js
│   └── tripController.js
├── middlewares/
│   └── authMiddleware.js
├── models/
│   ├── AiMessage.js
│   ├── Favorite.js
│   ├── Subscription.js
│   ├── Trip.js
│   └── User.js
├── routes/
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── favoriteRoutes.js
│   ├── messageRoutes.js
│   ├── tripRoutes.js
│   └── userRoutes.js
├── services/
│   └── notificationService.js
├── utils/
│   └── logger.js
├── test/
│   └── data.test.js
├── Dockerfile
├── package.json
└── README.md
```

---

## 🔒 Sécurité

- **JWT obligatoire** sur routes protégées (middleware authMiddleware)
- **Roles** via roleMiddleware (admin / premium / user)
- **CORS** : http://localhost:3000 et https://road-trip-iota.vercel.app
- **notification-service** : appels sortants protégés via header x-api-key

---

## 🔗 Intégrations

- **notification-service** (NOTIFICATION_SERVICE_URL)
-- POST /api/email/confirm { email, token }
-- POST /api/email/reset { email, code }
-- POST /api/sms/reset { username, apiKey, code }
→ toujours avec header x-api-key: <NOTIFICATION_API_KEY>

---

## 🧪 Tests

```bash
npm test
```

Couverture : auth, users, admin, trips, favorites, messages, système.

---

## 🐳 Docker

```bash
# Build
docker build -t data-service .

# Run
docker run -p 5002:5002 --env-file .env data-service
```

---

## 🐛 Troubleshooting

| Problème                                | Cause probable                                    | Solution                                                  |
| --------------------------------------- | ------------------------------------------------- | --------------------------------------------------------- |
| `Mongo disconnected`                    | Mauvaise variable                                 | Utilise **MONGODB\_URI** (pas MONGO\_URI)                 |
| `401 Auth requise / INVALID_TOKEN`      | JWT manquant/expiré                               | Envoyer `Authorization: Bearer <token>`                   |
| `403 Accès refusé`                      | Rôle insuffisant                                  | Utiliser un compte `admin`/`premium` selon route          |
| `initiate-password-reset` n’envoie rien | notification-service non joignable / API key abs. | Vérifie `NOTIFICATION_SERVICE_URL` + header `x-api-key`   |
| SMS Free Mobile échoue                  | Identifiants manquants                            | Renseigner `FREE_MOBILE_USERNAME` + `FREE_MOBILE_API_KEY` |
| `/metrics` vide                         | Pas de trafic                                     | Faire quelques requêtes pour alimenter les compteurs      |

---

## 👥 Contexte

**Projet M2** - Développement d'un microservice pour plateforme de roadtrip  
**Certification** : RNCP39583 - Expert en Développement Logiciel  
**Technologies** : Node.js, Express, MongoDB/Mongoose, Prometheus, Docker
**Auteur** : Inès GERVAIS