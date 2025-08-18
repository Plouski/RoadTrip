"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminService } from "@/services/admin-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { AlertMessage } from "@/components/ui/alert-message";
import Loading from "@/components/ui/loading";
import { NotFoundMessage } from "@/components/ui/not-found-message";

type User = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "user" | "premium" | "admin";
  isVerified: boolean;
};

type SubscriptionType = {
  plan: string;
  status: string;
  startDate: string;
  paymentMethod: string;
};

export default function UserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionType | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [alert, setAlert] = useState<{
    message: string;
    type: "success" | "error" | "";
  }>({
    message: "",
    type: "",
  });
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [hasError, setHasError] = useState(false);

  const isActive = (s?: string) =>
    ["active", "trialing"].includes((s || "").toLowerCase());

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    (async () => {
      setIsLoading(true);
      try {
        const [u, sub] = await Promise.allSettled([
          AdminService.getUserById(String(id)),
          AdminService.getUserSubscription(String(id)),
        ]);

        if (!mounted) return;

        if (u.status === "fulfilled") {
          const val = (u.value as any)?.user ?? u.value;
          setUser(val as User);
          setHasError(false);
        } else {
          setHasError(true);
          setAlert({
            message: "Impossible de charger l'utilisateur",
            type: "error",
          });
        }

        if (sub.status === "fulfilled") {
          setSubscription((sub.value as any) ?? null);
        } else {
          setSubscription(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) return;
    setIsDeleting(true);
    try {
      await AdminService.deleteUser(String(id));
      router.push("/admin");
    } catch (error) {
      setAlert({ message: "Erreur lors de la suppression", type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <Loading text="Chargement des détails de l'utilisateur..." />;
  }

  if (!user && hasError) {
    return (
      <NotFoundMessage
        title="Utilisateur introuvable"
        message="L'utilisateur que vous recherchez n'existe pas ou a été supprimé."
        linkHref="/admin"
        linkLabel="Retour au dashboard"
      />
    );
  }

  const roleKlass =
    user?.role === "admin"
      ? "border-purple-200 bg-purple-50 text-purple-800"
      : user?.role === "premium"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-slate-200 bg-slate-50 text-slate-700";

  const statusKlass = user?.isVerified
    ? "border-green-200 bg-green-50 text-green-700"
    : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      {/* Header actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          className="w-full sm:w-auto justify-start"
          onClick={() => router.push("/admin?tab=users")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste des utilisateurs
        </Button>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => router.push(`/admin/user/update/${id}`)}
          >
            <Edit className="mr-2 h-4 w-4" /> Modifier
          </Button>

          <Button
            className="w-full sm:w-auto"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Suppression...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Alert */}
      {alert.message && (
        <AlertMessage message={alert.message} type={alert.type} />
      )}

      {/* User info */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">
            Informations utilisateur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <Info
            label="Nom complet"
            value={
              `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "—"
            }
          />
          <Info
            label="Email"
            value={<span className="break-words">{user?.email || "—"}</span>}
          />
          <Info
            label="Rôle"
            value={
              <Badge
                variant="outline"
                className={roleKlass + " inline-flex w-auto"}
              >
                {user?.role === "admin"
                  ? "Admin"
                  : user?.role === "premium"
                  ? "Premium"
                  : "Utilisateur"}
              </Badge>
            }
          />
          <Info
            label="Statut"
            value={
              <Badge
                variant="outline"
                className={statusKlass + " inline-flex w-auto"}
              >
                {user?.isVerified ? "Vérifié" : "Non vérifié"}
              </Badge>
            }
          />
        </CardContent>
      </Card>

      {/* Subscription info */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Abonnement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {subscription && isActive(subscription.status) ? (
            <>
              <Info label="Plan" value={subscription.plan} />
              <Info
                label="Statut"
                value={
                  <Badge
                    variant="outline"
                    className={
                      ["active", "trialing"].includes(
                        subscription.status.toLowerCase()
                      )
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }
                  >
                    {subscription.status}
                  </Badge>
                }
              />
              <Info
                label="Début"
                value={new Date(subscription.startDate).toLocaleDateString(
                  undefined,
                  {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                  }
                )}
              />
              <Info
                label="Méthode de paiement"
                value={subscription.paymentMethod}
              />
            </>
          ) : (
            <div className="italic text-muted-foreground">
              Aucun abonnement actif
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Ligne d'info responsive (label / valeur) */
const Info = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-1 items-start gap-2 border-b pb-3 last:border-b-0 sm:grid-cols-[160px,1fr]">
    <span className="text-sm font-medium text-muted-foreground">{label}</span>
    <div className="break-words text-sm sm:text-right">{value}</div>
  </div>
);
