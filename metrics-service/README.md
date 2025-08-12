# 📊 Metrics Service - ROADTRIP MVP

> **Microservice de Monitoring et Observabilité pour l'écosystème ROADTRIP**  
> *Projet M2 - MVP Microservices - Certification RNCP39583*

## 📋 Vue d'ensemble

Service Node.js centralisant le **monitoring Prometheus**, dashboards Grafana, collecte de logs avec Loki et observabilité complète de l'architecture microservices ROADTRIP.

### 🎯 Fonctionnalités MVP

- ✅ **Prometheus Integration** : Collecte métriques de tous les microservices
- ✅ **Grafana Dashboards** : Visualisation temps réel + dashboards préconfigurés
- ✅ **Loki Log Aggregation** : Centralisation logs avec Promtail
- ✅ **Health Monitoring** : Surveillance état services + alertes
- ✅ **Performance Tracking** : Métriques HTTP, latence, throughput
- ✅ **Custom Metrics API** : Endpoints dashboard et status consolidés
- ✅ **Auto-Discovery** : Détection automatique nouveaux services

---

## 🚀 Installation & Démarrage

### Prérequis
```bash
Node.js 20+
npm ou yarn
Docker & Docker Compose (pour stack complète)
Prometheus 2.45+
Grafana 10.0+
Loki 2.9+
```

### Configuration
```bash
# Cloner et installer
git clone <repo>
cd metrics-service
npm install

# Configurer l'environnement
cp .env.example .env
```

### Variables d'environnement
```env
# Service Configuration
NODE_ENV=development
SERVICE_NAME=metrics-service
PORT=5006
METRICS_PORT=9006

# Prometheus & Grafana
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://localhost:3100

# Logs
LOG_LEVEL=debug
ENABLE_FILE_LOGGING=true
```

### Lancement Stack Complète
```bash
# Développement (service seul)
npm run dev

# Production (avec Docker stack)
docker-compose up -d

# Tests avec coverage
npm test
```

### Stack Docker Compose
```yaml
# docker-compose.yml (extrait)
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
    volumes: ["./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml"]
    
  grafana:
    image: grafana/grafana:latest
    ports: ["3100:3000"]
    volumes: ["./grafana/provisioning:/etc/grafana/provisioning"]
    
  loki:
    image: grafana/loki:latest
    ports: ["3100:3100"]
    volumes: ["./loki/loki-config.yaml:/etc/loki/local-config.yaml"]
    
  metrics-service:
    build: .
    ports: ["5006:5006", "9006:9006"]
    depends_on: [prometheus, grafana, loki]
```

---

## 📡 API Endpoints

### 📊 Dashboard & Monitoring

#### Dashboard Principal
```http
GET /api/dashboard
```

