"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthService } from "@/services/auth-service";

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordChangeFormProps {
  onAlert: (message: string, type: "success" | "error") => void;
}

export default function PasswordChangeForm({ onAlert }: PasswordChangeFormProps) {
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  
  // Formulaire de mot de passe
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Gère les changements dans le formulaire
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Change le mot de passe
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    // Regex pour mot de passe fort
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

    if (!strongPasswordRegex.test(passwordData.newPassword)) {
      onAlert(
        "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.",
        "error"
      );
      return;
    }

    // Vérification que les mots de passe correspondent
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      onAlert("Les mots de passe ne correspondent pas", "error");
      return;
    }

    setIsChangingPassword(true);

    try {
      await AuthService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      // Réinitialiser le formulaire
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      onAlert("Mot de passe modifié avec succès", "success");
    } catch (error) {
      console.error("Erreur lors du changement de mot de passe:", error);
      onAlert(
        error instanceof Error ? error.message : "Erreur lors du changement de mot de passe",
        "error"
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Changer de mot de passe</CardTitle>
        <CardDescription>
          Assurez-vous que votre nouveau mot de passe est
          suffisamment fort et différent des précédents.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">
              Mot de passe actuel
            </Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              placeholder="Votre mot de passe actuel"
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">
              Nouveau mot de passe
            </Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              placeholder="Votre nouveau mot de passe"
              onChange={handleInputChange}
              required
            />
            <p className="text-xs text-muted-foreground">
              Minimum 8 caractères, incluant au moins une lettre
              majuscule, une lettre minuscule et un chiffre.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Confirmer le mot de passe
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              placeholder="Confirmation de votre mot de passe"
              onChange={handleInputChange}
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isChangingPassword}>
            {isChangingPassword
              ? "Modification..."
              : "Changer le mot de passe"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}