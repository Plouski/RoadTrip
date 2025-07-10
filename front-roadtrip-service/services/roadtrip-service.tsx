import { AuthService } from "./auth-service";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_DB_SERVICE_URL || "http://localhost:5002";

export const RoadtripService = {
  /**
   * Récupère tous les roadtrips publics avec pagination et filtres
   */
  async getPublicRoadtrips(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append("page", params.page.toString());
      if (params.limit) queryParams.append("limit", params.limit.toString());
      if (params.country) queryParams.append("country", params.country);
      if (params.isPremium !== undefined)
        queryParams.append("isPremium", params.isPremium.toString());

      const url = `${API_GATEWAY_URL}/api/roadtrips${
        queryParams.toString() ? "?" + queryParams.toString() : ""
      }`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Erreur ${res.status}: ${errorText}`);
      }

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Erreur API");
      }

      return data.data;
    } catch (error) {
      console.error("❌ Erreur getPublicRoadtrips:", error);
      throw error;
    }
  },

  /**
   * Récupère les roadtrips populaires
   */
  async getPopularRoadtrips(limit = 3) {
    try {
      const url = `${API_GATEWAY_URL}/api/roadtrips/popular?limit=${limit}`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Erreur ${res.status}: ${errorText}`);
      }

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Erreur API");
      }

      return data.data.trips;
    } catch (error) {
      console.error("❌ Erreur getPopularRoadtrips:", error);
      throw error;
    }
  },

  /**
   * Récupère un roadtrip spécifique par son ID
   */
  async getRoadtripById(id) {
    try {
      if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
        throw new Error("ID de roadtrip invalide");
      }

      const token = AuthService.getAuthToken();
      const headers = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      const url = `${API_GATEWAY_URL}/api/roadtrips/${id}`;

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Erreur lors de la récupération du roadtrip"
        );
      }

      return result.data;
    } catch (error) {
      console.error(`❌ Erreur getRoadtripById ${id}:`, error);
      throw error;
    }
  },

  /**
   * Incrémente le compteur de vues avec body JSON
   */
  async incrementViewCount(id) {
    try {
      if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
        console.warn("⚠️ ID invalide pour incrementViewCount:", id);
        return { views: 0 };
      }

      const url = `${API_GATEWAY_URL}/api/roadtrips/${id}/views`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(
          `⚠️ HTTP Error incrementViewCount:`,
          response.status,
          errorText
        );
        return { views: 0 };
      }

      const result = await response.json();

      if (!result.success) {
        console.warn("⚠️ API Error incrementViewCount:", result.message);
        return { views: 0 };
      }

      console.log("✅ View count incremented:", result.data);
      return result.data;
    } catch (error) {
      console.error(`❌ Erreur incrementViewCount pour ${id}:`, error);
      return { views: 0 };
    }
  },

  /**
   * Version alternative si le serveur n'accepte pas de body vide
   */
  async incrementViewCountAlternative(id) {
    try {
      if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
        return { views: 0 };
      }

      const url = `${API_GATEWAY_URL}/api/roadtrips/${id}/views`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "increment_view",
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        return { views: 0 };
      }

      const result = await response.json();
      return result.data || { views: 0 };
    } catch (error) {
      console.error(`❌ incrementViewCountAlternative error:`, error);
      return { views: 0 };
    }
  },

  /**
   * Récupère les roadtrips avec gestion d'erreur pour l'affichage
   */
  async getPublicRoadtripsForDisplay() {
    try {
      const result = await this.getPublicRoadtrips();
      return result.trips || [];
    } catch (error) {
      console.error("❌ Erreur getPublicRoadtripsForDisplay:", error);
      return [];
    }
  },

  /**
   * Récupère les roadtrips populaires avec gestion d'erreur pour l'affichage
   */
  async getPopularRoadtripsForDisplay() {
    try {
      const trips = await this.getPopularRoadtrips();
      return trips || [];
    } catch (error) {
      console.error("❌ Erreur getPopularRoadtripsForDisplay:", error);
      return [];
    }
  },

  /**
   * Test de connectivité API
   */
  async checkApiHealth() {
    try {
      const response = await fetch(`${API_GATEWAY_URL}/ping`);
      return response.ok;
    } catch (error) {
      console.error("❌ API Health check error:", error);
      return false;
    }
  },
};
