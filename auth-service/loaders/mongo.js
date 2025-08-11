const mongoose = require("mongoose");
const logger = require("../utils/logger");
const { updateDatabaseHealth } = require("../metrics");

async function connectMongo(uri) {
  if (!uri) {
    logger.warn("⚠️ MongoDB URI non configurée (MONGODB_URI)");
    updateDatabaseHealth("mongodb", false);
    return;
  }

  try {
    logger.info("🔗 Connexion MongoDB…", { mongoUri: uri.replace(/\/\/.*@/, "//***:***@") });
    await mongoose.connect(uri);
    logger.info("✅ MongoDB connecté", {
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    });
    updateDatabaseHealth("mongodb", true);
  } catch (err) {
    logger.error("⚠️ Échec connexion MongoDB", { message: err.message, name: err.name });
    updateDatabaseHealth("mongodb", false);
  }
}

module.exports = { connectMongo };