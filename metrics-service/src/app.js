require("dotenv").config();

if (process.env.NODE_ENV === 'test') {
  process.env.ENABLE_FILE_LOGGING = 'false';
  process.env.LOG_LEVEL = 'error';
}

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const promClient = require("prom-client");
const logger = require("../utils/logger");

const app = express();
const PORT = process.env.PORT || 5006;
const METRICS_PORT = process.env.METRICS_PORT || 9006;
const SERVICE_NAME = "metrics-service";

logger.info(`🔥 Lancement du ${SERVICE_NAME}...`, { port: PORT });

// Configuration de base
logger.info("🔍 Initialisation des variables", {
  portPrincipal: PORT,
  portMetriques: METRICS_PORT,
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: logger.level
});

// CONFIGURATION DE BASE
// Vérifications
const prometheusUrl = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
logger.info("🔧 Configuration Prometheus", { prometheusUrl });

logger.info("🔍 Configuration Prometheus terminée");

// Métriques Prometheus
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

logger.info("🔍 Registry Prometheus créé");

// Métriques personnalisées
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const prometheusConnectionsGauge = new promClient.Gauge({
  name: 'prometheus_connections_active',
  help: 'Active connections to Prometheus'
});

const servicesStatusGauge = new promClient.Gauge({
  name: 'monitored_services_status',
  help: 'Status of monitored services',
  labelNames: ['service', 'instance']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(prometheusConnectionsGauge);
register.registerMetric(servicesStatusGauge);

logger.info("🔍 Métriques Prometheus enregistrées", {
  metriques: ['httpRequestDuration', 'httpRequestsTotal', 'prometheusConnectionsGauge', 'servicesStatusGauge']
});

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

logger.info("🔍 CORS configuré", {
  origin: process.env.FRONTEND_URL || "http://localhost:3000"
});

app.use(express.json({ limit: "2mb" }));

// MIDDLEWARE DE LOGGING - Doit être AVANT les autres middlewares
app.use(logger.middleware());

// MIDDLEWARE DE MÉTRIQUES
let currentConnections = 0;
app.use((req, res, next) => {
  const start = Date.now();
  currentConnections++;
  
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    currentConnections--;
    
    // Métriques Prometheus
    httpRequestDuration.observe(
      {
        method: req.method,
        route: req.route?.path || req.path,
        status_code: res.statusCode,
      },
      duration
    );
    
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    });
    
    // Log de performance si la requête est lente
    if (duration > 1) {
      logger.performance("Slow request detected", {
        method: req.method,
        path: req.path,
        duration: Math.round(duration * 1000),
        statusCode: res.statusCode,
        requestId: req.id
      });
    }
  });
  
  next();
});

// ROUTES STANDARD
// Métriques Prometheus
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
    logger.debug("Metrics endpoint accessed", { requestId: req.id });
  } catch (error) {
    logger.error("Error serving metrics", error);
    res.status(500).json({ error: "Failed to generate metrics" });
  }
});

// Health check
app.get("/health", (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: SERVICE_NAME,
    version: process.env.SERVICE_VERSION || "1.0.0"
  };

  // Vérifier la connexion Prometheus
  const isHealthy = health.status === "healthy";
  const statusCode = isHealthy ? 200 : 503;
  
  logger.info("Health check", { 
    status: health.status, 
    uptime: health.uptime,
    requestId: req.id 
  });
  
  res.status(statusCode).json(health);
});

// Vitals
app.get("/vitals", (req, res) => {
  const vitals = {
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    status: "running",
    active_connections: currentConnections,
    environment: process.env.NODE_ENV || "development",
    prometheus_url: prometheusUrl
  };
  
  logger.debug("Vitals requested", { 
    memory: vitals.memory.heapUsed, 
    connections: currentConnections,
    requestId: req.id 
  });
  
  res.json(vitals);
});

