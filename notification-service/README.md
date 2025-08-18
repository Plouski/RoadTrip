# 📧 Notification Service - RoadTrip! 

> **Microservice de Notifications Multi-Canal pour l'écosystème RoadTrip!**  
> _Projet M2 -  Microservices - Certification RNCP39583_

## 📋 Vue d'ensemble

Service Node.js gérant les **notifications emails, SMS** et formulaires de contact avec intégration Mailjet et Free Mobile, templates HTML personnalisés, sécurité API-Key et monitoring Prometheus.
Support des **alertes automatiques** pour le système de monitoring RoadTrip!

---

## 💡 Points forts

- **API sécurisée** par clé API (`x-api-key`) pour toutes les routes sensibles  
- **Support multi-canal** : emails transactionnels, SMS, formulaires de contact, **alertes système**  
- **Templates HTML responsives** aux couleurs RoadTrip!  
- **Monitoring en temps réel** avec Prometheus et health checks avancés  
- **Logs détaillés et structurés** avec Winston (JSON en prod, colorés en dev)  
- **Fallback providers** pour tests hors connexion ou sans credentials

---

## 🎯 Fonctionnalités 

- **Email Transactionnel** : Confirmation compte + réinitialisation mot de passe
- **SMS Free Mobile** : Codes de vérification par SMS
- **Formulaire Contact** : Gestion emails support + confirmation utilisateur
- **Alertes Système** : Notifications automatiques de monitoring
- **Templates HTML** : Emails branded RoadTrip! responsives
- **API Security** : Protection API-Key pour requêtes inter-services
- **Multi-Provider** : Mailjet (email) + Free Mobile (SMS)
- **Monitoring Intégré** : Métriques Prometheus + health checks
- **Fallback Mode** : Simulation si providers non configurés

---

## 🚀 Installation & Démarrage

### Prérequis

```bash
Node.js 20+
npm ou yarn
Compte Mailjet (email)
Compte Free Mobile avec API SMS (SMS)
```

### Configuration

```bash
# Cloner et installer
git clone <repo>
cd notification-service
npm install

# Configurer l'environnement
cp .env.example .env
```

### Variables d'environnement

```env
# Service Configuration
SERVICE_NAME=notification-service
PORT=5005
NODE_ENV=development
NOTIFICATION_API_KEY=your-secret-api-key-here
CORS_ORIGIN=http://localhost:3000

# Email Provider (Mailjet)
MAILJET_API_KEY=your-mailjet-api-key
MAILJET_API_SECRET=your-mailjet-secret-key
EMAIL_FROM_NAME=RoadTrip! Support
EMAIL_FROM_ADDRESS=noreply@roadtrip.fr

# SMS Provider (Free Mobile)
FREE_MOBILE_USERNAME=your-free-mobile-username
FREE_MOBILE_API_KEY=your-free-mobile-api-key

# Contact Configuration
CONTACT_RECEIVE_EMAIL=gervaisines@gmail.com

# Alertes & Monitoring
GRAFANA_URL=http://localhost:3100

# Frontend
FRONTEND_URL=http://localhost:3000
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

### 📧 Email

#### Confirmation

```http
POST /api/email/confirm
Headers: x-api-key: <NOTIFICATION_API_KEY>
Body:
{
  "email": "user@example.com",
  "token": "abc123"
}
```

#### Réinitialisation mot de passe

```http
POST /api/email/reset
Headers: x-api-key: <NOTIFICATION_API_KEY>
Body:
{
  "email": "user@example.com",
  "code": "123456"
}
```

### Alertes Système

```http
POST /api/alert
Headers: x-api-key: <NOTIFICATION_API_KEY>
Body:
{
  "type": "email",
  "email": "admin@roadtrip.com",
  "alert": {
    "severity": "CRITICAL",
    "service": "auth-service",
    "message": "Service auth-service est DOWN",
    "timestamp": "2025-08-16T10:30:00Z"
  }
}
```

#### Formulaire de Contact

```http
POST /api/contact/send
Headers: x-api-key: <NOTIFICATION_API_KEY>
Body:
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Problème technique",
  "category": "problem",
  "message": "Description du problème..."
}
```

**Catégories disponibles :**

- `problem` : Problème technique (🐛, priorité haute)
- `info` : Demande d'information (ℹ️, priorité normale)
- `suggestion` : Suggestion d'amélioration (⭐, priorité basse)
- `feedback` : Retour d'expérience (💚, priorité normale)
- `other` : Autre (💬, priorité normale)

### 📱 SMS

#### SMS Code de Réinitialisation

```http
POST /api/sms/reset
Content-Type: application/json
x-api-key: your-secret-api-key

