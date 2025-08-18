import { AuthService } from "./auth-service";

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL || "https://api.example.com";
const NEXT_PUBLIC_DB_SERVICE_URL = process.env.NEXT_PUBLIC_DB_SERVICE_URL || "http://localhost:5001";
const SUBSCRIPTION_API_URL = `${API_GATEWAY_URL}/subscription`;
const CHECKOUT_API_URL = `${SUBSCRIPTION_API_URL}/checkout`;

export const SubscriptionService = {
  /**
   * Récupère l'abonnement actuel de l'utilisateur
   */
  async getCurrentSubscription() {
    try {
      const token = AuthService.getAuthToken();
      if (!token) {
        return null;
      }

      const response = await fetch(`${SUBSCRIPTION_API_URL}/current`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      return await response.json();
    } catch (error) {
      console.error("Erreur getCurrentSubscription:", error);
      return null;
    }
  },

  /**
   * Met à jour le token utilisateur après un changement de rôle
   */
  async refreshUserToken() {
    try {
      const token = AuthService.getAuthToken();
      if (!token) {
        throw new Error("Non authentifié");
      }

      const response = await fetch(`${NEXT_PUBLIC_DB_SERVICE_URL}/api/auth/refresh-user-data`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur refresh token: ${errorText}`);
      }

      const result = await response.json();

      if (result.tokens) {
        AuthService.setAuthTokens(result.tokens);
        console.log("Token mis à jour avec nouveau rôle:", result.user?.role);
      }

      return result;
    } catch (error) {
      console.error("Erreur refreshUserToken:", error);
      throw error;
    }
  },

  /**
   * Annule l'abonnement actuel
   */
  async cancelSubscription() {
    try {
      const token = AuthService.getAuthToken();
      if (!token) {
        throw new Error("Non authentifié");
      }

      const response = await fetch(`${SUBSCRIPTION_API_URL}/cancel`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const result = await response.json();

      try {
        await this.refreshUserToken();
      } catch (refreshError) {
        console.warn("Erreur refresh après annulation:", refreshError);
      }

      return result;
    } catch (error) {
      console.error("Erreur cancelSubscription:", error);
      throw error;
    }
  },

  /**
   * Réactive un abonnement annulé
   */
  async reactivateSubscription() {
    try {
      const token = AuthService.getAuthToken();
      if (!token) {
        throw new Error("Non authentifié");
      }

      const response = await fetch(`${SUBSCRIPTION_API_URL}/reactivate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const result = await response.json();

      // Mettre à jour le token après réactivation
      try {
        await this.refreshUserToken();
      } catch (refreshError) {
        console.warn("Erreur refresh après réactivation:", refreshError);
      }

      return result;
    } catch (error) {
      console.error("Erreur reactivateSubscription:", error);
      throw error;
    }
  },

  /**
   * Change le plan d'abonnement (mensuel/annuel)
   */
  async changePlan(newPlan) {
    try {
      const token = AuthService.getAuthToken();
      if (!token) {
        throw new Error("Non authentifié");
      }

      if (!["monthly", "annual"].includes(newPlan)) {
        throw new Error("Plan invalide. Utilisez 'monthly' ou 'annual'");
      }

      const response = await fetch(`${SUBSCRIPTION_API_URL}/change-plan`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newPlan }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Erreur changePlan:", error);
      throw error;
    }
  },

  /**
   * Lance une session de paiement Stripe
   */
  async startCheckoutSession(plan = "monthly") {
    try {
      const token = AuthService.getAuthToken();
      if (!token) {
        throw new Error("Non authentifié");
      }

      const response = await fetch(CHECKOUT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Erreur startCheckoutSession:", error);
      throw error;
    }
  },

  /**
   * Gère les actions après un paiement réussi
   */
  async handlePaymentSuccess(sessionId = null) {
    try {
      // Attendre un peu pour que le webhook traite le paiement
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const result = await this.refreshUserToken();
      console.log("Utilisateur maintenant premium:", result.user?.role);

      return result;
    } catch (error) {
      console.error("Erreur handlePaymentSuccess:", error);
      return null;
    }
  },

  /**
   * Demande un remboursement
   */
  async requestRefund(reason = "") {
    try {
      const token = AuthService.getAuthToken();
      if (!token) {
        throw new Error("Non authentifié");
      }

      const response = await fetch(`${SUBSCRIPTION_API_URL}/refund`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Erreur requestRefund:", error);
      throw error;
    }
  },

  /**
   * Vérifie l'éligibilité au remboursement
   */
  async checkRefundEligibility() {
    try {
      const token = AuthService.getAuthToken();
      if (!token) {
        throw new Error("Non authentifié");
      }

      const response = await fetch(`${SUBSCRIPTION_API_URL}/refund/eligibility`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      return await response.json();
    } catch (error) {
      console.error("Erreur checkRefundEligibility:", error);
      return { eligible: false, reason: "Erreur de vérification" };
    }
  },

  /**
   * Formate le nom du plan pour l'affichage
   */
  formatPlanName(plan) {
    const planNames = {
      free: "Gratuit",
      monthly: "Mensuel",
      annual: "Annuel",
      premium: "Premium",
    };
    return planNames[plan] || plan || "Inconnu";
  }
};