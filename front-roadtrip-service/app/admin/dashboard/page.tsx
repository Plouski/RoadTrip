"use client";

import { useEffect, useState, useMemo } from "react";
import { AdminService } from "@/services/admin-service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface UserDTO {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  isVerified?: boolean;
}

interface RoadtripDTO {
  _id: string;
  title: string;
  country: string;
  bestSeason?: string;
  isPublished: boolean;
}

interface StatsDTO {
  totalUsers: number;
  activeUsers: number;
  totalRoadtrips: number;
  publishedRoadtrips: number;
  totalLikes: number;
  totalComments: number;
}

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  isVerified?: boolean;
}

interface Roadtrip {
  id: string;
  title: string;
  country: string;
  bestSeason?: string;
  isPublished: boolean;
}

interface DashboardOverviewProps {
  onChangeTab: (tab: string) => void;
}

export default function DashboardOverview({
  onChangeTab,
}: DashboardOverviewProps) {
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [loadingRoadtrips, setLoadingRoadtrips] = useState<boolean>(true);
  const [stats, setStats] = useState<StatsDTO>({
    totalUsers: 0,
    activeUsers: 0,
    totalRoadtrips: 0,
    publishedRoadtrips: 0,
    totalLikes: 0,
    totalComments: 0,
  });

  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentRoadtrips, setRecentRoadtrips] = useState<Roadtrip[]>([]);

  const getUserInitial = (u: User): string =>
    (u.firstName?.trim()?.[0] ?? u.email?.trim()?.[0] ?? "?").toUpperCase();

  const activeUsersPercent = useMemo(() => {
    if (!stats.totalUsers) return 0;
    return Math.round((stats.activeUsers / stats.totalUsers) * 100);
  }, [stats.activeUsers, stats.totalUsers]);

  const publishedRoadtripsPercent = useMemo(() => {
    if (!stats.totalRoadtrips) return 0;
    return Math.round((stats.publishedRoadtrips / stats.totalRoadtrips) * 100);
  }, [stats.publishedRoadtrips, stats.totalRoadtrips]);

  const fetchStats = async (): Promise<void> => {
    setLoadingStats(true);
    try {
      const data: StatsDTO = await AdminService.getStats();
      setStats(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchRecentUsers = async (): Promise<void> => {
    setLoadingUsers(true);
    try {
      const res = await AdminService.getRecentUsers();
      const users: User[] =
        (res?.users as UserDTO[] | undefined)?.map((u) => ({
          id: u._id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          isVerified: u.isVerified,
        })) ?? [];
      setRecentUsers(users);
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des derniers utilisateurs:",
        error
      );
      setRecentUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchRecentRoadtrips = async (): Promise<void> => {
    setLoadingRoadtrips(true);
    try {
      const res = await AdminService.getRecentRoadtrips();
      const rts: Roadtrip[] =
        (res?.roadtrips as RoadtripDTO[] | undefined)?.map((r) => ({
          id: r._id,
          title: r.title,
          country: r.country,
          bestSeason: r.bestSeason,
          isPublished: r.isPublished,
        })) ?? [];
      setRecentRoadtrips(rts);
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des derniers roadtrips:",
        error
      );
      setRecentRoadtrips([]);
    } finally {
      setLoadingRoadtrips(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRecentUsers();
    fetchRecentRoadtrips();
  }, []);

  return (
    <div className="container">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Dashboard</h1>
        <div className="flex gap-2"></div>
      </div>

      <div className="space-y-6">
        {/* Statistiques principales */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="min-h-[140px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                Utilisateurs
              </CardTitle>
              <CardDescription>Total et actifs</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-3xl font-bold">
                      {stats.totalUsers}
                    </div>
                    <Badge
                      variant="outline"
                      className="border-green-200 bg-green-50 text-green-700"
                    >
                      {stats.activeUsers} actifs
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {activeUsersPercent}% d'utilisateurs actifs
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="min-h-[140px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Roadtrips</CardTitle>
              <CardDescription>Total et publiés</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-3xl font-bold">
                      {stats.totalRoadtrips}
                    </div>
                    <Badge
                      variant="outline"
                      className="border-blue-200 bg-blue-50 text-blue-700"
                    >
                      {stats.publishedRoadtrips} publiés
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {publishedRoadtripsPercent}% de roadtrips publiés
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Derniers utilisateurs et roadtrips */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Derniers utilisateurs inscrits</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {recentUsers.map((user) => (
                    <div
                      key={user.id}
                      className="grid grid-cols-1 sm:grid-cols-[1fr,auto] items-start sm:items-center gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-red-600 text-white text-sm font-medium">
                          {getUserInitial(user)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium leading-snug break-words">
                            {[user.firstName, user.lastName]
                              .filter(Boolean)
                              .join(" ") || "Utilisateur"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </div>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={
                          (user.isVerified
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-slate-200 bg-slate-50 text-slate-700") +
                          " inline-flex w-auto self-start sm:self-auto"
                        }
                      >
                        {user.isVerified ? "Vérifié" : "Non vérifié"}
                      </Badge>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
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
              {loadingRoadtrips ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {recentRoadtrips.map((roadtrip) => (
                    <div
                      key={roadtrip.id}
                      className="grid grid-cols-1 sm:grid-cols-[1fr,auto] items-start sm:items-center gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-medium leading-snug break-words">
                          {roadtrip.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {roadtrip.country}
                          {roadtrip.bestSeason
                            ? ` — ${roadtrip.bestSeason}`
                            : ""}
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={
                          (roadtrip.isPublished
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-slate-200 bg-slate-50 text-slate-700") +
                          " inline-flex w-auto self-start sm:self-auto"
                        }
                      >
                        {roadtrip.isPublished ? "Publié" : "Brouillon"}
                      </Badge>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
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
    </div>
  );
}
