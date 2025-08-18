// services/contact-service.ts - Version avec debug renforcé

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
}

interface ContactResponse {
  success: boolean;
  message: string;
  messageId?: string;
  duration?: string;
  status?: string;
  warning?: string;
}

class ContactAPI {
  private notificationServiceUrl = process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL || "http://localhost:5005";
  private apiKey = process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY;

  constructor() {
    // Debug des variables d'environnement
    console.log("🔧 ContactAPI Configuration:", {
      url: this.notificationServiceUrl,
      hasApiKey: !!this.apiKey,
      apiKeyPreview: this.apiKey ? this.apiKey.substring(0, 8) + "..." : "MISSING"
    });
  }

  async sendContactMessage(formData: ContactFormData): Promise<ContactResponse> {
    try {
      if (!this.apiKey) {
        console.error("❌ API key manquante dans les variables d'environnement");
        throw new Error("Configuration API manquante");
      }

      const requestUrl = `${this.notificationServiceUrl}/api/contact/send`;
      const requestHeaders = {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      };

      const requestBody = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        subject: formData.subject.trim(),
        category: formData.category || 'other',
        message: formData.message.trim(),
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
        source: 'contact-form-frontend'
      };

      console.log("📤 Envoi message de contact...", {
        url: requestUrl,
        method: "POST",
        headers: {
          "Content-Type": requestHeaders["Content-Type"],
          "x-api-key": requestHeaders["x-api-key"].substring(0, 8) + "..."
        },
        body: {
          email: requestBody.email,
          category: requestBody.category,
          bodySize: JSON.stringify(requestBody).length + " chars"
        }
      });

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
      });

      console.log("📥 Réponse reçue:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: {
          'content-type': response.headers.get('content-type'),
          'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        }
      });

      let data;
      try {
        data = await response.json();
        console.log("📋 Données de réponse:", data);
      } catch (jsonError) {
        console.error("❌ Erreur parsing JSON:", jsonError);
        const textResponse = await response.text();
        console.error("📝 Réponse brute:", textResponse);
        throw new Error(`Réponse invalide du serveur: ${response.status}`);
      }

      if (!response.ok) {
        console.error("❌ Erreur réponse serveur:", {
          status: response.status,
          statusText: response.statusText,
          data
        });
        throw new Error(data.message || `Erreur ${response.status}`);
      }

      console.log("✅ Message de contact envoyé avec succès:", {
        success: data.success,
        messageId: data.messageId,
        duration: data.duration,
        status: data.status
      });

      return {
        success: true,
        message: data.message || "Message envoyé avec succès",
        messageId: data.messageId,
        duration: data.duration,
        status: data.status || 'sent'
      };
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi du message de contact:");
      console.error("Type d'erreur:", error.constructor.name);
      console.error("Message d'erreur:", error.message);
      console.error("Stack trace:", error.stack);
      
      // Messages d'erreur plus user-friendly
      let userMessage = "Une erreur est survenue lors de l'envoi du message.";
      
      if (error instanceof Error) {
        if (error.message.includes("fetch")) {
          userMessage = "Impossible de contacter le serveur. Vérifiez votre connexion.";
        } else if (error.message.includes("Configuration")) {
          userMessage = "Service temporairement indisponible. Réessayez plus tard.";
        } else if (error.message.includes("timeout") || error.message.includes("Timeout")) {
          userMessage = "La demande prend plus de temps que prévu, mais votre message est en cours de traitement.";
        } else if (error.message.includes("CORS")) {
          userMessage = "Problème de connexion avec le serveur. Contactez le support.";
        } else {
          userMessage = error.message;
        }
      }

      return {
        success: false,
        message: userMessage,
      };
    }
  }

  // Test simple des variables d'environnement
  debugConfig() {
    console.log("🔍 Debug Configuration:");
    console.log("- URL:", this.notificationServiceUrl);
    console.log("- API Key présente:", !!this.apiKey);
    console.log("- API Key preview:", this.apiKey ? this.apiKey.substring(0, 8) + "..." : "MANQUANTE");
    console.log("- Toutes les variables NEXT_PUBLIC:", 
      Object.keys(process.env)
        .filter(key => key.startsWith('NEXT_PUBLIC_'))
        .reduce((obj, key) => {
          obj[key] = process.env[key];
          return obj;
        }, {})
    );
  }

  // Test de connectivité avec plus de debug
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log("🧪 Test de connectivité vers:", `${this.notificationServiceUrl}/ping`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.notificationServiceUrl}/ping`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log("📡 Réponse ping:", {
        status: response.status,
        ok: response.ok,
        headers: {
          'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
          'content-type': response.headers.get('content-type')
        }
      });
      
      const data = await response.json();
      console.log("📋 Données ping:", data);
      
      return {
        success: response.ok,
        message: data.status || "Service accessible"
      };
    } catch (error) {
      console.error("❌ Erreur test de connectivité:", error);
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: "Service de notification lent à répondre"
        };
      }
      return {
        success: false,
        message: `Service de notification non disponible: ${error.message}`
      };
    }
  }

  // Validation identique à l'original
  validateContactForm(formData: ContactFormData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!formData.name || formData.name.trim().length < 2) {
      errors.push("Le nom doit contenir au moins 2 caractères");
    }

    if (!formData.email || !this.isValidEmail(formData.email)) {
      errors.push("Veuillez entrer une adresse email valide");
    }

    if (!formData.subject || formData.subject.trim().length < 5) {
      errors.push("Le sujet doit contenir au moins 5 caractères");
    }

    if (!formData.message || formData.message.trim().length < 10) {
      errors.push("Le message doit contenir au moins 10 caractères");
    }

    if (formData.message.includes('http://') || formData.message.includes('https://')) {
      if (formData.message.split('http').length > 3) {
        errors.push("Trop de liens dans le message");
      }
    }

    if (formData.message.length > 2000) {
      errors.push("Le message est trop long (maximum 2000 caractères)");
    }

    if (formData.subject.length > 200) {
      errors.push("Le sujet est trop long (maximum 200 caractères)");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  formatCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      problem: "Problème technique",
      info: "Demande d'information",
      suggestion: "Suggestion d'amélioration",
      feedback: "Retour d'expérience",
      other: "Autre",
    };
    return categoryMap[category] || category;
  }

  getCategoryEmoji(category: string): string {
    const emojiMap: Record<string, string> = {
      problem: "🐛",
      info: "ℹ️",
      suggestion: "⭐",
      feedback: "💚",
      other: "💬",
    };
    return emojiMap[category] || "💬";
  }

  getResponseTime(category: string): string {
    const responseTimeMap: Record<string, string> = {
      problem: "2-4 heures",
      info: "24 heures",
      suggestion: "48 heures", 
      feedback: "48 heures",
      other: "24-48 heures",
    };
    return responseTimeMap[category] || "24-48 heures";
  }
}

export const ContactService = new ContactAPI();
export type { ContactFormData, ContactResponse };