const logger = require('../utils/logger');

const errorHandler = (err, req, res) => {
    logger.error('💥 Middleware Error Handler:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
    });

    const statusCode = err.statusCode || err.status || 500;
    const message = process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Erreur interne du serveur'
        : err.message || 'Erreur interne du serveur';

    res.status(statusCode).json({
        error: message,
        timestamp: new Date().toISOString(),
        path: req.path
    });
};

module.exports = errorHandler;