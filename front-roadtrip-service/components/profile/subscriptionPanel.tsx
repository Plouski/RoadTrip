"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SubscriptionService } from "@/services/subscription-service";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
  DollarSign,
  Info,
} from "lucide-react";

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

interface RefundEligibility {
  eligible: boolean;
  daysSinceStart?: number;
  daysRemainingForRefund?: number;
  maxRefundDays?: number;
  subscriptionStatus?: string;
  startDate?: string;
  reason?: string;
}

interface SubscriptionPanelProps {
  subscription: Subscription | null;
  subscriptionLoading: boolean;
  onCancelSubscription: (immediate?: boolean) => Promise<void>;
  onReactivateSubscription: () => Promise<void>;
  onChangePlan?: (newPlan: "monthly" | "annual") => Promise<void>;
  onGoToPremium: () => void;
  onViewPaymentHistory?: () => void;
  onTabChange: (tab: string) => void;
  router: AppRouterInstance;
  onAlert: (message: string, type: "success" | "error") => void;
}

export default function SubscriptionPanel({
  subscription,
  subscriptionLoading,
  onCancelSubscription,
  onReactivateSubscription,
  onChangePlan,
  onGoToPremium,
  onViewPaymentHistory,
  onTabChange,
  onAlert,
}: SubscriptionPanelProps) {
  const [planChangeLoading, setPlanChangeLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundEligibility, setRefundEligibility] =
    useState<RefundEligibility | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [showRefundDialog, setShowRefundDialog] = useState(false);

  // Charger l'éligibilité au remboursement
  useEffect(() => {
    if (
      subscription &&
      (subscription.status === "active" ||
        (subscription.status === "canceled" && subscription.isActive))
    ) {
      checkRefundEligibility();
    }
  }, [subscription]);

  const checkRefundEligibility = async () => {
    try {
      const eligibility = await SubscriptionService.checkRefundEligibility();
      setRefundEligibility(eligibility);
    } catch (error) {
      console.error("Erreur vérification éligibilité remboursement:", error);
    }
  };

  // Gérer la demande de remboursement
  const handleRequestRefund = async () => {
    try {
      setRefundLoading(true);

      const result = await SubscriptionService.requestRefund(refundReason);

      setShowRefundDialog(false);
      setRefundReason("");

      onAlert(
        `Remboursement demandé avec succès ! Vous recevrez ${
          result.refund?.amount || 0
        }€ sous ${result.refund?.processingTime || "3-5 jours ouvrés"}.`,
        "success"
      );

      window.location.reload();
    } catch (error) {
      console.error("Erreur demande remboursement:", error);
      onAlert(
        error instanceof Error
          ? error.message
          : "Erreur lors de la demande de remboursement",
        "error"
      );
    } finally {
      setRefundLoading(false);
    }
  };

  const isExpired =
    subscription?.status === "canceled" && !subscription?.isActive;

  const isCanceledButActive =
    (subscription?.status === "canceled" &&
      subscription?.isActive &&
      subscription?.cancelationType === "end_of_period") ||
    (subscription?.status === "active" &&
      subscription?.cancelationType === "immediate" &&
      subscription?.refundStatus &&
      subscription?.refundStatus !== "none");

  const isFullyActive =
    subscription?.status === "active" &&
    subscription?.isActive &&
    !subscription?.cancelationType;

  console.log("🔍 États détectés:", {
    isExpired,
    isCanceledButActive,
    isFullyActive,
    hasSubscription: !!subscription,
    subscriptionData: {
      status: subscription?.status,
      isActive: subscription?.isActive,
      cancelationType: subscription?.cancelationType,
      refundStatus: subscription?.refundStatus,
    },
  });

  // Si pas d'abonnement
  if (!subscription) {
    console.log("🔍 Affichage: NoSubscriptionCard");
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aucun abonnement actif</CardTitle>
          <CardDescription>
            Découvrez nos plans premium pour accéder à toutes les
            fonctionnalités.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={onGoToPremium} className="w-full">
            Voir les plans Premium
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // ABONNEMENT EXPIRÉ
  if (isExpired) {
    console.log("🔍 Affichage: ExpiredSubscriptionCard");
    return (
      <Card>
        <CardHeader>
          <CardTitle>Abonnement expiré</CardTitle>
          <CardDescription>
            Votre abonnement Premium a expiré. Renouvelez-le pour retrouver
            l'accès à toutes les fonctionnalités.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                🔒 L'accès aux fonctionnalités premium est suspendu
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={onGoToPremium} className="flex-1">
            Renouveler l'abonnement
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // ABONNEMENT ANNULÉ MAIS ENCORE ACTIF
  if (isCanceledButActive) {
    console.log("🔍 Affichage: CanceledButActiveCard");

    const isImmediateRefund = subscription?.cancelationType === "immediate";
    const title = isImmediateRefund
      ? "Remboursement traité"
      : "Abonnement annulé";
    const badgeText = isImmediateRefund ? "Remboursé" : "Expire bientôt";
    const badgeVariant = isImmediateRefund ? "destructive" : "secondary";
    const description = isImmediateRefund
      ? "Votre demande de remboursement a été traitée. L'accès premium a été suspendu."
      : "Votre abonnement a été annulé mais reste actif jusqu'à expiration.";

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                {title}
                <Badge variant={badgeVariant}>{badgeText}</Badge>
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            {isImmediateRefund ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Clock className="h-5 w-5 text-orange-500" />
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isImmediateRefund ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <DollarSign className="h-4 w-4" />
                <span className="font-medium">Remboursement confirmé</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Votre remboursement sera traité sous 3-5 jours ouvrés.
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-800">
                <span className="font-medium">
                  {subscription.daysRemaining !== undefined &&
                  subscription.daysRemaining > 0
                    ? `${subscription.daysRemaining} jour${
                        subscription.daysRemaining > 1 ? "s" : ""
                      } restant${subscription.daysRemaining > 1 ? "s" : ""}`
                    : subscription.endDate
                    ? `Expire le ${new Date(
                        subscription.endDate
                      ).toLocaleDateString("fr-FR")}`
                    : "Expire bientôt"}
                </span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                Vous gardez tous vos avantages premium jusqu'à la date
                d'expiration.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {isImmediateRefund ? "Ancien plan" : "Plan actuel"}
                </span>
              </div>
              <p className="text-lg font-bold">
                {SubscriptionService.formatPlanName(subscription.plan)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {isImmediateRefund
                    ? "Date de traitement"
                    : "Date d'expiration"}
                </span>
              </div>
              <p className="text-lg">
                {isImmediateRefund
                  ? new Date().toLocaleDateString("fr-FR")
                  : subscription.endDate
                  ? new Date(subscription.endDate).toLocaleDateString("fr-FR")
                  : "Non renseigné"}
              </p>
            </div>
          </div>

          {/* Informations sur le remboursement si éligible et pas encore remboursé */}
          {refundEligibility && !isImmediateRefund && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Remboursement possible
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {refundEligibility.eligible
                      ? `Vous pouvez demander un remboursement (${refundEligibility.daysRemainingForRefund} jours restants)`
                      : refundEligibility.reason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Informations post-remboursement */}
          {isImmediateRefund && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Prochaines étapes
                  </p>
                  <ul className="text-xs text-blue-700 mt-1 space-y-1">
                    <li>
                      • Votre remboursement sera crédité sur votre compte sous
                      3-5 jours
                    </li>
                    <li>• Vous recevrez un email de confirmation</li>
                    <li>• Vous pouvez souscrire à nouveau à tout moment</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {isImmediateRefund ? (
            // Actions pour remboursement traité
            <div className="flex gap-2 w-full">
              <Button onClick={onGoToPremium} className="flex-1">
                Souscrire à nouveau
              </Button>
              {onViewPaymentHistory && (
                <Button
                  variant="outline"
                  onClick={onViewPaymentHistory}
                  className="flex-1"
                >
                  Historique des paiements
                </Button>
              )}
            </div>
          ) : (
            // Actions pour abonnement annulé mais actif
            <div className="flex gap-2 w-full">
              <Button
                onClick={onReactivateSubscription}
                disabled={subscriptionLoading}
                className="flex-1"
              >
                {subscriptionLoading
                  ? "Réactivation..."
                  : "Réactiver l'abonnement"}
              </Button>

              {/* Bouton de remboursement si éligible */}
              {refundEligibility?.eligible && (
                <Dialog
                  open={showRefundDialog}
                  onOpenChange={setShowRefundDialog}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline">Demander un remboursement</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Demander un remboursement</DialogTitle>
                      <DialogDescription>
                        Vous pouvez demander un remboursement de votre
                        abonnement. Celui-ci sera traité sous 3-5 jours ouvrés.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="refund-reason">
                          Raison du remboursement (optionnel)
                        </Label>
                        <Textarea
                          id="refund-reason"
                          placeholder="Expliquez brièvement pourquoi vous souhaitez être remboursé..."
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                          maxLength={500}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {refundReason.length}/500 caractères
                        </p>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <p className="text-sm text-yellow-800">
                          ⚠️ Attention : Demander un remboursement annulera
                          définitivement votre abonnement et vous perdrez
                          immédiatement l'accès aux fonctionnalités premium.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowRefundDialog(false)}
                        disabled={refundLoading}
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={handleRequestRefund}
                        disabled={refundLoading}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {refundLoading
                          ? "Traitement..."
                          : "Confirmer le remboursement"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
    );
  }

  // ABONNEMENT PLEINEMENT ACTIF
  if (isFullyActive) {
    console.log("🔍 Affichage: ActiveSubscriptionCard");
    const otherPlan = subscription.plan === "monthly" ? "annual" : "monthly";

    const handleCancel = async (immediate: boolean = false): Promise<void> => {
      await onCancelSubscription(immediate);
      onTabChange("profile");
    };

    const handleChangePlan = async (
      newPlan: "monthly" | "annual"
    ): Promise<void> => {
      if (!onChangePlan) return;
      setPlanChangeLoading(true);
      try {
        await onChangePlan(newPlan);
      } finally {
        setPlanChangeLoading(false);
      }
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                Mon abonnement Premium
                <Badge variant="default">Actif</Badge>
              </CardTitle>
              <CardDescription>
                Gérez votre abonnement, changez de plan ou annulez à tout
                moment.
              </CardDescription>
            </div>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Informations du plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Plan actuel</span>
              </div>
              <p className="text-lg font-bold">
                {SubscriptionService.formatPlanName(subscription.plan)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Prochain renouvellement</span>
              </div>
              <p className="text-lg">
                {subscription.endDate
                  ? new Date(subscription.endDate).toLocaleDateString("fr-FR")
                  : "Non renseigné"}
              </p>
            </div>
          </div>

          {/* Informations sur le remboursement */}
          {refundEligibility && (
            <div
              className={`border rounded-lg p-4 ${
                refundEligibility.eligible
                  ? "bg-green-50 border-green-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-start gap-2">
                <DollarSign
                  className={`h-4 w-4 mt-0.5 ${
                    refundEligibility.eligible
                      ? "text-green-600"
                      : "text-gray-400"
                  }`}
                />
                <div>
                  <p
                    className={`text-sm font-medium ${
                      refundEligibility.eligible
                        ? "text-green-800"
                        : "text-gray-600"
                    }`}
                  >
                    {refundEligibility.eligible
                      ? "Remboursement possible"
                      : "Remboursement non disponible"}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      refundEligibility.eligible
                        ? "text-green-700"
                        : "text-gray-500"
                    }`}
                  >
                    {refundEligibility.eligible
                      ? `Vous avez ${refundEligibility.daysRemainingForRefund} jours pour demander un remboursement`
                      : refundEligibility.reason}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {/* Actions principales */}
          <div className="flex flex-wrap gap-2 w-full">
            {/* Changement de plan */}
            {onChangePlan && (
              <Button
                variant="outline"
                onClick={() => handleChangePlan(otherPlan)}
                disabled={subscriptionLoading || planChangeLoading}
                className="flex-1"
              >
                {planChangeLoading
                  ? "Changement..."
                  : `Passer au plan ${SubscriptionService.formatPlanName(
                      otherPlan
                    )}`}
              </Button>
            )}
          </div>

          {/* Actions secondaires */}
          <div className="flex gap-2 w-full">
            {/* Bouton de remboursement pour abonnement actif */}
            {refundEligibility?.eligible && (
              <Dialog
                open={showRefundDialog}
                onOpenChange={setShowRefundDialog}
              >
                <DialogTrigger asChild>
                  <Button variant="outline">Demander un remboursement</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Demander un remboursement</DialogTitle>
                    <DialogDescription>
                      Vous pouvez demander un remboursement complet de votre
                      abonnement. Votre accès sera immédiatement suspendu.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="refund-reason">
                        Raison du remboursement (optionnel)
                      </Label>
                      <Textarea
                        id="refund-reason"
                        placeholder="Expliquez brièvement pourquoi vous souhaitez être remboursé..."
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        maxLength={500}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {refundReason.length}/500 caractères
                      </p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-sm text-red-800">
                        ⚠️ Attention : Le remboursement annulera immédiatement
                        votre abonnement. Cette action est irréversible.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowRefundDialog(false)}
                      disabled={refundLoading}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleRequestRefund}
                      disabled={refundLoading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {refundLoading
                        ? "Traitement..."
                        : "Confirmer le remboursement"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Button
              onClick={() => handleCancel()}
              disabled={subscriptionLoading}
              className="flex-1"
            >
              {subscriptionLoading ? "Annulation..." : "Annuler l'abonnement"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  }

  // État inattendu
  console.log("🔍 Affichage: UnexpectedStateCard");
  return (
    <Card className="border-yellow-500">
      <CardHeader>
        <CardTitle className="text-yellow-700">⚠️ État inattendu</CardTitle>
        <CardDescription>
          L'abonnement est dans un état non reconnu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <p className="text-sm text-yellow-800 mb-2">Détails de debug :</p>
          <pre className="text-xs text-yellow-700 whitespace-pre-wrap">
            {JSON.stringify(
              {
                status: subscription?.status,
                isActive: subscription?.isActive,
                cancelationType: subscription?.cancelationType,
                endDate: subscription?.endDate,
                plan: subscription?.plan,
              },
              null,
              2
            )}
          </pre>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={() => window.location.reload()} className="w-full">
          Actualiser la page
        </Button>
      </CardFooter>
    </Card>
  );
}
