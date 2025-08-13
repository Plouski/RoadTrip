# 📧 Notification Service - ROADTRIP MVP

> **Microservice de Notifications Multi-Canal pour l'écosystème ROADTRIP**  
> _Projet M2 - MVP Microservices - Certification RNCP39583_

## 📋 Vue d'ensemble

Service Node.js gérant les **notifications emails et SMS** avec intégration Mailjet et Free Mobile, templates HTML personnalisés, sécurité API-Key et monitoring Prometheus.

### 🎯 Fonctionnalités MVP

- ✅ **Email Transactionnel** : Confirmation compte + réinitialisation mot de passe
- ✅ **SMS Free Mobile** : Codes de vérification par SMS
- ✅ **Templates HTML** : Emails branded ROADTRIP responsives
- ✅ **API Security** : Protection API-Key pour requêtes inter-services
- ✅ **Multi-Provider** : Mailjet (email) + Free Mobile (SMS)
- ✅ **Monitoring Intégré** : Métriques Prometheus + health checks
- ✅ **Fallback Mode** : Simulation si providers non configurés
- ✅ **Formulaire Contact** : Gestion emails support + confirmation utilisateur

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
PORT=5005
NODE_ENV=development
NOTIFICATION_API_KEY=your-secret-api-key-here
CORS_ORIGIN=http://localhost:3000

# Email Provider (Mailjet)
MAILJET_API_KEY=your-mailjet-api-key
MAILJET_API_SECRET=your-mailjet-secret-key
EMAIL_FROM_NAME=ROADTRIP
EMAIL_FROM_ADDRESS=noreply@roadtrip.fr

# SMS Provider (Free Mobile)
FREE_SMS_USER=your-free-mobile-username
FREE_SMS_PASS=your-free-mobile-api-key

# Contact Configuration
CONTACT_RECEIVE_EMAIL=contact@roadtrip.com

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

### 📧 Notifications Email

#### Email de Confirmation

```http
POST /api/email/confirm
Content-Type: application/json
x-api-key: your-secret-api-key

{
  "email": "user@example.com",
  "token": "abc123def456"
}
```

**Template Email Confirmation :**

