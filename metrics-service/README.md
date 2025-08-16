# 📊 Metrics Service - RoadTrip! 

> **Passerelle d’observabilité** : expose des endpoints de santé, agrège des métriques Prometheus, centralise les logs (Loki/Promtail) et fournit un mini-dashboard JSON.  
> _Projet M2 -  Microservices - Certification RNCP39583_

## 📋 Vue d’ensemble

Service Node.js/Express qui :
- interroge **Prometheus** pour l'état des microservices,
- expose **/metrics** pour le scraping Prometheus,
- fournit des endpoints **health/vitals/status**,
- donne un **dashboard JSON** en direct (UP/DOWN + req/s),
- s'intègre à **Loki/Promtail** pour les logs centralisés,
- **surveille automatiquement** les services et envoie des **alertes email** en cas de panne.

---

## 💡 Points forts

- **/metrics** disponible sur le serveur principal **et** un **serveur dédié** (scrape-friendly)  
- **Dashboard JSON** prêt à consommer : services UP/DOWN + `rate(http_requests_total[5m])`  
- **Métriques HTTP** automatiques (latence + compteur) via `metricsLogger`  
- **Système d'alertes automatiques** : détection services DOWN + notifications email  
- **Stack complète** : Prometheus (metrics), Loki+Promtail (logs), Grafana (visualisation)  
- **Handlers d'erreurs** propres : 404 listant les routes, handler global détaillé en dev  

---

## 🚀 Installation & Démarrage

### Prérequis

```bash
Node.js 20+
Prometheus
Loki + Promtail
Grafana
notification-service (pour les alertes)
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
NODE_ENV=development
SERVICE_NAME=metrics-service
SERVICE_VERSION=1.0.0

# Ports
PORT=5006
METRICS_PORT=9090

# Intégrations
PROMETHEUS_URL=http://localhost:9090
FRONTEND_URL=http://localhost:3000
GRAFANA_URL=http://localhost:3100

# Alertes automatiques
NOTIFICATION_SERVICE_URL=http://localhost:5005
NOTIFICATION_API_KEY=test-api-key-123
ADMIN_EMAIL=gervaisines@gmail.com
ENABLE_ALERTS=true

# Logs
LOG_LEVEL=debug
ENABLE_FILE_LOGGING=true
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

**Note** : l’endpoint /metrics repose sur le middleware metricsLogger pour collecter les données HTTP.
Assurez-vous de l’activer dans src/app.js :

```js
app.use(metricsLogger(logger));
```

### 🔧 Système (publics)

- GET / — infos service + endpoints + URLs Prometheus/Grafana
- GET /ping — pong + uptime
- GET /health — statut healthy + version
- GET /vitals — mémoire/CPU/env/connexions actives
- GET /metrics — **métriques Prometheus**
- - exposé par l’app (port PORT, ex. 5006)
- - exposé aussi par un serveur dédié (port METRICS_PORT, ex. 9090)

### 🚨 Alertes

- GET /api/alerts/status — État du système d'alertes
- POST /api/alerts/test — Test manuel d'envoi d'alerte
Exemple test d'alerte :
```http
POST /api/alerts/test
Content-Type: application/json
{
  "type": "email",
  "severity": "WARNING"
}
```

#### Agrégations Prometheus

- GET /api/dashboard : Retourne un JSON synthétique basé sur :
- - up
- - rate(http_requests_total[5m])

Exemple de réponse :
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "services": { "total": 5, "up": 5, "down": 0 },
    "requests": { "totalPerSecond": "2.37" },
    "details": [
      { "service": "auth-service", "status": "UP", "instance": "auth-service:5001" }
    ]
  }
}
```
- GET /api/services/status : Liste les jobs Prometheus et leur statut healthy/down via la métrique up.

---

## 🚨 Système d'alertes automatiques

### Fonctionnement
Le **AlertManager** surveille automatiquement tous les services toutes les **30 secondes** :

1. **Interroge Prometheus** : Récupère la métrique up pour tous les services
2. **Détecte les pannes** : Si up = 0 pour un service
3. **Envoie une alerte** : Email automatique via notification-service
4. **Anti-spam** : Cooldown de 10 minutes par service
5. **Recovery** : Supprime l'alerte quand le service redevient UP

---

## 🔧 Métriques exposées (Prometheus)

- **HTTP**
- - *_http_request_duration_seconds{method,route,status_code} (Histogram)
- - *_http_requests_total{method,route,status_code} (Counter)

- **Connexions actives**
- - *_active_connections (Gauge)

- **Santé service**
- - *_service_health_status{service_name} (Gauge)

Les préfixes de métriques dépendent de la normalisation faite dans metrics.js (souvent dérivée de SERVICE_NAME).

