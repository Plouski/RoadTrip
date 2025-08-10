// utils/logger.js - ROADTRIP Microservices Logger
const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

const isProduction = process.env.NODE_ENV === 'production';
const enableFileLogging = process.env.ENABLE_FILE_LOGGING === 'true' || isProduction;

// 🎯 Détection automatique du service basé sur le dossier ou variable d'environnement
const detectServiceName = () => {
  // Priorité 1: Variable d'environnement
  if (process.env.SERVICE_NAME) {
    return process.env.SERVICE_NAME;
  }
  
  // Priorité 2: Nom du dossier parent
  const currentDir = path.basename(process.cwd());
  
  // Si on est dans un sous-service, utiliser le nom du dossier
  const knownServices = [
    'ai-service', 'auth-service', 'data-service', 
    'front-roadtrip-service', 'metrics-service', 
    'notification-service', 'paiement-service'
  ];
  
  if (knownServices.includes(currentDir)) {
    return currentDir;
  }
  
  // Priorité 3: Détection par package.json
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packagePath)) {
      const pkg = require(packagePath);
      if (pkg.name) {
        return pkg.name;
      }
    }
  } catch (error) {
    // Ignore errors
  }
  
  // Fallback: utiliser le nom du dossier
  return currentDir || 'unknown-service';
};

const SERVICE_NAME = detectServiceName();

// 📁 Structure des logs adaptée à ROADTRIP
const createLogsPaths = (serviceName) => {
  // CORRECTION: Vérifier si on est dans un container Docker
  const isDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER;
  
  let baseLogsDir;
  
  if (isDocker) {
    // Dans Docker: utiliser le volume monté ou créer dans /app/logs
    baseLogsDir = process.env.LOGS_DIR || '/app/logs';
  } else {
    // En développement local: utiliser ../logs comme prévu
    baseLogsDir = path.join(process.cwd(), '..', 'logs');
  }
  
  const serviceLogsDir = path.join(baseLogsDir, serviceName);
  
  // Créer les dossiers si nécessaire (avec gestion d'erreur)
  [baseLogsDir, serviceLogsDir].forEach(dir => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (error) {
      // Si erreur de permission, fallback vers un dossier temporaire
      console.warn(`⚠️  Impossible de créer ${dir}, utilisation de /tmp/logs`);
      const tempLogsDir = path.join('/tmp', 'logs', serviceName);
      if (!fs.existsSync(tempLogsDir)) {
        fs.mkdirSync(tempLogsDir, { recursive: true });
      }
      return {
        baseDir: '/tmp/logs',
        serviceDir: tempLogsDir,
        errorLog: path.join(tempLogsDir, 'error.log'),
        combinedLog: path.join(tempLogsDir, 'combined.log'),
        accessLog: path.join(tempLogsDir, 'access.log'),
        performanceLog: path.join(tempLogsDir, 'performance.log')
      };
    }
  });

  return {
    baseDir: baseLogsDir,
    serviceDir: serviceLogsDir,
    errorLog: path.join(serviceLogsDir, 'error.log'),
    combinedLog: path.join(serviceLogsDir, 'combined.log'),
    accessLog: path.join(serviceLogsDir, 'access.log'),
    performanceLog: path.join(serviceLogsDir, 'performance.log')
  };
};

const logsPaths = createLogsPaths(SERVICE_NAME);

// Format avec émojis pour différencier les services
const getServiceEmoji = (serviceName) => {
  const emojiMap = {
    'ai-service': '🤖',
    'auth-service': '🔐',
    'data-service': '💾',
    'front-roadtrip-service': '🌐',
    'metrics-service': '📊',
    'notification-service': '📧',
    'paiement-service': '💳',
    'roadtrip': '🚗'
  };
  return emojiMap[serviceName] || '⚙️';
};

const SERVICE_EMOJI = getServiceEmoji(SERVICE_NAME);

console.log(`${SERVICE_EMOJI} Initialisation logger pour ${SERVICE_NAME}`);
console.log(`📁 Logs: ${logsPaths.serviceDir}`);

// Format JSON structuré pour production
const jsonFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.splat(),
  format((info) => {
    // Ajouter des métadonnées ROADTRIP
    return {
      ...info,
      service: info.service || SERVICE_NAME,
      project: 'ROADTRIP',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.SERVICE_VERSION || '1.0.0'
    };
  })(),
  format.json()
);

