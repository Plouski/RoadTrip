const { httpRequestDuration, httpRequestsTotal, updateActiveConnections } = require("../metrics");
const logger = require("../utils/logger");

let currentConnections = 0;

module.exports = (req, res, next) => {
  const start = Date.now();
  currentConnections++;
  updateActiveConnections(currentConnections);

  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    currentConnections--;
    updateActiveConnections(currentConnections);

    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path || req.path, status_code: res.statusCode },
      duration
    );

    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    });

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
};