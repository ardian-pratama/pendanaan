"use client";

import { useEffect, useState, useTransition, useCallback, useMemo } from "react";
import { AdminTopBar } from "@/components/admin/admin-sidebar";
import {
  fetchUserProfiles,
  updateUserRoleAndPermissions,
  fetchAdminOrders,
  getCurrentUserProfile,
  getFriendlyErrorMessage,
  type OrderWithItems,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/client";
import { ErrorBanner } from "@/components/admin/error-banner";
import type { UserProfile, UserRole, PermissionKey } from "@/lib/supabase/database.types";
import {
  ALL_PERMISSIONS,
  ROLE_CONFIG,
  ROLE_DEFAULT_PERMISSIONS,
  hasPermission,
  isStaffOrAdmin,
} from "@/lib/auth/permissions";
import { formatRupiah } from "@/lib/data/menu-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Users,
  ShieldCheck,
  Shield,
  Search,
  RefreshCw,
  ShoppingBag,
  Mail,
  Calendar,
  CheckCircle2,
  Lock,
  KeyRound,
  Check,
  Sliders,
  Sparkles,
  Info,
  ShieldAlert,
  UserCheck,
} from "lucide-react";

const roleFilterTabs: { id: "semua" | UserRole; label: string }[] = [
  { id: "semua", label: "Semua Akun" },
  { id: "superadmin", label: "Super Admin" },
  { id: "admin", label: "Admin Panitia" },
  { id: "bendahara", label: "Bendahara" },
  { id: "staff", label: "Staff Booth" },
  { id: "user", label: "Pelanggan" },
];

