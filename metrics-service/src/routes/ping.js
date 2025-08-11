const { SERVICE_NAME } = require("../config");

module.exports = (_logger) => (req, res) => {
  res.json({
    status: "pong ✅",
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};