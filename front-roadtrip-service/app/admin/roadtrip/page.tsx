"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminService } from "@/services/admin-service";
import {
  Loader2,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Check,
  X,
  Search,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertMessage } from "@/components/ui/alert-message";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export type Roadtrip = {
  _id: string;
  title: string;
  country: string;
  tags?: string[];
  isPublished: boolean;
  isPremium: boolean;
};

function useDebouncedValue<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        className="pl-8"
        placeholder="Rechercher par titre, pays ou tag"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        published
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-slate-50 text-slate-700 border-slate-200"
      }
    >
      {published ? "Publié" : "Brouillon"}
    </Badge>
  );
}

function PremiumBadge() {
  return (
    <Badge
      variant="outline"
      className="border-amber-200 bg-amber-50 text-amber-800"
    >
      Premium
    </Badge>
  );
}

function PaginationControls({
  page,
  total,
  pageSize = 10,
  setPage,
}: {
  page: number;
  total: number;
  pageSize?: number;
  setPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => page > 1 && setPage(page - 1)}
            className={page === 1 ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
        {Array.from({ length: pages }, (_, i) => (
          <PaginationItem key={i}>
            <PaginationLink
              isActive={page === i + 1}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            onClick={() => page < pages && setPage(page + 1)}
            className={page >= pages ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export default function RoadtripsListPage() {
  const router = useRouter();
  const [items, setItems] = useState<Roadtrip[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [alert, setAlert] = useState<{
    message: string;
    type: "success" | "error" | null;
  }>({
    message: "",
    type: null,
  });

  useEffect(() => {
    loadRoadtrips();
  }, [page, debouncedSearch]);

  const pageSize = 10;

  const loadRoadtrips = async () => {
    setLoading(true);
    try {
      const res = await AdminService.getRoadtrips(
        page,
        pageSize,
        debouncedSearch
      );
      setItems(res.trips || []);
      setTotal(res.pagination?.total ?? res.total ?? 0);
    } catch (e) {
      showAlert("Erreur lors du chargement des roadtrips", "error");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message: string, type: "success" | "error") => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: "", type: null }), 3500);
  };

  const toggleStatus = async (id: string, current: boolean) => {
    try {
      setProcessing(true);
      await AdminService.updateRoadtripStatus(id, !current);
      setItems((prev) =>
        prev.map((r) => (r._id === id ? { ...r, isPublished: !current } : r))
      );
      showAlert("Statut mis à jour", "success");
    } catch (e) {
      showAlert("Échec de mise à jour", "error");
    } finally {
      setProcessing(false);
    }
  };

  const deleteRoadtrip = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce roadtrip ?")) return;
    try {
      setProcessing(true);
      await AdminService.deleteRoadtrip(id);
      await loadRoadtrips();
      showAlert("Supprimé avec succès", "success");
    } catch (e) {
      showAlert("Erreur lors de la suppression", "error");
    } finally {
      setProcessing(false);
    }
  };

  const emptyText = useMemo(
    () =>
      debouncedSearch
        ? "Aucun résultat pour votre recherche"
        : "Aucun roadtrip trouvé",
    [debouncedSearch]
  );

  return (
    <div className="container">
      {/* En-tête */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Gestion des roadtrips</h1>
        <Button
          className="w-full sm:w-auto"
          onClick={() => router.push("/admin/roadtrip/create")}
        >
          <Plus className="mr-2 h-4 w-4" /> Nouveau
        </Button>
      </div>

      {/* Alert */}
      {alert.message && (
        <div className="mb-4">
          <AlertMessage message={alert.message} type={alert.type} />
        </div>
      )}

      {/* Barre de recherche */}
      <div className="mb-4 flex items-center gap-2">
        <div className="w-full">
          <SearchInput value={search} onChange={setSearch} />
        </div>
      </div>

      {/* Tableau */}
      <Card>
        <CardHeader>
          <CardTitle>Roadtrips</CardTitle>
          <CardDescription>Liste des roadtrips enregistrés</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="overflow-x-auto rounded border">
            <Table className="min-w-[820px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="whitespace-nowrap">Titre</TableHead>
                  <TableHead className="whitespace-nowrap">Pays</TableHead>
                  <TableHead className="whitespace-nowrap">Tags</TableHead>
                  <TableHead className="whitespace-nowrap">Statut</TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center">
                      {emptyText}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((rt) => (
                    <TableRow key={rt._id} className="align-top">
                      <TableCell className="max-w-[280px]">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 min-w-0">
                          {rt.isPremium && <PremiumBadge />}
                          <span className="break-words sm:truncate">
                            {rt.title}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="break-words sm:truncate">
                          {rt.country}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {rt.tags?.slice(0, 3).map((tag, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {rt.tags && rt.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{rt.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <StatusBadge published={rt.isPublished} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/roadtrip/${rt._id}`)}
                            >
                              <Eye className="mr-2 h-4 w-4" /> Voir
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/admin/roadtrip/update/${rt._id}`)
                              }
                            >
                              <Edit className="mr-2 h-4 w-4" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                toggleStatus(rt._id, rt.isPublished)
                              }
                              disabled={processing}
                            >
                              {rt.isPublished ? (
                                <>
                                  <X className="mr-2 h-4 w-4" /> Dépublier
                                </>
                              ) : (
                                <>
                                  <Check className="mr-2 h-4 w-4" /> Publier
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteRoadtrip(rt._id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="mt-4">
            <PaginationControls
              page={page}
              total={total}
              pageSize={pageSize}
              setPage={setPage}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
