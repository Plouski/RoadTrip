import { AuthService } from "./auth-service";

const API_URL = process.env.NEXT_PUBLIC_DB_SERVICE_URL || "http://localhost:5002";

export const FavoriteService = {
  /**
   * Toggle le statut favori d'un roadtrip
   */
  async toggleFavorite(tripId) {
    const token = AuthService.getAuthToken();
    
    if (!token) {
      throw new Error("Connexion requise");
    }

    if (!tripId || !/^[0-9a-fA-F]{24}$/.test(tripId)) {
      throw new Error("ID de roadtrip invalide");
    }

    try {
      const response = await fetch(`${API_URL}/api/favorites/toggle/${tripId}`, {
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

      if (!response.ok) {
        const errorText = await response.text();
        
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
      
      if (typeof result.favorited !== 'boolean') {
        console.warn("Format de réponse inattendu:", result);
        return { favorited: false };
      }
      
      return result;

    } catch (error) {
      console.error("Erreur toggle favorite:", error);
      throw error;
    }
  },

  /**
   * Récupère la liste des favoris de l'utilisateur
   */
  async getFavorites() {
    const token = AuthService.getAuthToken();
    if (!token) {
      return { roadtrips: [] };
    }

    try {
      const response = await fetch(`${API_URL}/api/favorites`, {
        method: "GET",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          AuthService.logout();
          throw new Error("Session expirée");
        }
        
        return { roadtrips: [] };
      }
      
      const result = await response.json();
      
      if (!result.roadtrips || !Array.isArray(result.roadtrips)) {
        console.warn("Structure de réponse inattendue:", result);
        return { roadtrips: [] };
      }
      
      return result;
      
    } catch (error) {
      console.error("Erreur récupération favoris:", error);
      
      if (error.message === "Session expirée") {
        throw error;
      }
      
      return { roadtrips: [] };
    }
  }
};