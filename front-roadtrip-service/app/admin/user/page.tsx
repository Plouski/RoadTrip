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
  Search,
  Check,
  X,
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

export type AdminUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role?: "user" | "premium" | "admin";
  isVerified?: boolean;
  createdAt?: string;
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
        placeholder="Rechercher par email, prénom, nom"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function VerifyBadge({ verified }: { verified?: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        verified
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-slate-50 text-slate-700 border-slate-200"
      }
    >
      {verified ? "Vérifié" : "Non vérifié"}
    </Badge>
  );
}

function RoleBadge({ role }: { role?: string }) {
  const map: Record<string, string> = {
    admin: "border-red-200 bg-red-50 text-red-800",
    premium: "border-amber-200 bg-amber-50 text-amber-800",
    user: "border-slate-200 bg-slate-50 text-slate-700",
  };
  const klass = role ? map[role] ?? map.user : map.user;
  const label = role ? role.charAt(0).toUpperCase() + role.slice(1) : "User";
  return (
    <Badge variant="outline" className={klass}>
      {label}
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

export default function UsersListPage() {
  const router = useRouter();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;
  const [search, setSearch] = useState<string>("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [alert, setAlert] = useState<{
    message: string;
    type: "success" | "error" | null;
  }>({ message: "", type: null });

  useEffect(() => {
    loadUsers();
  }, [page, debouncedSearch]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await AdminService.getUsers(page, pageSize, debouncedSearch);
      setItems(res.users || []);
      setTotal(res.pagination?.total ?? res.total ?? 0);
    } catch (e) {
      showAlert("Erreur lors du chargement des utilisateurs", "error");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message: string, type: "success" | "error") => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: "", type: null }), 3500);
  };

  const toggleVerify = async (id: string, current?: boolean) => {
    try {
      setProcessing(true);
      await AdminService.updateUserStatus(id, !current);
      setItems((prev) =>
        prev.map((u) => (u._id === id ? { ...u, isVerified: !current } : u))
      );
      showAlert("Statut vérification mis à jour", "success");
    } catch (e) {
      showAlert("Échec de mise à jour", "error");
    } finally {
      setProcessing(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) return;
    try {
      setProcessing(true);
      await AdminService.deleteUser(id);
      await loadUsers();
      showAlert("Utilisateur supprimé avec succès", "success");
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
        : "Aucun utilisateur trouvé",
    [debouncedSearch]
  );

  return (
    <div className="container">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">
          Gestion des utilisateurs
        </h1>
      </div>

      {/* Alert */}
      {alert.message && (
        <div className="mb-4">
          <AlertMessage message={alert.message} type={alert.type} />
        </div>
      )}

      {/* Search */}
      <div className="mb-4 flex items-center gap-2">
        <div className="w-full">
          <SearchInput value={search} onChange={setSearch} />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs</CardTitle>
          <CardDescription>Liste des utilisateurs</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="overflow-x-auto rounded border">
            <Table className="min-w-[720px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="whitespace-nowrap">Nom</TableHead>
                  <TableHead className="whitespace-nowrap">Email</TableHead>
                  <TableHead className="whitespace-nowrap">Rôle</TableHead>
                  <TableHead className="whitespace-nowrap">
                    Vérification
                  </TableHead>
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
                  items.map((u) => (
                    <TableRow key={u._id} className="align-top">
                      <TableCell className="max-w-[220px]">
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {[u.firstName, u.lastName]
                              .filter(Boolean)
                              .join(" ") || "Utilisateur"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <div className="truncate">{u.email}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <RoleBadge role={u.role} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <VerifyBadge verified={u.isVerified} />
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
                              onClick={() =>
                                router.push(`/admin/user/${u._id}`)
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" /> Voir
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/admin/user/update/${u._id}`)
                              }
                            >
                              <Edit className="mr-2 h-4 w-4" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleVerify(u._id, u.isVerified)}
                              disabled={processing}
                            >
                              {u.isVerified ? (
                                <>
                                  <X className="mr-2 h-4 w-4" /> Marquer non
                                  vérifié
                                </>
                              ) : (
                                <>
                                  <Check className="mr-2 h-4 w-4" /> Marquer
                                  vérifié
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteUser(u._id)}
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
