// roadtrip-service.js
import { AuthService } from "./auth-service";

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_DB_SERVICE_URL || "http://localhost:5002";

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
      if (params.isPremium !== undefined) {
        queryParams.append("isPremium", params.isPremium.toString());
      }

      const url = `${API_GATEWAY_URL}/api/roadtrips${
        queryParams.toString() ? "?" + queryParams.toString() : ""
      }`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Erreur lors de la récupération des roadtrips");
      }

      return data.data;
    } catch (error) {
      console.error("Erreur getPublicRoadtrips:", error);
      throw error;
    }
  },

  /**
   * Récupère les roadtrips populaires
   */
  async getPopularRoadtrips(limit = 3) {
    try {
      const url = `${API_GATEWAY_URL}/api/roadtrips/popular?limit=${limit}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Erreur lors de la récupération des roadtrips populaires");
      }

      return data.data.trips;
    } catch (error) {
      console.error("Erreur getPopularRoadtrips:", error);
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

      const response = await fetch(`${API_GATEWAY_URL}/api/roadtrips/${id}`, {
        method: "GET",
        headers,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Erreur lors de la récupération du roadtrip");
      }

      return result.data;
    } catch (error) {
      console.error(`Erreur getRoadtripById ${id}:`, error);
      throw error;
    }
  },

  /**
   * Incrémente le compteur de vues d'un roadtrip
   */
  async incrementViewCount(id) {
    try {
      if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
        console.warn("ID invalide pour incrementViewCount:", id);
        return { views: 0 };
      }

      const response = await fetch(`${API_GATEWAY_URL}/api/roadtrips/${id}/views`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Erreur HTTP incrementViewCount:`, response.status, errorText);
        return { views: 0 };
      }

      const result = await response.json();

      if (!result.success) {
        console.warn("Erreur API incrementViewCount:", result.message);
        return { views: 0 };
      }

      return result.data;
    } catch (error) {
      console.error(`Erreur incrementViewCount pour ${id}:`, error);
      return { views: 0 };
    }
  },
};