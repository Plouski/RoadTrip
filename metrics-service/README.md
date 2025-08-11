# Metrics Service - Monitoring & Observability

> Service de monitoring centralisé pour l’application **RoadTrip!**, utilisant **Prometheus**, **Grafana** et **Loki** pour les métriques, dashboards et logs.

---

## Démarrage rapide

```bash
# Installation des dépendances
npm install

# Variables d'environnement (.env)
NODE_ENV=development
SERVICE_NAME=metrics-service
LOG_LEVEL=debug
ENABLE_FILE_LOGGING=true
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://localhost:3100
PORT=5006
METRICS_PORT=9006

# Lancement en développement
npm run dev

# Lancement en production
npm start

```

## 📡 API Endpoints

### Monitoring & Dashboard

| Endpoint               | Méthode | Description                                      |
| ---------------------- | ------- | ------------------------------------------------ |
| `/api/dashboard`       | GET     | Dashboard temps réel (données depuis Prometheus) |
| `/api/services/status` | GET     | Statut UP/DOWN de tous les services              |
| `/`                    | GET     | Page d'accueil avec liste des endpoints          |

### Infrastructure

| Endpoint   | Description                               |
| ---------- | ----------------------------------------- |
| `/health`  | Statut du service                         |
| `/metrics` | Métriques Prometheus (scrape)             |
| `/vitals`  | Informations système & connexions actives |
| `/ping`    | Test de réponse rapide                    |

## Tests

```bash
# Lancer les tests
npm test

# Mode watch
npm run test:watch
```

## Stack de monitoring

### **Prometheus** (Métriques)
- Collecte des métriques de tous les microservices
- Rétention 15 jours
- Scraping toutes les 15 secondes

### **Grafana** (Visualisation)
- Dashboard automatisé "RoadTrip!"
- Alertes configurées pour services & performances
- Accès : `http://localhost:3100`

### **Loki** (Logs centralisés)
- Collecte logs Winston de tous les services
- Pipeline de parsing JSON
- Rétention 7 jours

## Métriques exposées

| Nom                             | Type      | Description                                      |
| ------------------------------- | --------- | ------------------------------------------------ |
| `http_request_duration_seconds` | Histogram | Durée des requêtes HTTP par route/méthode/status |
| `http_requests_total`           | Counter   | Nombre total de requêtes HTTP                    |
| `prometheus_connections_active` | Gauge     | Connexions actives à Prometheus                  |
| `monitored_services_status`     | Gauge     | Statut des services (UP/DOWN)                    |

## Architecture

```
metrics-service/
├── src/
│   ├── server.js         # Démarrage et graceful shutdown
│   ├── app.js            # Configuration de l'app Express
│   ├── config.js         # Variables d'environnement & constantes
│   ├── metrics.js        # Définition des métriques Prometheus
│   ├── routes/           # Endpoints API
│   ├── middlewares/      # Middlewares (logs, métriques, erreurs)
│   └── ...
├── prometheus/           # Config scraping
│   └── prometheus.yml
├── grafana/              # Config dashboards
│   ├── provisioning/
│   └── dashboards/
├── loki/                 # Config logs centralisés
│   ├── loki-config.yaml
│   └── promtail-config.yaml
└── test/                 # Tests automatisés
```

## Dashboard Grafana

Le dashboard **RoadTrip!** inclut :

### Vue d'ensemble
- Statut UP/DOWN de tous les microservices
- Taux de requêtes/sec
- Temps de réponse moyen & 95e percentile
- Taux d'erreur par service

### Services spécifiques
- **Auth Service** : Tentatives de connexion OAuth
- **AI Service** : Requêtes IA traitées
- **Payment Service** : Transactions effectuées
- **Notification Service** : Messages envoyés

### Infrastructure
- Utilisation CPU & mémoire
- Connexions actives base de données
- Santé des services externes

---

## Configuration Prometheus

Exemple de targets :
```yaml
scrape_configs:
  - job_name: 'ai-service'
    static_configs:
      - targets: ['ai-service:5003']
  - job_name: 'auth-service'
    static_configs:
      - targets: ['auth-service:5001']