---

## 🧱 Middlewares

middlewares/metricsLogger.js
- Incrémente/décrémente app.locals.currentConnections
- Mesure la durée de chaque requête et alimente les métriques HTTP
- Log un événement performance si la requête > 1s

middlewares/errorHandler.js
- notFound : renvoie 404 + liste des routes disponibles
- global : handler d’erreurs ; en dev, renvoie le message détaillé

---

## 🏗 Structure Projet

```
metrics-service/
├── grafana/
│   └── provisioning/
│       ├── dashboards/
│       └── datasources/
├── loki/
│   ├── loki-config.yaml
│   └── promtail-config.yaml
├── prometheus/
│   └── prometheus.yml
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config.js
│   ├── metrics.js
│   ├── alerting/
│   │   ├── alertManager.js
│   │   └── notificationChannels.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── home.js
│   │   ├── ping.js
│   │   ├── health.js
│   │   ├── vitals.js
│   │   ├── dashboard.js
│   │   ├── status.js
│   │   └── alerts.js
│   └── middlewares/
│       ├── metricsLogger.js
│       └── errorHandler.js
├── utils/
│   └── logger.js
├── .env.example
├── Dockerfile
├── package.json
└── README.md
```

---

## 📈 Prometheus / Loki / Grafana

### Prometheus
Fichier : prometheus/prometheus.yml
Scrape par défaut :
- prometheus:9090
- ai-service:5003, auth-service:5001, data-service:5002,
notification-service:5005, paiement-service:5004, metrics-service:5006
Chaque job utilise metrics_path: /metrics.

### Loki & Promtail
- loki/loki-config.yaml : stockage boltdb-shipper, rétention, compaction.
- loki/promtail-config.yaml :
- - scrute /var/log/app/*/combined.log (job roadtrip-microservices)
- - scrute /var/log/app/*/error.log (job roadtrip-errors)
- - ajoute des labels (service, level, etc.) via les stages JSON/regex.

**Important** : Monte tes logs applicatifs dans le conteneur Promtail sous /var/log/app/<service>/... pour matcher les chemins.

---

## 🧪 Tests

```bash
npm test
```

- /metrics (200 et content-type)
- /health, /vitals, /ping
- /api/dashboard & /api/services/status (mock Prometheus)
- /api/alerts/test & /api/alerts/status

---

## 🐳 Docker

```bash
# Build
docker build -t metrics-service .

# Run
docker run -p 5006:5006 -p 9090:9090 --env-file .env metrics-service
```

---

## 🐛 Troubleshooting

| Problème                    | Cause probable              | Solution                                                                 |
| --------------------------- | --------------------------- | ------------------------------------------------------------------------ |
| `GET /api/dashboard` → 500  | Prometheus indisponible     | Vérifier `PROMETHEUS_URL`, réseau, service Prometheus                    |
| Aucune métrique HTTP        | `metricsLogger` non monté   | Vérifier `app.use(metricsLogger(logger))` dans `src/app.js`              |
| Prometheus ne scrape pas    | Mauvais port/chemin         | Vérifier `prometheus.yml` (target + `metrics_path: /metrics`)            |
| Pas de logs dans Loki       | Mauvais chemins de logs     | Monter les volumes de logs app sous `/var/log/app/<service>/...`         |
| `GET /metrics` → 500        | Registre non initialisé     | Vérifier `createMetrics()` et `app.locals.register`                      |
| `/metrics` chargé mais vide | Aucun trafic                | Générer des requêtes sur le service pour alimenter les compteurs         |
|   Alertes non reçues        | Config notification manquante | Vérifier `NOTIFICATION_SERVICE_URL` + `ADMIN_EMAIL`                      |
|   Services DOWN non détectés | Prometheus inaccessible    | Tester `curl http://localhost:9090/api/v1/query?query=up`                |
|   Spam d'alertes            | Cooldown défaillant         | Vérifier logs AlertManager pour cooldown                                 |

---

## 🎯 Validation du système d'alertes

### Tests à effectuer
1. **Arrêter un service** : docker-compose stop auth-service
2. **Attendre 1-2 minutes** : Le système détecte la panne
3. **Vérifier email reçu** : Alerte automatique dans votre boîte
4. **Redémarrer le service** : docker-compose start auth-service
5. **Vérifier recovery** : Plus d'alertes envoyées

---

## 👥 Contexte Projet

**Projet M2** - Développement d'un microservice pour plateforme de roadtrip  
**Certification** : RNCP39583 - Expert en Développement Logiciel 
**Technologies** : Node.js, Express, Prometheus, Loki, Promtail, Grafana, Docker
**Auteur** : Inès GERVAIS