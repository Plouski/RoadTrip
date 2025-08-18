const promClient = require("prom-client");

function createMetrics() {
  const register = new promClient.Registry();
  promClient.collectDefaultMetrics({ register });

  const httpRequestDuration = new promClient.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  });

  const httpRequestsTotal = new promClient.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
  });

  const prometheusConnectionsGauge = new promClient.Gauge({
    name: "prometheus_connections_active",
    help: "Active connections to Prometheus",
  });

  const servicesStatusGauge = new promClient.Gauge({
    name: "monitored_services_status",
    help: "Status of monitored services",
    labelNames: ["service", "instance"],
  });

  register.registerMetric(httpRequestDuration);
  register.registerMetric(httpRequestsTotal);
  register.registerMetric(prometheusConnectionsGauge);
  register.registerMetric(servicesStatusGauge);

  return {
    register,
    metrics: {
      httpRequestDuration,
      httpRequestsTotal,
      prometheusConnectionsGauge,
      servicesStatusGauge,
    },
  };
}

module.exports = { createMetrics };