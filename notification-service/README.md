# 📧 Notification Service - ROADTRIP

> Service de notifications multi-canal (Email & SMS) pour l'écosystème ROADTRIP

## Vue d'ensemble

Le **Notification Service** centralise toutes les communications de ROADTRIP :
- **Emails transactionnels** via Mailjet (confirmation, reset password)
- **SMS** via Free Mobile API (codes de sécurité)
- **Templates responsives** avec branding ROADTRIP
- **Mode simulation** pour développement sans configuration
- **Monitoring avancé** avec Prometheus et logs structurés
- **Sécurité renforcée** avec API Keys

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   NOTIFICATION SERVICE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Routes     │  │   Services   │  │ Middlewares  │           │
│  │              │  │              │  │              │           │
│  │ • /api/email │  │ • EmailSvc   │  │ • Auth       │           │
│  │ • /api/sms   │  │ • SmsSvc     │  │ • Validation │           │
│  │ • /health    │  │              │  │ • CORS       │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│  ┌──────────────┐  ┌──────▼───────┐  ┌──────────────┐           │
│  │   Templates  │  │    Utils     │  │   Metrics    │           │
│  │              │  │              │  │              │           │
│  │ • Confirmation│ │ • Logger     │  │ • Prometheus │           │
│  │ • Password   │  │ • Validation │  │ • Grafana    │           │
│  │              │  │ • Security   │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐    ┌─────────────┐
                    │   Mailjet   │    │ Free Mobile │
                    │    Email    │    │     SMS     │
                    └─────────────┘    └─────────────┘
```

## Démarrage rapide

### Prérequis
- **Node.js** 20+
- **Compte Mailjet**
- **Free Mobile**

### Installation

```bash
# Cloner et naviguer
git clone <repo-url>
cd roadtrip/notification-service

# Installation des dépendances
npm install

# Configuration environnement
cp .env.example .env
# ⚠️ Configurer au minimum NOTIFICATION_API_KEY

# Démarrage développement
npm run dev

# Démarrage production
npm start
```

### Variables d'environnement

```env
# Application
SERVICE_NAME=notification-service
NODE_ENV=development
PORT=5005

# Sécurité
NOTIFICATION_API_KEY=your-secret-api-key-here

# CORS
CORS_ORIGIN=http://localhost:3000

# Email - Mailjet
MAILJET_API_KEY=your-mailjet-api-key
MAILJET_API_SECRET=your-mailjet-secret-key
EMAIL_FROM_NAME=ROADTRIP
EMAIL_FROM_ADDRESS=noreply@roadtrip.fr

# SMS - Free Mobile
FREE_MOBILE_USERNAME=your-free-mobile-username
FREE_MOBILE_API_KEY=your-free-mobile-api-key

# Frontend
FRONTEND_URL=http://localhost:3000

