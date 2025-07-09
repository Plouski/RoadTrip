"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function OAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleOAuthRedirect = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const redirect = params.get("redirect") || "/";

        if (!token) {
          console.error("Token d'authentification manquant.");
          router.push("/login?error=Token+manquant");
          return;
        }

        localStorage.setItem("auth_token", token);
        router.push(redirect);
      } catch (error) {
        console.error("Erreur lors du traitement du callback OAuth :", error);
        router.push("/login?error=Erreur+lors+de+l%27authentification");
      }
    };

    handleOAuthRedirect();
  }, [router]);

  // Petit retour visuel pendant la redirection
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-500 animate-fade-in">
      <Loader2 className="h-10 w-10 animate-spin text-red-600 mb-5" />
      <p className="text-sm sm:text-base md:text-lg">Connexion en cours...</p>
    </div>
  );
}
