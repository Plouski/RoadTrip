# 🌍 RoadTrip! - Plateforme de Voyage Microservices

> **Écosystème complet de planification de voyages basé sur une architecture microservices**  
> _Projet M2 - Certification RNCP39583 - Expert en Développement Logiciel_

Lien de production en ligne (Vercel) : https://road-trip-gamma.vercel.app/
⚠️ **Statut de la production :**  
Le lien de production n’est actuellement plus actif suite à l’arrêt du service `data-service` hébergé sur Render.  
L’application reste entièrement fonctionnelle en environnement local via Docker (voir section Démarrage Rapide).

## 📋 Vue d'ensemble

RoadTrip! est une plateforme moderne de planification de voyages construite avec une architecture microservices. Elle permet aux utilisateurs de découvrir, planifier et partager leurs aventures de voyage grâce à l'intelligence artificielle.

### 🎯 Fonctionnalités principales

- **🤖 Assistant IA** : Génération d'itinéraires personnalisés avec météo intégrée
- **🔐 Authentification OAuth** : Connexion Google/Facebook simplifiée
- **💳 Abonnements Premium** : Accès aux fonctionnalités avancées via Stripe
- **📧 Notifications Multi-Canal** : Emails et SMS transactionnels
- **⭐ Système de Favoris** : Sauvegarde et partage d'itinéraires
- **📊 Monitoring Complet** : Prometheus, Grafana, Loki pour l'observabilité

---

## 🏗 Architecture

```
Frontend (Next.js)          Monitoring Stack
    :3000              ┌─────────────────────────┐
       │               │ Prometheus     :9090    │
       │               │ Grafana        :3100    │
       │               │ Loki           :3101    │
       │               │ Promtail                │
       │               └─────────────────────────┘
       │                          │
       ▼                          ▼
┌────────────────────────────────────────────────────────┐
│              MICROSERVICES NETWORK                     │
│                                                        │
│ ┌─────────────┐ ┌─────────────┐ ┌────────────────────┐ │
│ │auth-service │ │data-service │ │   ai-service       │ │
│ │    :5001    │ │    :5002    │ │     :5003          │ │
│ │    :9092    │ │    :9093    │ │     :9091          │ │
│ └─────────────┘ └─────────────┘ └────────────────────┘ │
│                                                        │
│ ┌─────────────┐ ┌─────────────┐ ┌────────────────────┐ │
│ │paiement-svc │ │notification-│ │  metrics-service   │ │
│ │    :5004    │ │service :5005│ │     :5006          │ │
│ │    :9095    │ │    :9094    │ │     :9096          │ │
│ └─────────────┘ └─────────────┘ └────────────────────┘ │
│                                                        │
│                MongoDB Atlas                           │
└────────────────────────────────────────────────────────┘
```

---

## 📋 Référence des Ports

| Service | Port Principal | Port Métriques | URL |
|---------|---------------|----------------|-----|
| Frontend | 3000 | - | http://localhost:3000 |
| Auth Service | 5001 | 9092 | http://localhost:5001 |
| Data Service | 5002 | 9093 | http://localhost:5002 |
| AI Service | 5003 | 9091 | http://localhost:5003 |
| Paiement Service | 5004 | 9095 | http://localhost:5004 |
| Notification Service | 5005 | 9094 | http://localhost:5005 |
| Metrics Service | 5006 | 9096 | http://localhost:5006 |
| **Monitoring** | | | |
| Prometheus | 9090 | - | http://localhost:9090 |
| Grafana | 3100 | - | http://localhost:3100 |
| Loki | 3101 | - | http://localhost:3101 |

---

## 🚀 Démarrage Rapide

### Prérequis

- **Docker & Docker Compose** (recommandé)
- **Node.js 20+** (pour développement local)
- **Stripe CLI** (pour les webhooks en développement)
- **Comptes API** : OpenAI, Stripe, Mailjet, Free Mobile

### Installation complète avec Docker

