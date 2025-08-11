require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const { app, SERVICE_NAME, PORT } = require('./app');
const { updateServiceHealth, updateActiveConnections, updateDatabaseHealth } = require('./metrics');

if (process.env.NODE_ENV !== 'test') {
  (async function start() {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info('✅ MongoDB connecté');
      updateDatabaseHealth('mongodb', true);

      const server = app.listen(PORT, () => {
        logger.info(`💾 ${SERVICE_NAME} démarré sur le port ${PORT}`);
        logger.info(`❤️ Health: http://localhost:${PORT}/health`);
        logger.info(`📈 Vitals: http://localhost:${PORT}/vitals`);
        logger.info(`📊 Métriques: http://localhost:${PORT}/metrics`);
        updateServiceHealth(SERVICE_NAME, true);
      });

      async function gracefulShutdown(signal) {
        logger.info(`🔄 Arrêt ${SERVICE_NAME} (${signal})...`);
        updateServiceHealth(SERVICE_NAME, false);
        updateActiveConnections(0);

        try {
          await mongoose.connection.close();
          logger.info('✅ MongoDB fermé proprement');
        } catch (e) {
          logger.error('❌ Erreur fermeture MongoDB:', e);
        }

        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 1000);
      }

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
      process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled Rejection:', reason);
        updateServiceHealth(SERVICE_NAME, false);
      });
      process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
        updateServiceHealth(SERVICE_NAME, false);
        process.exit(1);
      });
    } catch (err) {
      logger.error('❌ Erreur démarrage:', err);
      updateServiceHealth(SERVICE_NAME, false);
      process.exit(1);
    }
  })();
}

module.exports = process.env.NODE_ENV === 'test' ? require('./app').app : {};