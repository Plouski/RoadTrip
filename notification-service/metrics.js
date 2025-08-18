const promClient = require('prom-client');

const register = new promClient.Registry();

const normalizeServiceName = (serviceName) => {
  if (!serviceName) return 'service';
  return serviceName.toLowerCase()
    .replace(/-/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^([0-9])/, '_$1');
};

const SERVICE_NAME = normalizeServiceName(process.env.SERVICE_NAME || 'service');
const PROMETHEUS_PREFIX = `${SERVICE_NAME}_`;

console.log(`📊 Prometheus configuré pour: ${SERVICE_NAME} (préfixe: ${PROMETHEUS_PREFIX})`);

try {
  promClient.collectDefaultMetrics({
    register,
    prefix: PROMETHEUS_PREFIX
  });
  console.log(`✅ Métriques par défaut configurées avec le préfixe: ${PROMETHEUS_PREFIX}`);
} catch (error) {
  console.error(`❌ Erreur configuration métriques par défaut: ${error.message}`);
  try {
    promClient.collectDefaultMetrics({ register });
    console.log(`⚠️ Métriques par défaut configurées SANS préfixe`);
  } catch (fallbackError) {
    console.error(`❌ Impossible de configurer les métriques par défaut: ${fallbackError.message}`);
  }
}

// MÉTRIQUES STANDARD POUR TOUS LES MICROSERVICES

// 1. Santé du service
const serviceHealthStatus = new promClient.Gauge({
  name: `${SERVICE_NAME}_service_health_status`,
  help: 'Service health status (1 = healthy, 0 = unhealthy)',
  labelNames: ['service_name'],
  registers: [register]
});

// 2. Temps de réponse HTTP
const httpRequestDuration = new promClient.Histogram({
  name: `${SERVICE_NAME}_http_request_duration_seconds`,
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

// 3. Nombre total de requêtes
const httpRequestsTotal = new promClient.Counter({
  name: `${SERVICE_NAME}_http_requests_total`,
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// 4. Connexions actives
const activeConnections = new promClient.Gauge({
  name: `${SERVICE_NAME}_active_connections`,
  help: 'Number of active connections',
  registers: [register]
});

// 5. Status base de données
const databaseStatus = new promClient.Gauge({
  name: `${SERVICE_NAME}_database_status`,
  help: 'Database connection status (1 = connected, 0 = disconnected)',
  labelNames: ['database_type'],
  registers: [register]
});

// 6. Services externes
const externalServiceHealth = new promClient.Gauge({
  name: `${SERVICE_NAME}_external_service_health`,
  help: 'External service health (1 = healthy, 0 = unhealthy)',
  labelNames: ['service_name'],
  registers: [register]
});

// HELPERS SIMPLES

// Helper pour mettre à jour la santé du service
function updateServiceHealth(serviceName, isHealthy) {
  try {
    serviceHealthStatus.set({ service_name: serviceName }, isHealthy ? 1 : 0);
  } catch (error) {
    console.error(`❌ Erreur mise à jour santé service: ${error.message}`);
  }
}

// Helper pour mettre à jour la DB
function updateDatabaseHealth(dbType, isConnected) {
  try {
    databaseStatus.set({ database_type: dbType }, isConnected ? 1 : 0);
  } catch (error) {
    console.error(`❌ Erreur mise à jour santé DB: ${error.message}`);
  }
}

// Helper pour les services externes
function updateExternalServiceHealth(serviceName, isHealthy) {
  try {
    externalServiceHealth.set({ service_name: serviceName }, isHealthy ? 1 : 0);
  } catch (error) {
    console.error(`❌ Erreur mise à jour service externe: ${error.message}`);
  }
}

// Helper pour les connexions actives
function updateActiveConnections(count) {
  try {
    activeConnections.set(count);
  } catch (error) {
    console.error(`❌ Erreur mise à jour connexions: ${error.message}`);
  }
}

// Fonction de diagnostic pour débugger les métriques
function getMetricsInfo() {
  const metrics = register.getSingleMetric ? register.getMetricsAsArray() : [];
  return {
    serviceName: SERVICE_NAME,
    prometheusPrefix: PROMETHEUS_PREFIX,
    registeredMetrics: metrics.length,
    metricsNames: metrics.map(m => m.name)
  };
}

console.log(`📊 Métriques configurées:`, {
  serviceName: SERVICE_NAME,
  prefix: PROMETHEUS_PREFIX,
  originalServiceName: process.env.SERVICE_NAME
});

module.exports = {
  register,
  serviceName: SERVICE_NAME,
  prometheusPrefix: PROMETHEUS_PREFIX,
  serviceHealthStatus,
  httpRequestDuration,
  httpRequestsTotal,
  activeConnections,
  databaseStatus,
  externalServiceHealth,
  updateServiceHealth,
  updateDatabaseHealth,
  updateExternalServiceHealth,
  updateActiveConnections,
  getMetricsInfo
};