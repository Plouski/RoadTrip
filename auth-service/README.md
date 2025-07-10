# Auth Service OAuth

🎓 **Projet conforme RNCP39583 "Expert en développement logiciel"**

## 🚀 Démarrage rapide

```bash
# Installation
npm install

# Configuration
cp .env.example .env
# Remplir les variables OAuth dans .env

# Démarrage
npm run dev

# Tests
npm test
```

## 🔧 Configuration OAuth

### Google OAuth
1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Créer OAuth 2.0 Client ID
3. Redirect URI: `http://localhost:5001/auth/oauth/google/callback`

### Facebook OAuth  
1. [Facebook Developers](https://developers.facebook.com/) → Créer une app
2. Facebook Login → Paramètres
3. Valid OAuth Redirect URIs: `http://localhost:5001/auth/oauth/facebook/callback`

## 📊 Endpoints MVP

| Endpoint | Description |
|----------|-------------|
| `GET /auth/oauth/google` | Connexion Google |
| `GET /auth/oauth/facebook` | Connexion Facebook |
| `GET /health` | Status + métriques |
| `GET /docs` | Documentation API |
| `GET /metrics` | Monitoring détaillé |

## 🛡️ Sécurité OWASP

- ✅ **A01** - Rate limiting (100 req/15min)
- ✅ **A02** - JWT sécurisé + HTTPS
- ✅ **A03** - Validation des entrées
- ✅ **A05** - Headers sécurisés (Helmet)
- ✅ **A07** - OAuth 2.0 + OpenID Connect
- ✅ **A09** - Logging sécuritaire

## 🧪 Tests (Bloc 2 RNCP)

```bash
npm test
```

Couvre :
- Health checks
- OAuth redirections  
- JWT génération/validation
- API endpoints

## 📈 Monitoring (Bloc 4 RNCP)

**Métriques surveillées :**
- Nombre de requêtes
- Taux d'erreur
- Succès/échecs OAuth
- Performance

**Alertes :** Taux d'erreur > 5%, problèmes OAuth

## 🏗️ Architecture

```
Frontend → Auth Service → OAuth Providers (Google/Facebook)
              ↓
           MongoDB (Users)
```

**Technologies :**
- Node.js + Express
- Passport.js (OAuth)
- JWT (tokens)
- MongoDB (stockage)
- Helmet + Rate limiting (sécurité)

## 🎯 Conformité RNCP39583

| Bloc | Critère | Implementation |
|------|---------|----------------|
| **Bloc 1** | Cadrage projet | Architecture OAuth documentée |
| **Bloc 2** | Développement sécurisé | OWASP + Tests unitaires |
| **Bloc 3** | Pilotage | Health checks + Métriques |
| **Bloc 4** | Maintenance | Monitoring + Supervision |

## 🔄 Déploiement

```bash
# Production
NODE_ENV=production npm start

# Docker
docker build -t auth-service .
docker run -p 5001:5001 --env-file .env auth-service
```

## 📝 Cahier de recettes

✅ Connexion Google OAuth fonctionnelle  
✅ Connexion Facebook OAuth fonctionnelle  
✅ Génération JWT sécurisée  
✅ Rate limiting actif  
✅ Headers de sécurité présents  
✅ Monitoring temps réel  
✅ Tests unitaires passent  
✅ Documentation complète  