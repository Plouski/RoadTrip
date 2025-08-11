# RoadTrip! - Architecture Microservices

## Vue d'ensemble

RoadTrip! est une application de planification de voyages construite avec une architecture microservices moderne. Chaque service a une responsabilité spécifique et communique via des APIs REST sécurisées.

## Services

### **Auth Service** (Port: 5001)
**Responsabilité**: Authentification et autorisation
- Inscription/Connexion utilisateurs
- OAuth (Google, Facebook)
- Gestion des tokens JWT
- Vérification des sessions

**Technologies**: Node.js, Express, MongoDB, Passport.js

### **Data Service** (Port: 5002)
**Responsabilité**: Gestion des données métier
- CRUD utilisateurs et voyages
- Gestion des itinéraires
- Stockage des préférences
- API centrale des données

**Technologies**: Node.js, Express, MongoDB, Mongoose

### **AI Service** (Port: 5003)
**Responsabilité**: Intelligence artificielle
- Recommandations de voyages
- Optimisation d'itinéraires
- Suggestions personnalisées
- Intégration OpenAI

**Technologies**: Node.js, Express, OpenAI API

### **Payment Service** (Port: 5004)
**Responsabilité**: Gestion des paiements et abonnements
- Abonnements premium (mensuel/annuel)
- Intégration Stripe
- Gestion des remboursements
- Webhooks de paiement

**Technologies**: Node.js, Express, Stripe, MongoDB

### **Notification Service** (Port: 5005)
**Responsabilité**: Communications
- Emails transactionnels
- SMS (FreeMobile)
- Notifications push
- Templates d'emails

**Technologies**: Node.js, Express, Mailjet, FreeMobile API

### **Frontend Service** (Port: 3000)
**Responsabilité**: Interface utilisateur
- Application React/Next.js
- Interface utilisateur responsive
- Dashboard admin
- PWA (Progressive Web App)

**Technologies**: React, Next.js, TailwindCSS

### **Metrics Service** (Port: 5006)
**Responsabilité**: Monitoring et métriques
- Collecte des métriques
- Dashboards de monitoring
- Alertes système
- Interface Grafana

**Technologies**: Node.js, Express, Prometheus, Grafana, Loki

## Base de données

### MongoDB (Port: 27017)
- **Collections principales**:
  - `users` - Données utilisateurs
  - `trips` - Voyages et itinéraires
  - `subscriptions` - Abonnements premium
  - `aimessages` - Historique des messages avec l'intelligence artificielle
  - `favorites` - Roadtrips favoris enregistrés


## Communication inter-services

### Authentification
- **JWT Tokens** pour l'authentification
- **API Keys** pour les communications service-to-service
- **Middleware de sécurité** sur chaque service

### Patterns utilisés
- **Database per Service**
- **Event-driven** (webhooks Stripe)
- **Circuit Breaker** (gestion des pannes)

## Déploiement

### Développement local
```bash
# Cloner le repo
git clone <repo-url>
cd roadtrip

# Configurer l'environnement
cp .env.example .env
# Modifier les variables d'environnement

# Démarrer tous les services
docker-compose up -d

# Vérifier le statut
docker-compose ps
```

### Services disponibles après démarrage
- 🌐 Frontend: http://localhost:3000
- 🔐 Auth: http://localhost:5001
- 💾 Data: http://localhost:5002
- 🤖 AI: http://localhost:5003
- 💳 Payment: http://localhost:5004
- 📧 Notification: http://localhost:5005
- 📊 Metrics: http://localhost:5006
- 📈 Grafana: http://localhost:3100
- 📊 Prometheus: http://localhost:9090

## Monitoring

### Métriques collectées
- **Performance**: Temps de réponse, throughput
- **Errors**: Taux d'erreur par service
- **Business**: Conversions, abonnements
- **Infrastructure**: CPU, RAM, réseau

### Dashboards Grafana
- **Services Overview**: Vue globale des services
- **Payment Analytics**: Métriques de paiement
- **User Journey**: Parcours utilisateur
- **System Health**: Santé de l'infrastructure

## Sécurité

### Mesures implémentées
- **HTTPS** en production
- **JWT** pour l'authentification
- **Rate limiting** sur les APIs
- **Input validation** sur tous les endpoints
- **CORS** configuré strictement
- **Helmet.js** pour la sécurité Express

### Variables sensibles
Toutes les clés API et secrets sont stockés dans des variables d'environnement:
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `OPENAI_API_KEY`
- `MAILJET_API_KEY`
- `FREE_MOBILE_API_KEY`


## Tests

### Par service
```bash
cd [service-name]
npm test
```

## Métriques de performance

### Objectifs SLA
- **Disponibilité**: 99.9%
- **Temps de réponse**: < 500ms (95e percentile)
- **Throughput**: > 1000 req/min par service
- **Recovery Time**: < 5 minutes

### Monitoring automatique
- **Health checks** toutes les 30s
- **Alertes** Slack en cas de problème
- **Logs** centralisés avec Loki
- **Métriques** Prometheus + Grafana

## Maintenance

### Sauvegarde
```bash
# Sauvegarde MongoDB
node scripts/backup.js full

# Vérifier les sauvegardes
node scripts/backup.js list
```

## Contribution

1. **Fork** le projet
2. **Créer** une branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. **Commit** (`git commit -m 'Ajouter nouvelle fonctionnalité'`)
4. **Push** (`git push origin feature/nouvelle-fonctionnalite`)
5. **Pull Request**

## Support

- **Issues**: GitHub Issues
- **Monitoring**: Grafana dashboards
- **Logs**: Loki + Grafana