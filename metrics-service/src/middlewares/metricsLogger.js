module.exports = function metricsLogger(logger) {
  return (req, res, next) => {
    const start = Date.now();
    req.app.locals.currentConnections = (req.app.locals.currentConnections || 0) + 1;

    res.on("finish", () => {
      const duration = (Date.now() - start) / 1000;
      req.app.locals.currentConnections--;

      const { httpRequestDuration, httpRequestsTotal } = req.app.locals.metrics;

      const route = req.route?.path || req.path;
      const labels = { method: req.method, route, status_code: res.statusCode };

      httpRequestDuration.observe(labels, duration);
      httpRequestsTotal.inc(labels);

      if (duration > 1) {
        logger.performance("Slow request detected", {
          method: req.method,
          path: req.path,
          duration: Math.round(duration * 1000),
          statusCode: res.statusCode,
          requestId: req.id,
        });
      }
    });

    next();
  };
};