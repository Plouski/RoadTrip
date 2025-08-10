# AI Service - Roadtrip Assistant

> Service IA pour génération d'itinéraires de voyage personnalisés

## Démarrage rapide

```bash
# Installation
npm install

# Variables d'environnement (créer .env)
SERVICE_NAME=ai-service
PORT=5003
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_FILE_LOGGING=true
OPENAI_API_KEY=your-key-here
JWT_SECRET=your-secret
DATA_SERVICE_URL=http://localhost:5002

# Lancement
npm run dev
```

## API Endpoints

### Authentification requise (Bearer token)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/ai/ask` | POST | Générer un itinéraire |
| `/api/ai/save` | POST | Sauvegarder message |
| `/api/ai/history` | GET | Historique conversations |
| `/api/ai/history` | DELETE | Supprimer tout l'historique |
| `/api/ai/conversation/:id` | GET | Récupérer une conversation |
| `/api/ai/conversation/:id` | DELETE | Supprimer une conversation |

### Monitoring

| Endpoint | Description |
|----------|-------------|
| `/health` | Status du service |
| `/metrics` | Métriques Prometheus |
| `/ping` | Test de réponse |

## Tests

```bash
# Lancer les tests
npm test

# Mode watch
npm run test:watch
```

## Architecture

```
ai-service/
├── config/          # Configuration JWT
├── controllers/     # Logique API
├── middlewares/     # Auth & validation
├── routes/          # Routes
├── services/        # Intégration OpenAI
├── test/            # Tests automatisés
├── utils/           # Helpers
```

## Stack technique

- **Node.js** + Express
- **OpenAI API** (GPT-4o-mini)
- **JWT** pour l'authentification
- **Prometheus** pour les métriques
- **Winston** pour les logs
- **Jest** pour les tests

## Monitoring

- **Métriques** : `http://localhost:5003/metrics`
- **Health check** : `http://localhost:5003/health`
- **Logs** : Fichiers dans `../logs/ai-service/`

## Sécurité

- Authentification JWT obligatoire
- Accès réservé aux utilisateurs premium
- Validation des entrées
- Rate limiting intégré