```bash
# 1. Cloner le projet
git clone <repository>
cd Roadtrip

# 2. Configurer l'environnement global
cp .env.example .env
# Éditer .env avec vos clés API

# 3. Lancer tous les services
docker-compose up -d

# 4. Configurer les webhooks Stripe (OBLIGATOIRE)
# Dans un nouveau terminal
stripe listen --forward-to localhost:5004/webhook

# 5. Vérifier que tous les services sont UP
curl -s http://localhost:5006/api/services/status
```

### ⚠️ Configuration Stripe Webhook (CRITIQUE)

Pour que les paiements fonctionnent correctement, vous DEVEZ lancer Stripe CLI en parallèle :

```bash
# Terminal dédié pour Stripe
stripe login
stripe listen --forward-to localhost:5004/webhook

# La commande affichera un webhook secret comme :
# whsec_1234567890abcdef...
# Copiez ce secret dans votre .env : STRIPE_WEBHOOK_SECRET
```

### Accès aux interfaces

- **Frontend** : http://localhost:3000 (admin@gmail.com/Admin123456!)
- **Grafana** : http://localhost:3100 (admin/admin123)
- **Prometheus** : http://localhost:9090
- **Metrics Dashboard** : http://localhost:5006/api/dashboard

---

## 🔧 Services

### 🔐 Auth Service (Port: 5001)
**Responsabilité** : Authentification et autorisation

- OAuth Google/Facebook avec Passport.js
- Génération et validation JWT (access + refresh tokens)
- Sessions sécurisées pour le flow OAuth
- Redirections frontend automatiques

**API Principales :**
- `GET /auth/oauth/google` - Démarrer OAuth Google
- `GET /auth/oauth/facebook` - Démarrer OAuth Facebook
- `POST /auth/logout` - Déconnexion
- `GET /providers` - Providers disponibles

### 🗂 Data Service (Port: 5002)
**Responsabilité** : Gestion des données métier

- CRUD Utilisateurs avec profils complets
- Gestion des Roadtrips (publics/premium)
- Système de favoris utilisateur
- Historique des messages IA
- Administration (stats, gestion utilisateurs/contenus)

**API Principales :**
- `POST /api/auth/register` - Inscription
- `GET /api/roadtrips` - Liste des voyages
- `POST /api/favorites/toggle/:tripId` - Gérer favoris
- `GET /api/admin/stats` - Statistiques admin

### 🤖 AI Service (Port: 5003)
**Responsabilité** : Intelligence artificielle

- Génération d'itinéraires via OpenAI GPT-4
- Enrichissement météo (Open-Meteo)
- Cache intelligent des réponses
- Fallback local si API indisponible
- Historique des conversations

**API Principales :**
- `POST /ask` - Générer un itinéraire IA
- `POST /save` - Sauvegarder conversation
- `GET /history` - Historique utilisateur
- `DELETE /conversation/:id` - Supprimer conversation

### 💳 Paiement Service (Port: 5004)
**Responsabilité** : Abonnements et paiements

- Intégration Stripe Checkout complète
- Gestion abonnements (mensuel/annuel)
- Webhooks Stripe (paiements, annulations)
- Système de remboursement
- Changement de plans

**⚠️ Prérequis Webhooks :**
```bash
# OBLIGATOIRE : Lancer Stripe CLI en parallèle
stripe listen --forward-to localhost:5004/webhook
```

**API Principales :**
- `POST /subscription/checkout` - Créer session paiement
- `GET /subscription/current` - Abonnement actuel
- `PUT /subscription/change-plan` - Changer de plan
- `DELETE /subscription/cancel` - Annuler abonnement
- `POST /webhook` - **Endpoint webhook Stripe (écouté par Stripe CLI)**

### 📧 Notification Service (Port: 5005)
**Responsabilité** : Communications

- Emails transactionnels (Mailjet)
- SMS (Free Mobile API)
- Templates HTML responsives
- Formulaire de contact
- Notifications système

**API Principales :**
- `POST /api/email/confirm` - Email confirmation
- `POST /api/email/reset` - Email reset password
- `POST /api/sms/reset` - SMS code reset
- `POST /api/contact/send` - Formulaire contact

### 📊 Metrics Service (Port: 5006)
**Responsabilité** : Observabilité

- Agrégation métriques Prometheus
- Dashboard JSON en temps réel
- Health checks centralisés
- Logs centralisés (Loki/Promtail)
- APIs d'administration monitoring

