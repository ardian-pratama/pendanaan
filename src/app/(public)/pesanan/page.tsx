"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCart, ORDER_HISTORY_KEY } from "@/lib/context/cart-context";
import { formatRupiah, fallbackMenuItems } from "@/lib/data/menu-data";
import { createClient } from "@/lib/supabase/client";
import {
  Receipt,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowLeft,
  ShoppingBag,
  Send,
  LogIn,
  RefreshCw,
  CreditCard,
  UtensilsCrossed,
  QrCode,
  X,
  CheckCheck,
  Sparkles,
  Star,
  Search,
} from "lucide-react";
import { OrderQrCode } from "@/components/orders/order-qr-code";
import { BoothLocationModal } from "@/components/common/booth-location-modal";
import { OrderReviewModal } from "@/components/reviews/order-review-modal";
import { GoogleLogo } from "@/components/common/google-logo";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface OrderItemDetail {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  category?: string;
}

interface OrderRecord {
  id: string;
  order_number: string;
  created_at: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string | null;
  total_amount: number;
  payment_method?: string | null;
  payment_proof_url?: string | null;
  pickup_time?: string;
  notes?: string | null;
  status: "pending" | "menunggu_pembayaran" | "confirmed" | "dikerjakan" | "menunggu_selesai" | "completed" | "selesai" | "cancelled" | string;
  items?: OrderItemDetail[];
}

