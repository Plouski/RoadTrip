"use client";

import { useState } from "react";
import { User, Key, Shield, CreditCard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileInfoForm from "./profileInfoForm";
import PasswordChangeForm from "./passwordChangeForm";
import SubscriptionPanel from "./subscriptionPanel";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  role?: string;
  authProvider?: string;
}

interface Subscription {
  _id: string;
  plan: "free" | "monthly" | "annual" | "premium";
  status: "active" | "canceled" | "suspended" | "trialing" | "incomplete";
  isActive: boolean;
  startDate: string;
  endDate?: string;
  paymentMethod?: string;
  cancelationType?: "immediate" | "end_of_period";
  daysRemaining?: number;
}

interface ProfileTabsProps {
  user: User | null;
  subscription: Subscription | null;
  subscriptionLoading: boolean;
  onAlert: (message: string, type: "success" | "error") => void;
  onUpdateUser: (user: User) => void;
  onCancelSubscription: (immediate?: boolean) => Promise<void>;
  onReactivateSubscription: () => Promise<void>;
  onChangePlan: (newPlan: "monthly" | "annual") => Promise<void>;
  onGoToPremium: () => void;
  onViewPaymentHistory: () => void;
  router: AppRouterInstance;
}

export default function ProfileTabs({
  user,
  subscription,
  subscriptionLoading,
  onAlert,
  onUpdateUser,
  onCancelSubscription,
  onReactivateSubscription,
  onChangePlan,
  onGoToPremium,
  onViewPaymentHistory,
  router,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("profile");
  const isOAuthUser = user?.authProvider && user.authProvider !== "local";
  const hasActiveSubscription =
    subscription?.isActive && subscription?.status === "active";
  const hasCanceledButActiveSubscription =
    subscription?.status === "canceled" && subscription?.isActive;
  const hasExpiredSubscription =
    subscription?.status === "canceled" && !subscription?.isActive;
  const hasAnySubscription = subscription !== null;
  const shouldShowSubscriptionTab =
    hasAnySubscription || user?.role === "premium";
  const handleTabChange = (value: string): void => {
    setActiveTab(value);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="mb-6">
        <TabsTrigger value="profile" className="flex items-center">
          <User className="mr-2 h-4 w-4" />
          Informations personnelles
        </TabsTrigger>

        {!isOAuthUser && (
          <TabsTrigger value="password" className="flex items-center">
            <Key className="mr-2 h-4 w-4" />
            Changer de mot de passe
          </TabsTrigger>
        )}

        {shouldShowSubscriptionTab && (
          <TabsTrigger value="subscription" className="flex items-center">
            <Shield className="mr-2 h-4 w-4" />
            {hasActiveSubscription
              ? "Mon abonnement"
              : hasCanceledButActiveSubscription
              ? "Abonnement annulé"
              : hasExpiredSubscription
              ? "Abonnement expiré"
              : "Abonnement"}
            {hasCanceledButActiveSubscription &&
              subscription?.daysRemaining !== undefined && (
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

      {/* Onglet changement de mot de passe */}
      {!isOAuthUser && (
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
