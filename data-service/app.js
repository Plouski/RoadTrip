require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  updateServiceHealth,
  updateActiveConnections,
  updateDatabaseHealth,
  updateExternalServiceHealth,
} = require('./metrics');

const SERVICE_NAME = 'data-service';
const PORT = parseInt(process.env.PORT || '5002', 10);

const app = express();

if (process.env.NODE_ENV !== 'test') {
  const required = {
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  };
  const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    missing.forEach((v) => logger.error(`❌ ENV manquante: ${v}`));
    process.exit(1);
  }
}

app.use(helmet());

const allowedOrigins = [
  'http://localhost:3000',
  'https://road-trip-iota.vercel.app',
];

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      logger.error('❌ Origin non autorisée par CORS:', origin);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

let currentConnections = 0;
app.use((req, res, next) => {
  const start = Date.now();
  currentConnections++;
  updateActiveConnections(currentConnections);

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    currentConnections--;
    updateActiveConnections(currentConnections);

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

    if (process.env.NODE_ENV !== 'test') {
      logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${Math.round(duration * 1000)}ms`);
    }
  });

  next();
});

if (process.env.NODE_ENV !== 'test') {
  app.use('/api/roadtrips', require('./routes/tripRoutes'));
  app.use('/api/favorites', require('./routes/favoriteRoutes'));
  app.use('/api/messages', require('./routes/messageRoutes'));
  app.use('/api/admin', require('./routes/adminRoutes'));
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/users', require('./routes/userRoutes'));
} else {
  app.use('/api/roadtrips', (_req, res) => res.json({ status: 'mock', data: [] }));
  app.use('/api/favorites', (_req, res) => res.json({ status: 'mock' }));
  app.use('/api/messages', (_req, res) => res.json({ status: 'mock' }));
  app.use('/api/admin', (_req, res) => res.json({ status: 'mock' }));
  app.use('/api/auth', (_req, res) => res.json({ status: 'mock' }));
  app.use('/api/users', (_req, res) => res.json({ status: 'mock' }));
}

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/health', async (_req, res) => {
  const health = {
    status: 'healthy',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    dependencies: {},
  };

  const dbState = mongoose.connection.readyState;
  if (dbState === 1) {
    health.dependencies.mongodb = 'connected';
    updateDatabaseHealth('mongodb', true);
  } else {
    health.dependencies.mongodb = 'disconnected';
    health.status = 'degraded';
    updateDatabaseHealth('mongodb', false);
  }

  if (process.env.NODE_ENV === 'test') {
    health.dependencies.notificationService = 'mocked';
    health.dependencies.aiService = 'mocked';
    health.dependencies.authService = 'mocked';
    updateExternalServiceHealth('notification_service', true);
    updateExternalServiceHealth('ai_service', true);
    updateExternalServiceHealth('auth_service', true);
  } else {
    const check = async (name, url) => {
      try {
        const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
        const ok = r.ok;
        health.dependencies[name] = ok ? 'healthy' : 'unhealthy';
        updateExternalServiceHealth(name, ok);
        if (!ok && health.status === 'healthy') health.status = 'degraded';
      } catch {
        health.dependencies[name] = 'unreachable';
        updateExternalServiceHealth(name, false);
        if (health.status === 'healthy') health.status = 'degraded';
      }
    };

    await Promise.all([
      check('notificationService', process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5005'),
      check('aiService', process.env.AI_SERVICE_URL || 'http://localhost:5003'),
      check('authService', process.env.AUTH_SERVICE_URL || 'http://localhost:5001'),
    ]);
  }

  const ok = health.status === 'healthy';
  updateServiceHealth(SERVICE_NAME, ok);
  res.status(ok ? 200 : 503).json(health);
});

app.get('/vitals', (_req, res) => {
  res.json({
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    status: 'running',
    active_connections: currentConnections,
    database: {
      mongodb: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        collections: ['users', 'trips', 'favorites', 'aimessages', 'subscriptions'],
      },
    },
    features: [
      'JWT Authentication',
      'MongoDB Persistence',
      'Premium Content Logic',
      'Admin Panel',
      'GDPR Compliance',
      'Prometheus Metrics',
    ],
    integrations: ['🔗 Notification Service', '🔗 AI Service', '🔗 Auth Service', '🔗 Payment Service'],
  });
});

app.get('/ping', (_req, res) => {
  res.json({ status: 'pong ✅', service: SERVICE_NAME, timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.use((_req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    service: SERVICE_NAME,
    availableRoutes: [
      '/health',
      '/vitals',
      '/metrics',
      '/ping',
      '/api/auth/*',
      '/api/roadtrips/*',
      '/api/favorites/*',
      '/api/messages/* (🔗 ai)',
      '/api/admin/*',
    ],
  });
});

app.use((err, _req, res, _next) => {
  if (process.env.NODE_ENV !== 'test') logger.error(`❌ Erreur ${SERVICE_NAME}:`, err.message);

  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    return res.status(503).json({ error: 'Erreur base de données', service: SERVICE_NAME, message: 'Service temporairement indisponible' });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token invalide', message: 'Authentification requise' });
  }
  res.status(err.statusCode || 500).json({
    error: 'Erreur serveur',
    service: SERVICE_NAME,
    message: err.message || 'Une erreur est survenue',
    timestamp: new Date().toISOString(),
  });
});

module.exports = { app, SERVICE_NAME, PORT };