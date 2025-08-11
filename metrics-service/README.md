# Metrics Service - Monitoring & Observability

> Service de monitoring centralisé avec Prometheus, Grafana et Loki

## Démarrage rapide

```bash
# Installation
npm install

# Variables d'environnement (créer .env)
NODE_ENV=development
SERVICE_NAME=metrics-service
LOG_LEVEL=error
ENABLE_FILE_LOGGING=false
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://localhost:3100
PORT=5006
ENABLE_FILE_LOGGING=true
LOG_LEVEL=debug

# Lancement
npm run dev
```

## 📡 API Endpoints

### Monitoring & Dashboard

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/dashboard` | GET | Dashboard temps réel |
| `/api/services/status` | GET | Status de tous les services |
| `/` | GET | Page d'accueil avec endpoints |

### Infrastructure

| Endpoint | Description |
|----------|-------------|
| `/health` | Status du service |
| `/metrics` | Métriques Prometheus |
| `/vitals` | Informations système |
| `/ping` | Test de réponse |

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
- Dashboard automatisé RoadTrip
- Alertes configurées
- Accès : `http://localhost:3100`

### **Loki** (Logs centralisés)
- Collecte logs Winston de tous services
- Pipeline de parsing JSON
- Rétention 7 jours

## Métriques surveillées

### **Services**
- Status UP/DOWN
- Temps de réponse (95e percentile)
- Taux de requêtes/seconde
- Taux d'erreur par service

### **Business**
- Tentatives de connexion OAuth
- Notifications envoyées
- Transactions de paiement
- Requêtes IA traitées

### **Infrastructure**
- CPU et mémoire
- Connexions actives base de données
- Santé services externes

## Architecture

```
metrics-service/
├── src/
│   └── app.js          # API monitoring
├── prometheus/
│   └── prometheus.yml  # Config scraping
├── grafana/
│   ├── provisioning/   # Dashboard auto
│   └── dashboards/     # RoadTrip dashboard
├── loki/
│   ├── loki-config.yaml
│   └── promtail-config.yaml
└── test/               # Tests automatisés
```

## Stack technique

- **Node.js** + Express
- **Prometheus** pour métriques
- **Grafana** pour dashboards
- **Loki** + Promtail pour logs
- **prom-client** pour exposition métriques
- **Winston** pour logging
- **Jest** pour tests

## Dashboard Grafana

Le dashboard RoadTrip inclut :

### **Vue d'ensemble**
- Status de tous les microservices
- Métriques de performance globales
- Taux d'erreur par service

### **Services spécialisés**
- Auth Service : Tentatives de connexion
- AI Service : Requêtes IA traitées
- Payment Service : Transactions
- Notification Service : Messages envoyés

### **Infrastructure**
- Status base de données
- Connexions actives
- Santé services externes

## Configuration

### Prometheus targets

```yaml
scrape_configs:
  - job_name: 'ai-service'
    static_configs:
      - targets: ['ai-service:5003']
  - job_name: 'auth-service'
    static_configs:
      - targets: ['auth-service:5001']
```

### Grafana provisioning

```yaml
providers:
  - name: 'microservices'
    folder: 'Microservices'
    path: /etc/grafana/provisioning/dashboards
```

## 🚀 URLs importantes

- **Service** : `http://localhost:5006`
- **Prometheus** : `http://localhost:9090`
- **Grafana** : `http://localhost:3100`
- **Dashboard API** : `http://localhost:5006/api/dashboard`

## 🔍 Supervision

### Métriques clés
- `up` - Status des services
- `http_requests_total` - Nombre de requêtes
- `http_request_duration_seconds` - Temps de réponse
- `service_health_status` - Santé services

### Alertes configurées
- Service DOWN > 1 minute
- Taux d'erreur > 5%
- Temps de réponse > 2 secondes
- Espace disque < 10%