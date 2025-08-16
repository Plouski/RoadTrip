const logger = require("../../utils/logger");

class EmailChannel {
  constructor() {
    this.serviceUrl = process.env.NOTIFICATION_SERVICE_URL;
    this.apiKey = process.env.NOTIFICATION_API_KEY;
    
    logger.debug("📧 EmailChannel initialized", {
      hasServiceUrl: !!this.serviceUrl,
      hasApiKey: !!this.apiKey
    });
  }

  async send(alert) {
    logger.info("📧 Envoi email alerte", {
      service: alert.service,
      severity: alert.severity,
      adminEmail: process.env.ADMIN_EMAIL ? 'configured' : 'missing'
    });

    if (!this.serviceUrl || !this.apiKey) {
      logger.error("📧 Configuration email manquante", {
        hasServiceUrl: !!this.serviceUrl,
        hasApiKey: !!this.apiKey
      });
      return { success: false, error: "Not configured" };
    }

    try {
      const response = await this.makeRequest(`${this.serviceUrl}/api/alert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          type: "email",
          email: process.env.ADMIN_EMAIL,
          alert: {
            severity: alert.severity,
            service: alert.service,
            message: alert.message,
            timestamp: alert.timestamp,
          },
        }),
      });

      if (response.success) {
        logger.info("✅ Email alerte envoyé avec succès", {
          service: alert.service,
          status: response.status
        });
        return { success: true, result: response.data };
      } else {
        logger.error("❌ Échec envoi email alerte", {
          service: alert.service,
          status: response.status,
          error: response.error
        });
        return { success: false, error: response.error };
      }
    } catch (error) {
      logger.error("💥 Exception envoi email alerte", {
        service: alert.service,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  async makeRequest(url, options) {
    try {
      if (typeof fetch !== "undefined") {
        const response = await fetch(url, options);
        const data = await response.json();
        return {
          success: response.ok,
          data,
          status: response.status,
          error: response.ok ? null : data,
        };
      }
      return await this.makeHttpRequest(url, options);
    } catch (error) {
      logger.error("💥 Erreur requête HTTP", {
        url,
        error: error.message
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async makeHttpRequest(url, options) {
    const https = require("https");
    const http = require("http");
    const urlParsed = new URL(url);
    const client = urlParsed.protocol === "https:" ? https : http;

    return new Promise((resolve) => {
      const req = client.request(url, {
        method: options.method || "GET",
        headers: options.headers || {},
      }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({
              success: res.statusCode >= 200 && res.statusCode < 300,
              data: jsonData,
              status: res.statusCode,
              error: res.statusCode >= 400 ? jsonData : null,
            });
          } catch (error) {
            logger.error("❌ Erreur parsing JSON notification-service", {
              error: error.message,
              statusCode: res.statusCode
            });
            resolve({
              success: false,
              error: "Invalid JSON response",
            });
          }
        });
      });

      req.on("error", (error) => {
        logger.error("❌ Erreur requête notification-service", {
          url,
          error: error.message
        });
        resolve({
          success: false,
          error: error.message,
        });
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }
}

module.exports = { EmailChannel };