export default function OrderHistoryPage() {
  const { user, loadingUser } = useCart();
  const queryClient = useQueryClient();
  const [qrModalOrder, setQrModalOrder] = useState<OrderRecord | null>(null);
  const [receiptModalOrder, setReceiptModalOrder] = useState<OrderRecord | null>(null);
  const [reviewModalOrder, setReviewModalOrder] = useState<OrderRecord | null>(null);
  const [completedNotice, setCompletedNotice] = useState<string | null>(null);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // TanStack Query for orders (fetches all remote & local orders merged)
  const {
    data: orders = [],
    isLoading: loading,
    isFetching: refreshing,
    refetch,
  } = useQuery<OrderRecord[]>({
    queryKey: ["user-orders", user?.email, user?.id],
    queryFn: async () => {
      let localOrders: OrderRecord[] = [];
      try {
        const saved = localStorage.getItem(ORDER_HISTORY_KEY);
        if (saved) {
          localOrders = JSON.parse(saved);
        }
      } catch (e) {
        console.warn("Failed to load local order history:", e);
      }

      let remoteOrders: OrderRecord[] = [];
      const localOrderNumbers = localOrders.map((o) => o.order_number).filter(Boolean);

      try {
        const supabase = createClient();
        let query = supabase
          .from("orders")
          .select("*, order_items(*, menu_items(*))")
          .order("created_at", { ascending: false });

        if (user?.email) {
          if (localOrderNumbers.length > 0) {
            query = query.or(
              `customer_email.eq.${user.email},user_id.eq.${user.id},order_number.in.(${localOrderNumbers.join(",")})`
            );
          } else {
            query = query.or(`customer_email.eq.${user.email},user_id.eq.${user.id}`);
          }
        } else if (localOrderNumbers.length > 0) {
          query = query.in("order_number", localOrderNumbers);
        }

        const { data, error } = await query;

        if (!error && data) {
          remoteOrders = data.map((o: any) => ({
            id: o.id,
            order_number: o.order_number,
            created_at: o.created_at,
            customer_name: o.customer_name,
            customer_phone: o.customer_phone,
            customer_email: o.customer_email,
            total_amount: o.total_amount,
            payment_method: o.payment_method,
            payment_proof_url: o.payment_proof_url,
            pickup_time: o.pickup_time,
            notes: o.notes,
            status: o.status,
            items: (o.order_items || []).map((oi: any) => {
              const fallback = fallbackMenuItems.find(
                (m) => m.id === oi.menu_item_id || m.name === oi.menu_items?.name
              );
              return {
                id: oi.id,
                name: oi.menu_items?.name || fallback?.name || "Menu MathBites",
                price: oi.unit_price,
                quantity: oi.quantity,
                image_url: oi.menu_items?.image_url || fallback?.image_url,
                category: oi.menu_items?.category || fallback?.category,
              };
            }),
          }));
        }
      } catch (err) {
        console.warn("Failed to query remote orders:", err);
      }

      const map = new Map<string, OrderRecord>();
      for (const ro of remoteOrders) {
        map.set(ro.order_number, ro);
      }
      for (const lo of localOrders) {
        if (!map.has(lo.order_number)) {
          map.set(lo.order_number, lo);
        } else {
          // If remote order has empty items but local history has items, preserve them!
          const existing = map.get(lo.order_number)!;
          if ((!existing.items || existing.items.length === 0) && lo.items && lo.items.length > 0) {
            existing.items = lo.items;
          }
        }
      }

      return Array.from(map.values()).sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !loadingUser,
  });

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();
    return orders.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        (o.customer_phone && o.customer_phone.includes(q)) ||
        (o.items && o.items.some((it) => it.name.toLowerCase().includes(q)))
    );
  }, [orders, searchQuery]);

  const loadOrders = useCallback(() => {
    refetch();
  }, [refetch]);



  // Auto-close QR Modal immediately when order is scanned & completed by admin
  useEffect(() => {
    if (!qrModalOrder) return;
    const targetOrderNumber = qrModalOrder.order_number;
    const supabase = createClient();

    const handleCompleted = () => {
      setQrModalOrder(null);
      setCompletedNotice(targetOrderNumber);
      loadOrders();
      // Also update localStorage so local state reflects completion immediately
      try {
        const saved = localStorage.getItem(ORDER_HISTORY_KEY);
        if (saved) {
          const list = JSON.parse(saved);
          const updated = list.map((item: any) =>
            item.order_number === targetOrderNumber
              ? { ...item, status: "selesai" }
              : item
          );
          localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(updated));
        }
      } catch (e) {}
    };

    // 1. Supabase Postgres Realtime Channel
    const channel = supabase
      .channel(`qr-modal-live-${targetOrderNumber}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `order_number=eq.${targetOrderNumber}`,
        },
        (payload: any) => {
          if (payload.new?.status === "completed" || payload.new?.status === "selesai") {
            handleCompleted();
          }
        }
      )
      .subscribe();

    // 2. High-frequency Polling (every 1.5s) fallback while modal is open
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await (supabase.from("orders") as any)
          .select("status")
          .eq("order_number", targetOrderNumber)
          .single();

        if (data && (data.status === "completed" || data.status === "selesai")) {
          handleCompleted();
        }
      } catch (err) {
        // ignore poll errors
      }
    }, 1500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [qrModalOrder, loadOrders]);

  // Auto-dismiss completedNotice after 6s
  useEffect(() => {
    if (!completedNotice) return;
    const timer = setTimeout(() => {
      setCompletedNotice(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [completedNotice]);


  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "menunggu_selesai":
        return {
          label: "Siap Diambil di Booth",
          icon: Sparkles,
          cls: "bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200 border-purple-300 dark:border-purple-800 ring-2 ring-purple-400/40",
          step: 3,
        };
      case "dikerjakan":
      case "confirmed":
      case "dikonfirmasi":
        return {
          label: "Baru Dikerjakan",
          icon: UtensilsCrossed,
          cls: "bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 border-blue-300 dark:border-blue-800",
          step: 2,
        };
      case "selesai":
      case "completed":
        return {
          label: "Selesai (Sudah Diambil)",
          icon: CheckCheck,
          cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800",
          step: 4,
        };
      case "cancelled":
      case "dibatalkan":
        return {
          label: "Dibatalkan",
          icon: XCircle,
          cls: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border-rose-300 dark:border-rose-800",
          step: 0,
        };
      case "menunggu_pembayaran":
      case "pending":
      default:
        return {
          label: "Menunggu Pembayaran",
          icon: Clock,
          cls: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border-amber-300 dark:border-amber-800",
          step: 1,
        };
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return "Baru saja";
    }
  };

  return (
    <main className="w-full pt-24 pb-20 bg-surface min-h-[85vh]">
      {/* Floating Notification when QR is scanned & completed by admin */}
      {completedNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
              <CheckCheck className="w-6 h-6" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-sm">Pesanan #{completedNotice} Berhasil Diambil!</p>
              <p className="text-white/90">
                Makanan telah diserahkan oleh panitia di booth. Selamat menikmati!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCompletedNotice(null)}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadOrders()}
            disabled={refreshing}
            className="gap-1.5 text-xs font-semibold rounded-xl"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>Segarkan</span>
          </Button>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs font-semibold text-primary">
              MathBites &middot; Olimpiade 27
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-on-surface"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Riwayat Pemesanan Anda
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Pantau rincian pesanan dan status transaksi untuk pengambilan di
            Kampus Pendidikan Matematika FKIP UNRI.
          </p>
        </div>

        {/* Booth Location Information Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-card border border-border shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-foreground">Lokasi Booth Stand Pengambilan</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Kampus Pendidikan Matematika FKIP Universitas Riau, Pekanbaru. Buka Kamis, 24 Oktober (11:30–14:00 WIB).
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMapModalOpen(true)}
            className="rounded-xl text-xs font-semibold text-primary border-primary/20 hover:bg-primary/5 cursor-pointer shrink-0"
          >
            <MapPin className="w-3.5 h-3.5 mr-1.5" />
            <span>Lihat Peta Booth &amp; Rute</span>
          </Button>
        </div>

        {/* Not Logged In Banner (if guest) */}
        {!user && !loadingUser && (
          <Card className="mb-8 p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-none">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shrink-0 shadow-2xs">
                <GoogleLogo className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface">
                  Masuk dengan Akun Google
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Hubungkan pesanan Anda ke akun Google agar riwayat tersinkronisasi
                  dan dapat diakses kapan saja.
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="rounded-xl shrink-0 gap-2">
              <Link href="/login?next=/pesanan">
                <GoogleLogo className="w-4 h-4 shrink-0" />
                Masuk Akun
              </Link>
            </Button>
          </Card>
        )}

        {/* Loading State */}
        {loading || loadingUser ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-10 h-10 rounded-2xl bg-surface-container flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-primary animate-spin" />
            </div>
            <p className="text-sm text-on-surface-variant font-medium">
              Memuat riwayat pemesanan...
            </p>
          </div>
        ) : orders.length === 0 ? (
          /* Empty State */
          <Card className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-3xl space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h2 className="text-lg font-bold text-foreground">
                Belum Ada Riwayat Pemesanan
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Anda belum melakukan pemesanan. Pilih aneka makanan atau minuman
                lezat untuk santap siang Anda sekaligus mendukung kegiatan
                Olimpiade 27.
              </p>
            </div>
            <Button asChild size="lg" className="rounded-xl shadow-md gap-2">
              <Link href="/menu">
                <UtensilsCrossed className="w-4 h-4" />
                Pilih Menu Sekarang
              </Link>
            </Button>
          </Card>
        ) : (
          /* Orders List */
          <div className="space-y-5">
            {/* Search Input Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari pesanan berdasarkan nomor order, nama, atau menu..."
                  className="pl-9 h-10 rounded-2xl text-xs bg-card border-border"
                />
              </div>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="rounded-xl text-xs cursor-pointer"
                >
                  Reset
                </Button>
              )}
            </div>

            {filteredOrders.length === 0 ? (
              <Card className="p-8 text-center rounded-2xl border-border bg-card">
                <p className="text-xs text-muted-foreground">
                  Tidak ditemukan pesanan yang sesuai dengan kata kunci &ldquo;{searchQuery}&rdquo;.
                </p>
              </Card>
            ) : (
              filteredOrders.map((order: any) => {
              const status = getStatusBadge(order.status);
              const waUrl = `https://wa.me/?text=${encodeURIComponent(
                `Halo Panitia Olimpiade 27 MathBites! 👋\n` +
                  `Saya ingin menanyakan pesanan saya:\n\n` +
                  `*Nomor Order:* ${order.order_number}\n` +
                  `*Nama:* ${order.customer_name}\n` +
                  `*Total:* ${formatRupiah(order.total_amount)}\n` +
                  `*Status:* ${status.label}\n\n` +
                  `Terima kasih!`
              )}`;

              return (
                <motion.div
                  key={order.order_number}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    className="rounded-3xl shadow-sm overflow-hidden hover:shadow-md transition-shadow gap-0 p-0"
                  >
                  {/* Order Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b bg-muted/40">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-mono text-sm font-bold text-foreground block leading-tight">
                          {order.order_number}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(order.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`gap-1.5 px-3 py-1 font-bold ${status.cls}`}
                      >
                        <status.icon className="w-3.5 h-3.5" />
                        {status.label}
                      </Badge>
                    </div>
                  </div>

                  {/* 4-Step Progress Indicator */}
                  {status.step > 0 && (
                    <div className="px-4 sm:px-6 pt-4 pb-2 border-b bg-muted/15">
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { num: 1, label: "Menunggu Bayar" },
                          { num: 2, label: "Baru Dikerjakan" },
                          { num: 3, label: "Siap Diambil" },
                          { num: 4, label: "Selesai" },
                        ].map((s) => {
                          const isOrderCompleted = status.step === 4;
                          const isPast = status.step > s.num;
                          const isCurrent = status.step === s.num && !isOrderCompleted;
                          const isChecked = isPast || (isOrderCompleted && s.num <= 4);

                          return (
                            <div key={s.num} className="flex flex-col items-center gap-1.5">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                                  isChecked
                                    ? "bg-emerald-500 text-white shadow-2xs"
                                    : isCurrent
                                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110 shadow-xs"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {isChecked ? (
                                  <CheckCheck className="w-3.5 h-3.5" />
                                ) : (
                                  s.num
                                )}
                              </div>
                              <span
                                className={`text-[10px] sm:text-xs leading-tight font-medium ${
                                  isChecked
                                    ? "font-semibold text-emerald-700 dark:text-emerald-400"
                                    : isCurrent
                                    ? "font-bold text-primary"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {s.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* PROMINENT BANNER: PESANAN SIAP DIAMBIL DENGAN SCAN QR */}
                  {(order.status === "menunggu_selesai" || order.status === "ready") && (
                    <div className="mx-4 sm:mx-5 mt-4 p-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg flex items-start gap-3 animate-in fade-in zoom-in-95">
                      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                        <Sparkles className="w-6 h-6 text-yellow-300 animate-bounce" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm sm:text-base">
                          Pesanan Anda Sudah Selesai Disiapkan!
                        </h4>
                        <p className="text-xs text-purple-100 mt-0.5 leading-relaxed">
                          Silakan datang ke <strong>Booth MathBites</strong> dan tunjukkan <strong>QR Bukti Ambil</strong> pada kartu pesanan kepada panitia untuk di-scan.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* COMPLETED BANNER */}
                  {(order.status === "selesai" || order.status === "completed") && (
                    <div className="mx-4 sm:mx-5 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Pesanan telah berhasil diambil dan diserahkan di booth. Selamat menikmati!</span>
                    </div>
                  )}

                  {/* Order Items List */}
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border/70">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <UtensilsCrossed className="w-3.5 h-3.5 text-primary" />
                        <span>Rincian Menu yang Dibeli</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5 rounded-md">
                        {order.items?.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0) || 1} porsi
                      </Badge>
                    </div>

                    {order.items && order.items.length > 0 ? (
                      <div className="divide-y divide-border/60">
                        {order.items.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-2.5 first:pt-1 last:pb-1 gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {item.image_url ? (
                                <div className="size-11 sm:size-12 rounded-xl bg-muted overflow-hidden shrink-0 relative border border-border shadow-2xs">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="size-11 sm:size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                                  <UtensilsCrossed className="w-5 h-5" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                                    {item.name}
                                  </h4>
                                  {item.category && (
                                    <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 rounded font-bold text-muted-foreground">
                                      {item.category}
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground block mt-0.5">
                                  {item.quantity} &times; {formatRupiah(item.price)}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-foreground shrink-0 font-mono">
                              {formatRupiah(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Menu Terpilih & Santap Siang Kampus</span>
                        <span className="font-bold text-foreground font-mono">{formatRupiah(order.total_amount)}</span>
                      </div>
                    )}

                    {order.notes && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                        <span className="font-bold shrink-0">Catatan:</span>
                        <span>{order.notes}</span>
                      </div>
                    )}

                    {/* Booth Pickup Notice (no pickup time) */}
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/60 border border-border/60 text-xs text-muted-foreground">
                      <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>
                        Pengambilan pesanan di <strong className="text-foreground">Booth MathBites (Kampus Pendidikan Matematika FKIP UNRI)</strong>. Tunjukkan QR Code ke panitia saat mengambil pesanan.
                      </span>
                    </div>
                  </div>

                  {/* Order Card Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-t bg-muted/20">
                    <div className="flex items-center justify-between sm:justify-start gap-3">
                      <div>
                        <span className="text-xs text-muted-foreground block">
                          Total Pembayaran
                        </span>
                        <span className="text-base sm:text-lg font-bold text-primary">
                          {formatRupiah(order.total_amount)}
                        </span>
                      </div>
                      {order.payment_method && (
                        <Badge variant="outline" className="gap-1 font-medium text-xs rounded-lg">
                          <CreditCard className="w-3 h-3 text-primary" />
                          {order.payment_method === "qris" ? "QRIS" : order.payment_method === "transfer" ? "Transfer Bank" : "Tunai"}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {(order.status === "completed" || order.status === "selesai") ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setReceiptModalOrder(order)}
                            className="gap-1.5 rounded-xl font-semibold shadow-xs border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
                            title="Lihat struk resmi rincian pembayaran pesanan"
                          >
                            <Receipt className="w-4 h-4 text-emerald-600" />
                            <span>Lihat Struk</span>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setReviewModalOrder(order)}
                            className="gap-1.5 rounded-xl font-bold text-xs shadow-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                            title="Beri penilaian bintang dan ulasan pesanan"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                            <span>Beri Ulasan &amp; Rating</span>
                          </Button>
                        </>
                      ) : (order.status === "menunggu_selesai" || order.status === "ready") ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setQrModalOrder(order)}
                          className="gap-1.5 rounded-xl font-semibold shadow-sm"
                          title="Tampilkan QR Code untuk scan saat mengambil pesanan"
                        >
                          <QrCode className="w-4 h-4" />
                          <span>QR Bukti Ambil</span>
                        </Button>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                          title="QR Code akan terbit otomatis saat pesanan sudah siap diambil"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                          <span>QR Terbit Saat Siap Diambil</span>
                        </Badge>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="gap-1.5 rounded-xl font-semibold shadow-xs"
                      >
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
            }))}
          </div>
        )}

        {/* QR Code Modal for Customer Pickup (Hanya untuk pesanan yang belum diambil / siap diambil) */}
        {qrModalOrder && (qrModalOrder.status === "menunggu_selesai" || qrModalOrder.status === "ready") && (
          <Dialog
            open={!!qrModalOrder}
            onOpenChange={(isOpen) => !isOpen && setQrModalOrder(null)}
          >
            <DialogContent className="max-w-sm p-6 text-center rounded-3xl">
              <DialogHeader className="p-0 text-center">
                <DialogTitle className="text-lg font-bold text-foreground">
                  QR Bukti Pengambilan
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  Tunjukkan QR ini ke panitia di <strong>Booth MathBites (Kampus FKIP UNRI)</strong> saat mengambil pesanan.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 flex flex-col items-center justify-center">
                <OrderQrCode
                  orderNumber={qrModalOrder.order_number}
                  customerName={qrModalOrder.customer_name}
                  status={qrModalOrder.status}
                  size={200}
                  showDetails={false}
                />
              </div>

              <div className="pt-3 border-t border-border text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>
                  Booth MathBites &middot; Kampus FKIP UNRI
                </span>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Struk Pembelian Modal (Ketika pesanan telah selesai di-scan & diserahkan) */}
        {receiptModalOrder && (
          <Dialog
            open={!!receiptModalOrder}
            onOpenChange={(isOpen) => !isOpen && setReceiptModalOrder(null)}
          >
            <DialogContent className="max-w-md p-6 rounded-3xl">
              <DialogHeader className="p-0 text-center space-y-1.5">
                <div className="size-12 rounded-full bg-emerald-500/15 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                  <CheckCheck className="w-6 h-6" />
                </div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Struk Pembelian Terverifikasi
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  MathBites &middot; Penggalangan Dana Olimpiade Matematika Ke-27
                </DialogDescription>
              </DialogHeader>

              <div className="my-4 p-4 rounded-2xl bg-muted/30 border border-border space-y-3 text-xs">
                {/* Meta info */}
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-muted-foreground font-medium">No. Pesanan</span>
                  <span className="font-mono font-bold text-primary">
                    {receiptModalOrder.order_number}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-muted-foreground font-medium">Waktu Transaksi</span>
                  <span className="font-medium text-foreground">
                    {new Date(receiptModalOrder.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-muted-foreground font-medium">Nama Pemesan</span>
                  <span className="font-semibold text-foreground">
                    {receiptModalOrder.customer_name}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-1.5 py-1">
                  <p className="font-semibold text-foreground">Daftar Menu</p>
                  {receiptModalOrder.items?.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-muted-foreground">
                      <span>{it.name} &times; {it.quantity}</span>
                      <span className="font-medium text-foreground">{formatRupiah(it.price * it.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="pt-2 border-t border-border flex justify-between items-center text-sm font-bold">
                  <span>Total Bayar</span>
                  <span className="text-primary text-base font-extrabold">
                    {formatRupiah(receiptModalOrder.total_amount)}
                  </span>
                </div>

                <div className="pt-2 border-t border-border flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Metode Pembayaran</span>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {receiptModalOrder.payment_method === "qris" ? "QRIS" : receiptModalOrder.payment_method === "transfer" ? "Transfer Bank" : "Tunai"}
                  </Badge>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-center font-medium">
                  Pesanan telah diserahkan &amp; status selesai
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={() => setReceiptModalOrder(null)}
              >
                Tutup Struk
              </Button>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal Peta Booth Stand */}
        <BoothLocationModal open={mapModalOpen} onOpenChange={setMapModalOpen} />

        {/* Modal Beri Ulasan & Rating Pesanan */}
        <OrderReviewModal
          open={!!reviewModalOrder}
          onOpenChange={(isOpen) => !isOpen && setReviewModalOrder(null)}
          order={reviewModalOrder}
          userId={user?.id}
          onReviewSubmitted={() => refetch()}
        />
      </div>
    </main>
  );
}