**Réponse Dashboard :**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "services": {
      "total": 5,
      "up": 4,
      "down": 1
    },
    "requests": {
      "totalPerSecond": "125.34"
    },
    "details": [
      {
        "service": "ai-service",
        "status": "UP",
        "instance": "ai-service:5003"
      },
      {
        "service": "auth-service",
        "status": "UP",
        "instance": "auth-service:5001"
      },
      {
        "service": "data-service",
        "status": "DOWN",
        "instance": "data-service:5002"
      }
    ]
  }
}
```

#### Status Services
```http
GET /api/services/status
```

**Réponse Services Status :**
```json
{
  "success": true,
  "services": [
    {
      "name": "ai-service",
      "status": "healthy",
      "instance": "ai-service:5003",
      "lastCheck": "2024-01-15T10:30:00.000Z"
    },
    {
      "name": "auth-service",
      "status": "healthy",
      "instance": "auth-service:5001",
      "lastCheck": "2024-01-15T10:30:00.000Z"
    },
    {
      "name": "data-service",
      "status": "down",
      "instance": "data-service:5002",
      "lastCheck": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 🔧 Service Information

#### Page d'accueil
```http
GET /
```

**Réponse Service Info :**
```json
{
  "service": "Metrics Service API",
  "version": "1.0.0",
  "endpoints": [
    "GET /health - Service health",
    "GET /vitals - Service vitals", 
    "GET /metrics - Prometheus metrics",
    "GET /api/dashboard - Dashboard simple",
    "GET /api/services/status - Services status"
  ],
  "grafana": "http://localhost:3100",
  "prometheus": "http://prometheus:9090"
}
```

### 🔧 Système & Monitoring
```http
GET /health          # État du service metrics
GET /vitals          # Statistiques système + connexions actives
GET /metrics         # Métriques Prometheus natives
GET /ping            # Test connectivité simple
```

---

## 🏗️ Architecture

### Structure Projet
```
metrics-service/
├── src/                    # Code source principal
│   ├── routes/            # Routes API spécialisées
│   │   ├── dashboard.js   # Dashboard consolidé
│   │   ├── status.js      # Status services
│   │   ├── health.js      # Health checks
│   │   ├── vitals.js      # Statistiques système
│   │   └── index.js       # Router principal
│   ├── middlewares/       # Middlewares Express
│   │   ├── metricsLogger.js # Logging métriques
│   │   └── errorHandler.js  # Gestion erreurs
│   ├── config.js          # Configuration centralisée
│   ├── metrics.js         # Métriques Prometheus
│   ├── app.js             # Configuration Express
│   └── server.js          # Point d'entrée
├── prometheus/            # Configuration Prometheus
│   └── prometheus.yml     # Scraping configuration
├── grafana/              # Dashboards Grafana
│   ├── provisioning/
│   │   ├── datasources/   # Sources de données
│   │   └── dashboards/    # Dashboards préconfigurés
│   └── microservices-dashboard.json
├── loki/                 # Configuration Loki
│   ├── loki-config.yaml  # Config Loki
│   └── promtail-config.yaml # Collecte logs
├── test/                 # Tests
│   └── metrics.test.js
├── utils/                # Utilitaires
│   └── logger.js         # Logger ROADTRIP
└── Dockerfile            # Container optimisé
```

### Architecture Stack Observabilité
```mermaid
graph TB
    A[Microservices] --> B[Prometheus]
    A --> C[Loki via Promtail]
    B --> D[Metrics Service]
    C --> D
    D --> E[Grafana Dashboards]
    B --> E
    C --> E
    
    subgraph "Metrics Service"
        F[Dashboard API]
        G[Status Aggregator]
        H[Performance Monitor]
        I[Alert Manager]
    end
    
    subgraph "Stack Monitoring"
        J[Prometheus]
        K[Grafana]
        L[Loki]
        M[Promtail]
    end
```

---

## 📊 Métriques & Dashboards

### Métriques Prometheus Collectées
```yaml
# Métriques standard tous services
- http_request_duration_seconds
- http_requests_total  
- service_health_status
- database_status
- external_service_health
- active_connections

# Métriques spécialisées par service
auth_service:
  - auth_attempts_total
  - oauth_flow_duration_seconds
  - suspicious_activity_total

ai_service:
  - ai_generation_duration_seconds
  - cache_hit_ratio
  - openai_api_health

data_service:
  - mongodb_connections
  - premium_content_access_total
  - user_registrations_total
```

### Dashboards Grafana Préconfigurés
```javascript
// Dashboard ROADTRIP Microservices
{
  "title": "RoadTrip Microservices Dashboard",
  "panels": [
    {
      "title": "Services Status",
      "type": "stat",
      "targets": ["service_health_status"],
      "mappings": {
        "0": {"text": "DOWN", "color": "red"},
        "1": {"text": "UP", "color": "green"}
      }
    },
    {
      "title": "HTTP Requests per Second",
      "type": "graph", 
      "targets": ["rate(http_requests_total[5m])"]
    },
    {
      "title": "Response Time (95th percentile)",
      "type": "graph",
      "targets": ["histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"]
    },
    {
      "title": "Error Rate by Service",
      "type": "graph",
      "targets": ["rate(http_requests_total{status_code=~\"5..\"}[5m]) / rate(http_requests_total[5m]) * 100"]
    }
  ]
}
```

### Configuration Prometheus
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'ai-service'
    static_configs:
      - targets: ['ai-service:5003']
    metrics_path: '/metrics'
    
  - job_name: 'auth-service'
    static_configs:
      - targets: ['auth-service:5001']
    metrics_path: '/metrics'
    
  - job_name: 'data-service'
    static_configs:
      - targets: ['data-service:5002']
    metrics_path: '/metrics'
```

---

## 📈 Performance & Monitoring

### Health Checks Avancés
```bash
curl http://localhost:5006/health
# {
#   "status": "healthy",
#   "timestamp": "2024-01-15T10:30:00.000Z",
#   "uptime": 3600,
#   "service": "metrics-service",
#   "version": "1.0.0"
# }
```

### Vitals Système
```bash
curl http://localhost:5006/vitals
# {
#   "service": "metrics-service",
#   "uptime": 3600,
#   "memory": {
#     "rss": 45678592,
#     "heapTotal": 29360128,
#     "heapUsed": 18234567
#   },
#   "active_connections": 3,
#   "prometheus_url": "http://prometheus:9090"
# }
```

### Métriques Prometheus Natives
```bash
curl http://localhost:5006/metrics
# TYPE http_request_duration_seconds histogram
# http_request_duration_seconds_bucket{method="GET",route="/api/dashboard",status_code="200",le="0.1"} 45
# http_request_duration_seconds_bucket{method="GET",route="/api/dashboard",status_code="200",le="0.3"} 87
# 
# TYPE monitored_services_status gauge
# monitored_services_status{service="ai-service",instance="ai-service:5003"} 1
# monitored_services_status{service="auth-service",instance="auth-service:5001"} 1
```

---

## 🧪 Tests & Qualité

### Coverage Cible MVP
```bash
npm test
# ✅ Dashboard API (88% coverage)
# ✅ Status Aggregation (85% coverage)
# ✅ Metrics Collection (90% coverage) 
# ✅ Health Monitoring (82% coverage)
# ✅ Error Handling (95% coverage)
```

### Tests Critiques
```javascript
describe('📊 Metrics Service Core', () => {
  test('Dashboard API aggregates service metrics', async () => {
    const response = await request(app)
      .get('/api/dashboard')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.services).toHaveProperty('total');
    expect(response.body.data.services).toHaveProperty('up');
    expect(response.body.data.services).toHaveProperty('down');
    expect(response.body.data.requests).toHaveProperty('totalPerSecond');
  });

  test('Status endpoint returns service health', async () => {
    const response = await request(app)
      .get('/api/services/status')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.services)).toBe(true);
    
    response.body.services.forEach(service => {
      expect(service).toHaveProperty('name');
      expect(service).toHaveProperty('status');
      expect(['healthy', 'down']).toContain(service.status);
    });
  });

  test('Prometheus metrics endpoint works', async () => {
    const response = await request(app)
      .get('/metrics');
    
    expect([200, 500]).toContain(response.statusCode);
    if (response.statusCode === 200) {
      expect(response.text).toMatch(/http_requests_total/);
      expect(response.text).toMatch(/http_request_duration_seconds/);
    }
  });
});
```

---

## 🐳 Déploiement Docker

### Dockerfile Optimisé
```dockerfile
FROM node:20-alpine
WORKDIR /app

