const { EmailChannel } = require("./notificationChannels");
const logger = require("../../utils/logger");

class AlertManager {
  constructor() {
    this.channels = [new EmailChannel()];
    this.lastAlerts = new Map();
    this.alertCooldown = 10 * 60 * 1000;

    this.prometheusUrls = [
      "http://localhost:9090",
      "http://prometheus:9090",
      "http://127.0.0.1:9090",
    ];

    logger.info("🚨 AlertManager initialized", {
      channelsCount: this.channels.length,
      cooldownMinutes: this.alertCooldown / 60000,
      prometheusUrls: this.prometheusUrls
    });
  }

  async checkAlerts() {
    try {
      await this.checkServiceHealth();
    } catch (error) {
      logger.error("💥 Erreur globale AlertManager", {
        error: error.message,
        stack: error.stack
      });
    }
  }

  async checkServiceHealth() {
    const query = "up";

    for (let i = 0; i < this.prometheusUrls.length; i++) {
      const baseUrl = this.prometheusUrls[i];
      const url = `${baseUrl}/api/v1/query?query=${encodeURIComponent(query)}`;

      logger.debug("🔗 Test connexion Prometheus", {
        attempt: i + 1,
        total: this.prometheusUrls.length,
        url: baseUrl
      });

      try {
        const response = await this.makePrometheusRequest(url);

        logger.debug("📊 Réponse Prometheus", {
          baseUrl,
          success: response.success,
          status: response.status,
          hasData: !!response.data
        });

        if (response.success && response.data && response.data.status === "success") {
          const results = response.data.data.result;
          
          logger.info("✅ Prometheus accessible", {
            workingUrl: baseUrl,
            servicesFound: results.length
          });

          await this.processAlerts(results);
          return;
        }
      } catch (error) {
        logger.warn("❌ Échec connexion Prometheus", {
          baseUrl,
          error: error.message
        });
      }
    }

    logger.error("🚫 Aucune URL Prometheus accessible", {
      testedUrls: this.prometheusUrls
    });
  }

  async processAlerts(results) {
    for (const result of results) {
      const serviceName = result.metric.job || result.metric.instance || "unknown";
      const value = parseFloat(result.value[1]);

      logger.debug("🔍 Vérification service", {
        service: serviceName,
        value,
        status: value === 1 ? "UP" : "DOWN"
      });

      if (value === 0) {
        const alertKey = `service-down-${serviceName}`;
        const lastAlert = this.lastAlerts.get(alertKey);
        const now = Date.now();
        const isRecent = lastAlert && now - lastAlert < this.alertCooldown;

        if (!isRecent) {
          logger.warn("🚨 Service DOWN détecté - déclenchement alerte", {
            service: serviceName,
            alertKey,
            lastAlert: lastAlert ? new Date(lastAlert).toISOString() : 'never'
          });

          this.lastAlerts.set(alertKey, now);

          await this.sendAlert({
            id: alertKey,
            severity: "CRITICAL",
            service: serviceName,
            message: `Service ${serviceName} est DOWN`,
            timestamp: new Date().toISOString(),
          });
        } else {
          logger.debug("⏭️ Alerte ignorée - cooldown actif", {
            service: serviceName,
            alertKey,
            remainingCooldownMs: this.alertCooldown - (now - lastAlert)
          });
        }
      } else {
        const alertKey = `service-down-${serviceName}`;
        if (this.lastAlerts.has(alertKey)) {
          this.lastAlerts.delete(alertKey);
          logger.info("🟢 Service recovered - cooldown cleared", {
            service: serviceName,
            alertKey
          });
        }
      }
    }
  }

  async makePrometheusRequest(url) {
    logger.debug("🌐 Requête HTTP Prometheus", { url });

    return new Promise((resolve) => {
      const https = require("https");
      const http = require("http");

      try {
        const urlParsed = new URL(url);
        const client = urlParsed.protocol === "https:" ? https : http;

        const req = client.request(url, {
          method: "GET",
          timeout: 3000,
          headers: { Accept: "application/json" },
        }, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            logger.debug("📦 Réponse HTTP reçue", {
              statusCode: res.statusCode,
              dataLength: data.length
            });

            try {
              const jsonData = JSON.parse(data);
              resolve({
                success: res.statusCode >= 200 && res.statusCode < 300,
                data: jsonData,
                status: res.statusCode,
              });
            } catch (parseError) {
              logger.error("❌ Erreur parsing JSON Prometheus", {
                error: parseError.message,
                dataPreview: data.substring(0, 200)
              });
              resolve({
                success: false,
                error: "Invalid JSON: " + parseError.message,
              });
            }
          });
        });

        req.on("error", (error) => {
          logger.error("❌ Erreur requête Prometheus", {
            url,
            error: error.message,
            code: error.code,
            syscall: error.syscall
          });

          resolve({
            success: false,
            error: `${error.code}: ${error.message}`,
          });
        });

        req.on("timeout", () => {
          logger.warn("⏰ Timeout requête Prometheus", { url });
          req.destroy();
          resolve({
            success: false,
            error: "Timeout (3s)",
          });
        });

        req.end();
      } catch (urlError) {
        logger.error("❌ URL invalide", {
          url,
          error: urlError.message
        });
        resolve({
          success: false,
          error: "Invalid URL: " + urlError.message,
        });
      }
    });
  }

  async sendAlert(alert) {
    logger.info("🚨 Envoi alerte", {
      service: alert.service,
      severity: alert.severity,
      message: alert.message,
      channelsCount: this.channels.length
    });

    for (const channel of this.channels) {
      try {
        const result = await channel.send(alert);
        logger.info("📤 Résultat canal notification", {
          channel: channel.constructor.name,
          success: result.success,
          alertId: alert.id
        });
      } catch (error) {
        logger.error("❌ Erreur canal notification", {
          channel: channel.constructor.name,
          error: error.message,
          alertId: alert.id
        });
      }
    }
  }

  isRecentlyAlerted(alertKey) {
    const lastAlert = this.lastAlerts.get(alertKey);
    return lastAlert && Date.now() - lastAlert < this.alertCooldown;
  }
}

module.exports = { AlertManager };