# Monitoring
LOG_LEVEL=debug
ENABLE_FILE_LOGGING=true
```

## API Documentation

### Authentification
**TOUTES** les routes `/api/*` nécessitent l'header `x-api-key` avec votre clé secrète.

### Endpoints disponibles

#### **Emails**

```http
POST /api/email/confirm
```
Envoie un email de confirmation d'inscription
```json
{
  "email": "user@example.com",
  "token": "confirmation-token-uuid"
}
```

**Réponse success:**
```json
{
  "success": true,
  "message": "Email de confirmation envoyé avec Mailjet ✅",
  "requestId": "notification-service-12345"
}
```

```http
POST /api/email/reset
```
Envoie un email de réinitialisation de mot de passe
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

#### **SMS**

```http
POST /api/sms/reset
```
Envoie un SMS de réinitialisation via Free Mobile
```json
{
  "username": "12345678",
  "apiKey": "your-free-mobile-key",
  "code": "654321"
}
```

### Monitoring

```http
GET /health
```
État de santé détaillé du service
```json
{
  "status": "healthy",
  "service": "notification-service",
  "uptime": 3600,
  "config": {
    "auth": true,
    "mailjet": true,
    "freeMobile": false
  }
}
```

```http
GET /vitals
```
Informations système complètes
```json
{
  "service": "notification-service",
  "uptime": 3600,
  "memory": {...},
  "active_connections": 2,
  "features": [
    "Email Notifications (Mailjet)",
    "SMS Notifications (Free Mobile)",
    "API Key Authentication"
  ],
  "providers": {
    "mailjet": {
      "configured": true,
      "status": "Email provider active"
    }
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

## Templates d'emails

### **Email de confirmation**
- Design responsive ROADTRIP
- Bouton CTA prominent
- Lien de fallback
- Expiration 24h

### **Email de reset password**
- Code sécurisé bien visible
- Design cohérent avec la marque
- Instructions claires
- Expiration 1h

## Configuration des providers

### **Mailjet Setup**

1. **Créer compte** sur [Mailjet](https://mailjet.com/)
2. **Obtenir les clés** API dans Compte → API Keys
3. **Configurer domaine** pour éviter le spam
4. **Ajouter dans .env** :
```env
MAILJET_API_KEY=your_api_key
MAILJET_API_SECRET=your_secret_key
EMAIL_FROM_ADDRESS=noreply@votre-domaine.com
```

### **Free Mobile Setup**

1. **Activer l'option** dans votre espace Free Mobile
2. **Noter vos identifiants** : login + clé API
3. **Tester** depuis l'interface web
4. **Ajouter dans .env** :
```env
FREE_MOBILE_USERNAME=12345678
FREE_MOBILE_API_KEY=your_api_key
```

### **Mode simulation (sans config)**
```bash
# Le service fonctionne sans configuration !
# Responses mockées pour développement :
{
  "success": true,
  "message": "Email simulé - Configurez Mailjet",
  "note": "Ajoutez MAILJET_API_KEY et MAILJET_API_SECRET"
}
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
docker build -t notification-service .
```

### Run
```bash
docker run -p 5005:5005 -p 9005:9005 \
  -e NOTIFICATION_API_KEY=your-secret-key \
  -e MAILJET_API_KEY=your-mailjet-key \
  notification-service
```

### Docker Compose
```yaml
# Inclus dans le docker-compose.yml principal
notification-service:
  build: ./notification-service
  ports:
    - "5005:5005"
    - "9094:9090"
  environment:
    - NOTIFICATION_API_KEY=${NOTIFICATION_API_KEY}
    - MAILJET_API_KEY=${MAILJET_API_KEY}
    - MAILJET_API_SECRET=${MAILJET_API_SECRET}
```

## Monitoring & Observabilité

### Métriques Prometheus
- `notification_service_http_requests_total` - Requêtes totales
- `notification_service_http_request_duration_seconds` - Temps de réponse
- `notification_service_external_service_health` - Santé Mailjet/Free Mobile
- `notification_service_active_connections` - Connexions actives

### Logs structurés
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "info",
  "service": "notification-service",
  "type": "email",
  "action": "confirmation",
  "email": "tes***@example.com",
  "provider": "mailjet",
  "requestId": "notif-12345-abc"
}
```

### Types de logs spécialisés
- `logger.security()` - Événements sécurité
- `logger.performance()` - Requêtes lentes
- Email masqué dans logs pour protection données

## Sécurité

### Authentification
- **API Key obligatoire** pour tous les endpoints `/api/*`
- **Validation stricte** des paramètres
- **Rate limiting** recommandé en production

### Protection des données
- **Emails masqués** dans les logs (tes***@example.com)
- **Pas de stockage** des mots de passe ou tokens
- **Headers sécurisés** avec Helmet.js
- **CORS configuré** strictement

## Gestion d'erreurs

### Codes de réponse
- `200` - Succès
- `400` - Paramètres invalides
- `403` - API Key manquante/invalide
- `500` - Erreur serveur/provider

### Fallbacks intelligents
```javascript
// Si Mailjet indisponible → Mode simulation
// Si Free Mobile échoue → Réponse success avec note
// Si service surchargé → Retry automatique
```

### Monitoring des erreurs
- **Logs détaillés** pour chaque échec
- **Métriques d'erreur** dans Prometheus
- **Health checks** des providers externes

## Intégrations

### Services ROADTRIP
- **Auth Service** - Reset password
- **Data Service** - Confirmation comptes
- **Frontend** - Liens de redirection

### APIs externes
- **Mailjet** - Envoi emails transactionnels
- **Free Mobile** - Envoi SMS sécurisé
- **Prometheus** - Collecte métriques

### Communication inter-services
```javascript
// Appel depuis data-service
const response = await fetch('http://notification-service:5005/api/email/confirm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.NOTIFICATION_API_KEY
  },
  body: JSON.stringify({ email, token })
});
```

## Debugging

### Logs détaillés
```bash
# Mode debug
LOG_LEVEL=debug npm run dev

# Suivre les logs
tail -f logs/notification-service/combined.log
```

## Contribution

1. **Fork** le projet
2. **Créer** une branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. **Commit** (`git commit -m 'Ajouter nouvelle fonctionnalité'`)
4. **Push** (`git push origin feature/nouvelle-fonctionnalite`)
5. **Pull Request**

## Support

- **Issues** : GitHub Issues
- **Monitoring** : Grafana dashboards
- **Logs** : Centralisés avec Loki

## Licence

MIT License - voir `LICENSE` file

---

**📧 Notification Service** - *Communications multi-canal pour ROADTRIP*