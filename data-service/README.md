# Data Service - ROADTRIP

> Service central de données avec authentification, gestion premium et intégrations microservices

## Vue d'ensemble

Le **Data Service** est le cœur de l'écosystème RoadTrip!, gérant :
- **Authentification complète** (JWT, OAuth, rôles, premium)
- **Données métier** (roadtrips, utilisateurs, favoris, conversations IA)
- **Logique premium** avec content gating intelligent
- **Admin panel** complet avec dashboard et gestion RGPD
- **Intégrations** avec Notification, AI, Payment et Auth services
- **Monitoring avancé** avec Prometheus et logs structurés

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       DATA SERVICE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Controllers  │  │   Services   │  │ Middlewares  │        │
│  │              │  │              │  │              │        │
│  │ • Auth       │  │ • Notification│ │ • JWT Auth   │        │
│  │ • Trip       │  │ • Integration│  │ • Role Check │        │
│  │ • Admin      │  │              │  │ • Premium    │        │
│  │ • Favorite   │  │              │  │ • CORS       │        │
│  │ • Message    │  │              │  │ • Validation │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                 │                │
│         └─────────────────┼─────────────────┘                │
│                           │                                  │
│  ┌──────────────┐  ┌──────▼───────┐  ┌──────────────┐        │
│  │    Models    │  │    Routes    │  │   Metrics    │        │
│  │              │  │              │  │              │        │
│  │ • User       │  │ • /auth      │  │ • Prometheus │        │
│  │ • Trip       │  │ • /trips     │  │ • Grafana    │        │
│  │ • Favorite   │  │ • /admin     │  │              │        │
│  │ • AiMessage  │  │ • /favorites │  │               │       │
│  │ • Subscription│ │ • /messages  │  │              │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐    ┌─────────────┐
                    │   MongoDB   │    │ External    │
                    │ Port: 27017 │    │  Services   │
                    └─────────────┘    └─────────────┘
                           │                   │
                           └───────┬───────────┘
                                   │
                    🔗 Notification (emails/SMS)
                    🔗 AI Service (conversations)
                    🔗 Payment Service (premium)
                    🔗 Auth Service (OAuth)
```

## Démarrage rapide

### Prérequis
- **Node.js** 20+
- **MongoDB** 8.0+
- **Services externes**

### Installation

```bash
# Cloner et naviguer
git clone <repo-url>
cd roadtrip/data-service

# Installation des dépendances
npm install

# Configuration environnement
cp .env.example .env
# ⚠️ Configurer au minimum MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET

# Démarrage développement
npm run dev

# Démarrage production
npm start
```

### Variables d'environnement requises

```env
# Application
SERVICE_NAME=data-service
NODE_ENV=development
PORT=5002

# Base de données
MONGODB_URI=

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_jwt_key-refresh-secret-64-chars

# CORS
CORS_ORIGIN=http://localhost:3000

# Services externes
NOTIFICATION_SERVICE_URL=http://localhost:5005
NOTIFICATION_API_KEY=your-notification-api-key
AI_SERVICE_URL=http://localhost:5003
AUTH_SERVICE_URL=http://localhost:5001

# Free Mobile SMS
FREE_MOBILE_USERNAME=your-free-mobile-username
FREE_MOBILE_API_KEY=your-free-mobile-key

