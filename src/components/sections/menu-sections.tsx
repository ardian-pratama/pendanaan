"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { MenuItem, MenuCategory } from "@/lib/supabase/database.types";
import { fallbackMenuItems, getCategoryCounts } from "@/lib/data/menu-data";
import { MenuCard } from "@/components/menu/menu-card";
import {
  Star,
  Clock,
  Search,
  UtensilsCrossed,
  GlassWater,
  Cookie,
  LayoutGrid,
  Loader2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { useCart } from "@/lib/context/cart-context";

/* ─────────────────────────────────────────
   Category filter config
───────────────────────────────────────── */
type FilterKey = "semua" | MenuCategory | "terlaris";

const categoryFilters: { key: FilterKey; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "semua", label: "Semua", Icon: LayoutGrid },
  { key: "makanan", label: "Makanan", Icon: UtensilsCrossed },
  { key: "minuman", label: "Minuman", Icon: GlassWater },
  { key: "camilan", label: "Camilan", Icon: Cookie },
  { key: "terlaris", label: "Terlaris", Icon: Star },
];

/* ─────────────────────────────────────────
   Custom hook: fetch menu from Supabase
───────────────────────────────────────── */
function useMenuItems() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMenu() {
      try {
        const supabase = createClient();
        const { data, error: dbError } = await supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .order("sort_order", { ascending: true });

        if (!cancelled) {
          if (dbError) {
            console.warn("Supabase error:", dbError.message);
            setError(dbError.message);
          } else if (data) {
            setItems(data);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Gagal memuat dari server");
          setLoading(false);
        }
      }
    }

    fetchMenu();
    return () => { cancelled = true; };
  }, []);

  return { items, loading, error };
}

/* ─────────────────────────────────────────
   MENU SECTION (All-in-one unified place)
───────────────────────────────────────── */
export function MenuSection() {
  const { items, loading } = useMenuItems();
  const { storeSettings, storeStatus, isStoreOpen } = useCart();
  const [activeFilter, setActiveFilter] = useState<string>("semua");
  const [searchQuery, setSearchQuery] = useState("");

  // Dynamically compute all categories from loaded items
  const dynamicCategories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.category) set.add(it.category.trim().toLowerCase());
    });
    return Array.from(set);
  }, [items]);

  // Apply filter + search across all items
  const filtered = useMemo(() => {
    let result = items;

    // Category filter
    if (activeFilter === "terlaris") {
      result = [...items].sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
    } else if (activeFilter !== "semua") {
      result = items.filter(
        (i) => i.category?.toLowerCase() === activeFilter.toLowerCase()
      );
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [items, activeFilter, searchQuery]);

  const counts = getCategoryCounts(items);

  return (
    <section
      id="menu-grid"
      aria-labelledby="grid-heading"
      className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16"
    >
      {/* Combined Unified Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5" aria-hidden="true">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs font-semibold text-primary">
              Katalog Menu Pesanan Olimpiade 27
            </span>
          </div>
          <h2
            id="grid-heading"
            className="text-2xl sm:text-3xl font-bold text-on-surface"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Pilihan Menu Makanan &amp; Minuman
          </h2>
          <p className="text-sm text-on-surface-variant mt-1.5 max-w-xl leading-relaxed">
            Pilihan hidangan lezat, minuman segar, dan camilan berkualitas untuk santap siang praktis Anda di kampus sekaligus berkontribusi langsung pada kesuksesan kegiatan Olimpiade 27.
          </p>
          <p className="text-xs sm:text-sm font-semibold text-primary mt-2 flex items-center gap-1.5 flex-wrap">
            <Clock className="w-3.5 h-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Pengambilan {storeSettings.pickup_date || "Kamis, 24 Okt"} ({storeSettings.pickup_hours || "11:30–14:00 WIB"}) di {storeSettings.pickup_location || "Kampus Pendidikan Matematika FKIP UNRI"}
            </span>
          </p>
          {!isStoreOpen && (
            <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center gap-2 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{storeStatus.statusText} — {storeStatus.reason || "Pemesanan ditutup sementara."}</span>
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 shrink-0">
          <label htmlFor="menu-search" className="sr-only">
            Cari menu
          </label>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="menu-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
            placeholder="Cari makanan atau minuman..."
          />
        </div>
      </div>

      {/* Category filters */}
      <div
        role="group"
        aria-label="Filter kategori"
        className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none"
      >
        <button
          type="button"
          aria-pressed={activeFilter === "semua"}
          onClick={() => setActiveFilter("semua")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
            activeFilter === "semua"
              ? "bg-primary text-on-primary shadow-sm"
              : "bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-surface"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Semua</span>
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
              activeFilter === "semua"
                ? "bg-on-primary/20 text-on-primary"
                : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {items.length}
          </span>
        </button>

        {dynamicCategories.map((cat) => {
          const isActive = activeFilter === cat;
          const count = items.filter(
            (i) => i.category?.toLowerCase() === cat.toLowerCase()
          ).length;
          const Icon =
            cat === "makanan"
              ? UtensilsCrossed
              : cat === "minuman"
              ? GlassWater
              : cat === "camilan"
              ? Cookie
              : UtensilsCrossed;

          return (
            <button
              key={cat}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveFilter(cat)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap capitalize transition-all focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                isActive
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-surface"
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 shrink-0 ${isActive ? "" : "opacity-60"}`}
                aria-hidden="true"
              />
              <span>{cat}</span>
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                  isActive
                    ? "bg-on-primary/20 text-on-primary"
                    : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          aria-pressed={activeFilter === "terlaris"}
          onClick={() => setActiveFilter("terlaris")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
            activeFilter === "terlaris"
              ? "bg-primary text-on-primary shadow-sm"
              : "bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-surface"
          }`}
        >
          <Star className="w-3.5 h-3.5 shrink-0 text-amber-500 fill-current" aria-hidden="true" />
          <span>Terlaris</span>
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
              activeFilter === "terlaris"
                ? "bg-on-primary/20 text-on-primary"
                : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {items.length}
          </span>
        </button>
      </div>

      {/* Grid of Menu Cards (Unified Card Design) */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" aria-label="Memuat menu..." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center bg-surface-container-low rounded-2xl border border-outline-variant/40 mt-2">
          <Search className="w-8 h-8 text-on-surface-variant/40" aria-hidden="true" />
          <p className="text-sm font-medium text-on-surface">
            {searchQuery
              ? `Tidak ada menu yang cocok dengan "${searchQuery}"`
              : "Tidak ada menu di kategori ini."}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs text-primary font-bold hover:underline cursor-pointer"
            >
              Hapus pencarian
            </button>
          )}
        </div>
      ) : (
        <ul
          aria-label="Daftar menu pesanan"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 list-none p-0 m-0"
        >
          {filtered.map((item) => (
            <li key={item.id} className="h-full">
              <MenuCard item={item} />
            </li>
          ))}
        </ul>
      )}

      {/* Item count summary & Link to Full Catalog */}
      {!loading && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-outline-variant/40 text-center sm:text-left">
          <div>
            <h3 className="text-sm font-bold text-on-surface">
              Ingin Melihat Seluruh Menu &amp; Ulasan Pembeli?
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Jelajahi halaman katalog khusus untuk memfilter harga, membaca ulasan kepuasan, dan memberikan rating.
            </p>
          </div>
          <Link
            href="/menu"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-all shrink-0 shadow-xs"
          >
            <span>Buka Katalog Lengkap</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}
