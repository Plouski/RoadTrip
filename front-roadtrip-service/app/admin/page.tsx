"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminService } from "@/services/admin-service";
import Loading from "@/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertMessage } from "@/components/ui/alert-message";
import { Users, Map, BarChart3 } from "lucide-react";

const DashboardOverview = dynamic(() => import("./dashboard/page"), {
  ssr: false,
  loading: () => <Loading text="Chargement du dashboard..." />,
});
const UsersListPage = dynamic(() => import("./user/page"), {
  ssr: false,
  loading: () => <Loading text="Chargement des utilisateurs..." />,
});
const RoadtripsListPage = dynamic(() => import("./roadtrip/page"), {
  ssr: false,
  loading: () => <Loading text="Chargement des roadtrips..." />,
});

function useAdminGuard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ok = await AdminService.isAdmin();
        if (!mounted) return;
        if (!ok) {
          router.replace("/");
          setAllowed(false);
        } else {
          setAllowed(true);
        }
      } catch (e) {
        router.replace("/");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  return { loading, allowed } as const;
}

function usePersistentTab(defaultTab: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = useMemo(() => {
    const fromUrl = searchParams?.get("tab");
    if (fromUrl) return fromUrl;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_active_tab");
      if (saved) return saved;
    }
    return defaultTab;
  }, [searchParams, defaultTab]);

  const [tab, setTab] = useState<string>(initial);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_active_tab", tab);
    }
    const sp = new URLSearchParams(Array.from(searchParams?.entries?.() || []));
    sp.set("tab", tab);
    router.replace(`?${sp.toString()}`);
  }, [tab]);

  const onValueChange = useCallback((value: string) => setTab(value), []);

  return { tab, onValueChange } as const;
}

export default function AdminDashboard() {
  const { loading, allowed } = useAdminGuard();
  const { tab, onValueChange } = usePersistentTab("dashboard");

  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | null>(null);

  if (loading) return <Loading text="Chargement des autorisations..." />;
  if (!allowed) return null;

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-6">
        {alertMessage && (
          <AlertMessage message={alertMessage} type={alertType} />
        )}

        <Tabs value={tab} onValueChange={onValueChange} className="space-y-6">
          <TabsList
            className="
    w-full
    flex items-center gap-2 md:gap-3
    overflow-x-auto
    [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']
    p-1
  "
          >
            <TabsTrigger
              value="dashboard"
              className="flex-1 sm:flex-none whitespace-nowrap flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>

            <TabsTrigger
              value="users"
              className="flex-1 sm:flex-none whitespace-nowrap flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Utilisateurs</span>
            </TabsTrigger>

            <TabsTrigger
              value="roadtrips"
              className="flex-1 sm:flex-none whitespace-nowrap flex items-center gap-2"
            >
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Roadtrips</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardOverview onChangeTab={onValueChange} />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UsersListPage />
          </TabsContent>

          <TabsContent value="roadtrips" className="space-y-6">
            <RoadtripsListPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