**API Principales :**
- `GET /api/dashboard` - Dashboard JSON
- `GET /api/services/status` - Statut services
- `GET /metrics` - Métriques Prometheus
- `GET /health` - Santé globale

### 🌐 Frontend (Port: 3000)
**Responsabilité** : Interface utilisateur

- Application Next.js 13+ (App Router)
- UI moderne (Tailwind + shadcn/ui)
- Pages publiques et espaces protégés
- Intégration complète avec tous les microservices
- Responsive design

**Pages Principales :**
- `/` - Accueil
- `/explorer` - Catalogue voyages
- `/ai` - Assistant IA (premium)
- `/premium` - Abonnements
- `/admin` - Administration

---

## 🔒 Sécurité

### Authentification
- **JWT** avec access/refresh tokens
- **OAuth 2.0** Google/Facebook
- **Sessions** sécurisées (httpOnly, sameSite)

### Autorisation
- **Rôles** : user, premium, admin
- **Middlewares** de protection par service
- **API Keys** pour communication inter-services

### Sécurité Infrastructure
- **CORS** configuré strictement
- **Rate Limiting** sur endpoints sensibles
- **Helmet** pour headers sécurisés
- **Validation** des données entrantes

---

## 📊 Monitoring & Observabilité

### Stack de Monitoring
- **Prometheus** : Collecte des métriques
- **Grafana** : Visualisation et dashboards
- **Loki** : Agrégation des logs
- **Promtail** : Agent de collecte logs

### Métriques Exposées
- Latence HTTP par service/route
- Taux d'erreur et codes de statut
- Connexions actives
- Santé des bases de données
- Performances des services externes

### Health Checks
Chaque service expose :
- `/health` - Statut global + dépendances
- `/vitals` - Métriques système (CPU, mémoire)
- `/metrics` - Métriques Prometheus
- `/ping` - Test basique de connectivité

---

## 🐳 Docker

### Développement avec Docker

```bash
# Lancer stack complète
docker-compose up -d

# Lancer Stripe CLI (terminal séparé)
stripe listen --forward-to localhost:5004/webhook

# Logs en temps réel
docker-compose logs -f

# Restart un service
docker-compose restart ai-service

# Arrêter tous les services
docker-compose down
```

### Variables d'Environnement

Copier `.env.example` vers `.env` et configurer :

```env
# VARIABLES GLOBALES
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
CLIENT_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# DATABASE CONFIGURATION
MONGODB_URI=mongodb+srv://admin:password123@cluster0.f5kut.mongodb.net/roadtrip?retryWrites=true&w=majority&appName=Cluster0

# JWT CONFIGURATION (PARTAGÉ ENTRE TOUS LES SERVICES)
JWT_SECRET=roadTripTopSecret2024ChangeInProduction
JWT_REFRESH_SECRET=refreshTopsecret2024ChangeInProduction
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# SESSION CONFIGURATION
SESSION_SECRET=super-secret-session-key-change-in-production

# SERVICES INTEGRATION
DATA_SERVICE_URL=http://localhost:5002
NOTIFICATION_SERVICE_URL=http://localhost:5005
NOTIFICATION_API_KEY=test-api-key-123

# OAUTH CONFIGURATION

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5001/auth/oauth/google/callback

# Facebook OAuth
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:5001/auth/oauth/facebook/callback

# EXTERNAL APIS

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_from_stripe_cli
STRIPE_PRICE_MONTHLY_ID=price_your_monthly_price_id
STRIPE_PRICE_ANNUAL_ID=price_your_annual_price_id

# Email (Mailjet)
MAILJET_API_KEY=your-mailjet-api-key
MAILJET_API_SECRET=your-mailjet-secret-key
EMAIL_FROM_NAME=RoadTrip! Support
EMAIL_FROM_ADDRESS=noreply@roadtrip.fr

# SMS (Free Mobile)
FREE_MOBILE_USERNAME=12345678
FREE_MOBILE_API_KEY=your-free-mobile-api-key

# MONITORING
GRAFANA_API_KEY=your-grafana-api-key
```

---

## 🖥 Développement Local (sans Docker)

