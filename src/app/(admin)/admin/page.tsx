"use client";

import { useEffect, useState, useTransition, useCallback, useMemo } from "react";
import Link from "next/link";
import { AdminTopBar } from "@/components/admin/admin-sidebar";
import {
  fetchAdminOrders,
  fetchMenuItems,
  fetchUserProfiles,
  updateOrderStatus,
  getFriendlyErrorMessage,
  type OrderWithItems,
} from "@/lib/supabase/admin";
import { ErrorBanner } from "@/components/admin/error-banner";
import type {
  MenuItem,
  UserProfile,
  OrderStatus,
} from "@/lib/supabase/database.types";
import { formatRupiah } from "@/lib/data/menu-data";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  ArrowUpRight,
  Target,
  RefreshCw,
  Plus,
  ExternalLink,
  UtensilsCrossed,
  Sparkles,
  CheckCheck,
  TrendingDown,
  Receipt,
  Star,
  MessageSquare,
  Activity,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

/* ─────────────────── helpers ─────────────────── */
const statusConfig: Record<
  OrderStatus,
  { label: string; icon: React.ReactNode; cls: string }
> = {
  menunggu_pembayaran: {
    label: "Menunggu Bayar",
    icon: <Clock className="w-3 h-3" />,
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  },
  pending: {
    label: "Menunggu Bayar",
    icon: <Clock className="w-3 h-3" />,
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  },
  dikerjakan: {
    label: "Baru Dikerjakan",
    icon: <UtensilsCrossed className="w-3 h-3" />,
    cls: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  },
  confirmed: {
    label: "Baru Dikerjakan",
    icon: <UtensilsCrossed className="w-3 h-3" />,
    cls: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  },
  menunggu_selesai: {
    label: "Siap Diambil",
    icon: <Sparkles className="w-3 h-3" />,
    cls: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 ring-1 ring-purple-400",
  },
  selesai: {
    label: "Selesai",
    icon: <CheckCheck className="w-3 h-3" />,
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  completed: {
    label: "Selesai",
    icon: <CheckCheck className="w-3 h-3" />,
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  cancelled: {
    label: "Dibatalkan",
    icon: <XCircle className="w-3 h-3" />,
    cls: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
  },
};

/* ─────────────────── stat card ─────────────────── */
function StatCard({
  icon,
  label,
  value,
  sub,
  trend,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  trend?: string;
  color: string;
}) {
  const getTrendStyle = (text: string) => {
    if (/keluar|biaya|down/i.test(text)) {
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20";
    }
    if (/rating|bintang/i.test(text)) {
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
    }
    if (/donasi/i.test(text)) {
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20";
    }
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
  };

  return (
    <Card className="rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-full gap-3 shadow-xs hover:-translate-y-0.5 transition-transform bg-card border-border">
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}
        >
          {icon}
        </div>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-full border shadow-2xs ${getTrendStyle(trend)}`}
          >
            <ArrowUpRight className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-center my-1">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5 tracking-tight truncate">{value}</p>
      </div>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </Card>
  );
}

/* ─────────────────── main page ─────────────────── */
export default function AdminDashboard() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [expensesList, setExpensesList] = useState<{ amount: number; expense_date: string }[]>([]);
  const [userCount, setUserCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<
    | "semua"
    | "menunggu_pembayaran"
    | "dikerjakan"
    | "menunggu_selesai"
    | "selesai"
    | "cancelled"
  >("semua");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUpdating, startTransition] = useTransition();

  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [reviewsCount, setReviewsCount] = useState<number>(0);
  const [reviewsAvg, setReviewsAvg] = useState<string>("5.0");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const [allOrders, allMenus, allProfiles, { data: expData }, { data: revData }] =
        await Promise.all([
          fetchAdminOrders(),
          fetchMenuItems(),
          fetchUserProfiles(),
          supabase.from("expenses").select("amount, expense_date"),
          supabase.from("menu_reviews").select("rating"),
        ]);

      setOrders(allOrders);
      setMenuItems(allMenus);
      setUserCount(allProfiles.length);

      if (expData) {
        setExpensesList(expData as any);
        const sumExp = expData.reduce((acc, e: any) => acc + Number(e.amount || 0), 0);
        setTotalExpenses(sumExp);
      }
      if (revData && revData.length > 0) {
        setReviewsCount(revData.length);
        const avg = revData.reduce((acc, r: any) => acc + (r.rating || 5), 0) / revData.length;
        setReviewsAvg(avg.toFixed(1));
      }
    } catch (err: unknown) {
      setErrorMessage(
        getFriendlyErrorMessage(err, "Gagal memuat ringkasan data admin. Pastikan koneksi internet stabil dan akun memiliki hak akses.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Setup live subscription
    const supabase = createClient();
    const channel = supabase
      .channel("admin-overview-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handleQuickStatusChange = async (
    orderId: string,
    newStatus: OrderStatus
  ) => {
    startTransition(async () => {
      try {
        await updateOrderStatus(orderId, newStatus);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        setToastMessage(`Status pesanan berhasil diperbarui ke "${statusConfig[newStatus]?.label || newStatus}"`);
        setTimeout(() => setToastMessage(null), 3000);
      } catch (err: unknown) {
        setErrorMessage(getFriendlyErrorMessage(err, "Gagal mengubah status pesanan."));
      }
    });
  };

  // Calculations
  const pendingOrders = orders.filter(
    (o) => o.status === "pending" || o.status === "menunggu_pembayaran"
  ).length;
  const inProgressOrders = orders.filter(
    (o) => o.status === "dikerjakan" || o.status === "confirmed"
  ).length;
  const readyOrders = orders.filter((o) => o.status === "menunggu_selesai").length;
  const completedOrders = orders.filter(
    (o) => o.status === "completed" || o.status === "selesai"
  ).length;
  const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;
  const totalOrdersCount = orders.length || 1;
  const totalRevenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total_amount, 0);

  const totalSoldMenuItems = useMemo(
    () => menuItems.reduce((acc, m) => acc + (m.sold_count || 0), 0),
    [menuItems]
  );

  // 1. Daily Sales & Order Count Data for Area Chart
  const dailySalesData = useMemo(() => {
    const map = new Map<string, { date: string; omzet: number; count: number }>();

    orders
      .filter((o) => o.status !== "cancelled")
      .forEach((o) => {
        const d = new Date(o.created_at);
        const key = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        if (!map.has(key)) {
          map.set(key, { date: key, omzet: 0, count: 0 });
        }
        const cur = map.get(key)!;
        cur.omzet += o.total_amount;
        cur.count += 1;
      });

    const arr = Array.from(map.values());
    if (arr.length === 0) {
      arr.push({ date: "Hari Ini", omzet: totalRevenue, count: orders.length });
    }
    return arr;
  }, [orders, totalRevenue]);

  const salesChartConfig: ChartConfig = {
    omzet: {
      label: "Omzet Penjualan (Rp)",
      color: "#7c3aed",
    },
    count: {
      label: "Jumlah Pesanan",
      color: "#06b6d4",
    },
  };

  // 2. Cash Flow Comparison Data (Pemasukan vs Pengeluaran)
  const cashFlowData = useMemo(() => {
    const map = new Map<string, { date: string; pemasukan: number; pengeluaran: number }>();

    orders
      .filter((o) => o.status !== "cancelled")
      .forEach((o) => {
        const d = new Date(o.created_at);
        const key = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        if (!map.has(key)) {
          map.set(key, { date: key, pemasukan: 0, pengeluaran: 0 });
        }
        map.get(key)!.pemasukan += o.total_amount;
      });

    expensesList.forEach((e) => {
      const d = new Date(e.expense_date);
      const key = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      if (!map.has(key)) {
        map.set(key, { date: key, pemasukan: 0, pengeluaran: 0 });
      }
      map.get(key)!.pengeluaran += Number(e.amount) || 0;
    });

    const arr = Array.from(map.values());
    if (arr.length === 0) {
      arr.push({ date: "Akumulasi", pemasukan: totalRevenue, pengeluaran: totalExpenses });
    }
    return arr;
  }, [orders, expensesList, totalRevenue, totalExpenses]);

  const cashFlowChartConfig: ChartConfig = {
    pemasukan: {
      label: "Pemasukan (Rp)",
      color: "#10b981",
    },
    pengeluaran: {
      label: "Pengeluaran (Rp)",
      color: "#f43f5e",
    },
  };

  // 3. Category Breakdown Data for Donut Chart
  const categoryPieData = useMemo(() => {
    const catMap = new Map<string, number>();
    menuItems.forEach((m) => {
      const cat = (m.category || "Lainnya").replace("_", " ").toUpperCase();
      catMap.set(cat, (catMap.get(cat) || 0) + (m.sold_count || 0));
    });

    const palette = ["#7c3aed", "#ec4899", "#06b6d4", "#10b981", "#f59e0b", "#6366f1"];
    const arr = Array.from(catMap.entries()).map(([name, value], i) => ({
      name,
      value: Math.max(1, value),
      fill: palette[i % palette.length],
    }));

    return arr.length > 0 ? arr : [{ name: "SEMUA MENU", value: 1, fill: "#7c3aed" }];
  }, [menuItems]);

  const categoryChartConfig: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    categoryPieData.forEach((item) => {
      cfg[item.name] = {
        label: item.name,
        color: item.fill,
      };
    });
    return cfg;
  }, [categoryPieData]);

  // 4. Payment Method Composition for Bar Chart
  const paymentMethodData = useMemo(() => {
    const qris = orders.filter((o) => o.payment_method?.includes("qris")).length;
    const transfer = orders.filter((o) => o.payment_method?.includes("transfer")).length;
    const tunai = orders.filter(
      (o) => !o.payment_method?.includes("qris") && !o.payment_method?.includes("transfer")
    ).length;

    return [
      { method: "QRIS", count: qris, fill: "#7c3aed" },
      { method: "Transfer Bank", count: transfer, fill: "#06b6d4" },
      { method: "Tunai", count: tunai, fill: "#10b981" },
    ];
  }, [orders]);

  const paymentChartConfig: ChartConfig = {
    count: {
      label: "Jumlah Transaksi",
      color: "#7c3aed",
    },
  };

  const filteredOrders =
    activeFilter === "semua"
      ? orders
      : orders.filter((o) => {
          if (activeFilter === "menunggu_pembayaran") {
            return o.status === "menunggu_pembayaran" || o.status === "pending";
          }
          if (activeFilter === "dikerjakan") {
            return o.status === "dikerjakan" || o.status === "confirmed";
          }
          if (activeFilter === "menunggu_selesai") {
            return o.status === "menunggu_selesai";
          }
          if (activeFilter === "selesai") {
            return o.status === "selesai" || o.status === "completed";
          }
          return o.status === activeFilter;
        });

  // Top menu by sold_count
  const sortedMenu = [...menuItems]
    .sort((a, b) => b.sold_count - a.sold_count)
    .slice(0, 5);

  return (
    <>
      <AdminTopBar title="Overview Dashboard" />

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-on-surface text-surface px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6 pb-12 min-w-0">
        {/* Error notification banner if any */}
        {errorMessage && (
          <ErrorBanner
            message={errorMessage}
            onRetry={loadData}
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        {/* ── Welcome strip ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-on-surface">
              Selamat datang di Admin Panel MathBites!
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
              Kelola menu, pesanan makanan, donasi, dan hak akses pengguna secara real-time.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData()}
              className="gap-1.5 text-xs font-semibold rounded-xl"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Segarkan
            </Button>
            <Button
              size="sm"
              asChild
              className="gap-1.5 text-xs font-semibold rounded-xl"
            >
              <Link href="/admin/products">
                <Plus className="w-3.5 h-3.5" />
                Tambah Menu
              </Link>
            </Button>
          </div>
        </div>

        {/* ── Stat Cards (Live Supabase Metrics) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          <StatCard
            icon={<ShoppingBag className="w-5 h-5" />}
            label="Total Pesanan"
            value={orders.length.toString()}
            sub={`${pendingOrders} menunggu proses`}
            trend={orders.length > 0 ? `${completedOrders} selesai` : undefined}
            color="bg-primary/10 text-primary"
          />
          <StatCard
            icon={<Wallet className="w-5 h-5" />}
            label="Total Penjualan"
            value={formatRupiah(totalRevenue)}
            sub="Omzet pesanan masuk"
            trend="Live"
            color="bg-emerald-500/10 text-emerald-600"
          />
          <StatCard
            icon={<TrendingDown className="w-5 h-5" />}
            label="Pengeluaran Kas"
            value={formatRupiah(totalExpenses)}
            sub="Biaya operasional stand"
            trend="Kas Keluar"
            color="bg-rose-500/10 text-rose-600"
          />
          <StatCard
            icon={<Receipt className="w-5 h-5" />}
            label="Net Surplus Kas"
            value={formatRupiah(Math.max(0, totalRevenue - totalExpenses))}
            sub="Penjualan dikurangi biaya"
            trend="Profit"
            color="bg-indigo-500/10 text-indigo-600"
          />
          <StatCard
            icon={<Star className="w-5 h-5 fill-amber-400 text-amber-400" />}
            label="Ulasan Pelanggan"
            value={`${reviewsAvg} ★`}
            sub={`${reviewsCount} testimoni pembeli`}
            trend="Rating"
            color="bg-amber-500/10 text-amber-600"
          />
          <StatCard
            icon={<UtensilsCrossed className="w-5 h-5" />}
            label="Porsi Terjual"
            value={`${totalSoldMenuItems} Porsi`}
            sub={`${menuItems.length} menu aktif`}
            trend="Produk"
            color="bg-blue-500/10 text-blue-600"
          />
        </div>

        {/* ── Quick Administrative Shortcuts ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <Link
            href="/admin/orders"
            className="p-3 rounded-2xl bg-card border border-border/80 hover:border-primary/40 hover:shadow-xs transition-all flex items-center gap-2.5 group"
          >
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block truncate">Pesanan</span>
              <span className="text-[10px] text-muted-foreground">{pendingOrders} pending</span>
            </div>
          </Link>

          <Link
            href="/admin/products"
            className="p-3 rounded-2xl bg-card border border-border/80 hover:border-primary/40 hover:shadow-xs transition-all flex items-center gap-2.5 group"
          >
            <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block truncate">Kelola Menu</span>
              <span className="text-[10px] text-muted-foreground">{menuItems.length} menu</span>
            </div>
          </Link>

          <Link
            href="/admin/expenses"
            className="p-3 rounded-2xl bg-card border border-border/80 hover:border-primary/40 hover:shadow-xs transition-all flex items-center gap-2.5 group"
          >
            <div className="size-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block truncate">Kas Keluar</span>
              <span className="text-[10px] text-muted-foreground">Catat biaya</span>
            </div>
          </Link>

          <Link
            href="/admin/reviews"
            className="p-3 rounded-2xl bg-card border border-border/80 hover:border-primary/40 hover:shadow-xs transition-all flex items-center gap-2.5 group"
          >
            <div className="size-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block truncate">Ulasan</span>
              <span className="text-[10px] text-muted-foreground">{reviewsCount} ulasan</span>
            </div>
          </Link>

          <Link
            href="/admin/reports"
            className="p-3 rounded-2xl bg-card border border-border/80 hover:border-primary/40 hover:shadow-xs transition-all flex items-center gap-2.5 group"
          >
            <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block truncate">Laporan Dana</span>
              <span className="text-[10px] text-muted-foreground">Arus Kas Stand</span>
            </div>
          </Link>

          <Link
            href="/admin/settings"
            className="p-3 rounded-2xl bg-card border border-border/80 hover:border-primary/40 hover:shadow-xs transition-all flex items-center gap-2.5 group"
          >
            <div className="size-8 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block truncate">Pengaturan</span>
              <span className="text-[10px] text-muted-foreground">Jadwal & Stand</span>
            </div>
          </Link>
        </div>

        {/* ── Visualisasi Analitik & Grafik (Shadcn Charts UI) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Chart 1: Tren Omzet Penjualan (AreaChart Shadcn) */}
          <Card className="lg:col-span-2 p-5 rounded-2xl border-border bg-card shadow-xs flex flex-col justify-between">
            <CardHeader className="p-0 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span>Tren Omzet &amp; Pesanan Harian</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Pergerakan omzet akumulasi dan volume transaksi pemesanan stand MathBites.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-semibold self-start sm:self-auto bg-primary/5 text-primary border-primary/20">
                  Real-time Data
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0 pt-2">
              <ChartContainer config={salesChartConfig} className="w-full h-[260px] aspect-auto">
                <AreaChart data={dailySalesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillOmzet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-[11px]"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `Rp${(val / 1000).toFixed(0)}k`}
                    width={65}
                    className="text-[11px]"
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(val, name) => (
                          <div className="flex items-center justify-between gap-4 w-full">
                            <span className="text-muted-foreground">{name === "omzet" ? "Omzet" : "Pesanan"}:</span>
                            <span className="font-bold font-mono">
                              {name === "omzet" ? formatRupiah(Number(val)) : `${val} order`}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="omzet"
                    stroke="#7c3aed"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#fillOmzet)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Chart 2: Komposisi Penjualan per Kategori Menu (Donut/PieChart Shadcn) */}
          <Card className="p-5 rounded-2xl border-border bg-card shadow-xs flex flex-col justify-between">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-purple-600" />
                <span>Kategori Menu</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Porsi terjual per rumpun kategori makanan &amp; minuman.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0 flex-1 flex flex-col items-center justify-center">
              <ChartContainer config={categoryChartConfig} className="w-full h-[220px] aspect-auto">
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(val, name) => (
                          <div className="flex items-center justify-between gap-3 w-full">
                            <span className="text-muted-foreground">{name}:</span>
                            <span className="font-bold">{val} porsi</span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Pie
                    data={categoryPieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Row 2 Charts: Arus Kas Komparatif & Kanal Pembayaran */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Chart 3: Arus Kas (Pemasukan vs Beban Pengeluaran) */}
          <Card className="p-5 rounded-2xl border-border bg-card shadow-xs flex flex-col justify-between">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>Pemasukan vs Pengeluaran Kas</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Perbandingan kas masuk dari pesanan vs kas keluar operasional.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                  <span>Net: {formatRupiah(Math.max(0, totalRevenue - totalExpenses))}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 pt-2">
              <ChartContainer config={cashFlowChartConfig} className="w-full h-[230px] aspect-auto">
                <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-[11px]" />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `Rp${(val / 1000).toFixed(0)}k`}
                    width={65}
                    className="text-[11px]"
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(val, name) => (
                          <div className="flex items-center justify-between gap-3 w-full">
                            <span className="text-muted-foreground">
                              {name === "pemasukan" ? "Pemasukan" : "Pengeluaran"}:
                            </span>
                            <span className={`font-bold font-mono ${name === "pemasukan" ? "text-emerald-600" : "text-rose-600"}`}>
                              {formatRupiah(Number(val))}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="pemasukan" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="pengeluaran" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Chart 4: Kanal Pembayaran Pembeli */}
          <Card className="p-5 rounded-2xl border-border bg-card shadow-xs flex flex-col justify-between">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Wallet className="w-4 h-4 text-cyan-600" />
                <span>Distribusi Metode Pembayaran</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Kanal pembayaran yang digunakan pembeli stan (QRIS, Transfer Bank, Tunai).
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0 pt-2">
              <ChartContainer config={paymentChartConfig} className="w-full h-[230px] aspect-auto">
                <BarChart
                  data={paymentMethodData}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                  <XAxis type="number" tickLine={false} axisLine={false} className="text-[11px]" />
                  <YAxis
                    dataKey="method"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={90}
                    className="text-[11px] font-semibold"
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(val) => (
                          <div className="flex items-center justify-between gap-3 w-full">
                            <span className="text-muted-foreground">Transaksi:</span>
                            <span className="font-bold">{val} pesanan</span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* ── Main grid: Orders + Live Status Breakdown ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Orders Table */}
          <Card className="xl:col-span-2 shadow-xs overflow-hidden gap-0 p-0">
            {/* Table header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b bg-muted/40">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Pesanan Masuk Terbaru
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update otomatis dari database · {pendingOrders} menunggu konfirmasi
                </p>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                {(
                  [
                    "semua",
                    "menunggu_pembayaran",
                    "dikerjakan",
                    "menunggu_selesai",
                    "selesai",
                    "cancelled",
                  ] as const
                ).map((f) => (
                  <Button
                    key={f}
                    variant={activeFilter === f ? "default" : "secondary"}
                    size="xs"
                    onClick={() => setActiveFilter(f)}
                    className="rounded-full text-xs font-medium"
                  >
                    {f === "semua" ? "Semua" : statusConfig[f]?.label || f}
                  </Button>
                ))}
              </div>
            </div>

            {/* Mobile Card List (< sm) */}
            <div className="sm:hidden divide-y divide-border">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-xs">Memuat pesanan...</span>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-xs">Tidak ada pesanan.</p>
                </div>
              ) : (
                filteredOrders.slice(0, 5).map((order) => {
                  const s =
                    statusConfig[order.status as OrderStatus] ||
                    statusConfig.pending;
                  return (
                    <div key={order.id} className="p-3.5 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {order.order_number}
                        </span>
                        <Badge
                          variant="outline"
                          className={`gap-1 px-2.5 py-0.5 text-[11px] font-semibold ${s.cls}`}
                        >
                          {s.icon}
                          <span>{s.label}</span>
                        </Badge>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-xs text-foreground">
                            {order.customer_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {order.customer_phone}
                          </p>
                        </div>
                        <span className="font-bold text-xs text-foreground">
                          {formatRupiah(order.total_amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-border/60 text-xs">
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {order.payment_method || "Tunai"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {(order.status === "pending" || order.status === "menunggu_pembayaran") && (
                            <Button
                              size="xs"
                              onClick={() => handleQuickStatusChange(order.id, "dikerjakan")}
                              className="h-7 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded-lg"
                            >
                              Kerjakan
                            </Button>
                          )}
                          {(order.status === "confirmed" || order.status === "dikerjakan") && (
                            <Button
                              size="xs"
                              onClick={() => handleQuickStatusChange(order.id, "menunggu_selesai")}
                              className="h-7 px-2.5 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold rounded-lg"
                            >
                              Siap Ambil
                            </Button>
                          )}
                          {order.status === "menunggu_selesai" && (
                            <Button
                              size="xs"
                              onClick={() => handleQuickStatusChange(order.id, "selesai")}
                              className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-lg"
                            >
                              Selesai
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="xs"
                            asChild
                            className="h-7 px-2 rounded-lg text-[11px] font-semibold gap-1"
                          >
                            <Link href="/admin/orders">
                              <Eye className="w-3 h-3" />
                              <span>Detail</span>
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop / Tablet Table View (>= sm) */}
            <div className="hidden sm:block overflow-x-auto scrollbar-thin">
              <Table className="w-full text-sm min-w-[780px]">
                <TableHeader>
                  <TableRow className="text-xs bg-muted/40">
                    <TableHead className="px-5 py-3.5 font-semibold w-[18%] min-w-[130px]">
                      ID & Tanggal
                    </TableHead>
                    <TableHead className="px-4 py-3.5 font-semibold w-[22%] min-w-[150px]">
                      Pelanggan
                    </TableHead>
                    <TableHead className="px-4 py-3.5 font-semibold hidden sm:table-cell w-[25%] min-w-[180px]">
                      Item
                    </TableHead>
                    <TableHead className="text-right px-4 py-3.5 font-semibold w-[13%] min-w-[110px]">
                      Total
                    </TableHead>
                    <TableHead className="text-center px-4 py-3.5 font-semibold w-[11%] min-w-[100px]">
                      Status
                    </TableHead>
                    <TableHead className="px-5 py-3.5 text-right font-semibold w-[11%] min-w-[110px]">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                        <span>Memuat pesanan...</span>
                      </TableCell>
                    </TableRow>
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <p className="text-xs">Tidak ada pesanan.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.slice(0, 6).map((order) => {
                      const s =
                        statusConfig[order.status as OrderStatus] ||
                        statusConfig.pending;
                      return (
                        <TableRow
                          key={order.id}
                          className="hover:bg-muted/40 transition-colors"
                        >
                          <TableCell className="px-5 py-4 align-middle">
                            <span className="font-mono text-xs font-bold text-primary">
                              {order.order_number}
                            </span>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {new Date(order.created_at).toLocaleTimeString(
                                "id-ID",
                                { hour: "2-digit", minute: "2-digit" }
                              )}{" "}
                              WIB
                            </p>
                          </TableCell>
                          <TableCell className="px-4 py-4 align-middle">
                            <div className="font-semibold text-foreground text-xs sm:text-sm">
                              {order.customer_name}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {order.customer_phone}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4 align-middle hidden sm:table-cell">
                            <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]" title={order.order_items?.map((it) => `${it.menu_item?.name || "Item"} × ${it.quantity}`).join(", ") || "-"}>
                              {order.order_items?.map((it) => `${it.menu_item?.name || "Item"} × ${it.quantity}`).join(", ") || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-4 align-middle text-right">
                            <span className="font-bold text-foreground text-xs sm:text-sm">
                              {formatRupiah(order.total_amount)}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-4 align-middle text-center">
                            <Badge
                              variant="outline"
                              className={`gap-1 px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${s.cls}`}
                            >
                              {s.icon}
                              <span>{s.label}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="px-5 py-4 align-middle text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {(order.status === "pending" || order.status === "menunggu_pembayaran") && (
                                <Button
                                  size="xs"
                                  onClick={() =>
                                    handleQuickStatusChange(order.id, "dikerjakan")
                                  }
                                  className="h-8 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                                >
                                  Kerjakan
                                </Button>
                              )}
                              {(order.status === "confirmed" || order.status === "dikerjakan") && (
                                <Button
                                  size="xs"
                                  onClick={() =>
                                    handleQuickStatusChange(order.id, "menunggu_selesai")
                                  }
                                  className="h-8 px-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg"
                                >
                                  Siap Ambil
                                </Button>
                              )}
                              {order.status === "menunggu_selesai" && (
                                <Button
                                  size="xs"
                                  onClick={() =>
                                    handleQuickStatusChange(order.id, "selesai")
                                  }
                                  className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                                >
                                  Selesai
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="xs"
                                asChild
                                className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1"
                                title="Lihat di halaman Pesanan"
                              >
                                <Link href="/admin/orders">
                                  <Eye className="w-3.5 h-3.5 text-primary" />
                                  <span className="hidden lg:inline">Detail</span>
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Table footer */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t bg-muted/20">
              <span className="text-xs text-muted-foreground">
                Menampilkan {Math.min(6, filteredOrders.length)} dari {filteredOrders.length} pesanan
              </span>
              <Button variant="link" size="sm" asChild className="p-0 h-auto font-semibold text-xs gap-1.5">
                <Link href="/admin/orders">
                  Lihat Semua Pesanan & Kelola
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          </Card>

          {/* Right column */}
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Status Breakdown Card */}
            <Card className="rounded-2xl shadow-xs p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Status Operasional Pesanan
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Distribusi alur pemrosesan {orders.length} pesanan masuk
                  </p>
                </div>
                <Button variant="link" size="sm" asChild className="p-0 h-auto font-bold text-xs">
                  <Link href="/admin/orders">Kelola</Link>
                </Button>
              </div>

              {/* Multi-segment Progress Bar */}
              <div className="w-full bg-muted h-3 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${(completedOrders / totalOrdersCount) * 100}%` }}
                  title={`Selesai: ${completedOrders}`}
                />
                <div
                  className="bg-purple-500 h-full transition-all duration-500"
                  style={{ width: `${(readyOrders / totalOrdersCount) * 100}%` }}
                  title={`Siap Diambil: ${readyOrders}`}
                />
                <div
                  className="bg-blue-500 h-full transition-all duration-500"
                  style={{ width: `${(inProgressOrders / totalOrdersCount) * 100}%` }}
                  title={`Sedang Dikerjakan: ${inProgressOrders}`}
                />
                <div
                  className="bg-amber-500 h-full transition-all duration-500"
                  style={{ width: `${(pendingOrders / totalOrdersCount) * 100}%` }}
                  title={`Menunggu Pembayaran: ${pendingOrders}`}
                />
              </div>

              {/* Status List Items */}
              <div className="flex flex-col gap-2 pt-1">
                {[
                  {
                    label: "Pesanan Selesai / Terkirim",
                    count: completedOrders,
                    color: "bg-emerald-500",
                    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                  },
                  {
                    label: "Siap Diambil di Stand",
                    count: readyOrders,
                    color: "bg-purple-500",
                    badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
                  },
                  {
                    label: "Sedang Disiapkan / Dikerjakan",
                    count: inProgressOrders,
                    color: "bg-blue-500",
                    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                  },
                  {
                    label: "Menunggu Konfirmasi Bayar",
                    count: pendingOrders,
                    color: "bg-amber-500",
                    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                  },
                ].map((s) => {
                  const pct = Math.round((s.count / totalOrdersCount) * 100);
                  return (
                    <div
                      key={s.label}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                        <span className="font-medium text-foreground">{s.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{s.count}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold border ${s.badge}`}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Top Menu Items */}
            <Card className="rounded-2xl shadow-xs p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">
                  Menu Terlaris
                </h3>
                <Button variant="link" size="sm" asChild className="p-0 h-auto font-bold text-xs">
                  <Link href="/admin/products">Kelola Menu</Link>
                </Button>
              </div>

              <div className="flex flex-col gap-3">
                {sortedMenu.map((m, idx) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-xs pb-2 border-b border-border last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground text-[11px]">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground line-clamp-1">
                          {m.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatRupiah(m.price)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-primary">
                        {m.sold_count} terjual
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
