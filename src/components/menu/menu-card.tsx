"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Check, Minus, Star, Eye, ChevronRight } from "lucide-react";
import type { MenuItem } from "@/lib/supabase/database.types";
import { formatRupiah } from "@/lib/data/menu-data";
import { useCart } from "@/lib/context/cart-context";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* ─────────────────────────────────────────
   Quantity Stepper (inline shadcn)
───────────────────────────────────────── */
function QtyStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="inline-flex items-center bg-muted/70 rounded-xl p-0.5 border border-border" role="group" aria-label="Jumlah">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="size-7 rounded-lg hover:bg-card text-foreground transition-colors"
        aria-label="Kurangi jumlah"
        disabled={value <= 1}
      >
        <Minus className="w-3 h-3" aria-hidden="true" />
      </Button>
      <span
        className="w-7 text-center text-xs font-bold text-foreground tabular-nums select-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => onChange(value + 1)}
        className="size-7 rounded-lg hover:bg-card text-foreground transition-colors"
        aria-label="Tambah jumlah"
      >
        <Plus className="w-3 h-3" aria-hidden="true" />
      </Button>
    </div>
  );
}

/* ─────────────────────────────────────────
   FEATURED CARD  — large, hero style with Shadcn Card
───────────────────────────────────────── */
export function FeaturedMenuCard({ item }: { item: MenuItem }) {
  const { addToCart, openCart } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart(item, qty);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      openCart();
    }, 400);
  };

  return (
    <Card className="group bg-card border-border rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col py-0">
      {/* Clickable Image */}
      <Link
        href={`/menu/${item.id}`}
        className="block relative aspect-[4/3] overflow-hidden bg-muted group/img"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image_url}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          width={400}
          height={300}
        />

        {/* Badge */}
        {item.badge && (
          <Badge className={`absolute top-2.5 left-2.5 sm:top-3 sm:left-3 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold shadow-xs border-0 ${item.badge_style ?? "bg-primary text-primary-foreground"}`}>
            {item.badge}
          </Badge>
        )}

        {/* Rating & Sold count */}
        <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 flex items-center gap-1.5">
          <Badge variant="outline" className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-card/90 backdrop-blur-sm border-border text-[11px] font-bold text-amber-700 dark:text-amber-300">
            <Star className="w-3 h-3 text-amber-500" />
            4.9
          </Badge>
          <Badge variant="outline" className="px-2 py-0.5 rounded-lg bg-card/90 backdrop-blur-sm border-border text-[11px] font-medium text-foreground">
            {item.sold_count} terjual
          </Badge>
        </div>

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-[1px] pointer-events-none">
          <Eye className="w-4 h-4" />
          <span>Buka Detail Menu &amp; Ulasan</span>
        </div>
      </Link>

      {/* Content */}
      <CardContent className="flex flex-col gap-1.5 p-3.5 sm:p-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/menu/${item.id}`} className="hover:text-primary transition-colors">
            <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug line-clamp-1">{item.name}</h3>
          </Link>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {item.description}
        </p>

        {/* Clear affordance for menu detail */}
        <Link
          href={`/menu/${item.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors mt-auto pt-1 w-fit group/link"
        >
          <span>Lihat Detail Menu &amp; Ulasan</span>
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
        </Link>
      </CardContent>

      {/* Footer — price + actions */}
      <CardFooter className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-2 border-t border-border mt-auto">
        <span className="text-sm sm:text-base font-bold text-primary shrink-0">
          {formatRupiah(item.price)}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          <QtyStepper value={qty} onChange={setQty} />
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            aria-label={added ? `${item.name} ditambahkan` : `Tambah ${item.name} ke keranjang`}
            className={`rounded-xl text-xs sm:text-sm font-semibold transition-all gap-1.5 cursor-pointer ${
              added ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
            }`}
          >
            {added ? (
              <>
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                <span>Ditambah</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                <span>Tambah</span>
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

/* ─────────────────────────────────────────
   COMPACT CARD — grid item with Shadcn Card
───────────────────────────────────────── */
export function MenuCard({ item }: { item: MenuItem }) {
  const { addToCart, openCart } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart(item, 1);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      openCart();
    }, 400);
  };

  return (
    <Card className="group bg-card border-border rounded-2xl overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col h-full py-0">
      {/* Clickable Image */}
      <Link
        href={`/menu/${item.id}`}
        className="block relative h-36 sm:h-44 overflow-hidden bg-muted shrink-0 group/img"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image_url}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          width={320}
          height={180}
        />

        {/* Badges: Category & optional Custom Badge */}
        <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 flex items-center gap-1.5">
          {item.badge && (
            <Badge
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold shadow-2xs border-0 ${
                item.badge_style ?? "bg-secondary text-secondary-foreground"
              }`}
            >
              {item.badge}
            </Badge>
          )}
          <Badge
            variant="outline"
            className="px-2 py-0.5 rounded-md bg-card/90 backdrop-blur-sm text-xs font-medium text-muted-foreground border-border"
          >
            {item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : ""}
          </Badge>
        </div>

        {/* Rating preview */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-card/90 backdrop-blur-sm text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-border">
          <Star className="w-2.5 h-2.5 text-amber-500" />
          <span>4.9</span>
        </div>

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-[11px] font-bold backdrop-blur-[1px] pointer-events-none">
          <Eye className="w-3.5 h-3.5" />
          <span>Lihat Detail Menu</span>
        </div>
      </Link>

      {/* Content */}
      <CardContent className="flex flex-col gap-1 p-3 sm:p-3.5 flex-1">
        <Link href={`/menu/${item.id}`} className="hover:text-primary transition-colors">
          <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug line-clamp-1">{item.name}</h4>
        </Link>
        <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {item.description}
        </p>

        {/* Clear affordance for menu detail */}
        <Link
          href={`/menu/${item.id}`}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors mt-auto pt-1 w-fit group/link"
        >
          <span>Lihat Detail &amp; Ulasan</span>
          <ChevronRight className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5" />
        </Link>
      </CardContent>

      {/* Footer */}
      <CardFooter className="flex items-center justify-between gap-1.5 px-3 pb-3 sm:px-3.5 sm:pb-3.5 mt-auto border-t border-border pt-2">
        <div className="flex flex-col min-w-0">
          <span className="text-xs sm:text-sm font-bold text-primary truncate">{formatRupiah(item.price)}</span>
          <span className="text-[10px] text-muted-foreground truncate">{item.sold_count} terjual</span>
        </div>
        <Button
          type="button"
          size="xs"
          onClick={handleAdd}
          aria-label={added ? `${item.name} ditambahkan` : `Tambah ${item.name}`}
          className={`rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            added ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
          }`}
        >
          {added ? (
            <>
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden xs:inline">OK</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Tambah</span>
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