# Monitoring
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true
```

## API Documentation

### Authentification
La plupart des endpoints nécessitent un token JWT dans l'header `Authorization: Bearer <token>`

### Endpoints principaux

#### **Authentification**

```http
POST /api/auth/register
```
Inscription utilisateur (avec vérification email automatique)
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

```http
POST /api/auth/login
```
Connexion utilisateur
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

```http
POST /api/auth/verify-account
```
Vérification compte via token email
```json
{
  "token": "verification-token-from-email"
}
```

```http
POST /api/auth/initiate-password-reset
```
Demande reset password par email
```json
{
  "email": "user@example.com"
}
```

```http
POST /api/auth/initiate-password-reset-sms
```
Demande reset password par SMS
```json
{
  "phoneNumber": "+33612345678"
}
```

```http
POST /api/auth/reset-password
```
Reset password avec code
```json
{
  "email": "user@example.com",
  "resetCode": "123456",
  "newPassword": "newSecurePassword123"
}
```

#### **Roadtrips**

```http
GET /api/roadtrips
```
Liste des roadtrips publics avec pagination
- `?page=1&limit=10` - Pagination
- `?country=France` - Filtre par pays
- `?isPremium=true` - Filtre premium

```http
GET /api/roadtrips/popular
```
Top roadtrips par vues (limite 3)

```http
GET /api/roadtrips/:id
```
Détails d'un roadtrip avec **logique premium**
- **Utilisateurs gratuits** : contenu tronqué + call-to-action
- **Utilisateurs premium/admin** : contenu complet

```http
POST /api/roadtrips/:id/views
```
Incrémenter compteur de vues

#### **Favoris** (authentification requise)

```http
POST /api/favorites/toggle/:tripId
```
Ajouter/retirer des favoris

```http
GET /api/favorites
```
Liste des roadtrips favoris de l'utilisateur

#### **Messages IA** (authentification requise et intégration AI Service)

```http
POST /api/messages
```
Sauvegarder message de conversation IA
```json
{
  "userId": "user-id",
  "role": "user",
  "content": "Message content",
  "conversationId": "conv-uuid"
}
```

```http
GET /api/messages/user/:userId
```
Historique messages utilisateur

```http
GET /api/messages/conversation/:conversationId
```
Messages d'une conversation spécifique

#### **Profil utilisateur** (authentification requise)

```http
GET /api/auth/profile
```
Profil utilisateur connecté

```http
PUT /api/auth/profile
```
Mise à jour profil
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+33612345678"
}
```

```http
PUT /api/auth/change-password
```
Changement mot de passe
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newSecurePassword"
}
```

```http
POST /api/auth/refresh-user-data
```
Refresh données après upgrade premium

#### **Administration** (admin uniquement)

```http
GET /api/admin/stats
```
Statistiques dashboard
```json
{
  "stats": {
    "users": { "total": 1250, "verified": 1100 },
    "trips": { "total": 340, "published": 280 },
    "engagement": { "ai_messages": 15600, "favorites": 890 }
  }
}
```

```http
GET /api/admin/users
```
Liste utilisateurs avec pagination
- `?page=1&limit=10` - Pagination
- `?search=john` - Recherche

```http
PUT /api/admin/users/status/:id
```
Mise à jour statut utilisateur
```json
{
  "isVerified": true,
  "role": "premium"
}
```

```http
DELETE /api/admin/users/:id
```
Suppression utilisateur **RGPD compliant**
- Supprime toutes les données associées
- AiMessages, Favorites, Subscriptions, Trips

```http
GET /api/admin/roadtrips
```
Gestion roadtrips avec filtres

```http
PATCH /api/admin/roadtrips/status/:id
```
Mise à jour statut roadtrip
```json
{
  "isPublished": true,
  "isPremium": false
}
```

### Monitoring

```http
GET /health
```
État de santé avec dépendances
```json
{
  "status": "healthy",
  "dependencies": {
    "mongodb": "connected",
    "notificationService": "healthy",
    "aiService": "healthy"
  }
}
```

```http
GET /vitals
```
Informations système détaillées

```http
GET /metrics
```
Métriques Prometheus

```http
GET /ping
```
Test de connectivité simple

## Logique métier

### **Système de rôles**
- **`user`** - Utilisateur gratuit (contenu limité)
- **`premium`** - Accès complet aux roadtrips premium
- **`admin`** - Accès total + admin panel

### **Content gating premium**
```javascript
// Logique automatique de restriction
if (trip.isPremium && userRole !== 'premium' && userRole !== 'admin') {
  // Contenu tronqué + appel à l'action upgrade
  return {
    ...limitedContent,
    premiumNotice: {
      message: "Contenu réservé aux utilisateurs premium",
      callToAction: "Abonnez-vous pour débloquer",
      missingFeatures: ["Itinéraire complet", "Carte interactive"]
    }
  };
}
```

### **Gestion RGPD**
```javascript
// Suppression complète des données utilisateur
await Promise.all([
  AiMessage.deleteMany({ userId }),
  Favorite.deleteMany({ userId }),
  Subscription.deleteMany({ userId }),
  Trip.deleteMany({ userId })
]);
```

## Intégrations microservices

### **Notification Service**
```javascript
// Envoi automatique emails/SMS
await NotificationService.sendConfirmationEmail(email, token);
await NotificationService.sendPasswordResetSMS(phone, code);
```

### **AI Service**
```javascript
// Sauvegarde conversations IA
POST /api/messages
// Historique utilisateur
GET /api/messages/user/:id
```

### **Payment Service**
```javascript
// Refresh après upgrade premium
POST /api/auth/refresh-user-data
// Nouvelles données utilisateur avec rôle premium
```

### **Auth Service**
```javascript
// Délégation OAuth future
// Support Google, Facebook, GitHub
```

## Tests

### Tests unitaires
```bash
npm test
```

### Tests en mode watch
```bash
npm run test:watch
```

## Docker

### Build
```bash
docker build -t data-service .
```

### Run
```bash
docker run -p 5002:5002 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/roadtrip \
  -e JWT_SECRET=your-jwt-secret \
  data-service