// Format console coloré avec émojis
const consoleFormat = format.combine(
  format.timestamp({ format: 'HH:mm:ss' }),
  format.errors({ stack: true }),
  format.colorize({ all: true }),
  format.printf(({ timestamp, level, message, service, requestId, method, path, statusCode, duration, userId, stack }) => {
    const emoji = getServiceEmoji(service || SERVICE_NAME);
    let logLine = `${timestamp} [${level}] ${emoji} ${service || SERVICE_NAME}: ${message}`;
    
    if (method && path) {
      logLine += ` | ${method} ${path}`;
    }
    
    if (statusCode) {
      const statusEmoji = statusCode >= 400 ? '❌' : '✅';
      logLine += ` | ${statusEmoji} ${statusCode}`;
    }
    
    if (duration) {
      const durationEmoji = duration > 1000 ? '🐌' : duration > 500 ? '⏳' : '⚡';
      logLine += ` | ${durationEmoji} ${duration}ms`;
    }
    
    if (userId) {
      logLine += ` | 👤 ${userId}`;
    }
    
    if (requestId) {
      logLine += ` | 🔗 ${requestId.substring(0, 8)}`;
    }
    
    if (stack) {
      logLine += `\n💥 ${stack}`;
    }
    
    return logLine;
  })
);

// Configuration des transports
const loggerTransports = [
  new transports.Console({
    handleExceptions: true,
    handleRejections: true,
    format: consoleFormat
  })
];

