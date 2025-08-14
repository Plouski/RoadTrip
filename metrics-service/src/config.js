require("dotenv").config();

const SERVICE_NAME = "metrics-service";
const PORT = process.env.PORT || 5006;
const METRICS_PORT = process.env.METRICS_PORT || 9090;
const NODE_ENV = process.env.NODE_ENV || "development";
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || "http://prometheus:9090";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const SERVICE_VERSION = process.env.SERVICE_VERSION || "1.0.0";

module.exports = {
  SERVICE_NAME,
  PORT,
  METRICS_PORT,
  NODE_ENV,
  PROMETHEUS_URL,
  FRONTEND_URL,
  SERVICE_VERSION,
};