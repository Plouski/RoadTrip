# 💳 Paiement Service - RoadTrip! 

> **Microservice de gestion des abonnements et paiements Stripe**  
> _Projet M2 -  Microservices - Certification RNCP39583_

## 📋 Vue d'ensemble

Service Node.js/Express permettant de **gérer les abonnements (mensuel/annuel)**, **créer des paiements Stripe (Checkout)**, **réagir aux webhooks Stripe**, et **exposer des métriques Prometheus**. Sécurisé par **JWT** pour toutes les routes d’abonnement.

---

## 💡 Points forts

- **Abonnements premium** : checkout, changement de plan, annulation, réactivation  
- **Remboursement early-stage** : logique d’éligibilité (≤ 7 jours)  
- **Intégration Stripe complète** : checkout, subscription.updated, invoice.paid, etc.  
- **Sécurité JWT** via middleware global sur les routes d’abonnement  
- **Monitoring** : `/metrics`, `/health`, `/vitals` (Prometheus + health checks)  
- **Logs Winston** structurés, niveaux configurables

---

## 🚀 Installation & Démarrage

### Prérequis

```bash
Node.js 20+
MongoDB (MONGODB_URI)
Compte Stripe (clé secrète + webhook secret)
```

### Configuration
```bash
# Cloner et installer
git clone <repo>
cd paiement-service
npm install

# Configurer l'environnement
cp .env.example .env
```

### Variables d'environnement
```env
# Application
SERVICE_NAME=paiement-service
NODE_ENV=development
PORT=5004
CLIENT_URL=http://localhost:3000

# Base de données
MONGODB_URI=mongodb+srv://admin:password123@cluster0.f5kut.mongodb.net/roadtrip?retryWrites=true&w=majority&appName=Cluster0

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY_ID=price_...
STRIPE_PRICE_ANNUAL_ID=price_...

# CORS
CORS_ORIGINS=http://localhost:3000

# Monitoring / Logs
LOG_LEVEL=debug
ENABLE_FILE_LOGGING=true
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
curl http://localhost:5004/health
```

---

## 📡 API Endpoints

Toutes les routes **/subscription** sont protégées par **JWT**
Header requis : Authorization: Bearer <token>

### 🔧 Système (publics)

- GET /health – état du service + dépendances (Mongo, Stripe)
- GET /vitals – infos runtime (uptime, providers, webhooks, currencies)
- GET /metrics – métriques Prometheus
- GET /ping – ping simple

#### 👤 Abonnements (protégés JWT)

**Récupérer l’abonnement courant**
```http
GET /subscription/current
Authorization: Bearer <jwt>
```

**Récupérer l’abonnement d’un utilisateur (admin ou soi-même)**
```http
GET /subscription/user/:userId
Authorization: Bearer <jwt>
```

**Vérifier l’éligibilité au remboursement (≤ 7 jours)**
```http
GET /subscription/refund/eligibility
Authorization: Bearer <jwt>
```

**Demander un remboursement immédiat**
```http
POST /subscription/refund
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "reason": "Je me suis trompé de plan"
}
```

**Annuler à la fin de la période**
```http
DELETE /subscription/cancel
Authorization: Bearer <jwt>
```

**Réactiver un abonnement**
```http
POST /subscription/reactivate
Authorization: Bearer <jwt>
```

**Changer de plan (mensuel ↔ annuel)**
```http
PUT /subscription/change-plan
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "newPlan": "monthly"  // or "annual"
}
```

**Créer une session Stripe Checkout**
```http
POST /subscription/checkout
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "plan": "annual"  // or "monthly"
}
```

**Réponse**
```json
{ "url": "https://checkout.stripe.com/c/session_xyz" }
```

### 🔗 Webhooks Stripe

**Important** : l’endpoint /webhook doit recevoir le **body brut (raw)** pour que Stripe puisse vérifier la signature.
Configure le middleware comme ceci :
```js
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), webhookController.handleStripeWebhook);
```

