"use client";

import { useState, useEffect } from "react";
import { AdminService } from "@/services/admin-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface User {
  _id?: string;
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  isVerified?: boolean;
}

interface Roadtrip {
  _id: string;
  title: string;
  country: string;
  bestSeason?: string;
  isPublished: boolean;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalRoadtrips: number;
  publishedRoadtrips: number;
  totalLikes: number;
  totalComments: number;
}

interface DashboardOverviewProps {
  onChangeTab: (tab: string) => void;
}

export default function DashboardOverview({
  onChangeTab,
}: DashboardOverviewProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentRoadtrips, setRecentRoadtrips] = useState<Roadtrip[]>([]);

  // Statistiques globales
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRoadtrips: 0,
    publishedRoadtrips: 0,
    totalLikes: 0,
    totalComments: 0,
  });

  useEffect(() => {
    const loadDashboardData = async (): Promise<void> => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchStats(),
          fetchRecentUsers(),
          fetchRecentRoadtrips(),
        ]);
      } catch (error) {
        console.error(
          "Erreur lors du chargement des données du dashboard:",
          error
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Récupérer les statistiques globales
  const fetchStats = async (): Promise<void> => {
    try {
      const data = await AdminService.getStats();
      setStats(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
    }
  };

  const fetchRecentUsers = async (): Promise<void> => {
    try {
      const data = await AdminService.getRecentUsers();
      setRecentUsers(data.users);
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des derniers utilisateurs:",
        error
      );
    }
  };

  const fetchRecentRoadtrips = async (): Promise<void> => {
    try {
      const data = await AdminService.getRecentRoadtrips();
      setRecentRoadtrips(data.roadtrips);
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des derniers roadtrips:",
        error
      );
    }
  };

  // Créer un initiale à partir du nom de l'utilisateur
  const getUserInitial = (user: User): string => {
    return (user.firstName?.charAt(0) || user.email.charAt(0)).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Statistiques principales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Utilisateurs
            </CardTitle>
            <CardDescription>Total et actifs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-3xl font-bold">{stats.totalUsers}</div>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {stats.activeUsers} actifs
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.totalUsers > 0
                ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
                : 0}
              % d'utilisateurs actifs
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Roadtrips</CardTitle>
            <CardDescription>Total et publiés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-3xl font-bold">{stats.totalRoadtrips}</div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {stats.publishedRoadtrips} publiés
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.totalRoadtrips > 0
                ? Math.round(
                    (stats.publishedRoadtrips / stats.totalRoadtrips) * 100
                  )
                : 0}
              % de roadtrips publiés
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Derniers utilisateurs et roadtrips */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Derniers utilisateurs inscrits</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {recentUsers.map((user) => (
                  <div
                    key={user._id || user.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-8 w-8 rounded-full bg-red-600 flex items-center justify-center text-white font-medium`}
                      >
                        {getUserInitial(user)}
                      </div>
                      <div>
                        <div className="font-medium">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <Badge variant={user.isVerified ? "success" : "secondary"}>
                      {user.isVerified ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onChangeTab("users")}
                >
                  Voir tous les utilisateurs
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Derniers roadtrips créés</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {recentRoadtrips.map((roadtrip) => (
                  <div
                    key={roadtrip._id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{roadtrip.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {roadtrip.country} — {roadtrip.bestSeason}
                      </div>
                    </div>
                    <Badge
                      variant={roadtrip.isPublished ? "success" : "secondary"}
                    >
                      {roadtrip.isPublished ? "Publié" : "Brouillon"}
                    </Badge>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onChangeTab("roadtrips")}
                >
                  Voir tous les roadtrips
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
