'use client'

import Loading from "@/components/ui/loading";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminService } from "@/services/admin-service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertMessage } from "@/components/ui/alert-message";
import { Users, Map, BarChart3 } from "lucide-react";
import RoadtripsListPage from "./roadtrip/page";
import UsersListPage from "./user/page";
import PushManager from "@/components/pushManager";
import DashboardOverview from "./dashboard/page";

interface User {
  id: string;
  _id?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  isVerified?: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Utilisateurs
  const [user, setUser] = useState<User | null>(null);

  // Alertes et messages
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [alertType, setAlertType] = useState<"success" | "error" | null>(null);

  // Vérifier si l'utilisateur est admin
  useEffect(() => {
    const checkAdminAccess = async (): Promise<void> => {
      try {
        const isAdminUser = await AdminService.isAdmin();

        if (!isAdminUser) {
          router.push("/");
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des droits admin:",
          error
        );
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  // Affichage pendant le chargement initial
  if (isLoading && !isAdmin) {
    return <Loading text="Chargement des autorisations..." />;
  }

  return (
    <>
      {user && <PushManager userId={user.id} />}
      <div className="container py-10">
        <div className="flex flex-col gap-6">
          {alertMessage && (
            <AlertMessage message={alertMessage} type={alertType} />
          )}

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid grid-cols-4 w-full md:w-[500px]">
              <TabsTrigger
                value="dashboard"
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Utilisateurs</span>
              </TabsTrigger>
              <TabsTrigger
                value="roadtrips"
                className="flex items-center gap-2"
              >
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline">Roadtrips</span>
              </TabsTrigger>
            </TabsList>

            {/* Onglet Dashboard - Vue d'ensemble */}
            <TabsContent value="dashboard" className="space-y-6">
              <DashboardOverview onChangeTab={setActiveTab} />
            </TabsContent>

            {/* Onglet Utilisateurs */}
            <TabsContent value="users" className="space-y-6">
              <UsersListPage />
            </TabsContent>

            {/* Onglet Roadtrips */}
            <TabsContent value="roadtrips" className="space-y-6">
              <RoadtripsListPage />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}