```

### Docker Compose
```yaml
# Inclus dans le docker-compose.yml principal
data-service:
  build: ./data-service
  ports:
    - "5002:5002"
    - "9093:9090"
  environment:
    - MONGODB_URI=${MONGODB_URI}
    - JWT_SECRET=${JWT_SECRET}
    - NOTIFICATION_SERVICE_URL=http://notification-service:5005
  depends_on:
    - mongodb
```

## Monitoring & Observabilité

### Métriques Prometheus
- `data_service_http_requests_total` - Requêtes totales
- `data_service_http_request_duration_seconds` - Temps de réponse
- `data_service_database_status` - Statut MongoDB
- `data_service_external_service_health` - Santé services externes
- `data_service_active_connections` - Connexions actives

### Logs structurés
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "info",
  "service": "data-service",
  "type": "auth",
  "message": "User authenticated",
  "user": {
    "id": "user123",
    "email": "test@example.com",
    "role": "premium"
  }
}
```

### Health checks avancés
- **MongoDB** - Connexion et performance
- **Notification Service** - Emails/SMS disponibles
- **AI Service** - Sauvegarde conversations
- **Auth Service** - OAuth disponible

## Sécurité

### Authentification
- **JWT** avec access + refresh tokens
- **Multi-sources** : Header, Cookie, Query
- **Rôles** : user, premium, admin
- **Optional auth** pour endpoints publics

### Protection des données
- **Passwords** hashed avec bcrypt
- **Tokens** sécurisés avec expiration
- **Phone numbers** avec index sparse
- **RGPD** compliant (suppression complète)

### Rate limiting
```javascript
const rateLimit = require('express-rate-limit');
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50
}));
```

### Validation stricte
```javascript
const { body } = require('express-validator');
router.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 8 })
], AuthController.register);
```

## 🚨 Gestion d'erreurs

### Codes de réponse standards
- `200` - Succès
- `201` - Créé
- `400` - Données invalides
- `401` - Non authentifié
- `403` - Accès refusé
- `404` - Non trouvé
- `409` - Conflit (email déjà utilisé)
- `500` - Erreur serveur

### Types d'erreurs
```javascript
// MongoDB errors
if (err.name === 'MongoError') {
  return res.status(503).json({
    error: "Base de données indisponible"
  });
}

// JWT errors
if (err.name === 'JsonWebTokenError') {
  return res.status(401).json({
    error: "Token invalide"
  });
}
```

### Retry et fallbacks
- **Service externe indisponible** → Mode dégradé
- **MongoDB timeout** → Retry automatique
- **Email failed** → Log + continue

## Debugging

### Logs détaillés
```bash
# Mode debug
LOG_LEVEL=debug npm run dev

# Suivre les logs
tail -f logs/data-service/combined.log

```

## Contribution

1. **Fork** le projet
2. **Créer** une branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. **Commit** (`git commit -m 'Ajouter nouvelle fonctionnalité'`)
4. **Push** (`git push origin feature/nouvelle-fonctionnalite`)
5. **Pull Request**

## Support

- **Issues** : GitHub Issues
- **Monitoring** : Grafana dashboard
- **Logs** : Loki + Grafana

## Licence

MIT License - voir `LICENSE` file

---

**Data Service** - *Cœur intelligent de l'écosystème ROADTRIP*