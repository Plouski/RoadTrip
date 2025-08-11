# Paiement Service - ROADTRIP

> Service de gestion des abonnements premium avec intégration Stripe pour l'écosystème ROADTRIP

## Vue d'ensemble

Le **Paiement Service** gère tous les aspects des abonnements premium de RoadTrip! :
- Souscription d'abonnements (mensuel/annuel)
- Intégration complète Stripe (Checkout, Webhooks)
- Gestion des annulations et réactivations
- Système de remboursement intelligent
- Changement de plans avec proratisation
- Monitoring et métriques temps réel

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PAIEMENT SERVICE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Controllers  │  │   Services   │  │ Middlewares  │           │
│  │              │  │              │  │              │           │
│  │ • Subscription│ │ • Integration│  │ • Auth       │           │
│  │ • Webhook    │  │              │  │ • Validation │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│  ┌──────────────┐  ┌──────▼───────┐  ┌──────────────┐           │
│  │    Models    │  │    Utils     │  │   Metrics    │           │
│  │              │  │              │  │              │           │
│  │ • User       │  │ • Logger     │  │ • Prometheus │           │
│  │ • Subscription│ │ • Helpers    │  │ • Grafana    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐    ┌─────────────┐
                    │   MongoDB   │    │   Stripe    │
                    │ Port: 27017 │    │   Webhooks  │
                    └─────────────┘    └─────────────┘
```

## Démarrage rapide

### Prérequis
- **Node.js** 20+
- **MongoDB** 6.0+
- **Compte Stripe** (clés de test)

### Installation

```bash
# Cloner et naviguer
git clone <repo-url>
cd roadtrip/paiement-service

# Installation des dépendances
npm install

# Configuration environnement
cp .env.example .env
# ⚠️ Configurer les variables Stripe et MongoDB

# Démarrage développement
npm run dev

# Démarrage production
npm start
```

### Variables d'environnement requises

```env
# Application
SERVICE_NAME=paiement-service
NODE_ENV=development
PORT=5004
CLIENT_URL=http://localhost:3000

# Base de données
MONGODB_URI=

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY_ID=price_...
STRIPE_PRICE_ANNUAL_ID=price_...

# CORS
CORS_ORIGINS=http://localhost:3000

# Monitoring
LOG_LEVEL=debug
ENABLE_FILE_LOGGING=true
```

## API Documentation

### Authentification
Toutes les routes nécessitent un token JWT dans l'header `Authorization: Bearer <token>`

### Endpoints principaux

#### **Gestion des abonnements**

```http
GET /subscription/current
```
Récupère l'abonnement de l'utilisateur connecté
```json
{
  "plan": "monthly",
  "status": "active",
  "isActive": true,
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-02-01T00:00:00Z",
  "daysRemaining": 15
}
```

```http
GET /subscription/user/:userId
```
Récupère l'abonnement d'un utilisateur (admin ou soi-même)

```http
POST /subscription/checkout
```
Crée une session Stripe Checkout
```json
{
  "plan": "monthly" // ou "annual"
}
```
→ Retourne `{ "url": "https://checkout.stripe.com/..." }`

#### **Gestion du cycle de vie**

```http
DELETE /subscription/cancel
```
Programme l'annulation à la fin de période
```json
{
  "success": true,
  "cancelationType": "end_of_period",
  "message": "Abonnement programmé pour annulation le 01/02/2024"
}
```

```http
POST /subscription/reactivate
```
Réactive un abonnement annulé (si éligible)

```http
PUT /subscription/change-plan
```
Change le plan d'abonnement
```json
{
  "newPlan": "annual" // ou "monthly"
}
```

#### **Remboursements**

```http
GET /subscription/refund/eligibility
```
Vérifie l'éligibilité au remboursement (7 jours)
```json
{
  "eligible": true,
  "daysSinceStart": 3,
  "daysRemainingForRefund": 4,
  "reason": "Éligible au remboursement. Il vous reste 4 jour(s)"
}
```

```http
POST /subscription/refund
```
Demande un remboursement immédiat
```json
{
  "reason": "Ne correspond pas à mes attentes"
}
```

#### **Webhooks Stripe**

```http
POST /webhook
```
Endpoint sécurisé pour les webhooks Stripe
- Vérifie la signature Stripe
- Traite les événements : checkout.session.completed, subscription.updated, etc.

### Monitoring

```http
GET /health
```
État de santé du service et dépendances
```json
{
  "status": "healthy",
  "dependencies": {
    "mongodb": "healthy",
    "stripe": "configured"
  }
}
```

```http
GET /vitals
```
Informations détaillées du service
```json
{
  "service": "paiement-service",
  "uptime": 3600,
  "payment": {
    "providers": { "stripe": true },
    "currencies_supported": ["EUR", "USD"]
  }
}
```

```http
GET /metrics
```
Métriques Prometheus (format text/plain)

```http
GET /ping
```
Test de connectivité simple

## Configuration Stripe

### 1. Créer les produits dans Stripe Dashboard

```javascript
// Plan mensuel
Product: "ROADTRIP Premium Monthly"
Price: 5 EUR/mois
ID: price_monthly_xxxxx

