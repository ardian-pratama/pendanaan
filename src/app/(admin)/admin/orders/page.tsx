"use client";

import { useEffect, useState, useMemo } from "react";
import { AdminTopBar } from "@/components/admin/admin-sidebar";
import {
  fetchAdminOrders,
  updateOrderStatus,
  deleteOrder,
  getFriendlyErrorMessage,
  getCurrentUserProfile,
  type OrderWithItems,
} from "@/lib/supabase/admin";
import { ErrorBanner } from "@/components/admin/error-banner";
import type { OrderStatus } from "@/lib/supabase/database.types";
import { formatRupiah } from "@/lib/data/menu-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ShoppingBag,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  RefreshCw,
  Phone,
  Mail,
  User,
  FileText,
  MoreVertical,
  Check,
  X,
  Camera,
  Zap,
  ScanLine,
  CheckCheck,
  UtensilsCrossed,
  Sparkles,
  CreditCard,
  SlidersHorizontal,
  Printer,
  MessageCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { hasPermission } from "@/lib/auth/permissions";
import { OrderQrCode } from "@/components/orders/order-qr-code";
import { QrScannerModal } from "@/components/orders/qr-scanner-modal";

const statusFilters = [
  { id: "semua", label: "Semua" },
  { id: "menunggu_pembayaran", label: "Menunggu Pembayaran" },
  { id: "dikerjakan", label: "Baru Dikerjakan" },
  { id: "menunggu_selesai", label: "Menunggu Selesai" },
  { id: "selesai", label: "Selesai" },
  { id: "cancelled", label: "Dibatalkan" },
];

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Scan (Barcode Gun & Instant Direct Scan)
  const [quickScanInput, setQuickScanInput] = useState("");
  const [quickScanResult, setQuickScanResult] = useState<{
    orderNumber: string;
    customerName: string;
    total: number;
    itemsCount: number;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // TanStack Query: Current User Profile
  const { data: currentUser = null } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: getCurrentUserProfile,
  });

  // TanStack Query: Admin Orders
  const {
    data: orders = [],
    isLoading: loading,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ["admin-orders", activeFilter, searchQuery],
    queryFn: () =>
      fetchAdminOrders({
        status: activeFilter,
        search: searchQuery,
      }),
  });

  // Supabase real-time updates -> Invalidate TanStack Query
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-orders-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const canUpdate = hasPermission(currentUser, "orders:update");
  const canDelete = hasPermission(currentUser, "orders:delete");

  // TanStack Query: Status Update Mutation
  const statusMutation = useMutation({
    mutationFn: async ({
      orderId,
      newStatus,
    }: {
      orderId: string;
      newStatus: OrderStatus;
    }) => {
      await updateOrderStatus(orderId, newStatus);
      return { orderId, newStatus };
    },
    onSuccess: ({ orderId, newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      showToast(`Status pesanan berhasil diubah menjadi: ${newStatus}`);
    },
    onError: (err: unknown) => {
      showToast(
        getFriendlyErrorMessage(err, "Gagal mengubah status pesanan. Silakan coba lagi.")
      );
    },
  });

  // TanStack Query: Delete Order Mutation
  const deleteMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await deleteOrder(orderId);
      return orderId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setDetailOpen(false);
      showToast("Pesanan berhasil dihapus dari sistem.");
    },
    onError: (err: unknown) => {
      showToast(getFriendlyErrorMessage(err, "Gagal menghapus pesanan."));
    },
  });

  const playQuickScanTone = (type: "success" | "warning" | "error") => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      if (type === "success") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === "warning") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.setValueAtTime(180, now + 0.12);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(140, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch {}
  };

  // TanStack Query: Quick Scan Mutation
  const quickScanMutation = useMutation({
    mutationFn: async (rawInput: string) => {
      const raw = rawInput.trim();
      if (!raw) throw new Error("Nomor pesanan kosong");

      let orderNumber = raw;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.orderNumber) {
          orderNumber = String(parsed.orderNumber).trim();
        }
      } catch {}

      const supabase = createClient();
      const { data, error } = await (supabase.from("orders") as any)
        .select("id, order_number, customer_name, status, total_amount, order_items(id)")
        .ilike("order_number", orderNumber)
        .single();

      if (error || !data) {
        playQuickScanTone("error");
        throw new Error(`Pesanan ${orderNumber} tidak ditemukan.`);
      }

      if (data.status === "completed" || data.status === "selesai") {
        playQuickScanTone("warning");
        throw new Error(
          `Pesanan ${data.order_number} (${data.customer_name}) SUDAH PERNAH DIAMBIL sebelumnya!`
        );
      }

      if (data.status !== "menunggu_selesai" && data.status !== "ready") {
        playQuickScanTone("warning");
        const statusLabel =
          data.status === "dikerjakan"
            ? "Baru Dikerjakan"
            : data.status === "menunggu_pembayaran"
            ? "Menunggu Pembayaran"
            : data.status;
        throw new Error(
          `Kode ${data.order_number} BELUM DAPAT DIGUNAKAN! Status: '${statusLabel}'. Pesanan harus berstatus 'Siap Diambil' sebelum kodenya dapat digunakan.`
        );
      }

      await updateOrderStatus(data.id, "selesai");
      playQuickScanTone("success");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setQuickScanResult({
        orderNumber: data.order_number,
        customerName: data.customer_name,
        total: data.total_amount,
        itemsCount: data.order_items?.length || 0,
      });
      showToast(`⚡ Pesanan ${data.order_number} otomatis SELESAI!`);
      setQuickScanInput("");
      setTimeout(() => setQuickScanResult(null), 5000);
    },
    onError: (err: any) => {
      showToast(err.message || "Gagal memproses quick scan");
    },
  });

  const handleQuickScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickScanInput.trim()) return;
    quickScanMutation.mutate(quickScanInput);
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    if (!canUpdate) {
      showToast("Anda tidak memiliki izin (orders:update) untuk mengubah status pesanan");
      return;
    }

    if (newStatus === "selesai" || newStatus === "completed") {
      const current = orders.find((o) => o.id === orderId);
      if (
        current &&
        current.status !== "menunggu_selesai" &&
        current.status !== "ready"
      ) {
        showToast(
          "⚠️ Pesanan belum siap diambil! Ubah alur ke '3. Siap Diambil' terlebih dahulu agar kode pengambilan aktif sebelum menyelesaikan pesanan."
        );
        return;
      }
    }

    statusMutation.mutate({ orderId, newStatus });
  };

  const handleDelete = (orderId: string) => {
    if (!canDelete) {
      showToast("Anda tidak memiliki izin (orders:delete) untuk menghapus pesanan");
      return;
    }
    if (!confirm("Apakah Anda yakin ingin menghapus pesanan ini secara permanen?")) return;
    deleteMutation.mutate(orderId);
  };

  const getStatusBadge = (status: OrderStatus | string) => {
    const s = String(status).toLowerCase();
    switch (s) {
      case "menunggu_pembayaran":
      case "pending":
      case "bayar":
        return (
          <Badge variant="warning" className="gap-1.5 font-semibold py-1 px-2.5 text-xs shadow-none">
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Menunggu Pembayaran
          </Badge>
        );
      case "dikerjakan":
      case "confirmed":
        return (
          <Badge variant="info" className="gap-1.5 font-semibold py-1 px-2.5 text-xs shadow-none">
            <UtensilsCrossed className="w-3 h-3 text-sky-600 dark:text-sky-400" /> Baru Dikerjakan
          </Badge>
        );
      case "menunggu_selesai":
        return (
          <Badge variant="purple" className="gap-1.5 font-bold py-1 px-2.5 text-xs shadow-none animate-pulse border">
            <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" /> Menunggu Selesai
          </Badge>
        );
      case "selesai":
      case "completed":
        return (
          <Badge variant="success" className="gap-1.5 font-semibold py-1 px-2.5 text-xs shadow-none">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Selesai
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive" className="gap-1.5 font-semibold py-1 px-2.5 text-xs shadow-none">
            <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Dibatalkan
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // TanStack Table Column Definitions
  const columns = useMemo<ColumnDef<OrderWithItems>[]>(
    () => [
      {
        accessorKey: "order_number",
        header: () => (
          <span className="text-xs font-semibold text-muted-foreground">
            No. Pesanan
          </span>
        ),
        cell: ({ row }) => (
          <span className="font-mono font-bold text-primary whitespace-nowrap">
            {row.original.order_number}
          </span>
        ),
      },
      {
        accessorKey: "customer_name",
        header: () => (
          <span className="text-xs font-semibold text-muted-foreground">
            Pelanggan
          </span>
        ),
        cell: ({ row }) => (
          <div>
            <div
              className="font-semibold text-foreground truncate max-w-[170px]"
              title={row.original.customer_name}
            >
              {row.original.customer_name}
            </div>
            <div
              className="text-xs text-muted-foreground mt-0.5 truncate max-w-[170px]"
              title={row.original.customer_phone}
            >
              {row.original.customer_phone}
            </div>
          </div>
        ),
      },
      {
        id: "items",
        header: () => (
          <span className="text-xs font-semibold text-muted-foreground">
            Menu Dipesan
          </span>
        ),
        cell: ({ row }) => {
          const items = row.original.order_items;
          return items && items.length > 0 ? (
            <div
              className="truncate text-xs leading-relaxed max-w-[280px]"
              title={items
                .map((it) => `${it.menu_item?.name || "Item"} × ${it.quantity}`)
                .join(", ")}
            >
              {items
                .map((it) => `${it.menu_item?.name || "Item"} × ${it.quantity}`)
                .join(", ")}
            </div>
          ) : (
            <span className="text-muted-foreground italic text-xs">
              Detail item tidak tersedia
            </span>
          );
        },
      },
      {
        accessorKey: "total_amount",
        header: () => (
          <span className="text-xs font-semibold text-muted-foreground">
            Total &amp; Metode
          </span>
        ),
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <div className="font-bold text-foreground">
              {formatRupiah(row.original.total_amount)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {row.original.payment_method || "Tunai"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: () => (
          <div className="text-center text-xs font-semibold text-muted-foreground">
            Status
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex justify-center whitespace-nowrap">
            {getStatusBadge(row.original.status as OrderStatus)}
          </div>
        ),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right text-xs font-semibold text-muted-foreground">
            Aksi
          </div>
        ),
        cell: ({ row }) => {
          const order = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedOrder(order);
                  setDetailOpen(true);
                }}
                className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                title="Buka panel kelola rincian & aksi pesanan"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                <span>Kelola Pesanan</span>
              </Button>
            </div>
          );
        },
      },
    ],
    [canUpdate, canDelete, statusMutation]
  );

  // TanStack Table Instance
  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminTopBar title="Kelola Pesanan Masuk" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        {/* Error Banner */}
        {ordersError && (
          <ErrorBanner
            message={getFriendlyErrorMessage(
              ordersError,
              "Gagal memuat daftar pesanan. Pastikan akun memiliki hak akses dan koneksi internet stabil."
            )}
            onRetry={() => refetchOrders()}
          />
        )}

        {/* Quick Scan Bar (Barcode Scanner Gun & Direct Code) */}
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shadow-xs rounded-2xl overflow-hidden p-0">
          <CardContent className="p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                  <span>Quick Scan Pesanan</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                    Instant
                  </Badge>
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Gunakan barcode scanner USB/Bluetooth, ketik nomor pesanan, atau buka kamera.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <form onSubmit={handleQuickScan} className="flex-1 md:w-72 relative">
                <ScanLine className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Ketik/Scan Kode..."
                  value={quickScanInput}
                  onChange={(e) => setQuickScanInput(e.target.value)}
                  disabled={quickScanMutation.isPending}
                  className="pl-9 pr-14 text-xs font-mono h-9 bg-background"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  disabled={quickScanMutation.isPending || !quickScanInput.trim()}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-[11px] font-bold text-primary hover:bg-primary/10"
                >
                  {quickScanMutation.isPending ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    "Scan"
                  )}
                </Button>
              </form>

              <Button
                variant="default"
                type="button"
                size="sm"
                onClick={() => setQrScannerOpen(true)}
                className="gap-1.5 shrink-0 cursor-pointer shadow-xs font-bold"
                title="Buka Kamera Scanner"
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kamera</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick scan success banner */}
        {quickScanResult && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-400 dark:border-emerald-700 flex items-center justify-between gap-3 text-emerald-950 dark:text-emerald-100 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCheck className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold">
                  Pesanan #{quickScanResult.orderNumber} Berhasil Diselesaikan Otomatis!
                </p>
                <p className="text-emerald-800 dark:text-emerald-300">
                  Pembeli: <strong>{quickScanResult.customerName}</strong> • {quickScanResult.itemsCount} Item • {formatRupiah(quickScanResult.total)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              type="button"
              onClick={() => setQuickScanResult(null)}
              className="text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200/50"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Filter & Search Card with shadcn Tabs */}
        <Card className="p-3 sm:p-4 rounded-2xl shadow-xs border gap-0">
          <CardContent className="p-0 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
            {/* Status tabs */}
            <div className="overflow-x-auto pb-1 md:pb-0 scrollbar-none -mx-1 px-1">
              <Tabs value={activeFilter} onValueChange={setActiveFilter}>
                <TabsList className="bg-transparent border-0 p-0 gap-1.5 h-auto">
                  {statusFilters.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer h-8 px-3 border border-border/50 data-active:border-primary data-active:bg-primary data-active:text-primary-foreground transition-all"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Search box */}
            <div className="relative w-full md:w-72 shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
              <Input
                type="text"
                placeholder="Cari no order / nama / no HP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Orders Card / Table */}
        <Card className="rounded-2xl shadow-xs border overflow-hidden p-0 gap-0">
          {/* MOBILE CARD LIST (< md) */}
          <div className="md:hidden divide-y divide-border">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                <span className="text-xs">Memuat data pesanan...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                <ShoppingBag className="w-8 h-8 opacity-40" />
                <p className="text-xs font-medium">Tidak ada pesanan yang sesuai filter.</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="p-4 flex flex-col gap-3">
                  {/* Card Header: Order No & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-primary">
                      {order.order_number}
                    </span>
                    {getStatusBadge(order.status as OrderStatus)}
                  </div>

                  {/* Customer Info */}
                  <div>
                    <h4 className="font-bold text-sm text-foreground leading-tight">
                      {order.customer_name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.customer_phone}
                    </p>
                  </div>

                  {/* Items Preview */}
                  <div className="p-2.5 rounded-xl bg-muted/50 text-xs text-foreground">
                    <p className="line-clamp-2 text-[11px] text-muted-foreground">
                      {order.order_items && order.order_items.length > 0
                        ? order.order_items
                            .map((it) => `${it.menu_item?.name || "Item"} × ${it.quantity}`)
                            .join(", ")
                        : "Detail item tidak tersedia"}
                    </p>
                  </div>

                  {/* Total & Action Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div>
                      <span className="text-xs text-muted-foreground font-medium">
                        Total Bayar ({order.payment_method || "Tunai"})
                      </span>
                      <p className="font-bold text-sm text-foreground">
                        {formatRupiah(order.total_amount)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setDetailOpen(true);
                        }}
                        className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                        <span>Kelola Pesanan</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP / TABLET SHADCN TANSTACK TABLE (>= md) */}
          <div className="hidden md:block overflow-x-auto scrollbar-thin">
            <Table className="min-w-[960px]">
              <TableHeader className="bg-muted/40">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={cn(
                          "px-4 py-3.5",
                          header.id === "order_number" && "px-5 w-[15%] min-w-[130px] whitespace-nowrap",
                          header.id === "customer_name" && "w-[20%] min-w-[160px]",
                          header.id === "items" && "w-[30%] min-w-[220px]",
                          header.id === "total_amount" && "w-[15%] min-w-[130px] whitespace-nowrap",
                          header.id === "status" && "w-[10%] min-w-[120px] whitespace-nowrap",
                          header.id === "actions" && "px-5 text-right w-[10%] min-w-[120px] whitespace-nowrap"
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                        <span>Memuat data pesanan...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShoppingBag className="w-8 h-8 opacity-40" />
                        <p className="font-medium">Tidak ada pesanan yang sesuai filter.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "px-4 py-4 align-middle",
                            cell.column.id === "order_number" && "px-5",
                            cell.column.id === "actions" && "px-5 text-right"
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-lg max-h-[90vh] p-4 sm:p-6 overflow-y-auto rounded-3xl">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold font-mono text-primary">
                    {selectedOrder.order_number}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Dibuat pada{" "}
                    {new Date(selectedOrder.created_at).toLocaleString("id-ID")}
                  </DialogDescription>
                </div>
                {getStatusBadge(selectedOrder.status as OrderStatus)}
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2 text-sm">
              {/* Customer Info Card */}
              <Card className="bg-muted/40 p-3 sm:p-3.5 rounded-xl border gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Informasi Pemesan
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      {selectedOrder.customer_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <a
                      href={`https://wa.me/${selectedOrder.customer_phone.replace(/^0/, "62")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {selectedOrder.customer_phone}
                    </a>
                  </div>
                  {selectedOrder.customer_email && (
                    <div className="flex items-center gap-2 col-span-2">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground truncate">
                        {selectedOrder.customer_email}
                      </span>
                    </div>
                  )}
                  {selectedOrder.payment_method && (
                    <div className="flex items-center gap-2 col-span-2">
                      <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Metode Pembayaran <strong className="text-foreground">{selectedOrder.payment_method === "qris" ? "QRIS" : selectedOrder.payment_method === "transfer" ? "Transfer Bank" : "Tunai"}</strong>
                      </span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Order Items */}
              <Card className="rounded-xl border overflow-hidden p-0 gap-0">
                <div className="bg-muted/50 px-3.5 py-2 font-bold text-xs text-foreground border-b">
                  Item Pesanan
                </div>
                <div className="divide-y divide-border">
                  {selectedOrder.order_items?.map((item) => (
                    <div
                      key={item.id}
                      className="px-3.5 py-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-foreground">
                          {item.menu_item?.name || "Menu Item"}
                        </p>
                        <p className="text-muted-foreground">
                          {formatRupiah(item.unit_price)} × {item.quantity}
                        </p>
                      </div>
                      <span className="font-bold text-foreground">
                        {formatRupiah(item.subtotal || item.unit_price * item.quantity)}
                      </span>
                    </div>
                  ))}

                  <div className="px-3.5 py-3 bg-muted/30 flex items-center justify-between text-sm font-bold">
                    <span>Total Pembayaran</span>
                    <span className="text-primary text-base font-extrabold">
                      {formatRupiah(selectedOrder.total_amount)}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="bg-muted/40 p-3 rounded-xl border text-xs flex flex-col gap-1">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Catatan Pesanan
                  </span>
                  <p className="text-foreground italic">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Payment Proof Upload (QRIS / Transfer) */}
              {selectedOrder.payment_proof_url && (
                <Card className="rounded-xl border p-3.5 bg-muted/20 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-primary" />
                      Bukti Pembayaran ({selectedOrder.payment_method?.toUpperCase() || "UPLOAD"})
                    </span>
                    <a
                      href={selectedOrder.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Buka Resolusi Penuh
                    </a>
                  </div>
                  <div className="relative rounded-lg overflow-hidden border bg-background max-h-60 flex items-center justify-center p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedOrder.payment_proof_url}
                      alt={`Bukti Bayar ${selectedOrder.order_number}`}
                      className="w-full max-h-56 object-contain rounded-md"
                    />
                  </div>
                </Card>
              )}

              {/* QR Code Bukti Ambil / Status Selesai */}
              {(selectedOrder.status === "selesai" || selectedOrder.status === "completed") ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center flex flex-col items-center gap-1.5">
                  <CheckCheck className="w-6 h-6 text-emerald-600" />
                  <p className="text-xs font-bold text-foreground">Pesanan Selesai &amp; Diserahkan</p>
                  <p className="text-[11px] text-muted-foreground">
                    Kode QR telah hangus karena pesanan sudah berhasil diverifikasi dan diserahkan kepada pemesan.
                  </p>
                </div>
              ) : (
                <Card className="p-4 bg-muted/20 rounded-2xl border flex flex-col items-center gap-0">
                  <span className="text-xs font-semibold text-muted-foreground mb-2">
                    QR Code Bukti Pengambilan
                  </span>
                  <OrderQrCode
                    orderNumber={selectedOrder.order_number}
                    customerName={selectedOrder.customer_name}
                    status={selectedOrder.status}
                    size={150}
                    showDetails={true}
                  />
                </Card>
              )}

              {/* Status Updater */}
              {canUpdate ? (
                <div className="flex flex-col gap-2 pt-2 border-t">
                  <label className="text-xs font-bold text-muted-foreground">
                    Ubah Status Alur Pesanan
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { status: "menunggu_pembayaran" as OrderStatus, label: "1. Menunggu Bayar", match: ["menunggu_pembayaran", "pending"] },
                      { status: "dikerjakan" as OrderStatus, label: "2. Baru Dikerjakan", match: ["dikerjakan", "confirmed"] },
                      { status: "menunggu_selesai" as OrderStatus, label: "3. Siap Diambil", match: ["menunggu_selesai"] },
                      { status: "selesai" as OrderStatus, label: "4. Selesai (Diambil)", match: ["selesai", "completed"] },
                      { status: "cancelled" as OrderStatus, label: "Batalkan Pesanan", match: ["cancelled"] },
                    ].map((item) => {
                      const isActive = item.match.includes(selectedOrder.status);
                      return (
                        <Button
                          key={item.status}
                          variant={
                            isActive
                              ? "default"
                              : item.status === "cancelled"
                              ? "destructive"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => handleStatusChange(selectedOrder.id, item.status)}
                          disabled={statusMutation.isPending || isActive}
                          className={cn(
                            "h-9 text-xs font-semibold transition-all rounded-xl cursor-pointer",
                            isActive && "ring-2 ring-primary/20 shadow-xs",
                            !isActive && item.status === "cancelled" && "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20"
                          )}
                        >
                          {item.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-muted/40 rounded-xl border text-[11px] text-muted-foreground flex items-center gap-2">
                  <span>Anda hanya memiliki izin melihat pesanan (read-only).</span>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="rounded-xl text-xs font-semibold gap-1.5 h-9"
                  >
                    <a
                      href={`https://wa.me/${selectedOrder.customer_phone.replace(/^0/, "62")}?text=${encodeURIComponent(
                        `Halo kak ${selectedOrder.customer_name}! 👋\n` +
                        `Ini dari Panitia MathBites Olimpiade 27 mengenai pesanan #${selectedOrder.order_number}.\n` +
                        `Status pesanan: ${selectedOrder.status.replace(/_/g, " ")}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp Pemesan</span>
                    </a>
                  </Button>

                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(selectedOrder.id)}
                      disabled={deleteMutation.isPending}
                      className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 font-semibold h-9"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </Button>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailOpen(false)}
                  className="rounded-xl font-semibold cursor-pointer h-9 px-4"
                >
                  Tutup
                </Button>
              </div>

            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* QR Scanner Modal for Booth Staff */}
      <QrScannerModal
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
        onOrderUpdated={(orderId, newStatus) => {
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
          if (selectedOrder?.id === orderId) {
            setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
          }
          showToast(`Pesanan berhasil diselesaikan via scan QR!`);
        }}
      />
    </div>
  );
}
