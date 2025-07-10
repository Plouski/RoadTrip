"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminService } from "@/services/admin-service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { AlertMessage } from "@/components/ui/alert-message";
import Loading from "@/components/ui/loading";
import { NotFoundMessage } from "@/components/ui/not-found-message";

type UserType = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "user" | "admin" | "premium";
};

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasError, setHasError] = useState(false);
  const [alert, setAlert] = useState<{
    message: string;
    type: "success" | "error" | "";
  }>({
    message: "",
    type: "",
  });

  // Chargement des données utilisateur au montage
  useEffect(() => {
    if (id) fetchUser();
  }, [id]);

  // Récupération des infos utilisateur depuis l'API
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

  // Mise à jour des champs du formulaire
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setUser((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  // Envoi du formulaire
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      await AdminService.updateUser(id, user);
      setAlert({ message: "Utilisateur mis à jour", type: "success" });
      setTimeout(() => router.push("/admin"), 2000);
    } catch (error) {
      setAlert({ message: "Échec de la mise à jour", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  // Affiche un écran de chargement pendant la récupération
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
    <div className="container py-10 max-w-3xl space-y-6">
      {/* Bouton retour */}
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Modifier l'utilisateur</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Affichage de l'alerte si besoin */}
          {alert.message && (
            <AlertMessage
              message={alert.message}
              type={alert.type}
              className="mb-4"
            />
          )}

          {/* Formulaire de modification */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                name="firstName"
                value={user.firstName}
                onChange={handleChange}
                placeholder="Le prénom de l'utilisateur"
                required
              />
            </div>

            <div>
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                name="lastName"
                value={user.lastName}
                onChange={handleChange}
                placeholder="Le nom de l'utilisateur"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={user.email}
                onChange={handleChange}
                placeholder="L'email de l'utilisateur"
                required
              />
            </div>

            <div>
              <Label htmlFor="role">Rôle</Label>
              <select
                id="role"
                name="role"
                value={user.role}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="user">Utilisateur</option>
                <option value="admin">Administrateur</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loading text="Enregistrement..." />
              ) : (
                "Enregistrer les modifications"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
