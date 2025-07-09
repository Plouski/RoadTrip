const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_DB_SERVICE_URL || "https://api.example.com";
const OAUTH_URL =
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || "https://api.example.com";

export const AuthService = {

  async register(email, password, firstName, lastName) {
    try {
      const res = await fetch(`${API_GATEWAY_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      if (!res.ok)
        throw new Error((await res.json()).message || "Échec d'inscription");

      return await res.json();
    } catch (error) {
      console.error("Erreur d'inscription:", error);
      throw error;
    }
  },

  async login(email, password) {
    try {
      const res = await fetch(`${API_GATEWAY_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok)
        throw new Error((await res.json()).message || "Échec de connexion");

      const data = await res.json();

      localStorage.setItem("auth_token", data.tokens?.accessToken || "");
      localStorage.setItem("refresh_token", data.tokens?.refreshToken || "");

      return data;
    } catch (error) {
      console.error("Erreur pendant la connexion:", error);
      throw error;
    }
  },

  async logout() {
    try {
      const token = this.getAuthToken();

      if (token) {
        await fetch(`${API_GATEWAY_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch((err) => console.warn("Erreur lors de la déconnexion:", err));
      }
    } finally {
      this.clearAuthStorage();
      console.log("Déconnexion réussie, données nettoyées.");
    }
  },

  // Gestion des tokens

  async verifyToken(token) {
    try {
      const res = await fetch(`${API_GATEWAY_URL}/api/auth/verify-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      return data?.valid && data?.user;
    } catch {
      return false;
    }
  },

  async refreshToken() {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_GATEWAY_URL}/api/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      localStorage.setItem("auth_token", data.accessToken);
      return data.accessToken;
    } catch (error) {
      console.warn("Erreur lors du refresh token:", error);
      return null;
    }
  },

  setAuthTokens(tokens) {
    if (tokens.accessToken) {
      localStorage.setItem("auth_token", tokens.accessToken);
      console.log("✅ Access token mis à jour");
    }
    if (tokens.refreshToken) {
      localStorage.setItem("refresh_token", tokens.refreshToken);
      console.log("✅ Refresh token mis à jour");
    }
    
    localStorage.removeItem("userRole");
    console.log("🔄 Cache rôle nettoyé - sera rechargé automatiquement");
  },

  // Vérification de compte

  async verifyAccountToken(token) {
    try {
      const res = await fetch(`${API_GATEWAY_URL}/api/auth/verify-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (!res.ok)
        return {
          success: false,
          message: data.message || "Erreur de vérification.",
        };

      return {
        success: true,
        message: data.message || "Votre compte a bien été vérifié.",
      };
    } catch (err) {
      return {
        success: false,
        message: err.message || "Une erreur est survenue.",
      };
    }
  },

  // Mot de passe

  async initiatePasswordReset(email) {
    try {
      const res = await fetch(
        `${API_GATEWAY_URL}/api/auth/initiate-password-reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      if (!res.ok)
        throw new Error(
          (await res.json()).message ||
            "Erreur lors de la demande de réinitialisation"
        );

      return await res.json();
    } catch (error) {
      console.error("Erreur réinitialisation par email:", error);
      throw error;
    }
  },

  async initiatePasswordResetBySMS(phoneNumber) {
    try {
      const res = await fetch(
        `${API_GATEWAY_URL}/api/auth/initiate-password-reset-sms`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber }),
        }
      );

      if (!res.ok)
        throw new Error(
          (await res.json()).message || "Erreur de réinitialisation par SMS"
        );

      return await res.json();
    } catch (error) {
      console.error("Erreur SMS reset:", error);
      throw error;
    }
  },

  async resetPassword(email, resetCode, newPassword) {
    console.log("📦 Payload resetPassword:", { email, resetCode, newPassword });

    if (!email || !resetCode || !newPassword) {
      throw new Error(
        "Email, code de réinitialisation et nouveau mot de passe requis"
      );
    }

    const res = await fetch(`${API_GATEWAY_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, resetCode, newPassword }),
    });

    if (!res.ok)
      throw new Error((await res.json()).message || "Erreur reset password");

    return await res.json();
  },

  async changePassword(currentPassword, newPassword) {
    const token = this.getAuthToken();
    if (!token) throw new Error("Non authentifié");

    try {
      const res = await fetch(`${API_GATEWAY_URL}/api/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok)
        throw new Error(
          (await res.json()).message || "Erreur changement mot de passe"
        );

      return (await res.json()).message;
    } catch (error) {
      console.error("Erreur changement mot de passe:", error);
      throw error;
    }
  },

  // Profil utilisateur

  async getProfile() {
    const token = this.getAuthToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_GATEWAY_URL}/api/auth/profile`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        this.clearAuthStorage();
        return null;
      }

      return (await res.json()).user;
    } catch (error) {
      console.warn("Erreur getProfile:", error);
      return null;
    }
  },

  async updateProfile(profileData) {
    const token = this.getAuthToken();
    if (!token) throw new Error("Non authentifié");

    try {
      const res = await fetch(`${API_GATEWAY_URL}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (!res.ok)
        throw new Error(
          (await res.json()).message || "Erreur mise à jour du profil"
        );

      return (await res.json()).user;
    } catch (error) {
      console.error("Erreur updateProfile:", error);
      throw error;
    }
  },

  // Connexion sociale

  async socialLogin(provider) {
    try {
      const urlMap = {
        google: `${OAUTH_URL}/auth/oauth/google`,
        facebook: `${OAUTH_URL}/auth/oauth/facebook/callback`,
        github: `${OAUTH_URL}/auth/oauth/github`,
      };

      const url = urlMap[provider.toLowerCase()];
      if (!url) throw new Error(`Fournisseur non supporté : ${provider}`);

      window.location.href = url;
      return new Promise(() => {});
    } catch (error) {
      console.error(`Erreur OAuth (${provider}):`, error);
      throw error;
    }
  },

  // Suppression de compte

  async deleteAccount() {
    const token = this.getAuthToken();
    if (!token) throw new Error("Non authentifié");

    try {
      const res = await fetch(`${API_GATEWAY_URL}/api/auth/account`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(
          (await res.json()).message || "Erreur suppression du compte"
        );
      }

      this.clearAuthStorage();

      return await res.json();
    } catch (error) {
      console.error("Erreur suppression du compte:", error);
      throw error;
    }
  },

  // Vérification session + rôle

  async getAuthHeaders() {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  },

  async checkAuthentication() {
    const token = localStorage.getItem("auth_token");
    if (!token) return false;

    if (await this.verifyToken(token)) return true;

    const newToken = await this.refreshToken();
    if (!newToken || !(await this.verifyToken(newToken))) {
      this.clearAuthStorage();
      return false;
    }

    return true;
  },

  async checkAuthenticationAndRole() {
    const isAuthenticated = await this.checkAuthentication();
    if (!isAuthenticated) {
      return { isAuthenticated: false, role: null };
    }

    const role = await this.getUserRoleAsync();

    return { isAuthenticated: true, role };
  },

  getAuthToken() {
    return localStorage.getItem("auth_token");
  },

  getUserRole() {
    const role = localStorage.getItem("userRole");
    if (role) return role.toLowerCase();
    return null;
  },

  async getUserRoleAsync() {
    const cached = this.getUserRole();
    if (cached) return cached;

    const token = this.getAuthToken();
    if (!token) return null;

    const profile = await this.getProfile();
    if (profile?.role) {
      localStorage.setItem("userRole", profile.role.toLowerCase());
      return profile.role.toLowerCase();
    }

    return null;
  },

  clearAuthStorage() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("userRole");
  },
};