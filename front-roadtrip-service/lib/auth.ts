// lib/auth.ts

/**
 * Récupère le token d'authentification JWT depuis le localStorage.
 */
export function getAuthToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("auth_token")
}

/**
 * Extrait et retourne le rôle utilisateur à partir du token JWT (admin, user...).
 */
export function getUserRole(): string {
    if (typeof window === "undefined") return "user"

    const token = getAuthToken()
    if (!token) return "user"

    try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        return payload?.role || "user"
    } catch (error) {
        console.warn("Erreur lors du décodage du token JWT:", error)
        return "user"
    }
}