### Démarrage

```bash
# Démarrer les services (7 terminaux)
cd data-service && npm run dev        # Terminal 1
cd auth-service && npm run dev        # Terminal 2  
cd notification-service && npm run dev # Terminal 3
cd ai-service && npm run dev          # Terminal 4
cd paiement-service && npm run dev    # Terminal 5
cd metrics-service && npm run dev     # Terminal 6
cd front-roadtrip-service && npm run dev # Terminal 7

# Stripe CLI (Terminal)
stripe listen --forward-to localhost:5004/webhook
```

### ⚠️ Étapes Critiques Développement Local

1. **Services** : Tous les services doivent être UP
2. **Stripe CLI** : OBLIGATOIRE pour les paiements
3. **Variables d'environnement** : Bien configurées dans tous les services
4. **Base de données** : MongoDB Atlas accessible

### Avantages du développement local
- **Debug facile** : Logs directement dans le terminal
- **Rechargement rapide** : Pas de rebuild Docker
- **Flexibilité** : Démarrer seulement les services nécessaires
- **Performance** : Pas d'overhead Docker
- **Tests unitaires** : Plus rapides en local

### Standards de Code
- **ESLint** + **Prettier** pour le formatage
- **Conventional Commits** pour les messages Git
- **Husky** pour les pre-commit hooks
- **Jest** pour les tests unitaires

---

## 🧪 Tests

### Exécuter tous les tests

```bash
# Tests unitaires par service
# Dans chaque service
cd auth-service && npm test
cd data-service && npm test
cd ai-service && npm test
cd paiement-service && npm test
cd notification-service && npm test
cd metrics-service && npm test

# Avec coverage
npm test -- --coverage
```

### Types de Tests
- **Unitaires** : Logique métier de chaque service
- **Intégration** : APIs entre services
- **E2E** : Parcours utilisateur complets
- **Load** : Performance sous charge

---

## 🐛 Troubleshooting

### Problèmes Fréquents

| Problème | Cause | Solution |
|----------|-------|----------|
| Services ne démarrent pas | Ports occupés | `docker-compose down && docker-compose up -d` |
| 401 sur toutes les APIs | JWT invalide | Vérifier `JWT_SECRET` dans tous les .env |
| IA indisponible | OpenAI API down/quota | Vérifier `OPENAI_API_KEY` et crédits |
| Emails non envoyés | Mailjet mal configuré | Vérifier `MAILJET_API_KEY/SECRET` |
| Paiements échouent | Stripe CLI pas lancé | `stripe listen --forward-to localhost:5004/webhook` |
| Webhooks Stripe timeout | Port 5004 inaccessible | Vérifier service paiement UP |
| Prometheus vide | Services pas scrapés | Vérifier `prometheus.yml` et réseau |

### Health Checks Rapides

```bash
# Vérifier tous les services
for port in 5001 5002 5003 5004 5005 5006; do
  echo "Service port $port:"
  curl -s http://localhost:$port/health
done

# Dashboard complet
curl -s http://localhost:5006/api/dashboard

# Métriques Prometheus
curl -s http://localhost:9090/api/v1/targets

# Tester webhook Stripe (après avoir lancé stripe listen)
curl -X POST http://localhost:5004/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

### Debugging Stripe

```bash
# Vérifier que Stripe CLI écoute bien
stripe listen --list

# Tester un webhook manuellement
stripe events resend evt_test_webhook

# Vérifier les logs Stripe
stripe logs tail
```

---

## 🤝 Contribution

### Workflow de Développement

1. **Fork** le repository
2. **Créer** une branche feature (`git checkout -b feature/amazing-feature`)
3. **Commit** avec conventional commits (`git commit -m 'feat: add amazing feature'`)
4. **Push** vers la branche (`git push origin feature/amazing-feature`)
5. **Ouvrir** une Pull Request

---

## 👥 Contexte

**Auteur** : Inès GERVAIS  
**Projet** : M2 - Architecture Microservices  
**Certification** : RNCP39583 - Expert en Développement Logiciel  
**Technologies** : Node.js, Express, Next.js, MongoDB, Docker, Kubernetes, Prometheus