#### Webhook principal Stripe
```http
POST /webhook
Content-Type: application/json
Stripe-Signature: t=timestamp,v1=signature
```

**Événements traités :**
- `checkout.session.completed` → Activation abonnement
- `customer.subscription.updated` → Mise à jour statut
- `customer.subscription.deleted` → Suppression abonnement
- `invoice.paid` → Paiement réussi
- `invoice.payment_failed` → Échec paiement

---

## 🏗 Structure Projet

```
paiement-service/
├── app.js
├── index.js
├── metrics.js
│
├── config/
│   ├── db.js
│   └── jwtConfig.js
│
├── controllers/
│   ├── subscriptionController.js
│   └── webhookController.js
│
├── middlewares/
│   ├── authMiddleware.js
│   ├── bodyParser.js
│   ├── rateLimitMiddleware.js
│   ├── requestMetrics.js
│   └── validationMiddleware.js
│
├── models/
│   ├── Subscription.js
│   └── User.js
│
├── routes/
│   ├── subscriptionRoutes.js
│   └── systemRoutes.js
│
├── services/
│   └── subscriptionIntegrationService.js
│
├── test/
│   └── paiement.test.js
│
├── utils/
│   └── logger.js
│
├── Dockerfile
├── package.json
├── .env.example
└── README.md
```

---

## 🔒 Sécurité

- JWT obligatoire sur toutes les routes /subscription/* (authMiddleware)
- Webhook Stripe : signature requise (STRIPE_WEBHOOK_SECRET) + raw body
- CORS : domaines autorisés via CORS_ORIGINS
- Rate limiting possible via rateLimitMiddleware
- Logs : Winston (niveau via LOG_LEVEL, fichiers si ENABLE_FILE_LOGGING=true)

---

## 📊 Monitoring & Métriques

- /metrics : Prometheus (latences HTTP, compteurs, santé services)
- /health : statut service + Mongo/Stripe
- /vitals : uptime, versions, providers activés
- requestMetrics : temps de réponse et compteurs par route

---

## 🧪 Tests

```bash
npm test
```

- Checkout Stripe (session URL)
- Changement de plan / annulation / réactivation
- Éligibilité & demande de remboursement
- Webhooks : checkout.session.completed, invoice.paid, etc.
- Endpoints système : /health, /metrics

---

## 🐳 Docker

```bash
# Build
docker build -t paiement-service .

# Run
docker run -p 5004:5004 --env-file .env paiement-service
```

---

## 🐛 Troubleshooting

| Problème                             | Cause probable                       | Solution                                                                |
| ------------------------------------ | ------------------------------------ | ----------------------------------------------------------------------- |
| `Webhook Error: No signatures found` | Body parsé en JSON                   | Utiliser `bodyParser.raw({ type: 'application/json' })` pour `/webhook` |
| `Invalid signature`                  | `STRIPE_WEBHOOK_SECRET` incorrect    | Vérifier la clé et l’endpoint dans Stripe                               |
| `401 Unauthorized`                   | JWT manquant/expiré                  | Envoyer `Authorization: Bearer <token>` valide                          |
| `Price ID non défini`                | Variables Stripe manquantes          | Renseigner `STRIPE_PRICE_MONTHLY_ID` / `STRIPE_PRICE_ANNUAL_ID`         |
| `Mongo disconnected`                 | MONGODB\_URI vide ou indisponible    | Renseigner `.env`, vérifier la connexion                                |
| `createCheckoutSession` 500          | Email manquant ou clé Stripe absente | Vérifier user.email dans JWT et `STRIPE_SECRET_KEY`                     |

---

## 👥 Contexte Projet

**Projet M2** - Développement d'un microservice pour plateforme de roadtrip  
**Certification** : RNCP39583 - Expert en Développement Logiciel 
**Technologies** : Node.js, Express, Stripe, MongoDB, Prometheus, Docker
**Auteur** : Inès GERVAIS