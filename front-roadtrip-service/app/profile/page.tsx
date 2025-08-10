"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth-service";
import { SubscriptionService } from "@/services/subscription-service";
import { AlertMessage } from "@/components/ui/alert-message";
import Loading from "@/components/ui/loading";
import ProfileSidebar from "@/components/profile/profileSidebar";
import ProfileTabs from "@/components/profile/profileTabs";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, [router]);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      const token = AuthService.getAuthToken();
      if (!token) {
        router.push("/auth");
        return;
      }

      const [userData, currentSub] = await Promise.all([
        AuthService.getProfile(),
        SubscriptionService.getCurrentSubscription(),
      ]);

      console.log("Data loaded from backend:", {
        userData,
        currentSub,
        subStatus: currentSub?.status,
        subIsActive: currentSub?.isActive,
        subCancelationType: currentSub?.cancelationType,
        authProvider: userData?.authProvider,
      });

      setUser(userData);
      setSubscription(currentSub);
    } catch (error) {
      console.error("Erreur lors du chargement du profil:", error);
      setAlertMessage(
        "Impossible de charger votre profil. Veuillez vous reconnecter."
      );
      setAlertType("error");
      setTimeout(() => {
        AuthService.logout();
        router.push("/auth");
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlert = (message, type) => {
    setAlertMessage(message);
    setAlertType(type);

    setTimeout(() => {
      setAlertMessage("");
      setAlertType(null);
    }, 5000);
  };

  const handleDeleteAccount = async () => {
    try {
      await AuthService.deleteAccount();
      handleAlert("Votre compte a été supprimé", "success");

      setTimeout(() => {
        AuthService.logout();
        router.push("/");
      }, 2000);
    } catch (error) {
      console.error("Erreur lors de la suppression du compte:", error);
      handleAlert(
        error instanceof Error
          ? error.message
          : "Erreur lors de la suppression du compte",
        "error"
      );
    }
  };

  const handleCancelSubscription = async (immediate = false) => {
    try {
      setSubscriptionLoading(true);

      const confirmMessage =
        "Êtes-vous sûr de vouloir annuler votre abonnement ? Vous garderez vos avantages jusqu'à la fin de la période de facturation.";

      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) return;

      console.log("Tentative d'annulation...");

      const result = await SubscriptionService.cancelSubscription();

      console.log("Annulation réussie:", result);

      await fetchUserData();

      const message = `Votre abonnement a été annulé.${
        result.subscription?.endDate
          ? ` Vous gardez vos avantages jusqu'au ${new Date(
              result.subscription.endDate
            ).toLocaleDateString("fr-FR")}.`
          : ""
      }`;

      handleAlert(message, "success");
    } catch (error) {
      console.error("Erreur lors de l'annulation de l'abonnement:", error);

      let errorMessage = "Une erreur est survenue lors de l'annulation.";
      if (error instanceof Error) {
        if (error.message.includes("déjà programmé")) {
          errorMessage = error.message;
          await fetchUserData();
        } else {
          errorMessage = error.message;
        }
      }

      handleAlert(errorMessage, "error");
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    console.log("handleReactivateSubscription appelé");

    if (!subscription) {
      handleAlert("Aucun abonnement trouvé à réactiver.", "error");
      return;
    }

    if (subscription.status !== "canceled" || !subscription.isActive) {
      handleAlert("Cet abonnement ne peut pas être réactivé.", "error");
      return;
    }

    const confirmed = window.confirm(
      "Voulez-vous réactiver votre abonnement ? Les prélèvements automatiques reprendront."
    );

    if (!confirmed) {
      console.log("Réactivation annulée par l'utilisateur");
      return;
    }

    try {
      setSubscriptionLoading(true);

      const result = await SubscriptionService.reactivateSubscription();

      await fetchUserData();

      handleAlert(
        "Votre abonnement a été réactivé avec succès ! Les prélèvements automatiques ont repris.",
        "success"
      );
    } catch (error) {
      let errorMessage = "Une erreur est survenue lors de la réactivation.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      handleAlert(errorMessage, "error");
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleChangePlan = async (newPlan) => {
    try {
      setSubscriptionLoading(true);

      if (!subscription) {
        handleAlert("Aucun abonnement trouvé.", "error");
        return;
      }

      if (subscription.status !== "active" || !subscription.isActive) {
        handleAlert(
          "Seuls les abonnements actifs peuvent être modifiés.",
          "error"
        );
        return;
      }

      if (subscription.plan === newPlan) {
        handleAlert(
          `Vous êtes déjà sur le plan ${
            newPlan === "monthly" ? "Mensuel" : "Annuel"
          }.`,
          "error"
        );
        return;
      }

      const planName = newPlan === "monthly" ? "Mensuel" : "Annuel";
      const currentPlanName =
        subscription.plan === "monthly" ? "Mensuel" : "Annuel";

      const confirmed = window.confirm(
        `Voulez-vous changer du plan ${currentPlanName} vers le plan ${planName} ?\n\n` +
          `${
            newPlan === "annual"
              ? "Avantage : Économisez ~25% par rapport au plan mensuel"
              : "Note : Le plan mensuel coûte plus cher à l'année"
          }\n\n` +
          `La facturation sera ajustée automatiquement.`
      );

      if (!confirmed) return;

      const result = await SubscriptionService.changePlan(newPlan);

      await fetchUserData();

      const message = `Plan changé avec succès vers ${planName}.`;

      handleAlert(message, "success");
    } catch (error) {
      console.error("Erreur lors du changement de plan:", error);

      let errorMessage = "Une erreur est survenue lors du changement de plan.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      handleAlert(errorMessage, "error");
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Gestionnaire de mise à jour du profil
  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
    handleAlert("Profil mis à jour avec succès", "success");
  };

  // Gestionnaire pour aller vers la page premium
  const handleGoToPremium = () => {
    router.push("/premium");
  };

  // Gestionnaire pour voir l'historique des paiements
  const handleViewPaymentHistory = () => {
    router.push("/profile/payments");
  };

  // Vérifier si l'utilisateur s'est connecté via OAuth
  const isOAuthUser = user?.authProvider && user.authProvider !== "local";

  if (isLoading) {
    return <Loading text="Chargement de votre profil..." />;
  }

  return (
    <div className="container py-10 max-w-4xl">
      <h1 className="text-3xl font-bold mb-5">Mon Profil</h1>

      {alertMessage && (
        <div className="mb-6">
          <AlertMessage message={alertMessage} type={alertType} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr] gap-6">
        {/* Sidebar avec avatar et informations de base */}
        <ProfileSidebar
          user={user}
          subscription={subscription}
          onDeleteAccount={handleDeleteAccount}
        />

        {/* Sections principales */}
        <ProfileTabs
          user={user}
          subscription={subscription}
          subscriptionLoading={subscriptionLoading}
          isOAuthUser={isOAuthUser}
          onAlert={handleAlert}
          onUpdateUser={handleUpdateUser}
          onCancelSubscription={handleCancelSubscription}
          onReactivateSubscription={handleReactivateSubscription}
          onChangePlan={handleChangePlan}
          onGoToPremium={handleGoToPremium}
          onViewPaymentHistory={handleViewPaymentHistory}
          router={router}
        />
      </div>
    </div>
  );
}
