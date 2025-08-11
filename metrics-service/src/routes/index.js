const express = require("express");

const routes = ({ logger }) => {
  const router = express.Router();

  router.get("/", require("./home")(logger));
  router.get("/ping", require("./ping")(logger));
  router.get("/health", require("./health")(logger));
  router.get("/vitals", require("./vitals")(logger));
  router.get("/api/dashboard", require("./dashboard")(logger));
  router.get("/api/services/status", require("./status")(logger));

  return router;
};

module.exports = routes;