"use client";

import { useCart } from "@/lib/context/cart-context";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  MapPin,
  AlertCircle,
  Megaphone,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export function StoreStatusBanner() {
  const { storeSettings, storeStatus, isStoreOpen } = useCart();

  const showAnnouncement =
    storeSettings.announcement_banner_enabled === "true" &&
    Boolean(storeSettings.announcement_banner_text);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Broadcast Announcement Banner (from Admin Settings) */}
      {showAnnouncement && (
        <div className="w-full p-3.5 sm:p-4 rounded-2xl bg-primary/10 border border-primary/25 text-on-surface flex items-start gap-3 shadow-xs animate-in fade-in">
          <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5">
            <Megaphone className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">
                Pengumuman Panitia
              </span>
            </div>
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed mt-0.5 font-medium">
              {storeSettings.announcement_banner_text}
            </p>
          </div>
        </div>
      )}

      {/* Store Schedule & Live Open/Close Status */}
      <div className="flex flex-wrap items-center gap-2">
        {isStoreOpen ? (
          <Badge
            variant="outline"
            className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 font-semibold text-xs gap-1.5 shadow-2xs"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Toko Buka Sekarang</span>
            <span className="opacity-60">·</span>
            <span>{storeStatus.scheduleSummary}</span>
          </Badge>
        ) : (
          <Badge
            variant="destructive"
            className="px-3 py-1.5 rounded-full font-semibold text-xs gap-1.5 shadow-2xs"
          >
            <span className="w-2 h-2 rounded-full bg-white" />
            <span>{storeStatus.statusText}</span>
          </Badge>
        )}

        {/* Operating days & pickup time summary */}
        {storeSettings.pickup_hours && (
          <Badge
            variant="outline"
            className="px-3 py-1.5 rounded-full text-muted-foreground border-border text-xs gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Pengambilan: {storeSettings.pickup_hours}</span>
          </Badge>
        )}

        <Badge
          variant="outline"
          className="px-3 py-1.5 rounded-full text-muted-foreground border-border text-xs gap-1.5"
        >
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span>{storeSettings.pickup_location || "Kampus Pendidikan Matematika FKIP UNRI"}</span>
        </Badge>
      </div>

      {/* Closed Warning Banner if store is closed */}
      {!isStoreOpen && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3 mt-1">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm space-y-1">
            <p className="font-bold text-amber-950 dark:text-amber-100">
              Pemesanan Sedang Dinonaktifkan ({storeStatus.statusText})
            </p>
            <p className="text-amber-900/90 dark:text-amber-200/90 leading-relaxed text-xs">
              {storeStatus.reason || "Pemesanan sedang ditutup sementara oleh panitia."} Anda tetap dapat melihat katalog menu hidangan lezat kami.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