// Plan annuel  
Product: "ROADTRIP Premium Annual"
Price: 45 EUR/an
ID: price_annual_xxxxx
```

### 2. Configurer les webhooks

**URL**: `https://votre-domaine.com/webhook`

**Événements à écouter**:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

### 3. Récupérer la clé webhook
```bash
stripe listen --forward-to localhost:5004/webhook
# Copier la clé whsec_... dans STRIPE_WEBHOOK_SECRET
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

### Coverage
```bash
npm test -- --coverage
```

## Docker

### Build
```bash
docker build -t paiement-service .
```

### Run
```bash
docker run -p 5004:5004 -p 9004:9004 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/roadtrip \
  -e STRIPE_SECRET_KEY=sk_test_... \
  paiement-service
```

### Docker Compose
```yaml
# Inclus dans le docker-compose.yml principal
services:
  paiement-service:
    build: ./paiement-service
    ports:
      - "5004:5004"
      - "9095:9090"
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
```

## Monitoring & Observabilité

### Métriques Prometheus
- `paiement_service_http_requests_total` - Nombre de requêtes
- `paiement_service_http_request_duration_seconds` - Temps de réponse
- `paiement_service_subscription_total` - Abonnements par type
- `paiement_service_payment_success_total` - Paiements réussis
- `paiement_service_refund_total` - Remboursements

### Logs structurés
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "info",
  "service": "paiement-service",
  "type": "payment",
  "message": "Paiement réussi",
  "userId": "user123",
  "plan": "monthly",
  "amount": 5
}
```

### Dashboards Grafana
- **Payment Overview** - Vue globale des paiements
- **Subscription Analytics** - Analyse des abonnements
- **Error Tracking** - Suivi des erreurs
- **Performance Metrics** - Métriques de performance

## Sécurité

### Authentification
- **JWT obligatoire** sur toutes les routes `/subscription/*`
- **Validation des tokens** avec middleware
- **Gestion des rôles** (user/admin)

### Protection des données
- **Validation stricte** des inputs
- **Rate limiting** sur les endpoints sensibles
- **Logs de sécurité** pour tentatives d'accès
- **Chiffrement** des données sensibles en transit

### Webhooks sécurisés
- **Vérification signature Stripe** obligatoire
- **Endpoint dédié** `/webhook` avec raw body
- **Logs détaillés** des événements reçus

## Gestion d'erreurs

### Codes d'erreur standards
- `400` - Données invalides
- `401` - Non authentifié
- `403` - Accès refusé
- `404` - Ressource introuvable
- `429` - Rate limit dépassé
- `500` - Erreur serveur

## Business Logic

### Plans disponibles
- **Monthly**: 5€/mois
- **Annual**: 45€/an (économie de ~25%)

### Fonctionnalités premium
- Itinéraires illimités
- IA de recommandation avancée

## Intégrations

### Services externes
- **Stripe** - Paiements et abonnements
- **Prometheus** - Métriques
- **MongoDB** - Stockage des données

## Debugging

### Logs détaillés
```bash
# Mode debug
LOG_LEVEL=debug npm run dev

# Suivre les logs
tail -f logs/paiement-service/combined.log
```

### Test webhooks local
```bash
# Installer Stripe CLI
stripe listen --forward-to localhost:5004/webhook

# Simuler un événement
stripe trigger checkout.session.completed
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

**Paiement Service** - *Gestion des abonnements premium ROADTRIP*