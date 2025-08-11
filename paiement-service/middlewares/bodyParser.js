const express = require("express");

function jsonAndUrlencodedExceptWebhook(req, res, next) {
  const isRaw = ["/webhook", "/webhooks/stripe"].includes(req.path);
  if (!isRaw) {
    return express.json({ limit: "1mb" })(req, res, () =>
      express.urlencoded({ extended: true })(req, res, next)
    );
  }
  next();
}

const rawForWebhook = express.raw({ type: "application/json" });

module.exports = { jsonAndUrlencodedExceptWebhook, rawForWebhook };