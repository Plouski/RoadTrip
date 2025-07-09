"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminService } from "@/services/admin-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ArrowLeft } from "lucide-react";
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

  // États pour stocker les données utilisateur, abonnement, chargement, alerte, etc.
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

  // Charge les données utilisateur dès que l'id est disponible
  useEffect(() => {
    if (id) fetchUser();
  }, [id]);

  // Récupère les informations utilisateur et abonnement depuis les services
  const fetchUser = async () => {
    try {
      const data = await AdminService.getUserById(id);
      setUser(data);
      setHasError(false);
    } catch (error) {
      setAlert({
        message: "Impossible de charger l'utilisateur",
        type: "error",
      });
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Supprime l'utilisateur après confirmation
  const handleDelete = async () => {
    if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) return;
    setIsDeleting(true);
    try {
      await AdminService.deleteUser(id);
      router.push("/admin");
    } catch (error) {
      setAlert({ message: "Erreur lors de la suppression", type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  // Affiche un écran de chargement pendant la récupération des données
  if (isLoading) {
    return <Loading text="Chargement des détails de l'utilisateur..." />;
  }

  // Si aucune donnée utilisateur chargée et une erreur est survenue
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

  return (
    <div className="container max-w-3xl py-10 space-y-6">
      {/* Boutons haut de page */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/user/edit/${id}`)}
          >
            <Edit className="mr-2 h-4 w-4" /> Modifier
          </Button>

          <Button onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <Loading text="Suppression..." />
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Message d'alerte */}
      {alert.message && (
        <AlertMessage message={alert.message} type={alert.type} />
      )}

      {/* Informations utilisateur */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Informations utilisateur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-base">
          <Info
            label="Nom complet"
            value={`${user.firstName} ${user.lastName}`}
          />
          <Info label="Email" value={user.email} />
          <Info
            label="Rôle"
            value={
              <Badge
                variant={
                  user.role === "admin"
                    ? "default"
                    : user.role === "premium"
                    ? "premium"
                    : "outline"
                }
              >
                {user.role === "admin"
                  ? "Admin"
                  : user.role === "premium"
                  ? "Premium"
                  : "Utilisateur"}
              </Badge>
            }
          />
          <Info
            label="Statut"
            value={
              <Badge variant={user.isVerified ? "success" : "secondary"}>
                {user.isVerified ? "Actif" : "Inactif"}
              </Badge>
            }
          />
        </CardContent>
      </Card>

      {/* Informations d’abonnement */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Abonnement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-base">
          {subscription ? (
            <>
              <Info label="Plan" value={subscription.plan} />
              <Info label="Statut" value={subscription.status} />
              <Info
                label="Début"
                value={new Date(subscription.startDate).toLocaleDateString()}
              />
              <Info
                label="Méthode de paiement"
                value={subscription.paymentMethod}
              />
            </>
          ) : (
            <div className="text-muted-foreground italic">
              Aucun abonnement actif
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Composant réutilisable pour afficher une ligne d'information
const Info = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-center border-b pb-2">
    <span className="text-muted-foreground font-semibold">{label}</span>
    <span className="text-right">{value}</span>
  </div>
);
