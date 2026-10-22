"use client";

import { useEffect, useState, useTransition, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { AdminTopBar } from "@/components/admin/admin-sidebar";
import {
  fetchMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  uploadMenuImage,
  getCurrentUserProfile,
  getFriendlyErrorMessage,
} from "@/lib/supabase/admin";
import { ErrorBanner } from "@/components/admin/error-banner";
import { hasPermission } from "@/lib/auth/permissions";
import type { MenuItem, MenuCategory, UserProfile } from "@/lib/supabase/database.types";
import { formatRupiah } from "@/lib/data/menu-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  UtensilsCrossed,
  Plus,
  Search,
  Upload,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  LayoutGrid,
  List,
  Star,
  Check,
  Package,
  Layers,
  ArrowUpDown,
  TrendingUp,
  ChevronDown,
} from "lucide-react";

const badgeColors = [
  { label: "Violet (Unggulan)", value: "bg-primary text-white" },
  { label: "Emerald (Terlaris)", value: "bg-emerald-600 text-white" },
  { label: "Amber (Favorit)", value: "bg-amber-600 text-white" },
  { label: "Rose (Diskon)", value: "bg-rose-600 text-white" },
  { label: "Indigo (Baru)", value: "bg-indigo-600 text-white" },
];

export default function AdminProductsPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("semua");
  const [statusFilter, setStatusFilter] = useState<"semua" | "tersedia" | "habis" | "unggulan">("semua");
  const [sortBy, setSortBy] = useState<"terlaris" | "harga-asc" | "harga-desc" | "nama" | "sort_order">("terlaris");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();
  const [uploadingImage, setUploadingImage] = useState(false);

  // Dynamic Category State
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 20000,
    image_url: "",
    category: "makanan",
    badge: "",
    badge_style: "bg-primary text-white",
    is_featured: false,
    is_available: true,
    wave: 2,
    sort_order: 1,
  });

  // Dynamically computed categories from existing menu items
  const dynamicCategories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach((item) => {
      if (item.category) cats.add(item.category.trim().toLowerCase());
    });
    ["makanan", "minuman", "camilan"].forEach((c) => cats.add(c));
    return Array.from(cats);
  }, [items]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [data, profile] = await Promise.all([
        fetchMenuItems(),
        getCurrentUserProfile(),
      ]);
      setItems(data);
      if (profile) setCurrentUser(profile);
    } catch (err: unknown) {
      setErrorMessage(
        getFriendlyErrorMessage(err, "Gagal memuat daftar menu. Periksa koneksi internet Anda.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const canCreate = hasPermission(currentUser, "menu:create");
  const canUpdate = hasPermission(currentUser, "menu:update");
  const canDelete = hasPermission(currentUser, "menu:delete");

  // Summary KPI Metrics
  const stats = useMemo(() => {
    const total = items.length;
    const available = items.filter((i) => i.is_available).length;
    const outOfStock = items.filter((i) => !i.is_available).length;
    const featured = items.filter((i) => i.is_featured).length;
    const totalSold = items.reduce((acc, i) => acc + (i.sold_count || 0), 0);
    return { total, available, outOfStock, featured, totalSold };
  }, [items]);

  const handleOpenCreate = () => {
    if (!canCreate) {
      showToast("Anda tidak memiliki izin (menu:create) untuk menambah menu");
      return;
    }
    setEditingItem(null);
    setIsCustomCategory(false);
    setCustomCategoryInput("");
    setFormData({
      name: "",
      description: "",
      price: 20000,
      image_url: "",
      category: "makanan",
      badge: "",
      badge_style: "bg-primary text-white",
      is_featured: false,
      is_available: true,
      wave: 2,
      sort_order: items.length + 1,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    if (!canUpdate) {
      showToast("Anda tidak memiliki izin (menu:update) untuk mengedit menu");
      return;
    }
    const isCustom = !["makanan", "minuman", "camilan"].includes(item.category?.toLowerCase());
    setEditingItem(item);
    setIsCustomCategory(isCustom);
    setCustomCategoryInput(isCustom ? item.category : "");
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      image_url: item.image_url,
      category: item.category || "makanan",
      badge: item.badge || "",
      badge_style: item.badge_style || "bg-primary text-white",
      is_featured: item.is_featured,
      is_available: item.is_available,
      wave: item.wave,
      sort_order: item.sort_order,
    });
    setModalOpen(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const publicUrl = await uploadMenuImage(file);
      setFormData((prev) => ({ ...prev, image_url: publicUrl }));
      showToast("Foto menu berhasil diunggah!");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Gagal upload gambar");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Nama menu wajib diisi.");
      return;
    }
    if (formData.price <= 0) {
      showToast("Harga menu harus lebih dari Rp 0.");
      return;
    }
    if (!formData.image_url) {
      showToast("Foto menu wajib diisi atau diunggah.");
      return;
    }

    const finalCategory = isCustomCategory && customCategoryInput.trim()
      ? customCategoryInput.trim().toLowerCase()
      : formData.category;

    startTransition(async () => {
      try {
        if (editingItem) {
          if (!canUpdate) throw new Error("Tidak memiliki izin menu:update");
          await updateMenuItem(editingItem.id, {
            ...formData,
            category: finalCategory,
            badge: formData.badge.trim() ? formData.badge.trim() : null,
          });
          showToast(`Menu "${formData.name}" berhasil diperbarui!`);
        } else {
          if (!canCreate) throw new Error("Tidak memiliki izin menu:create");
          await createMenuItem({
            ...formData,
            category: finalCategory,
            badge: formData.badge.trim() ? formData.badge.trim() : null,
            sold_count: 0,
          });
          showToast(`Menu "${formData.name}" berhasil ditambahkan!`);
        }
        setModalOpen(false);
        loadMenu();
      } catch (err: unknown) {
        showToast(getFriendlyErrorMessage(err, "Gagal menyimpan menu."));
      }
    });
  };

  const handleToggleAvailable = async (item: MenuItem) => {
    if (!canUpdate) {
      showToast("Anda tidak memiliki izin (menu:update) untuk mengubah ketersediaan");
      return;
    }
    const newStatus = !item.is_available;
    try {
      await toggleMenuItemAvailability(item.id, newStatus);
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, is_available: newStatus } : it))
      );
      showToast(`Menu "${item.name}" kini ${newStatus ? "Tersedia" : "Habis"}`);
    } catch (err: unknown) {
      showToast(getFriendlyErrorMessage(err, "Gagal mengubah ketersediaan menu."));
    }
  };

  const handleToggleFeatured = async (item: MenuItem) => {
    if (!canUpdate) {
      showToast("Anda tidak memiliki izin (menu:update) untuk mengubah status unggulan");
      return;
    }
    const newFeatured = !item.is_featured;
    try {
      await updateMenuItem(item.id, { is_featured: newFeatured });
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, is_featured: newFeatured } : it))
      );
      showToast(`Menu "${item.name}" ${newFeatured ? "dijadikan Menu Unggulan" : "dihapus dari Unggulan"}`);
    } catch (err: unknown) {
      showToast(getFriendlyErrorMessage(err, "Gagal mengubah status unggulan."));
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    if (!canDelete) {
      showToast("Anda tidak memiliki izin (menu:delete) untuk menghapus menu");
      return;
    }
    try {
      await deleteMenuItem(itemToDelete.id);
      setItems((prev) => prev.filter((it) => it.id !== itemToDelete.id));
      showToast(`Menu "${itemToDelete.name}" berhasil dihapus dari katalog.`);
    } catch (err: unknown) {
      showToast(getFriendlyErrorMessage(err, "Gagal menghapus menu."));
    } finally {
      setItemToDelete(null);
    }
  };

  // Filter & Sort Logic
  const filteredAndSortedItems = useMemo(() => {
    let result = items.filter((item) => {
      const matchCat =
        selectedCategory === "semua" || item.category === selectedCategory;
      const matchStatus =
        statusFilter === "semua" ||
        (statusFilter === "tersedia" && item.is_available) ||
        (statusFilter === "habis" && !item.is_available) ||
        (statusFilter === "unggulan" && item.is_featured);
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.badge && item.badge.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchCat && matchStatus && matchSearch;
    });

    result.sort((a, b) => {
      if (sortBy === "terlaris") return (b.sold_count || 0) - (a.sold_count || 0);
      if (sortBy === "harga-asc") return a.price - b.price;
      if (sortBy === "harga-desc") return b.price - a.price;
      if (sortBy === "nama") return a.name.localeCompare(b.name);
      if (sortBy === "sort_order") return a.sort_order - b.sort_order;
      return 0;
    });

    return result;
  }, [items, selectedCategory, statusFilter, searchQuery, sortBy]);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <AdminTopBar title="Manajemen Menu & Produk" />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="rounded-3xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Hapus Menu dari Katalog?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Tindakan ini tidak dapat dibatalkan. Menu <strong>&ldquo;{itemToDelete?.name}&rdquo;</strong> akan dihapus permanen dari sistem dan katalog publik.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ya, Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6 pb-16 min-w-0">
        {/* Error notification banner */}
        {errorMessage && (
          <ErrorBanner
            message={errorMessage}
            onRetry={loadMenu}
            className="mb-2"
          />
        )}

        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2
              className="text-2xl sm:text-3xl font-bold text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Katalog Menu & Produk
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Kelola daftar menu makanan, minuman, harga, badge promosi, dan status ketersediaan.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMenu}
              disabled={loading}
              className="rounded-xl gap-2 h-10 border-border"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {canCreate && (
              <Button
                onClick={handleOpenCreate}
                className="rounded-xl gap-2 h-10 px-4 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Menu Baru</span>
              </Button>
            )}
          </div>
        </div>

        {/* Summary Analytics KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="border-border bg-card shadow-2xs h-full">
            <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
              <span className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                Total Menu
                <Package className="w-3.5 h-3.5 text-primary" />
              </span>
              <div>
                <span className="text-2xl font-bold text-foreground block">{stats.total}</span>
                <span className="text-[11px] text-muted-foreground">Item dalam katalog</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-2xs h-full">
            <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
              <span className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                Menu Tersedia
                <Eye className="w-3.5 h-3.5 text-emerald-500" />
              </span>
              <div>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 block">
                  {stats.available}
                </span>
                <span className="text-[11px] text-muted-foreground">Siap dipesan</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-2xs h-full">
            <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
              <span className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                Menu Habis
                <EyeOff className="w-3.5 h-3.5 text-rose-500" />
              </span>
              <div>
                <span className="text-2xl font-bold text-rose-600 dark:text-rose-400 block">
                  {stats.outOfStock}
                </span>
                <span className="text-[11px] text-muted-foreground">Stok kosong</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-2xs h-full">
            <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
              <span className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                Menu Unggulan
                <Star className="w-3.5 h-3.5 text-amber-500" />
              </span>
              <div>
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 block">
                  {stats.featured}
                </span>
                <span className="text-[11px] text-muted-foreground">Sorotan hero</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-2xs col-span-2 sm:col-span-1 h-full">
            <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
              <span className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                Total Terjual
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
              </span>
              <div>
                <span className="text-2xl font-bold text-primary block">{stats.totalSold}</span>
                <span className="text-[11px] text-muted-foreground">Porsi makanan/minuman</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls Bar */}
        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama menu, deskripsi, atau lencana..."
                  className="pl-9 rounded-xl h-10 border-border"
                />
              </div>

              {/* View mode & Sorting */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 px-3 rounded-xl bg-muted/60 border border-border text-foreground text-xs font-semibold gap-2 cursor-pointer shadow-2xs hover:bg-muted"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
                        <span>
                          {sortBy === "terlaris"
                            ? "Terlaris (Penjualan)"
                            : sortBy === "harga-asc"
                            ? "Harga Terendah"
                            : sortBy === "harga-desc"
                            ? "Harga Tertinggi"
                            : sortBy === "nama"
                            ? "Nama (A - Z)"
                            : "Urutan Prioritas"}
                        </span>
                        <ChevronDown className="w-3 h-3 text-muted-foreground opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl shadow-xl">
                      {[
                        { key: "terlaris", label: "Terlaris (Penjualan Tertinggi)" },
                        { key: "harga-asc", label: "Harga Terendah" },
                        { key: "harga-desc", label: "Harga Tertinggi" },
                        { key: "nama", label: "Nama (A - Z)" },
                        { key: "sort_order", label: "Urutan Prioritas" },
                      ].map((opt) => (
                        <DropdownMenuItem
                          key={opt.key}
                          onClick={() => setSortBy(opt.key as any)}
                          className={`text-xs rounded-xl py-2 px-3 font-medium cursor-pointer ${
                            sortBy === opt.key ? "bg-accent font-bold text-accent-foreground" : ""
                          }`}
                        >
                          <span>{opt.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* View Switcher (Grid vs Table) */}
                <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="h-8 px-2.5 rounded-lg text-xs"
                    aria-label="Tampilan Grid"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 mr-1" />
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="h-8 px-2.5 rounded-lg text-xs"
                    aria-label="Tampilan Tabel"
                  >
                    <List className="w-3.5 h-3.5 mr-1" />
                    Tabel
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Category & Status Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <Button
                  variant={selectedCategory === "semua" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("semua")}
                  className="rounded-xl h-8 text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  Semua ({items.length})
                </Button>
                {dynamicCategories.map((cat) => {
                  const count = items.filter(
                    (it) => it.category?.toLowerCase() === cat.toLowerCase()
                  ).length;
                  return (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                      className="rounded-xl h-8 text-xs font-semibold whitespace-nowrap capitalize cursor-pointer"
                    >
                      {cat} ({count})
                    </Button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {[
                  { id: "semua", label: "Semua" },
                  { id: "tersedia", label: "Tersedia" },
                  { id: "habis", label: "Habis" },
                  { id: "unggulan", label: "Unggulan" },
                ].map((st) => (
                  <Button
                    key={st.id}
                    variant={statusFilter === st.id ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setStatusFilter(st.id as any)}
                    className="rounded-xl h-7 px-2.5 text-xs font-medium"
                  >
                    {st.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Items: Grid View or Table View */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm">Memuat katalog menu...</span>
          </div>
        ) : filteredAndSortedItems.length === 0 ? (
          <Card className="border-border bg-card p-12 text-center rounded-3xl">
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-foreground">Tidak Ada Menu Ditemukan</h3>
              <p className="text-xs text-muted-foreground">
                Tidak ada menu yang sesuai dengan kata kunci pencarian atau filter yang dipilih. Coba reset filter Anda.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory("semua");
                  setStatusFilter("semua");
                  setSearchQuery("");
                }}
                className="rounded-xl text-xs"
              >
                Reset Semua Filter
              </Button>
            </div>
          </Card>
        ) : viewMode === "grid" ? (
          /* ──────── GRID VIEW ──────── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredAndSortedItems.map((item) => (
              <Card
                key={item.id}
                onClick={() => handleOpenEdit(item)}
                className={`group border border-border/80 bg-card shadow-2xs hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between rounded-2xl cursor-pointer hover:border-primary/50 relative h-full ${
                  !item.is_available ? "opacity-90 bg-muted/20" : ""
                }`}
              >
                {/* 1. Photo & Badges Container */}
                <div className="relative aspect-[16/10] overflow-hidden bg-muted/70 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url || "/images/placeholder-food.png"}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Gradient shadow for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />

                  {/* Non-overlapping Top Bar for Badges & Quick Action */}
                  <div className="absolute top-2.5 inset-x-2.5 flex items-start justify-between gap-2 pointer-events-none">
                    {/* Left Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0 pointer-events-auto">
                      <Badge
                        variant="secondary"
                        className="bg-background/95 backdrop-blur-md text-[10px] font-bold uppercase shadow-xs border-border/40 py-0.5 px-2 text-foreground"
                      >
                        {item.category}
                      </Badge>
                      {item.badge && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs whitespace-nowrap ${
                            item.badge_style || "bg-primary text-white"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>

                    {/* Right Quick Toggles */}
                    <div className="flex items-center gap-1.5 shrink-0 pointer-events-auto">
                      {/* Featured Star Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFeatured(item);
                        }}
                        title={item.is_featured ? "Hapus dari Menu Unggulan" : "Jadikan Menu Unggulan"}
                        className={`size-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-xs ${
                          item.is_featured
                            ? "bg-amber-500 text-white hover:bg-amber-600 ring-2 ring-white/50"
                            : "bg-black/50 text-white/80 hover:bg-black/70 hover:text-amber-300"
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${item.is_featured ? "fill-current" : ""}`} />
                      </button>

                      {/* Availability Pill Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAvailable(item);
                        }}
                        title={item.is_available ? "Klik untuk tandai Habis" : "Klik untuk tandai Tersedia"}
                        className={`h-7 px-2.5 rounded-full text-[10px] font-bold tracking-tight shadow-xs backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 ${
                          item.is_available
                            ? "bg-emerald-600/95 hover:bg-emerald-700 text-white"
                            : "bg-rose-600/95 hover:bg-rose-700 text-white"
                        }`}
                      >
                        <span className={`size-1.5 rounded-full ${item.is_available ? "bg-white animate-pulse" : "bg-white/70"}`} />
                        <span>{item.is_available ? "Tersedia" : "Habis"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Out of Stock Center Banner */}
                  {!item.is_available && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-2xs flex items-center justify-center pointer-events-none">
                      <span className="px-3.5 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold shadow-md ring-2 ring-white/40">
                        Stok Habis
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Content Body & Fixed Text Area */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="min-h-[58px]">
                    <h4 className="font-bold text-sm text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                      {item.name}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-1">
                      {item.description || "Menu lezat MathBites Olimpiade 27."}
                    </p>
                  </div>

                  {/* Price & Sales Stat */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-base font-extrabold text-primary block leading-none tracking-tight">
                      {formatRupiah(item.price)}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-primary" />
                      <span>{item.sold_count || 0} porsi</span>
                    </span>
                  </div>

                  {/* 3. Action Buttons Bar */}
                  <div className="pt-2.5 border-t border-border/80 flex items-center justify-between gap-2">
                    {/* Switch Toggle */}
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleAvailable(item);
                      }}
                      title={item.is_available ? "Tandai Stok Habis" : "Tandai Stok Tersedia"}
                    >
                      <Switch
                        checked={item.is_available}
                        onCheckedChange={() => handleToggleAvailable(item)}
                        disabled={!canUpdate}
                        aria-label={`Status stok ${item.name}`}
                      />
                      <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">
                        {item.is_available ? "Tersedia" : "Habis"}
                      </span>
                    </div>

                    {/* Action Buttons: Edit & Delete */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(item);
                        }}
                        className="rounded-xl text-xs font-bold gap-1.5 h-8 px-2.5 border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer shadow-2xs"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-primary" />
                        <span>Edit</span>
                      </Button>

                      {canDelete && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete(item);
                          }}
                          className="size-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Hapus Menu"
                          aria-label={`Hapus ${item.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* ──────── TABLE VIEW ──────── */
          <Card className="border-border bg-card overflow-hidden rounded-2xl shadow-xs">
            <div className="overflow-x-auto scrollbar-thin">
              <Table className="min-w-[720px]">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-16">Foto</TableHead>
                  <TableHead>Nama Menu</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Terjual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Unggulan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedItems.map((item) => (
                  <TableRow
                    key={item.id}
                    onClick={() => handleOpenEdit(item)}
                    className={`cursor-pointer hover:bg-muted/40 transition-colors ${!item.is_available ? "opacity-75" : ""}`}
                  >
                    <TableCell>
                      <div className="w-12 h-12 rounded-xl overflow-hidden relative bg-muted shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm text-foreground line-clamp-1">
                          {item.name}
                        </span>
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {item.description}
                        </span>
                        {item.badge && (
                          <span className="mt-1 inline-block text-[10px] font-semibold text-primary">
                            ★ {item.badge}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs font-semibold">
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-primary text-sm whitespace-nowrap">
                      {formatRupiah(item.price)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {item.sold_count || 0} porsi
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAvailable(item);
                        }}
                        title={item.is_available ? "Tandai Stok Habis" : "Tandai Stok Tersedia"}
                      >
                        <Switch
                          checked={item.is_available}
                          onCheckedChange={() => handleToggleAvailable(item)}
                          disabled={!canUpdate}
                          aria-label={`Status stok ${item.name}`}
                        />
                        <Badge
                          variant="outline"
                          className={`text-xs font-semibold ${
                            item.is_available
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300"
                          }`}
                        >
                          {item.is_available ? "Tersedia" : "Habis"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFeatured(item);
                        }}
                        title={item.is_featured ? "Hapus dari Menu Unggulan" : "Jadikan Menu Unggulan"}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          item.is_featured
                            ? "bg-amber-500 text-white shadow-2xs"
                            : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-amber-500"
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${item.is_featured ? "fill-current" : ""}`} />
                        <span>{item.is_featured ? "Unggulan" : "Biasa"}</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(item);
                          }}
                          className="rounded-xl text-xs font-bold gap-1.5 h-8 border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all cursor-pointer shadow-2xs"
                          title="Kelola & Edit Menu"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Button>

                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemToDelete(item);
                            }}
                            className="size-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Hapus Menu"
                            aria-label={`Hapus ${item.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </Card>
        )}
      </main>

      {/* ──────── UNIFIED MODAL KELOLA & EDIT MENU (Shadcn Dialog) ──────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  {editingItem ? `Kelola & Edit Menu` : "Tambah Menu Baru"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editingItem
                    ? `Pusat kendali status, harga, foto, dan detail untuk ${editingItem.name}.`
                    : "Lengkapi informasi menu makanan atau minuman baru MathBites."}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Quick Menu Summary Banner when editing */}
          {editingItem && (
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border flex items-center gap-3 mt-1">
              <div className="size-14 rounded-xl overflow-hidden bg-muted relative shrink-0 border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formData.image_url || editingItem.image_url}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground truncate">
                    {formData.name || editingItem.name}
                  </span>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold">
                    {formData.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="font-extrabold text-primary">
                    {formatRupiah(formData.price)}
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    &middot; {editingItem.sold_count || 0} porsi terjual
                  </span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Quick Status Toggles (Ketersediaan & Unggulan) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                    <Package className="w-3.5 h-3.5 text-primary" />
                    Ketersediaan Stok
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    {formData.is_available ? "Menu siap dipesan pembeli" : "Ditandai stok habis di toko"}
                  </p>
                </div>
                <Switch
                  checked={formData.is_available}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_available: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                    <Star
                      className={`w-3.5 h-3.5 ${
                        formData.is_featured ? "text-amber-500 fill-current" : "text-muted-foreground"
                      }`}
                    />
                    Menu Unggulan
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    {formData.is_featured ? "Tampil di sorotan rekomendasi" : "Tampilan standar katalog"}
                  </p>
                </div>
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_featured: checked })
                  }
                />
              </div>
            </div>

            {/* Nama & Kategori */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="m-name" className="text-xs font-bold text-foreground">
                  Nama Menu *
                </Label>
                <Input
                  id="m-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Nasi Ayam Geprek Sambal Matah"
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-cat" className="text-xs font-bold text-foreground">
                  Kategori *
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      id="m-cat"
                      type="button"
                      variant="outline"
                      className="w-full justify-between h-10 px-3 rounded-xl bg-card border border-border text-foreground text-xs font-semibold cursor-pointer shadow-2xs hover:bg-muted"
                    >
                      <span className="capitalize">
                        {isCustomCategory
                          ? (customCategoryInput ? customCategoryInput : "+ Kategori Baru")
                          : formData.category}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-52 p-1.5 rounded-xl shadow-xl">
                    {dynamicCategories.map((cat) => (
                      <DropdownMenuItem
                        key={cat}
                        onClick={() => {
                          setIsCustomCategory(false);
                          setFormData({ ...formData, category: cat });
                        }}
                        className={`text-xs capitalize rounded-lg py-2 px-3 cursor-pointer ${
                          !isCustomCategory && formData.category === cat
                            ? "bg-accent font-bold text-accent-foreground"
                            : ""
                        }`}
                      >
                        {cat}
                      </DropdownMenuItem>
                    ))}
                    <div className="border-t my-1" />
                    <DropdownMenuItem
                      onClick={() => {
                        setIsCustomCategory(true);
                      }}
                      className={`text-xs font-semibold text-primary rounded-lg py-2 px-3 cursor-pointer ${
                        isCustomCategory ? "bg-primary/10 font-bold" : ""
                      }`}
                    >
                      + Kategori Baru...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Custom Category Input if selected */}
            {isCustomCategory && (
              <div className="space-y-1.5 p-3 rounded-2xl bg-primary/5 border border-primary/20 animate-in fade-in">
                <Label htmlFor="m-custom-cat" className="text-xs font-bold text-primary">
                  Nama Kategori Baru *
                </Label>
                <Input
                  id="m-custom-cat"
                  placeholder="Contoh: sarapan, paket hemat, dessert, merchandise"
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  className="rounded-xl text-xs bg-background"
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  Kategori ini akan otomatis tersimpan dan dapat digunakan untuk produk lainnya.
                </p>
              </div>
            )}

            {/* Deskripsi */}
            <div className="space-y-1.5">
              <Label htmlFor="m-desc" className="text-xs font-bold text-foreground">
                Deskripsi Menu
              </Label>
              <Textarea
                id="m-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Rasa renyah ayam berpadu sambal matah pedas segar khas..."
                rows={2}
                className="rounded-xl text-xs"
              />
            </div>

            {/* Harga & Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="m-price" className="text-xs font-bold text-foreground">
                  Harga Satuan (Rp) *
                </Label>
                <span className="text-xs font-extrabold text-primary">
                  {formatRupiah(formData.price)}
                </span>
              </div>
              <Input
                id="m-price"
                type="number"
                min="0"
                step="500"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: Number(e.target.value) || 0 })
                }
                className="rounded-xl text-sm"
                required
              />
              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-muted-foreground">Tambah:</span>
                {[1000, 2000, 5000, 10000].map((addAmt) => (
                  <button
                    key={addAmt}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, price: (Number(prev.price) || 0) + addAmt }))
                    }
                    className="text-[10px] px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground font-semibold cursor-pointer transition-colors"
                  >
                    +{formatRupiah(addAmt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Foto Menu Upload & Preview */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-muted/30 border border-border">
              <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Foto Menu Makanan / Minuman *</span>
                {uploadingImage && <span className="text-primary text-[10px]">Mengunggah foto...</span>}
              </Label>

              <div className="flex items-center gap-3">
                {formData.image_url ? (
                  <div className="size-16 rounded-xl overflow-hidden bg-muted relative shrink-0 border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="size-16 rounded-xl bg-muted border border-dashed border-border flex items-center justify-center text-muted-foreground shrink-0">
                    <UtensilsCrossed className="w-6 h-6 opacity-40" />
                  </div>
                )}

                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="rounded-xl text-xs gap-1.5 h-8 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-primary" />
                      Pilih File Foto
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </div>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="Atau masukkan URL gambar..."
                    className="rounded-xl text-xs h-8"
                  />
                </div>
              </div>
            </div>

            {/* Custom Promo Badge & Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-badge" className="text-xs font-bold text-foreground">
                  Teks Lencana Promosi (Opsional)
                </Label>
                <Input
                  id="m-badge"
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  placeholder="Contoh: Best Seller, Favorit, Promo"
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-badge-style" className="text-xs font-bold text-foreground">
                  Warna Lencana Promosi
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      id="m-badge-style"
                      type="button"
                      variant="outline"
                      className="w-full justify-between h-10 px-3 rounded-xl bg-card border border-border text-foreground text-xs font-semibold cursor-pointer shadow-2xs hover:bg-muted"
                    >
                      <span className="flex items-center gap-2">
                        <span className={`size-3 rounded-full ${formData.badge_style}`} />
                        <span>
                          {badgeColors.find((bc) => bc.value === formData.badge_style)?.label || "Pilih Warna Lencana"}
                        </span>
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 p-1 rounded-xl shadow-xl">
                    {badgeColors.map((bc) => (
                      <DropdownMenuItem
                        key={bc.value}
                        onClick={() => setFormData({ ...formData, badge_style: bc.value })}
                        className={`text-xs rounded-lg py-2 px-3 cursor-pointer flex items-center gap-2 ${
                          formData.badge_style === bc.value ? "bg-accent font-bold text-accent-foreground" : ""
                        }`}
                      >
                        <span className={`size-3 rounded-full ${bc.value}`} />
                        <span>{bc.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Urutan Tampil & Gelombang Batch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-order" className="text-xs font-bold text-foreground">
                  Urutan Prioritas Tampil
                </Label>
                <Input
                  id="m-order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: Number(e.target.value) || 1 })
                  }
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-wave" className="text-xs font-bold text-foreground">
                  Gelombang Batch
                </Label>
                <Input
                  id="m-wave"
                  type="number"
                  value={formData.wave}
                  onChange={(e) =>
                    setFormData({ ...formData, wave: Number(e.target.value) || 1 })
                  }
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Unified Dialog Footer */}
            <DialogFooter className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-border">
              {editingItem && canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setItemToDelete(editingItem);
                  }}
                  className="rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Menu</span>
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl text-xs font-bold gap-2 px-5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSaving
                      ? "Menyimpan..."
                      : editingItem
                      ? "Simpan Perubahan"
                      : "Tambah ke Menu"}
                  </span>
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
