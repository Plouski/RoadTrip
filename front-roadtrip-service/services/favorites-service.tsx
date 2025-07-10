import { AuthService } from "./auth-service";

const API_URL = process.env.NEXT_PUBLIC_DB_SERVICE_URL || "http://localhost:5002";

export const FavoriteService = {
  /**
   * Toggle favori avec body JSON
   */
  async toggleFavorite(tripId) {
    console.log("=== DEBUG TOGGLE FAVORITE ===");
    console.log("tripId:", tripId);
    console.log("API_URL:", API_URL);
    
    const token = AuthService.getAuthToken();
    console.log("token exists:", !!token);
    
    if (!token) {
      console.log("Pas de token, erreur");
      throw new Error("Connexion requise");
    }

    if (!tripId || !/^[0-9a-fA-F]{24}$/.test(tripId)) {
      throw new Error("ID de roadtrip invalide");
    }

    const url = `${API_URL}/api/favorites/toggle/${tripId}`;
    console.log("URL complète:", url);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "toggle",
          tripId: tripId,
          timestamp: new Date().toISOString()
        })
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        
        switch (response.status) {
          case 401:
            throw new Error("Session expirée - Reconnectez-vous");
          case 403:
            throw new Error("Accès non autorisé");
          case 404:
            throw new Error("Roadtrip non trouvé");
          case 400:
            throw new Error("Requête invalide");
          default:
            throw new Error(`Erreur ${response.status}: ${errorText}`);
        }
      }

      const result = await response.json();
      console.log("Success result:", result);
      
      if (typeof result.favorited !== 'boolean') {
        console.warn("Format de réponse inattendu:", result);
        return { favorited: false };
      }
      
      return result;

    } catch (error) {
      console.error("Fetch error:", error);
      throw error;
    }
  },

  /**
   * Récupère les favoris
   */
  async getFavorites() {
    const token = AuthService.getAuthToken();
    if (!token) {
      console.log("Pas de token pour getFavorites");
      return { roadtrips: [] };
    }

    try {
      console.log("=== GETTING FAVORITES ===");
      
      const url = `${API_URL}/api/favorites`;
      console.log("URL getFavorites:", url);
      
      const response = await fetch(url, {
        method: "GET",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      console.log("Get favorites status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Get favorites error:", errorText);
        
        if (response.status === 401) {
          AuthService.logout();
          throw new Error("Session expirée");
        }
        
        return { roadtrips: [] };
      }
      
      const result = await response.json();
      console.log("Favorites result:", result);
      
      if (!result.roadtrips || !Array.isArray(result.roadtrips)) {
        console.warn("Structure de réponse inattendue:", result);
        return { roadtrips: [] };
      }
      
      return result;
      
    } catch (error) {
      console.error("Get favorites error:", error);
      
      if (error.message === "Session expirée") {
        throw error;
      }
      
      return { roadtrips: [] };
    }
  },

  /**
   * Vérifie si un roadtrip est en favori
   */
  async isFavorite(tripId) {
    try {
      const favorites = await this.getFavorites();
      return favorites.roadtrips.some(trip => trip._id === tripId);
    } catch (error) {
      console.error("Error checking favorite status:", error);
      return false;
    }
  },

  /**
   * Ajoute aux favoris (explicite)
   */
  async addToFavorites(tripId) {
    try {
      const result = await this.toggleFavorite(tripId);

      if (!result.favorited) {
        return await this.toggleFavorite(tripId);
      }
      
      return result;
    } catch (error) {
      console.error("Error adding to favorites:", error);
      throw error;
    }
  },

  /**
   * Retire des favoris
   */
  async removeFromFavorites(tripId) {
    try {
      const result = await this.toggleFavorite(tripId);

      if (result.favorited) {
        return await this.toggleFavorite(tripId);
      }
      
      return result;
    } catch (error) {
      console.error("Error removing from favorites:", error);
      throw error;
    }
  },

  /**
   * Test de connectivité
   */
  async testFavoritesAPI() {
    const token = AuthService.getAuthToken();
    
    console.log("🧪 Testing Favorites API...");
    console.log("Token:", !!token);
    console.log("API URL:", API_URL);
    
    if (!token) {
      console.log("❌ No token available");
      return false;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/favorites`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      console.log("🧪 Favorites API test:", response.ok ? "PASS" : "FAIL");
      console.log("🧪 Status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("🧪 Data structure:", {
          hasRoadtrips: !!data.roadtrips,
          count: data.roadtrips?.length || 0
        });
      }
      
      return response.ok;
    } catch (error) {
      console.error("🧪 Favorites API test failed:", error);
      return false;
    }
  }
};