export default function AdminCustomersPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoleFilter, setActiveRoleFilter] = useState<"semua" | UserRole>("semua");
  const [searchQuery, setSearchQuery] = useState("");

  // Permissions Modal state
  const [manageUser, setManageUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("user");
  const [selectedPerms, setSelectedPerms] = useState<PermissionKey[]>([]);
  const [permModalOpen, setPermModalOpen] = useState(false);

  // Orders History Modal state
  const [ordersUser, setOrdersUser] = useState<UserProfile | null>(null);
  const [userOrders, setUserOrders] = useState<OrderWithItems[]>([]);
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [data, profile] = await Promise.all([
        fetchUserProfiles(),
        getCurrentUserProfile(),
      ]);
      setUsers(data);
      if (profile) {
        if (!isStaffOrAdmin(profile.role)) {
          window.location.href = "/?unauthorized=admin";
          return;
        }
        setCurrentUser(profile);
      }
    } catch (err: unknown) {
      setErrorMessage(
        getFriendlyErrorMessage(err, "Gagal memuat data pengguna dan hak akses. Periksa koneksi internet Anda.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();

    const supabase = createClient();
    const channel = supabase
      .channel("admin-customers-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_profiles" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as UserProfile;
            setUsers((prev) =>
              prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u))
            );
          } else {
            loadUsers();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadUsers]);

  const canViewUsers = hasPermission(currentUser, "users:view");
  const canManageUsers = hasPermission(currentUser, "users:manage");

  // Open Permission Modal for a specific user
  const handleOpenPermissions = (user: UserProfile) => {
    if (!canManageUsers) {
      showToast("Anda hanya memiliki izin melihat pengguna (read-only), tidak dapat mengubah hak akses.");
      return;
    }
    setManageUser(user);
    const userRole = (user.role as UserRole) || "user";
    setSelectedRole(userRole);

    // Initial permissions: if user already has permissions array, use it; otherwise use role defaults
    if (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
      setSelectedPerms(user.permissions as PermissionKey[]);
    } else {
      setSelectedPerms(ROLE_DEFAULT_PERMISSIONS[userRole] || []);
    }
    setPermModalOpen(true);
  };

  // Change role inside modal -> automatically pre-fill recommended permissions
  const handleRoleSelect = (newRole: UserRole) => {
    setSelectedRole(newRole);
    setSelectedPerms(ROLE_DEFAULT_PERMISSIONS[newRole] || []);
  };

  // Toggle single permission checkbox
  const handleTogglePermission = (key: PermissionKey) => {
    setSelectedPerms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  // Select all or deselect all
  const handleSelectAllPerms = () => {
    setSelectedPerms(ALL_PERMISSIONS.map((p) => p.key));
  };
  const handleDeselectAllPerms = () => {
    setSelectedPerms([]);
  };

  // Save role and permissions
  const handleSavePermissions = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageUser) return;

    if (!canManageUsers) {
      showToast("Anda tidak memiliki izin (users:manage) untuk mengubah role atau hak akses.");
      return;
    }

    // Safety warning if user demotes their own currently logged-in account to user
    if (manageUser.id === currentUser?.id && selectedRole === "user") {
      const confirmed = window.confirm(
        "PERINGATAN KRUSIAL:\nAnda sedang mengubah role akun Anda sendiri menjadi 'Pelanggan'.\n\nJika disimpan, akun Anda akan kehilangan semua akses panitia dan Anda akan langsung diarahkan keluar dari panel admin.\n\nApakah Anda benar-benar yakin ingin melanjutkan?"
      );
      if (!confirmed) return;
    }

    startTransition(async () => {
      try {
        await updateUserRoleAndPermissions(manageUser.id, selectedRole, selectedPerms);
        setUsers((prev) =>
          prev.map((u) =>
            u.id === manageUser.id
              ? { ...u, role: selectedRole, permissions: selectedPerms }
              : u
          )
        );
        setPermModalOpen(false);
        showToast(
          `Hak akses & role untuk ${manageUser.full_name || manageUser.email} berhasil diperbarui!`
        );

        // If the current user demoted themselves, redirect them out immediately
        if (manageUser.id === currentUser?.id && !isStaffOrAdmin(selectedRole)) {
          window.location.href = "/?unauthorized=admin";
        }
      } catch (err: unknown) {
        showToast(getFriendlyErrorMessage(err, "Gagal memperbarui hak akses pengguna."));
      }
    });
  };

  // View user order history
  const handleViewOrders = async (user: UserProfile) => {
    setOrdersUser(user);
    setOrdersModalOpen(true);
    setLoadingOrders(true);
    try {
      const allOrders = await fetchAdminOrders({
        search: user.email || user.full_name || "",
      });
      setUserOrders(allOrders);
    } catch (err) {
      console.error(err);
      setUserOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Group permissions by category for the modal
  const categories = useMemo(
    () => Array.from(new Set(ALL_PERMISSIONS.map((p) => p.category))),
    []
  );

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole =
        activeRoleFilter === "semua" || u.role === activeRoleFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        u.role.toLowerCase().includes(q);
      return matchRole && matchSearch;
    });
  }, [users, activeRoleFilter, searchQuery]);

  const staffCount = useMemo(
    () => users.filter((u) => isStaffOrAdmin(u.role)).length,
    [users]
  );
  const customerCount = useMemo(
    () => users.filter((u) => !isStaffOrAdmin(u.role)).length,
    [users]
  );

  if (!canViewUsers && !loading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <AdminTopBar title="Kelola Pengguna & Hak Akses" />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 text-center rounded-2xl shadow-md border-border">
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground">Akses Pengguna Dibatasi</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Akun Anda tidak memiliki izin untuk melihat daftar pengguna (<code>users:view</code>). Hubungi Super Admin untuk penyesuaian hak akses.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminTopBar title="Kelola Pengguna & Hak Akses" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6 pb-16 min-w-0">
        {/* Error notification banner */}
        {errorMessage && (
          <ErrorBanner
            message={errorMessage}
            onRetry={loadUsers}
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2
                className="text-xl sm:text-2xl font-bold text-foreground tracking-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Kelola Pengguna &amp; Hak Akses (RBAC)
              </h2>
              {!canManageUsers && (
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                  Mode Lihat Saja
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Atur role kepanitiaan (Super Admin, Admin, Bendahara, Staff Booth) dan kontrol wewenang izin tiap akun.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadUsers()}
              className="gap-1.5 text-xs font-semibold rounded-xl border-border bg-card shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Segarkan</span>
            </Button>
          </div>
        </div>

        {/* User Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 rounded-2xl border-border bg-card shadow-xs flex items-center gap-3.5">
            <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Total Pengguna Terdaftar</p>
              <p className="text-xl font-bold text-foreground">{users.length} Akun</p>
            </div>
          </Card>

          <Card className="p-4 rounded-2xl border-border bg-card shadow-xs flex items-center gap-3.5">
            <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Total Panitia &amp; Staf</p>
              <p className="text-xl font-bold text-emerald-600">{staffCount} Akun</p>
            </div>
          </Card>

          <Card className="p-4 rounded-2xl border-border bg-card shadow-xs flex items-center gap-3.5">
            <div className="size-11 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Pelanggan / Pembeli</p>
              <p className="text-xl font-bold text-foreground">{customerCount} Akun</p>
            </div>
          </Card>
        </div>

        {/* Roles Quick Reference Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(["superadmin", "admin", "bendahara", "staff", "user"] as UserRole[]).map(
            (r) => {
              const cfg = ROLE_CONFIG[r];
              const count = users.filter((u) => u.role === r).length;
              return (
                <Card
                  key={r}
                  onClick={() => setActiveRoleFilter(r)}
                  className={`p-3.5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between border-border shadow-xs ${
                    activeRoleFilter === r
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${cfg.badgeCls}`}>
                      {cfg.label}
                    </Badge>
                    <span className="text-xs font-bold text-foreground">
                      {count}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                    {cfg.description}
                  </p>
                </Card>
              );
            }
          )}
        </div>

        {/* Filter and Search Bar */}
        <Card className="p-3 sm:p-4 rounded-2xl border-border bg-card shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Role tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {roleFilterTabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeRoleFilter === tab.id ? "default" : "ghost"}
                size="xs"
                onClick={() => setActiveRoleFilter(tab.id)}
                className="rounded-xl text-xs font-medium whitespace-nowrap h-8"
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
            <Input
              type="text"
              placeholder="Cari nama, email, atau role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs rounded-xl"
            />
          </div>
        </Card>

        {/* Users Table Container */}
        <Card className="border-border bg-card rounded-2xl shadow-xs overflow-hidden p-0">
          {/* Mobile Card List (< md) */}
          <div className="md:hidden divide-y divide-border">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                <span className="text-xs">Memuat data akun pengguna...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Users className="w-8 h-8 opacity-40" />
                <p className="text-xs font-medium">Tidak ada akun yang sesuai kriteria filter.</p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const roleKey = (user.role as UserRole) || "user";
                const roleCfg = ROLE_CONFIG[roleKey] || ROLE_CONFIG.user;
                const permsCount =
                  roleKey === "superadmin"
                    ? ALL_PERMISSIONS.length
                    : (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0)
                    ? user.permissions.length
                    : (ROLE_DEFAULT_PERMISSIONS[roleKey] || []).length;

                return (
                  <div key={user.id} className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 ring-1 ring-border">
                          <AvatarImage src={user.avatar_url || ""} />
                          <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                            {(user.full_name || user.email || "U").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-sm text-foreground">
                            {user.full_name || "Tanpa Nama"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.email || "-"}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`gap-1 px-2 py-0.5 text-[10px] font-bold shrink-0 ${roleCfg.badgeCls}`}
                      >
                        <Shield className="w-3 h-3" />
                        {roleCfg.label}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-muted/40">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <KeyRound className="w-3.5 h-3.5 text-primary" />
                        <span>Hak Akses</span>
                      </div>
                      <span className="font-semibold text-foreground text-[11px]">
                        {roleKey === "superadmin"
                          ? "Semua Akses (Super Admin)"
                          : `${permsCount} dari ${ALL_PERMISSIONS.length} Izin`}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleViewOrders(user)}
                        className="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1.5 shadow-2xs"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        <span>Pesanan</span>
                      </Button>

                      {canManageUsers && (
                        <Button
                          size="xs"
                          onClick={() => handleOpenPermissions(user)}
                          className="h-7 px-3 rounded-lg text-xs font-semibold gap-1.5 shadow-2xs"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Atur Role &amp; Akses</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto scrollbar-thin">
            <Table className="w-full text-left text-xs sm:text-sm">
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <TableHead className="px-5 py-3.5">Akun Pengguna</TableHead>
                  <TableHead className="px-4 py-3.5">Email</TableHead>
                  <TableHead className="px-4 py-3.5 text-center">Role Saat Ini</TableHead>
                  <TableHead className="px-4 py-3.5">Wewenang / Hak Akses</TableHead>
                  <TableHead className="px-5 py-3.5 text-right">Aksi Kelola</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      <span>Memuat data pengguna &amp; hak akses...</span>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-medium">Tidak ada akun yang sesuai kriteria filter.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const roleKey = (user.role as UserRole) || "user";
                    const roleCfg = ROLE_CONFIG[roleKey] || ROLE_CONFIG.user;
                    const permsCount =
                      roleKey === "superadmin"
                        ? ALL_PERMISSIONS.length
                        : (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0)
                        ? user.permissions.length
                        : (ROLE_DEFAULT_PERMISSIONS[roleKey] || []).length;

                    return (
                      <TableRow
                        key={user.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        {/* Avatar & Name */}
                        <TableCell className="px-5 py-3.5 align-middle">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9 ring-1 ring-border shrink-0">
                              <AvatarImage src={user.avatar_url || ""} />
                              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                                {(user.full_name || user.email || "U").substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate" title={user.full_name || "Tanpa Nama"}>
                                {user.full_name || "Tanpa Nama"}
                              </p>
                              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                ID {user.id.substring(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Email */}
                        <TableCell className="px-4 py-3.5 align-middle text-foreground">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate" title={user.email || "-"}>
                              {user.email || "-"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Role Badge */}
                        <TableCell className="px-4 py-3.5 align-middle text-center whitespace-nowrap">
                          <div className="flex justify-center">
                            <Badge
                              variant="outline"
                              className={`gap-1.5 px-2.5 py-0.5 text-xs font-semibold ${roleCfg.badgeCls}`}
                            >
                              <Shield className="w-3 h-3" />
                              {roleCfg.label}
                            </Badge>
                          </div>
                        </TableCell>

                        {/* Permissions Granted */}
                        <TableCell className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <KeyRound className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="text-xs font-medium text-foreground">
                              {permsCount} dari {ALL_PERMISSIONS.length} Izin
                            </span>
                            {roleKey === "superadmin" && (
                              <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                                Full Akses
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="px-5 py-3.5 align-middle text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleViewOrders(user)}
                              className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1.5 shadow-2xs"
                              title="Lihat riwayat pesanan pelanggan"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Pesanan</span>
                            </Button>

                            {canManageUsers && (
                              <Button
                                size="xs"
                                onClick={() => handleOpenPermissions(user)}
                                className="h-8 px-3 rounded-lg text-xs font-semibold gap-1.5 shadow-2xs"
                                title="Kelola Role dan Hak Akses Granular"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                                <span>Atur Akses</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      {/* Role & Permissions Modal */}
      {manageUser && (
        <Dialog open={permModalOpen} onOpenChange={setPermModalOpen}>
          <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-card border-border">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Kelola Role &amp; Hak Akses Pengguna
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Pengguna: <strong>{manageUser.full_name || manageUser.email}</strong> ({manageUser.email})
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleSavePermissions} className="flex flex-col gap-5 py-2 text-xs sm:text-sm">
              {/* Role Selection Cards */}
              <div className="flex flex-col gap-2">
                <label className="font-bold text-foreground text-xs">
                  Pilih Role Utama:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(["superadmin", "admin", "bendahara", "staff", "user"] as UserRole[]).map(
                    (r) => {
                      const cfg = ROLE_CONFIG[r];
                      const isSelected = selectedRole === r;
                      return (
                        <div
                          key={r}
                          onClick={() => handleRoleSelect(r)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected
                              ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                              : "border-border bg-muted/40 hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-foreground">
                              {cfg.label}
                            </span>
                            {isSelected && (
                              <div className="size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground line-clamp-2 mt-1">
                            {cfg.description}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Granular Permissions Section */}
              <div className="flex flex-col gap-3 p-4 bg-muted/30 rounded-2xl border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-primary" />
                      Hak Akses Spesifik (Permissions Matrix)
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedRole === "superadmin"
                        ? "Super Admin memiliki izin tak terbatas untuk semua aksi dalam sistem."
                        : "Sesuaikan checkbox untuk menambah atau mencabut izin secara granular."}
                    </p>
                  </div>

                  {selectedRole !== "superadmin" && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllPerms}
                        className="text-[11px] text-primary font-semibold hover:underline"
                      >
                        Pilih Semua
                      </button>
                      <span className="text-muted-foreground">·</span>
                      <button
                        type="button"
                        onClick={handleDeselectAllPerms}
                        className="text-[11px] text-muted-foreground font-semibold hover:underline"
                      >
                        Kosongkan
                      </button>
                    </div>
                  )}
                </div>

                {/* Categorized Permissions Grid */}
                <div className="flex flex-col gap-4 mt-2">
                  {categories.map((cat) => {
                    const catPerms = ALL_PERMISSIONS.filter((p) => p.category === cat);
                    return (
                      <div key={cat} className="flex flex-col gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {cat}
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {catPerms.map((perm) => {
                            const isChecked =
                              selectedRole === "superadmin" ||
                              selectedPerms.includes(perm.key);

                            return (
                              <label
                                key={perm.key}
                                className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                                  isChecked
                                    ? "bg-card border-primary/40 shadow-2xs"
                                    : "bg-card/40 border-border hover:bg-card"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  disabled={selectedRole === "superadmin"}
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(perm.key)}
                                  className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary mt-0.5 shrink-0"
                                />
                                <div className="flex flex-col">
                                  <span className="font-semibold text-xs text-foreground">
                                    {perm.label}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {perm.description}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dialog Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPermModalOpen(false)}
                  className="rounded-xl text-xs font-semibold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving}
                  className="rounded-xl text-xs font-bold gap-1.5 shadow-sm"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Role & Permissions"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* User Orders History Dialog */}
      {ordersUser && (
        <Dialog open={ordersModalOpen} onOpenChange={setOrdersModalOpen}>
          <DialogContent className="max-w-lg w-full max-h-[85vh] overflow-y-auto rounded-2xl p-6 bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <ShoppingBag className="w-4 h-4 text-primary" />
                Riwayat Pesanan — {ordersUser.full_name || ordersUser.email}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Daftar pesanan makanan &amp; minuman yang pernah dibuat oleh pelanggan ini.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 py-2 max-h-[60vh] overflow-y-auto">
              {loadingOrders ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                  <span className="text-xs">Memeriksa transaksi pelanggan...</span>
                </div>
              ) : userOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-xs">Belum ada transaksi pesanan dari pelanggan ini.</p>
                </div>
              ) : (
                userOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3.5 bg-muted/40 rounded-xl border border-border flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-primary">
                        {ord.order_number}
                      </span>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        {new Date(ord.created_at).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        {formatRupiah(ord.total_amount)}
                      </p>
                      <span className="text-xs font-medium text-primary">
                        {ord.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
