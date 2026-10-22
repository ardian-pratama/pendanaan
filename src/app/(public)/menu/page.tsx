"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { MenuItem, MenuCategory } from "@/lib/supabase/database.types";
import { fallbackMenuItems, getCategoryCounts } from "@/lib/data/menu-data";
import { MenuCard } from "@/components/menu/menu-card";
import { useCart } from "@/lib/context/cart-context";
import {
  Search,
  ChevronRight,
  Home,
  UtensilsCrossed,
  GlassWater,
  Cookie,
  Star,
  LayoutGrid,
  Clock,
  MapPin,
  AlertCircle,
  Sparkles,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type FilterCategory = "semua" | MenuCategory | "terlaris";
type SortOption = "populer" | "harga_asc" | "harga_desc" | "nama";

const CATEGORIES: { key: FilterCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "semua", label: "Semua Menu", icon: LayoutGrid },
  { key: "makanan", label: "Makanan", icon: UtensilsCrossed },
  { key: "minuman", label: "Minuman", icon: GlassWater },
  { key: "camilan", label: "Camilan", icon: Cookie },
  { key: "terlaris", label: "Paling Laris", icon: Star },
];

export default function MenuCatalogPage() {
  const { storeSettings, storeStatus, isStoreOpen } = useCart();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FilterCategory>("semua");
  const [sortBy, setSortBy] = useState<SortOption>("populer");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .order("sort_order", { ascending: true });

        if (!cancelled) {
          if (!error && data && data.length > 0) {
            setItems(data);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => getCategoryCounts(items), [items]);

  const dynamicCategories = useMemo(() => {
    const list: { key: string; label: string; icon: any }[] = [
      { key: "semua", label: "Semua Menu", icon: LayoutGrid },
    ];

    const uniqueCats = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
    for (const cat of uniqueCats) {
      let icon = UtensilsCrossed;
      if (cat.toLowerCase().includes("minum")) icon = GlassWater;
      else if (cat.toLowerCase().includes("camil") || cat.toLowerCase().includes("snack")) icon = Cookie;

      const label = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, " ");
      list.push({ key: cat, label, icon });
    }

    list.push({ key: "terlaris", label: "Paling Laris", icon: Star });
    return list;
  }, [items]);

  // Filtering & Sorting
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Category
    if (category === "terlaris") {
      result.sort((a, b) => b.sold_count - a.sold_count);
    } else if (category !== "semua") {
      result = result.filter((i) => i.category === category);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          (i.badge && i.badge.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (sortBy === "populer") {
      result.sort((a, b) => b.sold_count - a.sold_count);
    } else if (sortBy === "harga_asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "harga_desc") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "nama") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [items, category, search, sortBy]);

  return (
    <main id="main-content" className="w-full pt-20 sm:pt-24 pb-32 sm:pb-24 bg-surface min-h-screen" tabIndex={-1}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
          <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Beranda</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
          <span className="font-semibold text-foreground">Katalog Menu</span>
        </nav>

        {/* Page Header Banner with Shadcn Card */}
        <Card className="rounded-3xl bg-gradient-to-br from-primary/10 via-surface-container-low to-tertiary/10 border-border p-5 sm:p-8 flex flex-col gap-4 shadow-xs py-5 sm:py-8">
          <div className="flex flex-col gap-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary text-primary-foreground font-bold text-xs gap-1.5 py-1 px-3">
                <Sparkles className="w-3 h-3" />
                Katalog Menu MathBites
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs font-semibold gap-1.5 py-1 px-3 ${
                  isStoreOpen
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                }`}
              >
                <span className={`size-1.5 rounded-full ${isStoreOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                {isStoreOpen ? "Pemesanan Dibuka" : "Pemesanan Tutup"}
              </Badge>
            </div>

            <h1
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-on-surface tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Pilihan Lengkap Menu Santap Kampus
            </h1>

            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Seluruh pembelian makanan dan minuman didedikasikan langsung untuk mendukung kelancaran penggalangan dana kegiatan{" "}
              <strong className="text-on-surface font-semibold">Olimpiade Matematika ke-27 (Olimpiade 27)</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-on-surface-variant">
              <span className="inline-flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <strong className="text-on-surface font-semibold">{storeSettings.pickup_location || "Kampus Pendidikan Matematika FKIP UNRI"}</strong>
              </span>
              <span className="opacity-40">|</span>
              <span className="inline-flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                {storeSettings.pickup_date || "Kamis, 24 Okt"} ({storeSettings.pickup_hours || "11:30–14:00 WIB"})
              </span>
            </div>
          </div>

          {!isStoreOpen && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Status Pemesanan Tutup</p>
                <p className="mt-0.5 leading-relaxed text-amber-800 dark:text-amber-300">
                  {storeStatus.reason || "Pemesanan ditutup sementara sesuai jadwal operasional panitia."}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Search & Filter Toolbar with Shadcn Card */}
        <Card className="rounded-2xl border-border bg-card p-4 sm:p-5 shadow-xs py-4 sm:py-5 flex flex-col gap-3.5">
          {/* Top Row: Search (Left) + Sort Dropdown (Right) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input with Shadcn Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari menu makanan, minuman, boba, atau cemilan..."
                className="pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-muted/40"
              />
            </div>

            {/* Sorting Dropdown without 'Urutkan:' */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-3.5 rounded-xl bg-muted/50 border border-border text-foreground text-xs font-semibold gap-2 shadow-2xs hover:bg-muted cursor-pointer shrink-0"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {sortBy === "populer"
                      ? "Paling Populer"
                      : sortBy === "harga_asc"
                      ? "Harga Terendah"
                      : sortBy === "harga_desc"
                      ? "Harga Tertinggi"
                      : "Nama A — Z"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-2xl shadow-xl">
                {[
                  { key: "populer", label: "Paling Populer / Laris" },
                  { key: "harga_asc", label: "Harga Terendah" },
                  { key: "harga_desc", label: "Harga Tertinggi" },
                  { key: "nama", label: "Nama A — Z" },
                ].map((opt) => (
                  <DropdownMenuItem
                    key={opt.key}
                    onClick={() => setSortBy(opt.key as SortOption)}
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

          {/* Bottom Row: Dynamic Category Tabs with Shadcn Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
            {dynamicCategories.map((cat) => {
              const active = category === cat.key;
              const count =
                cat.key === "semua"
                  ? items.length
                  : cat.key === "terlaris"
                  ? items.filter((i) => i.sold_count > 50).length
                  : items.filter((i) => i.category === cat.key).length;

              return (
                <Button
                  key={cat.key}
                  type="button"
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategory(cat.key as FilterCategory)}
                  className="rounded-xl text-xs font-semibold gap-1.5 shrink-0 cursor-pointer"
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                  <Badge
                    variant={active ? "secondary" : "outline"}
                    className="ml-1 text-[10px] px-1.5 py-0 font-bold"
                  >
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </Card>

        {/* Results Header */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Menampilkan <strong className="text-foreground">{filteredItems.length}</strong> menu</span>
          {search && (
            <Button
              variant="link"
              size="xs"
              onClick={() => {
                setSearch("");
                setCategory("semua");
              }}
              className="text-primary font-semibold p-0 h-auto"
            >
              Reset Semua Filter
            </Button>
          )}
        </div>

        {/* Menu Cards Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {filteredItems.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Card className="w-full py-16 text-center rounded-3xl bg-surface-container-low border-border p-8 flex flex-col items-center justify-center gap-3">
            <div className="size-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">Menu Tidak Ditemukan</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Tidak ada menu yang sesuai dengan kata kunci &ldquo;{search}&rdquo; atau filter yang dipilih. Coba cari kata kunci lainnya.
            </p>
            <Button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("semua");
              }}
              className="mt-2 rounded-xl text-xs font-semibold"
            >
              Tampilkan Semua Menu
            </Button>
          </Card>
        )}

      </div>
    </main>
  );
}