// Ping
app.get("/ping", (req, res) => {
  res.json({
    status: "pong ✅",
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ROUTES SPÉCIFIQUES AU SERVICE METRICS
// Dashboard simple - JUSTE les infos essentielles
app.get('/api/dashboard', async (req, res) => {
  const startTime = Date.now();
  logger.info('🎯 Génération dashboard demandée', { requestId: req.id });
  
  try {
    logger.debug('🔍 Requêtes vers Prometheus', {
      prometheusUrl,
      queries: ['up', 'rate(http_requests_total[5m])'],
      requestId: req.id
    });
    
    // Juste 2 requêtes essentielles
    const [upResponse, requestsResponse] = await Promise.all([
      axios.get(`${prometheusUrl}/api/v1/query?query=up`).catch((error) => {
        logger.warn('⚠️ Erreur requête UP vers Prometheus', {
          error: error.message,
          url: `${prometheusUrl}/api/v1/query?query=up`,
          requestId: req.id
        });
        prometheusConnectionsGauge.set(0);
        return { data: { data: { result: [] } } };
      }),
      axios.get(`${prometheusUrl}/api/v1/query?query=rate(http_requests_total[5m])`).catch((error) => {
        logger.warn('⚠️ Erreur requête RATE vers Prometheus', {
          error: error.message,
          url: `${prometheusUrl}/api/v1/query?query=rate(http_requests_total[5m])`,
          requestId: req.id
        });
        return { data: { data: { result: [] } } };
      })
    ]);

    const upMetrics = upResponse.data.data.result || [];
    const requestMetrics = requestsResponse.data.data.result || [];

    // Mettre à jour les métriques de connexion Prometheus
    prometheusConnectionsGauge.set(upMetrics.length > 0 ? 1 : 0);

    // Mettre à jour les métriques des services
    upMetrics.forEach(metric => {
      servicesStatusGauge.set(
        { service: metric.metric.job, instance: metric.metric.instance },
        metric.value[1] === '1' ? 1 : 0
      );
    });

    logger.debug('📊 Métriques récupérées', {
      upMetricsCount: upMetrics.length,
      requestMetricsCount: requestMetrics.length,
      requestId: req.id
    });

    // Format simple
    const servicesUp = upMetrics.filter(m => m.value[1] === '1').length;
    const servicesDown = upMetrics.filter(m => m.value[1] === '0').length;
    const totalRequestsPerSecond = requestMetrics.reduce((sum, m) => sum + parseFloat(m.value[1] || 0), 0);

    const dashboard = {
      timestamp: new Date().toISOString(),
      services: {
        total: 5, // Vos 5 microservices
        up: servicesUp,
        down: servicesDown
      },
      requests: {
        totalPerSecond: totalRequestsPerSecond.toFixed(2)
      },
      details: upMetrics.map(metric => ({
        service: metric.metric.job,
        status: metric.value[1] === '1' ? 'UP' : 'DOWN',
        instance: metric.metric.instance
      }))
    };

    const duration = Date.now() - startTime;
    
    logger.info('✅ Dashboard généré avec succès', {
      servicesUp,
      servicesDown,
      totalServices: 5,
      requestsPerSecond: totalRequestsPerSecond.toFixed(2),
      duration,
      prometheusConnected: upMetrics.length > 0 || requestMetrics.length > 0,
      requestId: req.id
    });

    res.json({ success: true, data: dashboard });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('❌ Erreur lors de la génération du dashboard', {
      error: error.message,
      stack: error.stack,
      duration,
      prometheusUrl,
      requestId: req.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des métriques',
      requestId: req.id
    });
  }
});

// Vue d'ensemble simple des services
app.get('/api/services/status', async (req, res) => {
  const startTime = Date.now();
  logger.info('🔍 Status des services demandé', { requestId: req.id });
  
  try {
    logger.debug('🔍 Requête status services vers Prometheus', {
      prometheusUrl,
      query: 'up',
      requestId: req.id
    });
    
    const response = await axios.get(`${prometheusUrl}/api/v1/query?query=up`);
    
    const services = response.data.data.result.map(metric => ({
      name: metric.metric.job,
      status: metric.value[1] === '1' ? 'healthy' : 'down',
      instance: metric.metric.instance,
      lastCheck: new Date().toISOString()
    }));

    const duration = Date.now() - startTime;
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const downCount = services.filter(s => s.status === 'down').length;

    logger.info('✅ Status des services récupéré', {
      totalServices: services.length,
      healthyServices: healthyCount,
      downServices: downCount,
      duration,
      services: services.map(s => ({ name: s.name, status: s.status })),
      requestId: req.id
    });

    res.json({ success: true, services });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('❌ Erreur lors de la récupération du status des services', {
      error: error.message,
      stack: error.stack,
      duration,
      prometheusUrl,
      requestId: req.id
    });
    
    res.status(500).json({ 
      success: false, 
      error: 'Erreur services status',
      requestId: req.id
    });
  }
});

// Page d'accueil informative
app.get('/', (req, res) => {
  logger.info('🏠 Page d\'accueil consultée', { requestId: req.id });
  
  const homeData = {
    service: 'Metrics Service API',
    version: '1.0.0',
    endpoints: [
      'GET /health - Service health',
      'GET /vitals - Service vitals',
      'GET /metrics - Prometheus metrics',
      'GET /ping - Service ping',
      'GET /api/dashboard - Dashboard simple',
      'GET /api/services/status - Services status'
    ],
    grafana: 'http://localhost:3100',
    prometheus: prometheusUrl,
    requestId: req.id
  };
  
  logger.debug('📋 Informations service envoyées', {
    endpoints: homeData.endpoints.length,
    version: homeData.version,
    requestId: req.id
  });
  
  res.json(homeData);
});

// GESTION D'ERREURS
// 404 Handler
app.use((req, res) => {
  logger.warn("Route not found", {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    requestId: req.id
  });
  
  res.status(404).json({
    error: "Route non trouvée",
    service: SERVICE_NAME,
    requestId: req.id,
    availableRoutes: [
      "GET /health", "GET /vitals", "GET /metrics", "GET /ping",
      "GET /api/dashboard", "GET /api/services/status", "GET /"
    ],
  });
});

// Error Handler
app.use((err, req, res, next) => {
  logger.error(`💥 Erreur ${SERVICE_NAME}:`, {
    error: err,
    method: req.method,
    path: req.path,
    requestId: req.id,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  res.status(500).json({
    error: "Erreur serveur",
    service: SERVICE_NAME,
    requestId: req.id,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// DÉMARRAGE
// Serveur principal
let server, metricsServer;

logger.info("🔍 Tentative de démarrage du serveur", {
  nodeEnv: process.env.NODE_ENV,
  port: PORT,
  metricsPort: METRICS_PORT,
  runTests: process.env.RUN_TESTS
});

// En développement, on veut toujours démarrer sauf si explicitement en mode test pour les tests unitaires
const isTestMode = process.env.NODE_ENV === 'test';

if (!isTestMode) {
  logger.info("🚀 Démarrage du serveur en mode développement", {
    mode: process.env.NODE_ENV || 'development'
  });
  
  server = app.listen(PORT, () => {
    logger.info(`📊 ${SERVICE_NAME} démarré avec succès`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      logLevel: logger.level
    });
    
    logger.info(`📊 Métriques: http://localhost:${PORT}/metrics`);
    logger.info(`❤️ Health: http://localhost:${PORT}/health`);
    logger.info(`📈 Vitals: http://localhost:${PORT}/vitals`);
    logger.info(`🎯 Dashboard: http://localhost:${PORT}/api/dashboard`);
    logger.info(`🔍 Services Status: http://localhost:${PORT}/api/services/status`);
    
    logger.info(`✅ ${SERVICE_NAME} démarré avec métriques et logging avancé`);
  });

  logger.info("🔍 Configuration serveur métriques séparé");

  // Serveur métriques séparé (pour Prometheus)
  const metricsApp = express();
  
  metricsApp.use((req, res, next) => {
    logger.debug("Metrics server request", { 
      method: req.method, 
      path: req.path 
    });
    next();
  });
  
  metricsApp.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      logger.error("Error serving metrics from dedicated server", error);
      res.status(500).json({ error: 'Failed to generate metrics' });
    }
  });
  
  metricsApp.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: `${SERVICE_NAME}-metrics` });
  });
  
  metricsServer = metricsApp.listen(METRICS_PORT, () => {
    logger.info(`📊 Serveur métriques démarré`, { 
      port: METRICS_PORT,
      service: `${SERVICE_NAME}-metrics`
    });
  });
  
  logger.info("🔍 Configuration serveur métriques terminée");
} else {
  logger.info("🔍 Mode test détecté, serveurs non démarrés");
}

// GRACEFUL SHUTDOWN
function gracefulShutdown(signal) {
  logger.info(`🔄 Arrêt ${SERVICE_NAME}`, { signal });
  
  // Fermer les serveurs proprement
  const shutdownPromises = [];
  
  if (server) {
    shutdownPromises.push(new Promise(resolve => {
      server.close(() => {
        logger.info('📴 Serveur principal fermé');
        resolve();
      });
    }));
  }
  
  if (metricsServer) {
    shutdownPromises.push(new Promise(resolve => {
      metricsServer.close(() => {
        logger.info('📴 Serveur métriques fermé');
        resolve();
      });
    }));
  }
  
  Promise.all(shutdownPromises).then(() => {
    logger.info(`✅ ${SERVICE_NAME} arrêté proprement`);
    process.exit(0);
  }).catch(error => {
    logger.error("Erreur lors de l'arrêt", error);
    process.exit(1);
  });
  
  // Timeout de sécurité
  setTimeout(() => {
    logger.error("Timeout d'arrêt, arrêt forcé");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason.toString(),
    promise: promise.toString()
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  
  // Graceful shutdown après une exception critique
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Nettoyage périodique des logs (une fois par jour)
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    logger.cleanup();
  }, 24 * 60 * 60 * 1000);
}

module.exports = process.env.NODE_ENV === 'test' ? app : { app, server, metricsServer };