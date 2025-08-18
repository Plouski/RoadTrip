import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth-service";

export const useAuthentication = () => {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuthentication = useCallback(async (): Promise<boolean> => {
    setIsCheckingAuth(true);
    try {
      const { isAuthenticated, role } = 
        await AuthService.checkAuthenticationAndRole();

      if (!isAuthenticated) {
        router.push("/auth");
        return false;
      }

      if (role !== "premium" && role !== "admin") {
        router.push("/premium");
        return false;
      }

      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error("Erreur d'authentification:", error);
      router.push("/auth");
      return false;
    } finally {
      setIsCheckingAuth(false);
    }
  }, [router]);

  return {
    isCheckingAuth,
    isAuthenticated,
    checkAuthentication
  };
};