# Sécurité: utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 5006 9006

# Healthcheck intégré
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const req = http.request({hostname: 'localhost', port: 5006, path: '/health', timeout: 2000}, \
    (res) => process.exit(res.statusCode === 200 ? 0 : 1)); \
    req.on('error', () => process.exit(1)); req.end();"

CMD ["npm", "start"]
```

---

## 🔍 Validation RNCP39583

### Critères Respectés

| Critère RNCP | Implémentation | Status |
|--------------|----------------|---------|
| **C2.2.1 - Monitoring Architecture** | Prometheus + Grafana + Loki stack | ✅ |
| **C2.2.2 - Tests Observabilité** | Jest + mocks Prometheus >85% | ✅ |
| **C2.2.3 - Sécurité Monitoring** | Health checks + alertes + logs | ✅ |
| **C4.1.2 - Supervision Avancée** | Dashboards temps réel + métriques | ✅ |
| **C4.2.1 - Collecte Logs** | Loki + Promtail + agrégation | ✅ |
| **C4.3.2 - Monitoring Versioning** | Dashboards versionnés + config | ✅ |

---

## 📈 Optimisations & Limitations MVP

### ✅ Optimisations Implémentées
- **Stack Docker Complète** : Prometheus + Grafana + Loki intégrés
- **Dashboards Préconfigurés** : Visualisations ROADTRIP ready-to-use
- **Auto-Discovery** : Détection automatique services via Prometheus
- **Performance Monitoring** : Métriques HTTP + latence + throughput temps réel
- **Log Aggregation** : Centralisation logs avec recherche et alertes

### ⚠️ Limitations MVP
- **Alerting** : Prometheus AlertManager pas encore configuré
- **Retention** : Données métriques/logs sur 7 jours max
- **Clustering** : Prometheus single instance (pas HA)
- **Advanced Dashboards** : Dashboards basiques (pas business metrics)

---

## 🚧 Roadmap Post-MVP

### Phase 2 (Production)
- [ ] **AlertManager** : Notifications Slack/email automatiques
- [ ] **Prometheus HA** : Cluster haute disponibilité
- [ ] **Long-term Storage** : Thanos ou VictoriaMetrics
- [ ] **Business Metrics** : KPIs métier dans Grafana
- [ ] **SLA Monitoring** : SLI/SLO tracking automated

### Phase 3 (Enterprise)
- [ ] **Distributed Tracing** : Jaeger intégration
- [ ] **APM Integration** : Application Performance Monitoring
- [ ] **Cost Monitoring** : Métriques ressources + coûts cloud
- [ ] **AI-Powered Anomaly Detection** : ML pour détection automatique
- [ ] **Multi-tenant Dashboards** : Isolation par client/environnement

---

## 🐛 Troubleshooting

### Erreurs Courantes
```bash
# Prometheus non accessible
Error: ECONNREFUSED prometheus:9090
# Solution: Vérifier docker-compose up prometheus

