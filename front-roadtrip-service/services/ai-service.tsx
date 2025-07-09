import { AuthService } from "./auth-service";

const AI_SERVICE_URL =
  process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:5003";

export const AiService = {
  /**
   * Envoie une question à l'assistant IA et récupère la réponse
   */
  async askAssistant(query: string, params: any = {}): Promise<any> {
    try {
      const token = AuthService.getAuthToken();

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${AI_SERVICE_URL}/api/ai/ask`, {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: query, ...params }),
      });

      if (!response.ok) {
        throw new Error(
          `Erreur HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Erreur AiService.askAssistant:", error);
      throw error;
    }
  },

  /**
   * Sauvegarde un message dans une conversation
   */
  async saveMessage(
    role: string,
    content: string,
    conversationId: string
  ): Promise<any> {
    try {
      const token = AuthService.getAuthToken();

      const response = await fetch(`${AI_SERVICE_URL}/api/ai/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ role, content, conversationId }),
      });

      if (!response.ok) {
        throw new Error(
          `Erreur HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Erreur AiService.saveMessage:", error);
      throw error;
    }
  },

  /**
   * Récupère l'historique des conversations de l'utilisateur
   */
  async getHistory(): Promise<any> {
    try {
      const token = AuthService.getAuthToken();

      const response = await fetch(`${AI_SERVICE_URL}/api/ai/history`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(
          `Erreur HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Erreur AiService.getHistory:", error);
      throw error;
    }
  },

  /**
   * Récupère une conversation spécifique par son ID
   */
  async getConversationById(conversationId: string): Promise<any> {
    try {
      const token = AuthService.getAuthToken();

      const response = await fetch(
        `${AI_SERVICE_URL}/api/ai/conversation/${conversationId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Erreur HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Erreur AiService.getConversationById:", error);
      throw error;
    }
  },

  /**
   * Supprime une conversation spécifique
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      const token = AuthService.getAuthToken();

      const response = await fetch(
        `${AI_SERVICE_URL}/api/ai/conversation/${conversationId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Erreur HTTP ${response.status}: ${response.statusText}`
        );
      }

      return true;
    } catch (error) {
      console.error("Erreur AiService.deleteConversation:", error);
      throw error;
    }
  },
};
