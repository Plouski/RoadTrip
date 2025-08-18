"use client";

import { useState } from "react";
import { User, Key, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileInfoForm from "./profileInfoForm";
import PasswordChangeForm from "./passwordChangeForm";
import SubscriptionPanel from "./subscriptionPanel";

export default function ProfileTabs({
  user,
  subscription,
  subscriptionLoading,
  isOAuthUser,
  onAlert,
  onUpdateUser,
  onCancelSubscription,
  onReactivateSubscription,
  onChangePlan,
  onGoToPremium,
  onViewPaymentHistory,
  router,
}) {
  const [activeTab, setActiveTab] = useState("profile");

  // Détection OAuth fiable basée uniquement sur authProvider du backend
  const isOAuth = Boolean(
    isOAuthUser || 
    (user?.authProvider && user.authProvider !== "local" && user.authProvider !== null)
  );

  // États de l'abonnement
  const hasActiveSubscription = subscription?.isActive && subscription?.status === "active";
  const hasCanceledButActiveSubscription = subscription?.status === "canceled" && subscription?.isActive;
  const hasExpiredSubscription = subscription?.status === "canceled" && !subscription?.isActive;
  const hasAnySubscription = subscription !== null;
  const shouldShowSubscriptionTab = hasAnySubscription || user?.role === "premium";

  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  // Déterminer le libellé de l'onglet abonnement
  const getSubscriptionTabLabel = () => {
    if (hasActiveSubscription) return "Mon abonnement";
    if (hasCanceledButActiveSubscription) return "Abonnement annulé";
    if (hasExpiredSubscription) return "Abonnement expiré";
    return "Abonnement";
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="mb-6">
        <TabsTrigger value="profile" className="flex items-center">
          <User className="mr-2 h-4 w-4" />
          Informations personnelles
        </TabsTrigger>

        {!isOAuth && (
          <TabsTrigger value="password" className="flex items-center">
            <Key className="mr-2 h-4 w-4" />
            Changer de mot de passe
          </TabsTrigger>
        )}

        {shouldShowSubscriptionTab && (
          <TabsTrigger value="subscription" className="flex items-center">
            <Shield className="mr-2 h-4 w-4" />
            {getSubscriptionTabLabel()}
            {hasCanceledButActiveSubscription && subscription?.daysRemaining !== undefined && (
              <span className="ml-1 text-xs bg-orange-100 text-orange-800 px-1 rounded">
                {subscription.daysRemaining}j
              </span>
            )}
          </TabsTrigger>
        )}
      </TabsList>

      {/* Onglet informations personnelles */}
      <TabsContent value="profile">
        <ProfileInfoForm
          user={user}
          onAlert={onAlert}
          onUpdateUser={onUpdateUser}
        />
      </TabsContent>

      {/* Onglet changement de mot de passe - Masqué pour les utilisateurs OAuth */}
      {!isOAuth && (
        <TabsContent value="password">
          <PasswordChangeForm onAlert={onAlert} />
        </TabsContent>
      )}

      {/* Onglet abonnement */}
      {shouldShowSubscriptionTab && (
        <TabsContent value="subscription">
          <SubscriptionPanel
            subscription={subscription}
            subscriptionLoading={subscriptionLoading}
            onCancelSubscription={onCancelSubscription}
            onReactivateSubscription={onReactivateSubscription}
            onChangePlan={onChangePlan}
            onGoToPremium={onGoToPremium}
            onViewPaymentHistory={onViewPaymentHistory}
            onTabChange={handleTabChange}
            onAlert={onAlert}
            router={router}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}