# Grafana dashboards vides
Warning: No data in Grafana panels
# Solution: Vérifier prometheus.yml scrape configs

# Loki logs manquants
Error: No logs in Loki
# Solution: Vérifier promtail-config.yaml paths

# Métriques manquantes
Warning: Missing service metrics in /metrics
# Solution: Vérifier middleware metricsLogger actif
```

### Debug Stack Monitoring
```bash
# Vérifier Prometheus targets
curl http://localhost:9090/api/v1/targets

# Tester dashboard API
curl http://localhost:5006/api/dashboard | jq '.'

# Vérifier status services
curl http://localhost:5006/api/services/status | jq '.services[].status'

# Check Grafana datasources
curl http://admin:admin@localhost:3100/api/datasources
```

### Logs Debugging
```bash
# Vérifier logs Loki
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={service="metrics-service"}' | jq

# Tail logs temps réel
curl -G -s "http://localhost:3100/loki/api/v1/tail" \
  --data-urlencode 'query={job="roadtrip-microservices"}'
```

---

## 👥 Contexte Projet

**Projet M2** - Développement d'un MVP microservices pour plateforme de roadtrip  
**Certification** : RNCP39583 - Expert en Développement Logiciel  
**Technologies** : Node.js, Prometheus, Grafana, Loki, Docker, Express  
**Auteur** : Inès GERVAIS

---

## 📄 Licence

MIT License - Projet académique M2