- Design responsive avec couleurs ROADTRIP (#E30613)
- Bouton CTA pour confirmation de compte
- Lien de fallback en cas de problème avec le bouton
- Expiration automatique du token (24h)

#### Email de Réinitialisation

```http
POST /api/email/reset
Content-Type: application/json
x-api-key: your-secret-api-key

{
  "email": "user@example.com",
  "code": "123456"
}
```

**Template Email Reset :**

- Code à 6 chiffres stylisé et centré
- Police large avec espacement pour faciliter la lecture
- Couleurs branded ROADTRIP
- Expiration automatique du code (1h)

### 📮 Formulaire de Contact

#### Envoi Message Contact

```http
POST /api/contact/send
Content-Type: application/json
x-api-key: your-secret-api-key

{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "subject": "Demande d'information",
  "category": "info",
  "message": "Votre message ici...",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "userAgent": "Mozilla/5.0...",
  "source": "contact-form"
}
```

**Catégories disponibles :**

- `problem` : Problème technique (🐛, priorité haute)
- `info` : Demande d'information (ℹ️, priorité normale)
- `suggestion` : Suggestion d'amélioration (⭐, priorité basse)
- `feedback` : Retour d'expérience (💚, priorité normale)
- `other` : Autre (💬, priorité normale)

**Réponse immédiate :**

```json
{
  "success": true,
  "message": "Votre message a été reçu et est en cours de traitement...",
  "messageId": "contact-1642248600000-abc123",
  "duration": "45ms",
  "status": "processing"
}
```

**Processus asynchrone :**

1. Email envoyé à l'équipe support (`CONTACT_RECEIVE_EMAIL`)
2. Email de confirmation envoyé à l'utilisateur
3. Logs détaillés pour suivi et debugging

### 📱 Notifications SMS

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

### 🔧 Système & Monitoring

```http
GET /health          # État du service + providers
GET /vitals          # Statistiques système détaillées
GET /metrics         # Métriques Prometheus
GET /ping            # Test connectivité simple
GET /api/test/mailjet # Test configuration Mailjet
```

---

## 🏗️ Architecture

### Structure Projet

```
notification-service/
├── services/               # Services notifications
│   ├── emailService.js     # Service Mailjet avec templates
│   └── smsService.js       # Service Free Mobile
├── utils/                  # Utilitaires
│   └── logger.js           # Logger ROADTRIP structuré
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

## 🔒 Sécurité & Authentification

### API Key Protection

```javascript
// Middleware sécurité inter-services
const requireApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.NOTIFICATION_API_KEY) {
    logger.warn("❌ Tentative d'accès sans API key valide", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      providedKey: apiKey ? "present" : "missing",
    });
    return res.status(403).json({ error: "API key requise" });
  }
  next();
};
```

### Validation Robuste

```javascript
// Validation email stricte
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Validation les données avant envoi
validateContactForm(formData: ContactFormData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!formData.name || formData.name.trim().length < 2) {
      errors.push("Le nom doit contenir au moins 2 caractères");
    }

    if (!formData.email || !this.isValidEmail(formData.email)) {
      errors.push("Veuillez entrer une adresse email valide");
    }

    if (!formData.subject || formData.subject.trim().length < 5) {
      errors.push("Le sujet doit contenir au moins 5 caractères");
    }

    if (!formData.message || formData.message.trim().length < 10) {
      errors.push("Le message doit contenir au moins 10 caractères");
    }

    // Validation anti-spam basique
    if (formData.message.includes('http://') || formData.message.includes('https://')) {
      if (formData.message.split('http').length > 3) {
        errors.push("Trop de liens dans le message");
      }
    }

    // Vérification de longueur maximale
    if (formData.message.length > 2000) {
      errors.push("Le message est trop long (maximum 2000 caractères)");
    }

    if (formData.subject.length > 200) {
      errors.push("Le sujet est trop long (maximum 200 caractères)");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
```

### Configuration Providers Sécurisée

```javascript
// Email Service - Mailjet avec pool de connexions
const transportConfig = {
  auth: {
    apiKey: process.env.MAILJET_API_KEY,
    apiSecret: process.env.MAILJET_API_SECRET,
  },
  pool: false,
  maxConnections: 1,
  maxMessages: 1,
  rateLimit: 1000,
};

// Timeout de sécurité pour tous les envois
const withTimeout = (promise, timeoutMs = 30000, operation = "operation") => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        logger.error(`⏰ Timeout ${operation} après ${timeoutMs}ms`);
        reject(new Error(`Timeout ${operation} après ${timeoutMs}ms`));
      }, timeoutMs);

      promise.finally(() => clearTimeout(timeoutId));
    }),
  ]);
};
```

### Templates Sécurisés

```javascript
// Prévention XSS dans templates
const createConfirmationEmail = (token) => {
  const link = `${process.env.FRONTEND_URL}/confirm-account?token=${token}`;

  return {
    subject: "Confirmez votre compte - RoadTrip!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #E30613;">Bienvenue sur RoadTrip!</h1>
        <p>Cliquez sur le lien ci-dessous pour confirmer votre compte :</p>
        <a href="${link}" style="background: #E30613; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Confirmer mon compte
        </a>
        <p style="margin-top: 20px; font-size: 14px; color: #666;">
          Si le bouton ne fonctionne pas, copiez ce lien : ${link}
        </p>
        <p style="margin-top: 20px; font-size: 12px; color: #999;">
          Ce lien expire dans 24 heures.
        </p>
      </div>
    `,
  };
};
```

---

## 📊 Monitoring & Métriques

### Health Checks Avancés

```bash
# Test général
curl http://localhost:5005/health
# {
#   "status": "healthy",
#   "service": "notification-service",
#   "timestamp": "2024-01-15T10:30:00.000Z",
#   "uptime": 3600
# }

# Test Mailjet spécifique
curl -H "x-api-key: your-key" http://localhost:5005/api/test/mailjet
# {
#   "success": true,
#   "message": "Configuration Mailjet OK",
#   "duration": "52ms",
#   "details": {...}
# }
```

### Logs Structurés & Traçabilité

```javascript
// Log email avec ID opération
logger.info("🎉 Email envoyé avec succès", {
  operationId: "email-1642248600-abc123",
  type: "email",
  action: "confirmation",
  to: "user@example.com",
  messageId: "msg-12345",
  duration: "1250ms",
  provider: "mailjet",
  accepted: 1,
  rejected: 0,
});

// Log contact avec catégorisation
logger.info("📧 Nouvelle demande de contact", {
  type: "contact",
  email: "user@example.com",
  category: "info",
  subject: "Demande d'information sur...",
  messageId: "contact-1642248600-def456",
});

// Log erreur avec contexte
logger.error("❌ Erreur envoi email", {
  operationId: "email-1642248600-xyz789",
  to: "user@example.com",
  error: "Connection timeout",
  duration: "30000ms",
  isTimeout: true,
  provider: "mailjet",
});
```

---

## 🧪 Tests & Qualité

### Coverage Détaillé MVP

```bash
npm test
# 📧 Notification Service - Tests Complets
#
# ✅ Tests de Santé du Service (4/4)
# ✅ Tests d'Authentification API (3/3)
# ✅ Tests Email de Confirmation (4/4)
# ✅ Tests Email de Réinitialisation (3/3)
# ✅ Tests SMS de Réinitialisation (3/3)
# ✅ Tests Formulaire de Contact (8/8)
# ✅ Tests Mailjet (2/2)
# ✅ Tests de Validation (3/3)
# ✅ Tests de Gestion d'Erreurs (3/3)
# ✅ Tests de Performance (2/2)
# ✅ Tests d'Intégration (2/2)
# ✅ Tests Utilitaires (2/2)

```

### Tests Critiques Implémentés

#### 🔐 Sécurité

```javascript
describe("🔐 Tests d'Authentification API", () => {
  test("❌ Accès refusé sans API key", async () => {
    const res = await request(app)
      .post("/api/email/confirm")
      .send({ email: "test@example.com", token: "tok-123" });
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe("API key requise");
  });
});
```

#### 📧 Fonctionnalités Email

```javascript
describe("📧 Tests Email de Confirmation", () => {
  test("✅ Envoi email confirmation réussi", async () => {
    const res = await request(app)
      .post("/api/email/confirm")
      .set("x-api-key", "test-valid-key")
      .send({ email: "test@example.com", token: "tok-123" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: "Email de confirmation envoyé",
    });
  });
});
```

#### 📮 Contact Form

```javascript
describe("📮 Tests Formulaire de Contact", () => {
  const validContactData = {
    name: "John Doe",
    email: "john.doe@example.com",
    subject: "Test de contact",
    category: "info",
    message: "Ceci est un message de test pour le formulaire de contact.",
  };

  test("✅ Envoi message contact réussi", async () => {
    const res = await request(app)
      .post("/api/contact/send")
      .set("x-api-key", "test-valid-key")
      .send(validContactData);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: expect.stringContaining("reçu et est en cours de traitement"),
      messageId: expect.stringMatching(/^contact-\d+-[a-z0-9]+$/),
      duration: expect.stringMatching(/^\d+ms$/),
      status: "processing",
    });
  });
});
```

---

## 🐳 Déploiement Docker

### Dockerfile Optimisé

```dockerfile
FROM node:20-alpine
WORKDIR /app

# Installation dépendances
COPY package*.json ./
RUN npm install -g nodemon && npm install

# Code source
COPY . .

# Ports
EXPOSE 5005 9005

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD npm run health || exit 1

# Démarrage
CMD ["npm", "run", "dev"]
```

---

## 🐛 Troubleshooting

### Erreurs Configuration

```bash
# Mailjet non configuré
Warning: ❌ Mailjet non configuré - les emails seront simulés
# Solution: Définir MAILJET_API_KEY + MAILJET_API_SECRET dans .env

# Free Mobile échec SMS
Error: API Free Mobile retourne: 403
# Solution:
# 1. Vérifier FREE_SMS_USER + FREE_SMS_PASS
# 2. Activer service SMS dans espace Free Mobile
# 3. Vérifier quota SMS non dépassé

# API Key manquante
Error: API key requise
# Solution: Ajouter header x-api-key avec NOTIFICATION_API_KEY

# Template email cassé
Error: Template rendering failed
# Solution: Vérifier FRONTEND_URL pour liens de confirmation
```

### Erreurs Runtime

```bash
# Timeout Mailjet
Error: Timeout envoi email après 30000ms
# Solutions:
# 1. Vérifier connectivité réseau
# 2. Augmenter timeout dans emailService.js
# 3. Vérifier status Mailjet (status.mailjet.com)

# Contact form validation
Error: Données invalides - Le nom doit contenir au moins 2 caractères
# Solution: Vérifier format des données avant envoi

# Memory leak détecté
Warning: Possible EventEmitter memory leak detected
# Solution: Vérifier cleanup des listeners dans tests
```

---

## 👥 Contexte Projet & Équipe

**Projet M2** - Développement d'un MVP microservices pour plateforme de roadtrip  
**Certification** : RNCP39583 - Expert en Développement Logiciel  
**Technologies** : Node.js, Mailjet, Free Mobile, Nodemailer, Express, Prometheus  
**Auteur** : Inès GERVAIS