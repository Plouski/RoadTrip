"use client";

import { useState, useEffect, FormEvent } from "react";
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

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
}

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

interface ProfileInfoFormProps {
  user: User | null;
  onAlert: (message: string, type: "success" | "error") => void;
  onUpdateUser: (user: User) => void;
}

export default function ProfileInfoForm({ 
  user, 
  onAlert, 
  onUpdateUser 
}: ProfileInfoFormProps) {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Formulaire de profil
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
  });
  
  // Initialiser les données du formulaire quand l'utilisateur change
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
      });
    }
  }, [user]);

  // Gère les changements dans le formulaire
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Enregistre les modifications du profil
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const updatedUser = await AuthService.updateProfile(formData);
      onUpdateUser(updatedUser);
      onAlert("Profil mis à jour avec succès", "success");
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      onAlert(
        error instanceof Error ? error.message : "Erreur lors de la mise à jour du profil",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations personnelles</CardTitle>
        <CardDescription>
          Mettez à jour vos informations personnelles ici. Ces
          informations seront affichées publiquement, alors faites
          attention à ce que vous partagez.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                placeholder="Votre prénom"
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                placeholder="Votre nom"
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled
            />
            <p className="text-xs text-muted-foreground">
              L'email ne peut pas être modifié. Contactez le support
              pour changer d'adresse email.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Téléphone (optionnel)</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="+33 6 12 34 56 78"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSaving}>
            {isSaving
              ? "Enregistrement..."
              : "Enregistrer les modifications"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}