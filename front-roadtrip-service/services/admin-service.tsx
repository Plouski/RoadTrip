import { AuthService } from "./auth-service";

const API_URL =
  process.env.NEXT_PUBLIC_DB_SERVICE_URL || "http://localhost:5002";

type RequestOpts = RequestInit & {
  auth?: boolean;
  json?: boolean;
};

const toCurrencySymbol = (c?: string) => {
  if (!c) return "EUR";
  const up = c.toUpperCase();
  return up === "EUR"
    ? "EUR"
    : up === "USD"
    ? "USD"
    : up === "GBP"
    ? "GBP"
    : up;
};

const normalizeBudgetForApi = (b: any) => {
  if (b && typeof b === "object" && "amount" in b) {
    return {
      amount: Number(b.amount) || 0,
      currency: toCurrencySymbol(b.currency),
    };
  }
  const amount =
    typeof b === "number"
      ? b
      : typeof b === "string"
      ? Number(b.replace(/[^\d.]/g, "")) || 0
      : 0;
  return { amount, currency: "EUR" };
};

class AdminAPI {
  private base = API_URL;

  private async request<T = any>(
    path: string,
    opts: RequestOpts = {}
  ): Promise<T> {
    const { auth = true, json, headers: hdrs, ...rest } = opts;

    const headers: Record<string, string> = {};

    if (auth) {
      const authHeaders = await AuthService.getAuthHeaders();
      Object.assign(headers, authHeaders);
    }

    const shouldSendJson =
      typeof json === "boolean" ? json : typeof rest.body !== "undefined";
    if (shouldSendJson) {
      headers["Content-Type"] =
        (hdrs as Record<string, string>)?.["Content-Type"] ||
        "application/json";
    }

    const res = await fetch(`${this.base}${path}`, {
      ...rest,
      headers: { ...headers, ...(hdrs as any) },
    });

    let payload: any = null;
    try {
      payload = await res.json();
    } catch {}

    if (!res.ok) {
      const msg =
        payload?.message ||
        (res.status === 401
          ? "Session expirée, veuillez vous reconnecter"
          : res.status === 403
          ? "Vous n'avez pas les autorisations nécessaires"
          : `Erreur ${res.status}`);
      throw new Error(msg);
    }

    return payload as T;
  }

  //  Auth / Role
  isAdmin = async (): Promise<boolean> => {
    try {
      const user = await AuthService.getProfile();
      return user?.role?.toLowerCase?.() === "admin";
    } catch {
      return false;
    }
  };

  //  Dashboard
  getStats = async () => {
    const data = await this.request<any>("/api/admin/stats", { method: "GET" });

    if (data?.success && data?.stats) {
      const s = data.stats;
      return {
        totalUsers: s.users?.total ?? 0,
        activeUsers: s.users?.verified ?? 0,
        totalRoadtrips: s.trips?.total ?? 0,
        publishedRoadtrips: s.trips?.published ?? 0,
        totalLikes: s.engagement?.favorites ?? 0,
        totalComments: s.engagement?.ai_messages ?? 0,
      };
    }

    // fallback structure
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalRoadtrips: 0,
      publishedRoadtrips: 0,
      totalLikes: 0,
      totalComments: 0,
    };
  };

  getRecentUsers = () =>
    this.request("/api/admin/users/recent", { method: "GET" });

  getRecentRoadtrips = () =>
    this.request("/api/admin/roadtrips/recent", { method: "GET" });

  //  Users
  getUsers = (page = 1, limit = 10, search = "") =>
    this.request(
      `/api/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(
        search
      )}`,
      { method: "GET" }
    );

  getUserById = (userId: string) =>
    this.request(`/api/admin/users/${userId}`, { method: "GET" });

  getUserSubscription = async (userId: string) => {
    const data = await this.request<any>(
      `/api/admin/users/${userId}/subscription`,
      { method: "GET" }
    );
    return data?.subscription;
  };

  updateUserStatus = (userId: string, isVerified: boolean) =>
    this.request(`/api/admin/users/status/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ isVerified }),
    });

  updateUser = (userId: string, userData: any) =>
    this.request(`/api/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });

  deleteUser = (userId: string) =>
    this.request(`/api/admin/users/${userId}`, { method: "DELETE" });

  //  Roadtrips
  getRoadtrips = (page = 1, limit = 10, search = "") =>
    this.request(
      `/api/admin/roadtrips?page=${page}&limit=${limit}&search=${encodeURIComponent(
        search
      )}`,
      { method: "GET" }
    );

  createRoadtrip = async (roadtripData: any) => {
    const token = AuthService.getAuthToken();
    if (!token)
      throw new Error("Vous devez être connecté pour créer un roadtrip");

    const user = await AuthService.getProfile();
    if (!user || user.role !== "admin")
      throw new Error("Vous devez être administrateur pour créer un roadtrip");

    const body = {
      ...roadtripData,
      budget: normalizeBudgetForApi(roadtripData.budget),
      userId: user.id || user.userId,
    };
    return this.request("/api/admin/roadtrips", {
      method: "POST",
      body: JSON.stringify(body),
    });
  };

  updateRoadtrip = async (id: string, roadtripData: any) => {
    const token = AuthService.getAuthToken();
    if (!token)
      throw new Error("Vous devez être connecté pour modifier un roadtrip");

    const user = await AuthService.getProfile();
    if (!user || user.role !== "admin")
      throw new Error(
        "Vous devez être administrateur pour modifier un roadtrip"
      );

    const body = {
      ...roadtripData,
      budget: normalizeBudgetForApi(roadtripData.budget),
      userId: user.id || user.userId,
    };
    return this.request(`/api/admin/roadtrips/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  };

  deleteRoadtrip = async (id: string) => {
    const token = AuthService.getAuthToken();
    if (!token)
      throw new Error("Vous devez être connecté pour supprimer un roadtrip");

    const user = await AuthService.getProfile();
    if (!user || user.role !== "admin")
      throw new Error(
        "Vous devez être administrateur pour supprimer un roadtrip"
      );

    await this.request(`/api/admin/roadtrips/${id}`, { method: "DELETE" });
    return true;
  };

  updateRoadtripStatus = (id: string, isPublished: boolean) =>
    this.request(`/api/admin/roadtrips/status/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isPublished }),
    });
}

export const AdminService = new AdminAPI();