{
  "username": "12345678",
  "apiKey": "your-free-mobile-api-key",
  "code": "654321"
}
```

**Format du SMS :**

```
RoadTrip! - Votre code de réinitialisation est : 654321
```

## 🔧 Système & Monitoring

```http
GET /health           # État du service + providers
GET /vitals           # Statistiques système détaillées
GET /metrics          # Métriques Prometheus
GET /ping             # Test connectivité simple
GET /api/test/mailjet # Test configuration Mailjet
```

---

## 🏗 Structure Projet

```
notification-service/
├── services/               # Services notifications
│   ├── emailService.js     # Service Mailjet avec templates
│   └── smsService.js       # Service Free Mobile
├── utils/                  # Utilitaires
│   └── logger.js           # Logger RoadTrip! structuré
├── tests/                  # Tests complets
│   └── notification.test.js
├── routes.js              # Routes API centralisées + middleware
├── metrics.js             # Métriques Prometheus
├── index.js               # Point d'entrée + serveur Express
├── package.json           # Dépendances
├── Dockerfile             # Container
└── README.md              # Documentation
```

---

## 🔒 Sécurité

- Protection API-Key sur toutes les routes sensibles
- Validation stricte des emails et données reçues
- Limitation taille payload (1mb)
- Logs détaillés pour toute tentative non autorisée
- Alertes : Logs sécurisés (emails masqués ***)

---

## 📊 Monitoring & Logs

- Prometheus : métriques CPU, mémoire, temps de réponse, connexions actives, santé providers
- Winston : logs JSON (prod) ou colorés (dev) avec émojis par service
- Nettoyage auto des vieux fichiers logs
- Logs spécialisés : user, trip, payment, performance, sécurité, alertes système

---

## 🧪 Tests

```bash
npm test
```

- Tests unitaires et d’intégration (jest + supertest)
- Couverture : email, sms, contact, sécurité, métriques, alertes, sécurité, métriques
- Simulation providers si credentials absents

---

## 🐳 Docker

```bash
# Build
docker build -t notification-service .

# Run
docker run -p 5005:5005 --env-file .env notification-service
```

---

## 🐛 Troubleshooting

| Erreur                   | Cause probable                          | Solution                                      |
| ------------------------ | --------------------------------------- | --------------------------------------------- |
| `Mailjet non configuré`  | Variables manquantes                    | Vérifier `.env`                               |
| `403 Free Mobile`        | Service inactif ou mauvais identifiants | Activer SMS dans compte Free                  |
| `API key requise`        | Header absent ou invalide               | Ajouter `x-api-key`                           |
| Timeout envoi email      | Réseau ou provider lent                 | Augmenter timeout ou vérifier connexion       |
|  Alerte non reçue       | Config email manquante                  | Vérifier `ADMIN_EMAIL` + Mailjet              |
|  Spam email alerte      | Nouveau domaine                         | Normal – configurer SPF/DKIM en prod          |
|  Route `/api/alert` 404 | Route non ajoutée                       | Vérifier `routes.js` contient bien la route   |

---

## 👥 Contexte

**Projet M2** - Développement d'un microservice pour plateforme de roadtrip  
**Certification** : RNCP39583 - Expert en Développement Logiciel  
**Technologies** : Node.js, Express, Mailjet, Free Mobile, Prometheus, Docker
**Auteur** : Inès GERVAIS