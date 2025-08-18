"use client";

import { useState } from "react";
import { Shield, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import DeleteAccountDialog from "./deleteAccountDialog";

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role?: string;
  createdAt: string;
}

interface ProfileSidebarProps {
  user: User | null;
  onDeleteAccount: () => Promise<void>;
}

export default function ProfileSidebar({
  user,
  onDeleteAccount,
}: ProfileSidebarProps) {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Première lettre de chaque nom pour l'avatar
  const getInitials = (): string => {
    const first = user?.firstName?.charAt(0) || "?";
    const last = user?.lastName?.charAt(0) || "?";
    return `${first}${last}`.toUpperCase();
  };

  // Gestionnaire de suppression de compte
  const handleDeleteConfirm = async (): Promise<void> => {
    setIsDeleting(true);
    try {
      await onDeleteAccount();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
          <Avatar className="h-24 w-24 bg-red-600 rounded-full flex items-center justify-center text-white">
          <AvatarFallback className="text-xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-lg font-semibold line-clamp-2">
                {user?.firstName} {user?.lastName}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed sm:leading-relaxed">
                {user?.email}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations du compte */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations du compte</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Rôle</dt>
              <dd className="flex items-center">
                <Shield className="h-3.5 w-3.5 mr-1 text-red-600" />
                {user?.role || "Utilisateur"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Membre depuis</dt>
              <dd>
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : "N/A"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Bouton de suppression de compte */}
      <DeleteAccountDialog
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
      >
        <Button>
          <UserX className="mr-2 h-4 w-4" />
          Supprimer mon compte
        </Button>
      </DeleteAccountDialog>
    </div>
  );
}
