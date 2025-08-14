# 🤖 AI Service - RoadTrip!

> **Microservice IA pour la génération d’itinéraires de roadtrip et la gestion d’historiques de conversations**  
> _Projet M2 - Microservices - Certification RNCP39583_

## 📋 Vue d'ensemble

ai-service expose une API REST sécurisée (JWT + rôles) qui :

- génère des **itinéraires de roadtrip** via OpenAI (avec **fallback** si l’API n’est pas dispo),
- **enrichit** les 5 premiers jours avec une météo indicative (Open-Meteo),
- **met en cache** les réponses pour éviter les appels redondants,
- **persiste** l’historique des conversations via le data-service,
- expose des **métriques Prometheus** et des **logs** structurés.

---

## 💡 Fonctionnalités

- Génération d’itinéraires IA en **JSON strict** (destination, durée, budget, étapes, conseils…)
- **Fallback** local si OpenAI indisponible / non configuré
- **Météo** indicative (Open-Meteo) sur les premiers jours
- **Cache** (NodeCache, TTL 1h) sur les requêtes IA
- **Historique**: sauvegarde, listing, suppression, conversation par ID
- **Sécurité**: JWT + rôle premium / admin requis sur toutes les routes
- **Métriques** Prometheus + health (via metrics.js)
- **Logs** avec contexte (requêtes, erreurs, perf)

---

## 🚀 Installation & Démarrage

### Prérequis

```bash
Node.js 20+
Un service JWT émettant des tokens (auth/data-service)
OpenAI API Key (recommandé, sinon fallback actif)
```

### Configuration

```bash
# Cloner et installer
git clone <repo>
cd ai-service
npm install

# Configurer l'environnement
cp .env.example .env
```

### Variables d'environnement

```env
SERVICE_NAME=ai-service
PORT=5003
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_FILE_LOGGING=true

# IA
OPENAI_API_KEY=your-key-here

# Auth
JWT_SECRET=your-secret

# Data Service (persistance des messages IA)
DATA_SERVICE_URL=http://localhost:5002

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

Toutes les routes nécessitent un **JWT valide** et un **rôle** premium ou admin.
Headers communs : Authorization: Bearer <ACCESS_TOKEN> · Content-Type: application/json

### 🤖 Génération d’itinéraire IA

**Demander un itinéraire (OpenAI + fallback + météo)**

```http
POST /ask
Headers:
  Authorization: Bearer <ACCESS_TOKEN>
  Content-Type: application/json
Body:
{
  "prompt": "Je veux aller au Portugal pendant une semaine avec un budget faible",
}
```

### 💾 Historique de conversation

**Sauvegarder un message**

```http
POST /save
Headers:
  Authorization: Bearer <ACCESS_TOKEN>
  Content-Type: application/json
Body:
{
  "role": "user",                 // "user" | "assistant"
  "content": "Je veux aller au Portugal pendant une semaine avec un budget faible",
  "conversationId": "conv-123"
}
```

**Récupérer tout l’historique (groupé par conversationId)**

```http
GET /history
Headers:
  Authorization: Bearer <ACCESS_TOKEN>
```

**Supprimer tout l’historique de l’utilisateur**

```http
Copier
Modifier
DELETE /history
Headers:
Authorization: Bearer <ACCESS_TOKEN>
```

### 🗂 Conversations

**Récupérer une conversation par ID**

```http
GET /conversation/:id
Headers:
  Authorization: Bearer <ACCESS_TOKEN>
```

**Supprimer une conversation par ID**

```http
DELETE /conversation/:id
Headers:
  Authorization: Bearer <ACCESS_TOKEN>
```

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
ai-service/
├── config/
│   └── jwtConfig.js
├── controllers/
│   └── aiController.js
├── middlewares/
│   ├── authMiddleware.js
│   └── metricsLogger.js
├── routes/
│   ├── aiRoutes.js
│   └── systemRoutes.js
├── services/
│   ├── aiService.js
│   └── dataService.js
├── utils/
│   ├── logger.js
│   ├── cacheKey.js
│   ├── durationExtractor.js
│   └── roadtripValidation.js
├── metrics.js
├── index.js
├── Dockerfile
└── README.md
```

---

## 🔒 Sécurité

- **JWT** vérifié via middlewares/authMiddleware.js (lecture depuis Authorization, cookie accessToken, x-access-token ou ?token=).

- **Rôles** : roleMiddleware(["premium","admin"]) → toutes les routes d’IA sont réservées aux abonnés premium ou admin.

- En cas d’échec :
- - 401 TOKEN_EXPIRED ou INVALID_TOKEN
- - 403 permissions insuffisantes

---

## 🧠 IA, Cache & Fallback

- **OpenAI** via services/aiService.js (modèle gpt-4o-mini).
- **Cache**: NodeCache TTL 3600s (clé dérivée des paramètres utilisateur).
- **Fallback**: si OpenAI indisponible ou clé absente → génération d’un objet JSON valide minimal (sans appel réseau).
- **Météo**: Open-Meteo (géocoding + prévisions quotidiennes) ajoutée sur les 5 premiers jours quand possible (silencieux en cas d’échec)

---

## 📊 Monitoring

**Prometheus** via metrics.js

- ${SERVICE_NAME}\_service_health_status
- ${SERVICE_NAME}\_http_request_duration_seconds
- ${SERVICE_NAME}\_http_requests_total
- ${SERVICE_NAME}\_active_connections
- ${SERVICE_NAME}\_database_status
- ${SERVICE_NAME}\_external_service_health

---

## 🧪 Tests

```bash
npm test
```

---

## 🐳 Docker

```bash
# Build
docker build -t ai-service .

# Run
docker run -p 5001:5001 --env-file .env ai-service
```

---

## 🐛 Troubleshooting

| Problème                          | Cause probable                         | Solution                                     |
| --------------------------------- | -------------------------------------- | -------------------------------------------- |
| `401 TOKEN_EXPIRED`               | JWT expiré                             | Rafraîchir les tokens côté client            |
| `403 Accès refusé`                | Rôle non premium/admin                 | Mettre à jour l’abonnement / rôle            |
| Réponse `type:error` non roadtrip | Prompt hors sujet                      | Reformuler la demande (destination, durée…)  |
| Réponse fallback                  | `OPENAI_API_KEY` manquante ou API down | Renseigner la clé ou réessayer               |
| Météo manquante                   | Géocodage impossible / API down        | Toléré (le service reste fonctionnel)        |
| `/metrics` vide                   | Pas de trafic                          | Exécuter quelques requêtes                   |
| Doublons d’appels                 | Cache expiré ou paramètres différents  | Vérifier TTL et normalisation des paramètres |

---

## 👥 Contexte

**Projet M2** - Développement d'un microservice pour plateforme de roadtrip  
**Certification** : RNCP39583 - Expert en Développement Logiciel  
**Technologies** : Node.js, Express, OpenAI, Open-Meteo, Prometheus, Docker
**Auteur** : Inès GERVAIS