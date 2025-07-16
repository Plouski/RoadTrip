const winston = require("winston");
const path = require("path");

// Format simple pour la console
const consoleFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `${timestamp} [${level.toUpperCase()}]: ${message}${metaString}`;
});

// Logger simplifié pour
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: process.env.SERVICE_NAME || 'data-service'
  },
  transports: [
    // Fichier d'erreurs simple
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 3
    }),
    
    // Fichier général
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 3
    })
  ]
});

// Console en développement
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        consoleFormat
      )
    })
  );
}

// Méthodes utilitaires simplifiées pour les intégrations
logger.logServiceCall = (service, action, metadata = {}) => {
  logger.info(`🔗 ${service}: ${action}`, {
    service_call: service,
    action,
    ...metadata,
    timestamp: new Date().toISOString()
  });
};

logger.logAuth = (action, user, metadata = {}) => {
  logger.info(`🔐 Auth: ${action}`, {
    auth_action: action,
    user: user?.email || 'unknown',
    userId: user?.userId,
    ...metadata
  });
};

logger.logError = (context, error, metadata = {}) => {
  logger.error(`💥 ${context}`, {
    error_context: context,
    error_message: error.message,
    error_stack: error.stack,
    ...metadata
  });
};

// Export simple
module.exports = logger;