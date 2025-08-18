"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthService } from "@/services/auth-service";

export default function OAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleOAuthRedirect = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const redirect = params.get("redirect");

        if (!token) {
          console.error("Token d'authentification manquant.");
          router.push("/login?error=Token+manquant");
          return;
        }

        localStorage.setItem("auth_token", token);

        const user = await AuthService.getProfile();
        const role = user?.role;

        if (redirect) {
          router.push(redirect);
        } else if (role === "admin") {
          router.push("/admin");
        } else {
          router.push("/explorer");
        }
      } catch (error) {
        console.error("Erreur callback OAuth :", error);
        router.push("/login?error=Erreur+lors+de+l%27authentification");
      }
    };

    handleOAuthRedirect();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-500 animate-fade-in">
      <Loader2 className="h-10 w-10 animate-spin text-red-600 mb-5" />
      <p className="text-sm sm:text-base md:text-lg">Connexion en cours...</p>
    </div>
  );
}