// Transports fichiers si activé
if (enableFileLogging) {
  loggerTransports.push(
    // Erreurs critiques
    new transports.File({
      filename: logsPaths.errorLog,
      level: 'error',
      format: jsonFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Tous les logs
    new transports.File({
      filename: logsPaths.combinedLog,
      format: jsonFormat,
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Logs HTTP/API
    new transports.File({
      filename: logsPaths.accessLog,
      level: 'info',
      format: jsonFormat,
      maxsize: 100 * 1024 * 1024,
      maxFiles: 5,
      tailable: true
    }),
    
    // Logs de performance (requêtes lentes, etc.)
    new transports.File({
      filename: logsPaths.performanceLog,
      level: 'warn',
      format: jsonFormat,
      maxsize: 50 * 1024 * 1024,
      maxFiles: 3,
      tailable: true
    })
  );
}

// Créer le logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: jsonFormat,
  transports: loggerTransports,
  exitOnError: false,
  handleExceptions: true,
  handleRejections: true
});

// Log d'initialisation
logger.info(`${SERVICE_EMOJI} Logger ROADTRIP initialisé`, {
  service: SERVICE_NAME,
  logsDir: logsPaths.serviceDir,
  level: logger.level,
  isProduction,
  enableFileLogging,
  project: 'ROADTRIP'
});

// === MÉTHODES SPÉCIALISÉES ROADTRIP ===

// Log des requêtes HTTP avec contexte ROADTRIP
logger.request = (req, res, duration) => {
  const logData = {
    service: SERVICE_NAME,
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    duration: Math.round(duration),
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    requestId: req.id || req.headers['x-request-id'],
    project: 'ROADTRIP'
  };

  // Contexte utilisateur si disponible
  if (req.user) {
    logData.userId = req.user.id;
    logData.userEmail = req.user.email;
  }

  // Contexte de voyage si disponible
  if (req.tripId) {
    logData.tripId = req.tripId;
  }

  // Géolocalisation si disponible
  if (req.location) {
    logData.location = req.location;
  }

  const level = res.statusCode >= 400 ? 'warn' : 'info';
  logger[level](`${req.method} ${req.path} - ${res.statusCode}`, logData);

  // Log de performance si requête lente
  if (duration > 1000) {
    logger.performance('Requête lente détectée', {
      ...logData,
      slowRequest: true
    });
  }
};

// Logs spécialisés ROADTRIP
logger.trip = (message, tripData = {}) => {
  logger.info(message, { 
    type: 'trip', 
    service: SERVICE_NAME,
    ...tripData 
  });
};

logger.user = (message, userData = {}) => {
  logger.info(message, { 
    type: 'user', 
    service: SERVICE_NAME,
    ...userData 
  });
};

logger.payment = (message, paymentData = {}) => {
  logger.info(message, { 
    type: 'payment', 
    service: SERVICE_NAME,
    ...paymentData 
  });
};

logger.auth = (message, authData = {}) => {
  logger.info(message, { 
    type: 'auth', 
    service: SERVICE_NAME,
    ...authData 
  });
};

logger.ai = (message, aiData = {}) => {
  logger.info(message, { 
    type: 'ai', 
    service: SERVICE_NAME,
    ...aiData 
  });
};

logger.performance = (message, perfData = {}) => {
  logger.warn(message, { 
    type: 'performance', 
    service: SERVICE_NAME,
    ...perfData 
  });
};

logger.security = (message, securityData = {}) => {
  logger.warn(message, { 
    type: 'security', 
    service: SERVICE_NAME,
    ...securityData 
  });
};

// Middleware Express adapté ROADTRIP
logger.middleware = () => {
  return (req, res, next) => {
    const start = Date.now();
    
    // Générer un ID de requête unique
    if (!req.id) {
      req.id = `${SERVICE_NAME}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    }

    // Extraire des infos spécifiques ROADTRIP depuis les headers
    const tripId = req.headers['x-trip-id'];
    const userId = req.headers['x-user-id'];
    
    if (tripId) req.tripId = tripId;
    if (userId) req.userId = userId;

    logger.debug(`→ ${req.method} ${req.path}`, {
      service: SERVICE_NAME,
      method: req.method,
      path: req.path,
      requestId: req.id,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      ...(tripId && { tripId }),
      ...(userId && { userId })
    });

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.request(req, res, duration);
    });

    next();
  };
};

// Nettoyage des logs avec contexte ROADTRIP
logger.cleanup = () => {
  if (!enableFileLogging) return;
  
  const maxAge = parseInt(process.env.LOG_RETENTION_DAYS || '30') * 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  logger.debug(`🧹 Nettoyage logs ${SERVICE_NAME}`, { 
    service: SERVICE_NAME,
    maxAgeDays: maxAge / (24 * 60 * 60 * 1000),
    logsDir: logsPaths.serviceDir
  });
  
  fs.readdir(logsPaths.serviceDir, (err, files) => {
    if (err) {
      logger.error('Erreur lecture dossier logs', { 
        service: SERVICE_NAME,
        error: err.message 
      });
      return;
    }
    
    let deletedCount = 0;
    files.forEach(file => {
      const filePath = path.join(logsPaths.serviceDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlink(filePath, (err) => {
            if (!err) {
              deletedCount++;
              logger.info(`📁 Ancien fichier log supprimé`, { 
                service: SERVICE_NAME,
                file,
                age: Math.floor((now - stats.mtime.getTime()) / (24 * 60 * 60 * 1000))
              });
            }
          });
        }
      });
    });
    
    setTimeout(() => {
      logger.info(`✅ Nettoyage terminé`, { 
        service: SERVICE_NAME,
        deletedFiles: deletedCount 
      });
    }, 1000);
  });
};

// Stats du service avec contexte ROADTRIP
logger.getStats = () => {
  const stats = {
    service: SERVICE_NAME,
    project: 'ROADTRIP',
    fileLogging: enableFileLogging,
    logsDir: logsPaths.serviceDir,
    files: []
  };

  if (!enableFileLogging) return stats;

  try {
    const files = fs.readdirSync(logsPaths.serviceDir);
    files.forEach(file => {
      const filePath = path.join(logsPaths.serviceDir, file);
      const fileStat = fs.statSync(filePath);
      stats.files.push({
        name: file,
        size: fileStat.size,
        sizeHuman: (fileStat.size / (1024 * 1024)).toFixed(2) + ' MB',
        created: fileStat.birthtime,
        modified: fileStat.mtime
      });
    });
  } catch (error) {
    logger.error('Erreur stats logs', { 
      service: SERVICE_NAME,
      error: error.message 
    });
  }

  return stats;
};

// Nettoyage automatique au démarrage
const isTest = process.env.NODE_ENV === 'test';

if (enableFileLogging && !isTest) {
  setTimeout(() => {
    logger.cleanup();
  }, 5000);
}

// Helper léger pour sérialiser proprement une erreur
const _toErr = (e) =>
  e instanceof Error
    ? { name: e.name, message: e.message, stack: e.stack }
    : e;

// logger.logError("Contexte", error, { meta })
logger.logError = (context, error, meta = {}) => {
  logger.error(context, {
    service: SERVICE_NAME,
    error: _toErr(error),
    ...meta,
  });
};

// logger.logAuth("Message", user, { meta })
logger.logAuth = (message, user, meta = {}) => {
  logger.info(message, {
    type: "auth",
    service: SERVICE_NAME,
    user: user
      ? {
          id: user._id || user.id,
          email: user.email,
          role: user.role,
        }
      : undefined,
    ...meta,
  });
};

module.exports = logger;