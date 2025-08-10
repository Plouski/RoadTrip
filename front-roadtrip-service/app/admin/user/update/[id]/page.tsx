"use client";

import { useEffect, useMemo, useState, ChangeEvent, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminService } from "@/services/admin-service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
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
  const [initialUser, setInitialUser] = useState<UserType | null>(null);
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

  const pickPayload = (u: UserType) => ({
    firstName: (u.firstName ?? "").trim(),
    lastName: (u.lastName ?? "").trim(),
    email: (u.email ?? "").trim(),
    role: u.role,
  });

  const hasChanges = useMemo(() => {
    if (!user || !initialUser) return false;
    return (
      JSON.stringify(pickPayload(user)) !==
      JSON.stringify(pickPayload(initialUser))
    );
  }, [user, initialUser]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setIsLoading(true);
      try {
        const res = await AdminService.getUserById(String(id));
        const u = (res as any)?.user ?? res;
        setUser(u);
        setInitialUser(u);
        setHasError(false);
      } catch (e) {
        setAlert({
          message: "Impossible de charger l'utilisateur",
          type: "error",
        });
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setUser((prev) => (prev ? ({ ...prev, [name]: value } as UserType) : prev));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const payload = pickPayload(user);
      await AdminService.updateUser(String(id), payload);
      setAlert({ message: "Utilisateur mis à jour", type: "success" });
      setInitialUser({ ...(user as UserType) });
      setTimeout(() => router.push("/admin?tab=users"), 1200);
    } catch (error) {
      setAlert({ message: "Échec de la mise à jour", type: "error" });
    } finally {
      setIsSaving(false);
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
        linkHref="/admin?tab=users"
        linkLabel="Retour au dashboard"
      />
    );
  }

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      {/* Header actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          className="w-full justify-start sm:w-auto"
          onClick={() => router.push("/admin?tab=users")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste des utilisateurs
        </Button>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => router.push(`/admin/user/${id}`)}
          >
            Voir la fiche
          </Button>
        </div>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">
            Modifier l'utilisateur
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {/* Alert */}
          {alert.message && (
            <AlertMessage
              className="mb-4"
              message={alert.message}
              type={alert.type}
            />
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Prénom */}
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[160px,1fr]">
              <Label
                htmlFor="firstName"
                className="text-sm text-muted-foreground"
              >
                Prénom
              </Label>
              <Input
                id="firstName"
                name="firstName"
                value={user?.firstName || ""}
                onChange={handleChange}
                placeholder="Le prénom de l'utilisateur"
                required
              />
            </div>

            {/* Nom */}
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[160px,1fr]">
              <Label
                htmlFor="lastName"
                className="text-sm text-muted-foreground"
              >
                Nom
              </Label>
              <Input
                id="lastName"
                name="lastName"
                value={user?.lastName || ""}
                onChange={handleChange}
                placeholder="Le nom de l'utilisateur"
                required
              />
            </div>

            {/* Email */}
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[160px,1fr]">
              <Label htmlFor="email" className="text-sm text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={user?.email || ""}
                onChange={handleChange}
                placeholder="L'email de l'utilisateur"
                required
                className="break-words"
              />
            </div>

            {/* Rôle */}
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[160px,1fr]">
              <Label htmlFor="role" className="text-sm text-muted-foreground">
                Rôle
              </Label>
              <select
                id="role"
                name="role"
                value={user?.role || "user"}
                onChange={handleChange}
                className="mt-0 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="user">Utilisateur</option>
                <option value="premium">Premium</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setUser(initialUser)}
                disabled={!hasChanges || isSaving}
                title={
                  !hasChanges
                    ? "Aucune modification à réinitialiser"
                    : "Réinitialiser les changements"
                }
              >
                Réinitialiser
              </Button>

              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={isSaving || !hasChanges}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer les modifications"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
