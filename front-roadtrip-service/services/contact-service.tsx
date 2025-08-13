// services/contact-service.ts - Version optimisée

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

  async sendContactMessage(formData: ContactFormData): Promise<ContactResponse> {
    try {
      if (!this.apiKey) {
        throw new Error("Configuration API manquante");
      }

      console.log("📤 Envoi message de contact...", {
        email: formData.email,
        category: formData.category,
        url: `${this.notificationServiceUrl}/api/contact/send`
      });

      const response = await fetch(`${this.notificationServiceUrl}/api/contact/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          subject: formData.subject.trim(),
          category: formData.category || 'other',
          message: formData.message.trim(),
          timestamp: new Date().toISOString(),
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
          source: 'contact-form-frontend'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ Erreur réponse serveur:", {
          status: response.status,
          statusText: response.statusText,
          data
        });
        throw new Error(data.message || `Erreur ${response.status}`);
      }

      console.log("✅ Message de contact envoyé:", {
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
      console.error("❌ Erreur lors de l'envoi du message de contact:", error);
      
      // Messages d'erreur plus user-friendly
      let userMessage = "Une erreur est survenue lors de l'envoi du message.";
      
      if (error instanceof Error) {
        if (error.message.includes("fetch")) {
          userMessage = "Impossible de contacter le serveur. Vérifiez votre connexion.";
        } else if (error.message.includes("Configuration")) {
          userMessage = "Service temporairement indisponible. Réessayez plus tard.";
        } else if (error.message.includes("timeout") || error.message.includes("Timeout")) {
          userMessage = "La demande prend plus de temps que prévu, mais votre message est en cours de traitement.";
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

  // Test de connectivité avec timeout court
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 secondes max

      const response = await fetch(`${this.notificationServiceUrl}/ping`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      
      return {
        success: response.ok,
        message: data.status || "Service accessible"
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: "Service de notification lent à répondre"
        };
      }
      return {
        success: false,
        message: "Service de notification non disponible"
      };
    }
  }

  // Méthode pour valider les données avant envoi
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

    // Validation anti-spam basique
    if (formData.message.includes('http://') || formData.message.includes('https://')) {
      if (formData.message.split('http').length > 3) { // Plus de 2 liens
        errors.push("Trop de liens dans le message");
      }
    }

    // Vérification de longueur maximale
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

  // Méthode pour formater la catégorie en français
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

  // Méthode pour obtenir l'emoji correspondant à la catégorie
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

  // Méthode pour obtenir le temps de réponse estimé
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