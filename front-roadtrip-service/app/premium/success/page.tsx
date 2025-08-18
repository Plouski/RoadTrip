"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthService } from "@/services/auth-service";
import { SubscriptionService } from "@/services/subscription-service";
import Loading from "@/components/ui/loading";

export default function PremiumSuccessPage() {
  const [loading, setLoading] = useState(true);
  const [refreshingToken, setRefreshingToken] = useState(true);
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      try {
        console.log("🎉 Traitement du paiement réussi...");

        // 1. D'abord refresh le token pour avoir le nouveau rôle
        setRefreshingToken(true);
        await SubscriptionService.handlePaymentSuccess();

        console.log("✅ Token mis à jour avec rôle premium");

        // 2. Ensuite récupérer les données mises à jour
        setRefreshingToken(false);
        setLoading(true);

        const [userData, sub] = await Promise.all([
          AuthService.getProfile(),
          SubscriptionService.getCurrentSubscription(),
        ]);

        setUser(userData);
        setSubscription(sub);

        // 3. Vérifier que l'utilisateur a bien le rôle premium
        if (userData?.role === "premium") {
          console.log("✅ Utilisateur confirmé en premium");
        } else {
          console.warn("⚠️ Rôle pas encore mis à jour:", userData?.role);
          setError(
            "Le rôle premium n'est pas encore activé. Veuillez vous reconnecter."
          );
        }
      } catch (error) {
        console.error("❌ Erreur lors du traitement du paiement:", error);
        setError(
          "Erreur lors de l'activation de votre abonnement premium. Veuillez vous reconnecter."
        );
      } finally {
        setLoading(false);
        setRefreshingToken(false);
      }
    };

    handlePaymentSuccess();
  }, []);

  // Fonction pour forcer la reconnexion si le refresh a échoué
  const handleForceReconnection = () => {
    AuthService.logout();
    router.push(
      "/auth?message=Veuillez vous reconnecter pour activer votre abonnement premium"
    );
  };

  if (refreshingToken) {
    return (
      <Loading text="Mise à jour de vos permissions premium en cours..." />
    );
  }

  if (loading) {
    return <Loading text="Chargement de votre abonnement..." />;
  }

  // Affichage d'erreur avec option de reconnexion
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-6">
          <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <RefreshCw className="h-6 w-6 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-yellow-700">
            Activation en cours...
          </h1>
          <p className="text-gray-600 text-sm">{error}</p>

          <div className="flex flex-col gap-3">
            <Button onClick={handleForceReconnection}>
              Se reconnecter maintenant
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-6">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
        <h1 className="text-2xl font-bold">Bienvenue dans Premium !</h1>

        <p className="text-gray-600 text-sm leading-relaxed sm:leading-relaxed">
          Merci {user?.firstName} pour votre abonnement{" "}
          <strong>
            {subscription?.plan === "annual" ? "annuel" : "mensuel"}
          </strong>{" "}
          !
        </p>

        {/* Affichage du rôle pour débugger */}
        <div className="rounded-lg bg-green-50 p-4 text-left text-sm">
          <p>
            <span className="font-medium">Rôle :</span>{" "}
            <span className="text-green-700 font-semibold">
              {user?.role === "premium" ? "✅ Premium" : `⚠️ ${user?.role}`}
            </span>
          </p>
          <p>
            <span className="font-medium">Statut :</span> {subscription?.status}
          </p>
          <p>
            <span className="font-medium">Début :</span>{" "}
            {subscription?.startDate
              ? new Date(subscription.startDate).toLocaleDateString()
              : "N/A"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => router.push("/ai")}>
            Essayer l'IA Premium
          </Button>
          <Button variant="secondary" onClick={() => router.push("/profile")}>
            Voir mon profil
          </Button>
        </div>

        {/* Message d'information si le rôle n'est pas encore premium */}
        {user?.role !== "premium" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
            <p className="text-yellow-800">
              💡 Si vous ne pouvez pas accéder aux fonctionnalités premium,
              essayez de vous reconnecter.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleForceReconnection}
              className="mt-2"
            >
              Se reconnecter
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
