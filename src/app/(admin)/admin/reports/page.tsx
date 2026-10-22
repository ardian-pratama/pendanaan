"use client";

import { useEffect, useState, useTransition, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminTopBar } from "@/components/admin/admin-sidebar";
import {
  fetchAdminOrders,
  getCurrentUserProfile,
  getFriendlyErrorMessage,
  type OrderWithItems,
} from "@/lib/supabase/admin";
import { ErrorBanner } from "@/components/admin/error-banner";
import { hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/supabase/database.types";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  Target,
  Wallet,
  DollarSign,
  Edit2,
  RefreshCw,
  CheckCircle2,
  ArrowUpRight,
  PieChart as PieChartIcon,
  Award,
  Plus,
  Trash2,
  Printer,
  ShieldAlert,
  ArrowDownRight,
  CreditCard,
  QrCode,
  Banknote,
  CheckCheck,
  Clock,
  Sparkles,
  Info,
  ReceiptText,
  Tag,
  Calendar,
  FileText,
  Download,
  Filter,
  BarChart3,
} from "lucide-react";

export interface ExpenseRecord {
  id: string;
  title: string;
  category: "bahan_baku" | "kemasan" | "operasional" | "transportasi" | "publikasi" | "lainnya" | string;
  amount: number;
  expense_date: string;
  notes?: string | null;
  receipt_url?: string | null;
  created_by?: string | null;
  created_at: string;
}

export default function AdminReportsPage() {
  const queryClient = useQueryClient();

  // Date Range Filter State
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7days" | "30days">("all");

  // 1. TanStack Query: Orders
  const {
    data: orders = [],
    isLoading: ordersLoading,
    isRefetching: ordersRefetching,
    refetch: refetchOrders,
  } = useQuery<OrderWithItems[]>({
    queryKey: ["admin-reports-orders"],
    queryFn: async () => {
      return await fetchAdminOrders();
    },
    staleTime: 1000 * 30,
  });

  // 2. TanStack Query: Current User Profile
  const { data: currentUser = null } = useQuery<UserProfile | null>({
    queryKey: ["admin-reports-profile"],
    queryFn: async () => {
      return await getCurrentUserProfile();
    },
    staleTime: 1000 * 60 * 5,
  });

  // 3. TanStack Query: Expenses
  const {
    data: expenses = [],
    isLoading: expensesLoading,
    isRefetching: expensesRefetching,
    refetch: refetchExpenses,
  } = useQuery<ExpenseRecord[]>({
    queryKey: ["admin-reports-expenses"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return (data || []) as ExpenseRecord[];
    },
    staleTime: 1000 * 30,
  });

  const loading = ordersLoading || expensesLoading;
  const isRefreshing = ordersRefetching || expensesRefetching;

  // Expense modal management state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("bahan_baku");
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [currentDateStr, setCurrentDateStr] = useState("");
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);

  useEffect(() => {
    const now = new Date();
    setExpenseDate(now.toISOString().split("T")[0]);
    setCurrentDateStr(now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }));
    setCurrentYear(now.getFullYear());
    setCurrentTimestamp(now.getTime());
  }, []);

  const [savingExpense, setSavingExpense] = useState(false);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");

  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRefreshAll = async () => {
    await Promise.all([refetchOrders(), refetchExpenses()]);
    showToast("Data laporan berhasil diperbarui");
  };

  // Realtime Supabase Subscription to auto-invalidate TanStack cache
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("reports-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-reports-expenses"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-reports-orders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const canEdit = hasPermission(currentUser, "reports:edit");
  const canView = hasPermission(currentUser, "reports:view");

  // Date-filtered datasets
  const dateFilteredOrders = useMemo(() => {
    if (dateFilter === "all" || !currentTimestamp) return orders;
    return orders.filter((o) => {
      const orderTime = new Date(o.created_at).getTime();
      if (dateFilter === "today") {
        return new Date(o.created_at).toDateString() === new Date(currentTimestamp).toDateString();
      }
      if (dateFilter === "7days") {
        return currentTimestamp - orderTime <= 7 * 24 * 60 * 60 * 1000;
      }
      if (dateFilter === "30days") {
        return currentTimestamp - orderTime <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [orders, dateFilter, currentTimestamp]);

  const dateFilteredExpenses = useMemo(() => {
    if (dateFilter === "all" || !currentTimestamp) return expenses;
    return expenses.filter((e) => {
      const expTime = new Date(e.expense_date).getTime();
      if (dateFilter === "today") {
        return new Date(e.expense_date).toDateString() === new Date(currentTimestamp).toDateString();
      }
      if (dateFilter === "7days") {
        return currentTimestamp - expTime <= 7 * 24 * 60 * 60 * 1000;
      }
      if (dateFilter === "30days") {
        return currentTimestamp - expTime <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [expenses, dateFilter, currentTimestamp]);

  // Order Revenue Calculations
  const validOrders = useMemo(
    () => dateFilteredOrders.filter((o) => o.status !== "cancelled"),
    [dateFilteredOrders]
  );
  const completedOrders = useMemo(
    () => dateFilteredOrders.filter((o) => o.status === "selesai" || o.status === "completed"),
    [dateFilteredOrders]
  );
  const pendingOrders = useMemo(
    () => dateFilteredOrders.filter((o) => o.status === "menunggu_pembayaran" || o.status === "pending"),
    [dateFilteredOrders]
  );

  const totalRevenue = useMemo(
    () => validOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    [validOrders]
  );

  const completedRevenue = useMemo(
    () => completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    [completedOrders]
  );

  // Expenses & Profit Calculations
  const totalExpenses = useMemo(
    () => dateFilteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [dateFilteredExpenses]
  );

  const netProfit = useMemo(
    () => completedRevenue - totalExpenses,
    [completedRevenue, totalExpenses]
  );

  const profitMarginPct = useMemo(() => {
    return totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0;
  }, [totalRevenue, totalExpenses]);

  const filteredExpenses = useMemo(() => {
    if (expenseCategoryFilter === "all") return dateFilteredExpenses;
    return dateFilteredExpenses.filter((e) => e.category === expenseCategoryFilter);
  }, [dateFilteredExpenses, expenseCategoryFilter]);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || expenseAmount <= 0 || savingExpense) return;
    setSavingExpense(true);
    try {
      const supabase = createClient();
      const { data, error } = await (supabase.from("expenses") as any)
        .insert({
          title: expenseTitle.trim(),
          category: expenseCategory,
          amount: expenseAmount,
          expense_date: expenseDate,
          notes: expenseNotes.trim() || null,
          created_by: currentUser?.full_name || "Bendahara",
        })
        .select()
        .single();
      if (!error && data) {
        queryClient.invalidateQueries({ queryKey: ["admin-reports-expenses"] });
        showToast("Pengeluaran berhasil dicatat");
        setExpenseModalOpen(false);
        setExpenseTitle("");
        setExpenseAmount(0);
        setExpenseNotes("");
      }
    } catch (err) {
      console.warn("Gagal mencatat pengeluaran:", err);
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const supabase = createClient();
      await (supabase.from("expenses") as any).delete().eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["admin-reports-expenses"] });
      showToast("Data pengeluaran berhasil dihapus");
      setDeleteExpenseId(null);
    } catch (err) {
      console.warn("Gagal menghapus pengeluaran:", err);
    }
  };

  // Payment method breakdown
  const paymentMethodStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {
      qris: { count: 0, total: 0 },
      transfer: { count: 0, total: 0 },
      tunai: { count: 0, total: 0 },
    };

    for (const o of validOrders) {
      const method = (o.payment_method || "tunai").toLowerCase();
      const key = method.includes("qris")
        ? "qris"
        : method.includes("transfer")
        ? "transfer"
        : "tunai";

      stats[key].count += 1;
      stats[key].total += o.total_amount || 0;
    }
    return stats;
  }, [validOrders]);

  // Chart 1: Daily Cashflow Data (AreaChart)
  const dailyCashFlowData = useMemo(() => {
    const dayMap = new Map<string, { date: string; pemasukan: number; pengeluaran: number; rawDate: string }>();

    validOrders.forEach((o) => {
      const d = new Date(o.created_at);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      const cur = dayMap.get(key) || { date: label, pemasukan: 0, pengeluaran: 0, rawDate: key };
      cur.pemasukan += o.total_amount || 0;
      dayMap.set(key, cur);
    });

    dateFilteredExpenses.forEach((e) => {
      const d = new Date(e.expense_date);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      const cur = dayMap.get(key) || { date: label, pemasukan: 0, pengeluaran: 0, rawDate: key };
      cur.pengeluaran += Number(e.amount) || 0;
      dayMap.set(key, cur);
    });

    const list = Array.from(dayMap.values()).sort(
      (a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime()
    );

    return list.length > 0
      ? list
      : [{ date: "Hari Ini", pemasukan: 0, pengeluaran: 0, rawDate: "2026-01-01" }];
  }, [validOrders, dateFilteredExpenses]);

  const cashflowChartConfig: ChartConfig = {
    pemasukan: {
      label: "Kas Masuk (Omzet)",
      color: "#10b981",
    },
    pengeluaran: {
      label: "Kas Keluar (Beban)",
      color: "#f43f5e",
    },
  };

  // Chart 2: Expense Category Pie Data
  const expensePieData = useMemo(() => {
    const catMap = new Map<string, number>();
    dateFilteredExpenses.forEach((e) => {
      const label = e.category.replace("_", " ").toUpperCase();
      catMap.set(label, (catMap.get(label) || 0) + (Number(e.amount) || 0));
    });

    const palette = ["#7c3aed", "#ec4899", "#06b6d4", "#10b981", "#f59e0b", "#6366f1", "#8b5cf6"];
    const arr = Array.from(catMap.entries()).map(([name, value], i) => ({
      name,
      value: Math.max(0, value),
      fill: palette[i % palette.length],
    }));

    return arr.length > 0 ? arr : [{ name: "TIDAK ADA BEBAN", value: 1, fill: "#e2e8f0" }];
  }, [dateFilteredExpenses]);

  const expensePieConfig: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    expensePieData.forEach((item) => {
      cfg[item.name] = {
        label: item.name,
        color: item.fill,
      };
    });
    return cfg;
  }, [expensePieData]);

  // Chart 3: Payment Method Bar Data
  const paymentBarData = useMemo(() => {
    return [
      {
        method: "QRIS",
        nominal: paymentMethodStats.qris.total,
        transaksi: paymentMethodStats.qris.count,
        fill: "#7c3aed",
      },
      {
        method: "Transfer Bank",
        nominal: paymentMethodStats.transfer.total,
        transaksi: paymentMethodStats.transfer.count,
        fill: "#06b6d4",
      },
      {
        method: "Tunai di Stand",
        nominal: paymentMethodStats.tunai.total,
        transaksi: paymentMethodStats.tunai.count,
        fill: "#10b981",
      },
    ];
  }, [paymentMethodStats]);

  const paymentBarConfig: ChartConfig = {
    nominal: {
      label: "Total Omzet (Rp)",
      color: "#7c3aed",
    },
  };

  // Export CSV functions
  const exportCashFlowCSV = () => {
    const headers = ["ID", "Tanggal", "Uraian Transaksi", "Kategori", "Tipe", "Debit (Masuk)", "Kredit (Keluar)"];
    const rows = cashFlowLedger.map((entry) => [
      entry.id,
      new Date(entry.date).toLocaleString("id-ID"),
      `"${entry.title.replace(/"/g, '""')}"`,
      `"${entry.category}"`,
      entry.type === "in" ? "Pemasukan" : "Pengeluaran",
      entry.type === "in" ? entry.amount : 0,
      entry.type === "out" ? entry.amount : 0,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Buku-Kas-MathBites-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("File CSV Buku Kas berhasil diunduh");
  };

  const exportExpensesCSV = () => {
    const headers = ["ID", "Tanggal", "Item Belanja", "Kategori", "Jumlah (Rp)", "Catatan", "Dicatat Oleh"];
    const rows = expenses.map((e) => [
      e.id,
      e.expense_date,
      `"${e.title.replace(/"/g, '""')}"`,
      e.category,
      e.amount,
      `"${(e.notes || "").replace(/"/g, '""')}"`,
      `"${e.created_by || ""}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Beban-Pengeluaran-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("File CSV Beban Pengeluaran berhasil diunduh");
  };

  // Comprehensive Cash Flow Ledger (Mutasi Kas Masuk & Keluar)
  const cashFlowLedger = useMemo(() => {
    type LedgerEntry = {
      id: string;
      date: string;
      type: "in" | "out";
      title: string;
      category: string;
      amount: number;
      ref: string;
    };

    const entries: LedgerEntry[] = [];

    // Orders as cash in
    validOrders.forEach((o) => {
      entries.push({
        id: `ord-${o.id}`,
        date: o.created_at,
        type: "in",
        title: `Pesanan #${o.order_number} (${o.customer_name})`,
        category: `Penjualan ${o.payment_method?.toUpperCase() || "QRIS"}`,
        amount: o.total_amount,
        ref: o.order_number,
      });
    });

    // Expenses as cash out
    expenses.forEach((e) => {
      entries.push({
        id: `exp-${e.id}`,
        date: e.expense_date,
        type: "out",
        title: e.title,
        category: e.category.replace("_", " ").toUpperCase(),
        amount: Number(e.amount) || 0,
        ref: "Beban Operasional",
      });
    });

    // Sort descending by date
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return entries;
  }, [validOrders, expenses]);

  const handlePrintDocument = () => {
    const printableElement = document.getElementById("printable-report-sheet");
    if (!printableElement) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <title>Laporan Keuangan & Penjualan MathBites - Olimpiade Matematika 27</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #111827;
              background: #ffffff;
              margin: 0;
              padding: 16px;
              font-size: 11px;
              line-height: 1.4;
            }
            .kop {
              text-align: center;
              border-bottom: 3px double #111827;
              padding-bottom: 10px;
              margin-bottom: 16px;
            }
            .kop h2 {
              margin: 2px 0;
              font-size: 15px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .kop p {
              margin: 1px 0;
              font-size: 10px;
              color: #374151;
            }
            .doc-title {
              text-align: center;
              margin-bottom: 16px;
            }
            .doc-title h3 {
              margin: 0 0 3px 0;
              font-size: 13px;
              font-weight: 800;
              text-transform: uppercase;
              text-decoration: underline;
            }
            .doc-title p {
              margin: 0;
              font-size: 10px;
              color: #4b5563;
            }
            .section-heading {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              margin: 14px 0 6px 0;
              color: #111827;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12px;
              font-size: 10.5px;
            }
            th, td {
              border: 1px solid #1f2937;
              padding: 5px 8px;
            }
            th {
              background-color: #f3f4f6;
              font-weight: 700;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: 700; }
            .text-emerald { color: #047857; font-weight: 700; }
            .text-rose { color: #be123c; font-weight: 700; }
            .signatures {
              margin-top: 36px;
              display: flex;
              justify-content: space-between;
              page-break-inside: avoid;
            }
            .sig-box {
              width: 44%;
              text-align: center;
              font-size: 10.5px;
            }
            .sig-space {
              height: 55px;
            }
            .sig-line {
              border-top: 1px solid #111827;
              padding-top: 4px;
              font-weight: 700;
              display: inline-block;
              min-width: 170px;
            }
            @media print {
              body { padding: 0; }
              @page { margin: 12mm 15mm; }
            }
          </style>
        </head>
        <body>
          ${printableElement.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
  };

  if (!canView && !loading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <AdminTopBar title="Laporan Dana & Keuangan" />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 text-center rounded-2xl shadow-md border-border">
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground">Akses Laporan Dibatasi</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Akun Anda tidak memiliki izin untuk melihat laporan keuangan dan pendanaan olimpiade.
              Silakan hubungi Bendahara atau Super Admin jika memerlukan akses ini.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <div className="print:hidden flex-1 flex flex-col min-h-screen">
        <AdminTopBar title="Laporan Dana & Keuangan Olimpiade" />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6 pb-16 min-w-0">
        {/* Error notification banner */}
        {errorMessage && (
          <ErrorBanner
            message={errorMessage}
            onRetry={handleRefreshAll}
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
                Laporan Keuangan &amp; Pendanaan Olimpiade 27
              </h2>
              {!canEdit && (
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                  Mode Lihat Saja
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Rekapitulasi target kebutuhan dana, progres penggalangan donasi, serta omzet penjualan makanan MathBites.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="gap-1.5 text-xs font-semibold rounded-xl border-border bg-card shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Segarkan</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportCashFlowCSV}
              className="gap-1.5 text-xs font-semibold rounded-xl border-border bg-card shadow-2xs hover:bg-accent cursor-pointer"
              title="Unduh Buku Kas format CSV untuk Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Buku Kas (CSV)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportExpensesCSV}
              className="gap-1.5 text-xs font-semibold rounded-xl border-border bg-card shadow-2xs hover:bg-accent cursor-pointer"
              title="Unduh data pengeluaran beban kas format CSV"
            >
              <Download className="w-3.5 h-3.5 text-rose-600" />
              <span>Beban (CSV)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPrintPreviewOpen(true)}
              className="gap-1.5 text-xs font-semibold rounded-xl border-border bg-card shadow-2xs print:hidden cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-primary" />
              <span>Cetak Dokumen</span>
            </Button>

            {canEdit && (
              <Button
                size="sm"
                onClick={() => setExpenseModalOpen(true)}
                className="gap-1.5 text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Catat Beban Kas</span>
              </Button>
            )}
          </div>
        </div>

        {/* Date Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border/70 shadow-2xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Rentang Periode Laporan:</span>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl self-start sm:self-auto flex-wrap">
            {[
              { id: "all", label: "Semua Waktu" },
              { id: "today", label: "Hari Ini" },
              { id: "7days", label: "7 Hari Terakhir" },
              { id: "30days", label: "30 Hari Terakhir" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDateFilter(f.id as any)}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  dateFilter === f.id
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Financial Highlight Cards (100% Real Cash Flow) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Omzet Penjualan */}
          <Card className="p-4 rounded-2xl border-border shadow-xs bg-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Total Omzet Penjualan</span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground mt-2">
                {formatRupiah(totalRevenue)}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/50">
              Dari {validOrders.length} pesanan aktif pembeli
            </p>
          </Card>

          {/* 2. Total Pengeluaran */}
          <Card className="p-4 rounded-2xl border-border shadow-xs bg-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Beban Pengeluaran Stand</span>
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                  <ReceiptText className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-rose-600 mt-2">
                {formatRupiah(totalExpenses)}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/50">
              Total {expenses.length} mutasi belanja operasional
            </p>
          </Card>

          {/* 3. Saldo Kas Bersih */}
          <Card className="p-4 rounded-2xl border-border shadow-xs bg-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Saldo Kas Bersih (Net Cash)</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <p className={`text-xl sm:text-2xl font-bold mt-2 ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {formatRupiah(netProfit)}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold mt-3 pt-2 border-t border-border/50 text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{profitMarginPct}% Margin keuntungan bersih</span>
            </div>
          </Card>

          {/* 4. Realisasi Pesanan Lunas */}
          <Card className="p-4 rounded-2xl border-border shadow-xs bg-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Realisasi Kas Masuk</span>
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-primary mt-2">
                {formatRupiah(completedRevenue)}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/50">
              {completedOrders.length} pesanan telah selesai dibayar
            </p>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="sales" className="w-full flex flex-col gap-6">
          <TabsList className="w-full sm:w-auto self-start bg-muted p-1 rounded-2xl flex-wrap">
            <TabsTrigger value="sales" className="rounded-xl text-xs font-bold gap-1.5 px-4">
              <PieChart className="w-3.5 h-3.5" />
              <span>Analisis Penjualan &amp; Laba</span>
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="rounded-xl text-xs font-bold gap-1.5 px-4">
              <ReceiptText className="w-3.5 h-3.5" />
              <span>Buku Kas Besar / Mutasi ({cashFlowLedger.length})</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-xl text-xs font-bold gap-1.5 px-4">
              <Tag className="w-3.5 h-3.5" />
              <span>Beban Pengeluaran Stand ({expenses.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB: BUKU KAS BESAR / MUTASI ARUS KAS */}
          <TabsContent value="cashflow" className="mt-0 flex flex-col gap-4">
            <Card className="p-5 rounded-2xl border-border bg-card shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                <div>
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <ReceiptText className="w-4 h-4 text-primary" />
                    Buku Kas Besar &amp; Mutasi Arus Kas
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Kronologi mutasi debit (penjualan) dan kredit (pengeluaran) operasional kegiatan.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-semibold">
                    Total Mutasi: {cashFlowLedger.length}
                  </Badge>
                </div>
              </div>

              {cashFlowLedger.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  Belum ada mutasi arus kas yang tercatat.
                </div>
              ) : (
                <div className="overflow-x-auto scrollbar-thin mt-4">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead>
                      <tr className="border-b border-border/80 text-muted-foreground font-semibold">
                        <th className="py-3 px-3">Tanggal</th>
                        <th className="py-3 px-3">Uraian Transaksi</th>
                        <th className="py-3 px-3">Kategori</th>
                        <th className="py-3 px-3">Tipe</th>
                        <th className="py-3 px-3 text-right">Debit (Masuk)</th>
                        <th className="py-3 px-3 text-right">Kredit (Keluar)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {cashFlowLedger.map((entry) => (
                        <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                            {new Date(entry.date).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-3 font-medium text-foreground">
                            {entry.title}
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="secondary" className="text-[10px] font-medium">
                              {entry.category}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              entry.type === "in"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                            }`}>
                              {entry.type === "in" ? "Pemasukan" : "Pengeluaran"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                            {entry.type === "in" ? `+ ${formatRupiah(entry.amount)}` : "-"}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-rose-600 whitespace-nowrap">
                            {entry.type === "out" ? `- ${formatRupiah(entry.amount)}` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border font-bold text-xs bg-muted/20">
                        <td colSpan={4} className="py-3 px-3 text-foreground">
                          Total Akumulasi Arus Kas
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-600">
                          + {formatRupiah(totalRevenue)}
                        </td>
                        <td className="py-3 px-3 text-right text-rose-600">
                          - {formatRupiah(totalExpenses)}
                        </td>
                      </tr>
                      <tr className="border-t border-border font-bold text-sm bg-primary/5">
                        <td colSpan={4} className="py-3 px-3 text-primary">
                          Saldo Kas Bersih Tersedia
                        </td>
                        <td colSpan={2} className={`py-3 px-3 text-right ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {formatRupiah(netProfit)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* TAB 2: Analisis Penjualan & Arus Kas */}
          <TabsContent value="sales" className="mt-0 flex flex-col gap-6">
            {/* Visualisasi Grafik Arus Kas & Kanal Pembayaran */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Grafik 1: Tren Arus Kas Masuk vs Keluar Harian */}
              <Card className="lg:col-span-2 p-5 rounded-2xl border-border bg-card shadow-xs flex flex-col justify-between">
                <CardHeader className="p-0 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        <span>Tren Arus Kas Masuk vs Kas Keluar Harian</span>
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        Perbandingan omzet penjualan stand (masuk) dengan pengeluaran belanja operasional (keluar).
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold self-start sm:self-auto bg-primary/5 text-primary border-primary/20">
                      Grafik Dinamis
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-0 pt-2">
                  <ChartContainer config={cashflowChartConfig} className="h-64 sm:h-72 w-full">
                    <AreaChart data={dailyCashFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillPemasukan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="fillPengeluaran" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} className="text-[10px]" />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        className="text-[10px]"
                        tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) => (
                              <div className="flex items-center justify-between gap-2 w-full">
                                <span className="text-muted-foreground">{name === "pemasukan" ? "Kas Masuk" : "Kas Keluar"}:</span>
                                <span className="font-bold">{formatRupiah(Number(value) || 0)}</span>
                              </div>
                            )}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Area type="monotone" dataKey="pemasukan" stroke="#10b981" fillOpacity={1} fill="url(#fillPemasukan)" strokeWidth={2} />
                      <Area type="monotone" dataKey="pengeluaran" stroke="#f43f5e" fillOpacity={1} fill="url(#fillPengeluaran)" strokeWidth={2} />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Grafik 2: Kanal Pembayaran */}
              <Card className="p-5 rounded-2xl border-border bg-card shadow-xs flex flex-col justify-between">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <span>Omzet Per Metode Bayar</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Komparasi nominal penjualan berdasarkan kanal transaksi.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-0 pt-2">
                  <ChartContainer config={paymentBarConfig} className="h-64 sm:h-72 w-full">
                    <BarChart data={paymentBarData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                      <XAxis dataKey="method" tickLine={false} axisLine={false} tickMargin={8} className="text-[10px]" />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        className="text-[10px]"
                        tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name, item) => (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-muted-foreground">Total:</span>
                                  <span className="font-bold">{formatRupiah(Number(value) || 0)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-2 text-[10px]">
                                  <span className="text-muted-foreground">Volume:</span>
                                  <span>{item.payload.transaksi} order</span>
                                </div>
                              </div>
                            )}
                          />
                        }
                      />
                      <Bar dataKey="nominal" radius={[8, 8, 0, 0]}>
                        {paymentBarData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* QRIS */}
              <Card className="p-5 rounded-2xl border-border bg-card shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Metode QRIS</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {paymentMethodStats.qris.count} transaksi
                  </Badge>
                </div>
                <p className="text-xl font-bold text-foreground mt-1">
                  {formatRupiah(paymentMethodStats.qris.total)}
                </p>
                <span className="text-[11px] text-muted-foreground">
                  Pembayaran digital barcode instan
                </span>
              </Card>

              {/* Transfer Bank */}
              <Card className="p-5 rounded-2xl border-border bg-card shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-foreground">Transfer Bank</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {paymentMethodStats.transfer.count} transaksi
                  </Badge>
                </div>
                <p className="text-xl font-bold text-foreground mt-1">
                  {formatRupiah(paymentMethodStats.transfer.total)}
                </p>
                <span className="text-[11px] text-muted-foreground">
                  Transfer ke rekening panitia
                </span>
              </Card>

              {/* Tunai di Booth */}
              <Card className="p-5 rounded-2xl border-border bg-card shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-foreground">Tunai di Stand / Booth</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {paymentMethodStats.tunai.count} transaksi
                  </Badge>
                </div>
                <p className="text-xl font-bold text-foreground mt-1">
                  {formatRupiah(paymentMethodStats.tunai.total)}
                </p>
                <span className="text-[11px] text-muted-foreground">
                  Bayar langsung saat pengambilan makanan
                </span>
              </Card>
            </div>

            {/* Status Pesanan Breakdown */}
            <Card className="p-6 rounded-2xl border-border bg-card shadow-xs flex flex-col gap-4">
              <h4 className="text-sm font-bold text-foreground">
                Rekapitulasi Status Pesanan MathBites
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Pesanan Selesai Diambil
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {completedOrders.length} Pesanan
                  </span>
                  <span className="text-xs font-semibold text-emerald-600">
                    {formatRupiah(completedRevenue)}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Menunggu Pembayaran
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {pendingOrders.length} Pesanan
                  </span>
                  <span className="text-xs font-semibold text-amber-600">
                    {formatRupiah(
                      pendingOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
                    )}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Rata-rata Nilai Pesanan (AOV)
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {validOrders.length > 0
                      ? formatRupiah(Math.round(totalRevenue / validOrders.length))
                      : "Rp 0"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Per transaksi pembeli
                  </span>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 3: Beban Pengeluaran Stand */}
          <TabsContent value="expenses" className="mt-0 flex flex-col gap-6">
            {/* KPI Pengeluaran & Laba Bersih */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-5 rounded-2xl border-border bg-card shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-semibold">Omzet Penjualan Lunas</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-foreground mt-2">
                    {formatRupiah(completedRevenue)}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                  Total dari {completedOrders.length} pesanan berstatus selesai
                </p>
              </Card>

              <Card className="p-5 rounded-2xl border-border bg-card shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-semibold">Total Beban Pengeluaran</span>
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                      <ReceiptText className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-rose-600 mt-2">
                    {formatRupiah(totalExpenses)}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                  Tercatat {expenses.length} item transaksi belanja stand
                </p>
              </Card>

              <Card className="p-5 rounded-2xl border-border bg-card shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-semibold">Estimasi Laba Bersih Stand</span>
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <p className={`text-xl sm:text-2xl font-bold mt-2 ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {formatRupiah(netProfit)}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                  {netProfit >= 0 ? "Surplus dialokasikan penuh untuk pendanaan Olimpiade 27" : "Pengeluaran melebihi omzet penjualan"}
                </p>
              </Card>
            </div>

            {/* Grafik Komposisi Beban Pengeluaran Stand (Donut PieChart) */}
            <Card className="p-5 rounded-2xl border-border bg-card shadow-xs">
              <CardHeader className="p-0 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4 text-rose-500" />
                      <span>Komposisi Alokasi Beban Stand</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Distribusi persentase pengeluaran berdasarkan pos belanja (bahan baku, kemasan, dll).
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold self-start sm:self-auto bg-rose-500/10 text-rose-600 border-rose-500/20">
                    Total: {formatRupiah(totalExpenses)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0 pt-2 flex flex-col md:flex-row items-center justify-around gap-6">
                <div className="w-full md:w-1/2 flex justify-center">
                  <ChartContainer config={expensePieConfig} className="h-56 sm:h-64 w-full max-w-xs">
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) => (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-muted-foreground">{name}:</span>
                                <span className="font-bold">{formatRupiah(Number(value) || 0)}</span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Pie
                        data={expensePieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {expensePieData.map((entry, index) => (
                          <Cell key={`pie-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ChartContainer>
                </div>

                {/* Category List Stats */}
                <div className="w-full md:w-1/2 flex flex-col gap-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Rincian Pos Belanja:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {expensePieData.map((item, idx) => {
                      const pct = totalExpenses > 0 ? Math.round((item.value / totalExpenses) * 100) : 0;
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                            <span className="text-xs font-semibold text-foreground truncate">{item.name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-foreground block">{formatRupiah(item.value)}</span>
                            <span className="text-[10px] text-muted-foreground">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expense Table Card with Filter & Add Button */}
            <Card className="rounded-2xl border-border bg-card shadow-xs overflow-hidden">
              <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Daftar Pembukuan Beban &amp; Pengeluaran Stand
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Catatan modal bahan baku, kemasan, operasional stand, dan logistik MathBites
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Category Filter */}
                  <div className="flex items-center gap-1 bg-muted p-1 rounded-xl text-xs">
                    {[
                      { id: "all", label: "Semua" },
                      { id: "bahan_baku", label: "Bahan Baku" },
                      { id: "kemasan", label: "Kemasan" },
                      { id: "operasional", label: "Operasional" },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setExpenseCategoryFilter(cat.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          expenseCategoryFilter === cat.id
                            ? "bg-card text-foreground shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {canEdit && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setExpenseTitle("");
                        setExpenseAmount(0);
                        setExpenseCategory("bahan_baku");
                        setExpenseDate(new Date().toISOString().split("T")[0]);
                        setExpenseNotes("");
                        setExpenseModalOpen(true);
                      }}
                      className="gap-1.5 rounded-xl text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Catat Pengeluaran</span>
                    </Button>
                  )}
                </div>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <ReceiptText className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-semibold text-foreground">Belum Ada Catatan Pengeluaran</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    {expenseCategoryFilter === "all"
                      ? "Catat pengeluaran belanja bahan makanan, kemasan, atau operasional untuk menghitung laba bersih."
                      : `Tidak ada data pengeluaran untuk kategori ${expenseCategoryFilter}.`}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Kebutuhan / Item Belanja</th>
                        <th className="py-3 px-4">Kategori</th>
                        <th className="py-3 px-4 text-right">Nominal</th>
                        <th className="py-3 px-4">Dicatat Oleh</th>
                        {canEdit && <th className="py-3 px-4 text-center w-16">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                            {new Date(exp.expense_date).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-foreground">{exp.title}</span>
                            {exp.notes && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                {exp.notes}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                              {exp.category.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-rose-600">
                            - {formatRupiah(exp.amount)}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {exp.created_by || "Bendahara"}
                          </td>
                          {canEdit && (
                            <td className="py-3 px-4 text-center">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Hapus Pengeluaran"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/20 font-bold">
                        <td colSpan={3} className="py-3 px-4 text-foreground">
                          Total Beban Pengeluaran Terfilter
                        </td>
                        <td className="py-3 px-4 text-right text-rose-600">
                          - {formatRupiah(filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0))}
                        </td>
                        <td colSpan={canEdit ? 2 : 1}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>



      {/* Modal Catat Pengeluaran Baru */}
      <Dialog open={expenseModalOpen} onOpenChange={setExpenseModalOpen}>
        <DialogContent className="max-w-md w-full rounded-2xl p-6 bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Catat Pengeluaran Stand
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Masukkan transaksi belanja modal, bahan baku, kemasan, atau operasional stand MathBites.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveExpense} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expenseTitle" className="text-xs font-bold text-foreground">
                Nama Pengeluaran / Item Belanja
              </Label>
              <Input
                id="expenseTitle"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                placeholder="Contoh: Belanja Bahan Baku Daging & Bumbu"
                className="rounded-xl text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expenseCategory" className="text-xs font-bold text-foreground">
                  Kategori
                </Label>
                <select
                  id="expenseCategory"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="rounded-xl text-xs bg-card border border-input h-9 px-3 text-foreground font-medium"
                >
                  <option value="bahan_baku">Bahan Baku</option>
                  <option value="kemasan">Kemasan &amp; Cup</option>
                  <option value="operasional">Operasional</option>
                  <option value="transportasi">Transportasi</option>
                  <option value="publikasi">Publikasi / Banner</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expenseDate" className="text-xs font-bold text-foreground">
                  Tanggal
                </Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="expenseAmount" className="text-xs font-bold text-foreground">
                  Nominal Pengeluaran (Rp)
                </Label>
                <span className="text-xs font-semibold text-rose-600">
                  {formatRupiah(Number(expenseAmount) || 0)}
                </span>
              </div>
              <Input
                id="expenseAmount"
                type="number"
                min="1000"
                step="5000"
                value={expenseAmount || ""}
                onChange={(e) => setExpenseAmount(Number(e.target.value) || 0)}
                placeholder="0"
                className="rounded-xl text-sm"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expenseNotes" className="text-xs font-bold text-foreground">
                Keterangan Tambahan (Opsional)
              </Label>
              <Input
                id="expenseNotes"
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                placeholder="Contoh: Belanja di Pasar Arengka, nota terlampir"
                className="rounded-xl text-sm"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExpenseModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingExpense || !expenseTitle.trim() || expenseAmount <= 0}
                className="rounded-xl text-xs font-bold"
              >
                {savingExpense ? "Menyimpan..." : "Simpan Pengeluaran"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>

      {/* ── MODAL PRATINJAU CETAK DOKUMEN RESMI ── */}
      <Dialog open={printPreviewOpen} onOpenChange={setPrintPreviewOpen}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-card border-border">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Pratinjau Cetak Laporan Keuangan
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Format cetak formal A4 dokumen rekapitulasi dana, omzet, dan pengeluaran MathBites.
                </DialogDescription>
              </div>
              <Button
                size="sm"
                onClick={handlePrintDocument}
                className="gap-2 rounded-xl text-xs font-bold shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Dokumen Sekarang</span>
              </Button>
            </div>
          </DialogHeader>

          {/* Paper Sheet Preview Container (Rendered to PDF/Print via handlePrintDocument) */}
          <div
            id="printable-report-sheet"
            className="mt-4 p-6 sm:p-8 rounded-2xl bg-white text-black shadow-inner border border-neutral-300 font-sans text-xs space-y-6"
          >
            {/* Kop Surat Resmi */}
            <div className="kop text-center pb-3 border-b-4 border-double border-black">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                Panitia Pelaksana Olimpiade Matematika Ke-27
              </p>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-black mt-0.5">
                Fakultas Keguruan dan Ilmu Pendidikan &middot; Universitas Riau
              </h2>
              <p className="text-[11px] text-neutral-600 mt-0.5">
                Sekretariat: Gedung Pendidikan Matematika FKIP UNRI, Kampus Bina Widya Km 12.5 Pekanbaru 28293
              </p>
            </div>

            {/* Title & Metadata */}
            <div className="doc-title text-center space-y-1">
              <h3 className="text-sm sm:text-base font-extrabold uppercase underline decoration-1 text-black">
                Laporan Rekapitulasi Realisasi Dana &amp; Keuangan MathBites
              </h3>
              <p className="text-[11px] text-neutral-600">
                Nomor: OM27/KEU/REKAP/{currentYear} &middot; Tanggal Cetak: {currentDateStr || "Hari ini"}
              </p>
            </div>

            {/* Tabel 1: Rekapitulasi Arus Kas & Laba Rugi */}
            <div className="space-y-1.5">
              <p className="section-heading font-bold text-xs uppercase text-black">I. Ringkasan Eksekutif Arus Kas &amp; Laba Stand</p>
              <table className="w-full border-collapse border border-black text-left text-[11px]">
                <thead>
                  <tr className="bg-neutral-100">
                    <th className="border border-black p-2 font-bold">Uraian Arus Keuangan</th>
                    <th className="border border-black p-2 font-bold text-right">Nominal (Rp)</th>
                    <th className="border border-black p-2 font-bold text-center">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2">Total Omzet Penjualan Tercatat</td>
                    <td className="border border-black p-2 text-right font-semibold">{formatRupiah(totalRevenue)}</td>
                    <td className="border border-black p-2 text-center">{orders.length} Transaksi Terdaftar</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">Realisasi Kas Masuk Terbayar (Lunas)</td>
                    <td className="border border-black p-2 text-right font-semibold text-emerald">{formatRupiah(completedRevenue)}</td>
                    <td className="border border-black p-2 text-center text-emerald font-semibold">{completedOrders.length} Pesanan Lunas</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">Beban Pengeluaran Stand (Bahan Baku, Kemasan, Ops)</td>
                    <td className="border border-black p-2 text-right font-semibold text-rose">- {formatRupiah(totalExpenses)}</td>
                    <td className="border border-black p-2 text-center">{expenses.length} Transaksi Belanja</td>
                  </tr>
                  <tr className="bg-neutral-50 font-bold">
                    <td className="border border-black p-2">Estimasi Laba Bersih Penjualan Stand</td>
                    <td className="border border-black p-2 text-right font-bold text-emerald">{formatRupiah(netProfit)}</td>
                    <td className="border border-black p-2 text-center font-bold">Surplus Stand</td>
                  </tr>
                  <tr className="bg-neutral-100 font-bold">
                    <td className="border border-black p-2">Saldo Kas Bersih Tersedia (Surplus Kas Bersih)</td>
                    <td className={`border border-black p-2 text-right font-bold ${netProfit >= 0 ? "text-emerald" : "text-rose"}`}>
                      {formatRupiah(netProfit)}
                    </td>
                    <td className="border border-black p-2 text-center font-bold">
                      {profitMarginPct}% Margin
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tabel 2: Beban Pengeluaran Stand MathBites */}
            {expenses.length > 0 && (
              <div className="space-y-1.5">
                <p className="section-heading font-bold text-xs uppercase text-black">II. Rincian Pembukuan Beban &amp; Pengeluaran Stand</p>
                <table className="w-full border-collapse border border-black text-left text-[11px]">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border border-black p-1.5 text-center w-8">No</th>
                      <th className="border border-black p-1.5">Tanggal</th>
                      <th className="border border-black p-1.5">Uraian Pembelanjaan</th>
                      <th className="border border-black p-1.5">Kategori</th>
                      <th className="border border-black p-1.5 text-right">Nominal (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp, idx) => (
                      <tr key={exp.id}>
                        <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                        <td className="border border-black p-1.5">
                          {new Date(exp.expense_date).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="border border-black p-1.5 font-medium">{exp.title}</td>
                        <td className="border border-black p-1.5 uppercase text-[10px]">{exp.category.replace("_", " ")}</td>
                        <td className="border border-black p-1.5 text-right font-semibold text-rose">- {formatRupiah(exp.amount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-neutral-100 font-bold">
                      <td colSpan={4} className="border border-black p-1.5 text-right">
                        Total Beban Pengeluaran Stand
                      </td>
                      <td className="border border-black p-1.5 text-right text-rose">
                        - {formatRupiah(totalExpenses)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Tabel 3: Rekap Metode Bayar */}
            <div className="space-y-1.5">
              <p className="section-heading font-bold text-xs uppercase text-black">III. Rekapitulasi Metode Pembayaran MathBites</p>
              <table className="w-full border-collapse border border-black text-left text-[11px]">
                <thead>
                  <tr className="bg-neutral-100">
                    <th className="border border-black p-1.5">Kanal Pembayaran</th>
                    <th className="border border-black p-1.5 text-center">Total Transaksi</th>
                    <th className="border border-black p-1.5 text-right">Total Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-1.5 font-medium">QRIS Digital (Barcode Bank &amp; E-Wallet)</td>
                    <td className="border border-black p-1.5 text-center">{paymentMethodStats.qris.count} Transaksi</td>
                    <td className="border border-black p-1.5 text-right font-semibold">{formatRupiah(paymentMethodStats.qris.total)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 font-medium">Transfer Bank Manual (Rekening Panitia)</td>
                    <td className="border border-black p-1.5 text-center">{paymentMethodStats.transfer.count} Transaksi</td>
                    <td className="border border-black p-1.5 text-right font-semibold">{formatRupiah(paymentMethodStats.transfer.total)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 font-medium">Tunai di Stand Booth Kampus FKIP</td>
                    <td className="border border-black p-1.5 text-center">{paymentMethodStats.tunai.count} Transaksi</td>
                    <td className="border border-black p-1.5 text-right font-semibold">{formatRupiah(paymentMethodStats.tunai.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Kolom Tanda Tangan Pengesahan */}
            <div className="signatures pt-8 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="sig-box">
                <p className="text-neutral-700">Mengetahui,</p>
                <p className="font-bold text-black">Ketua Pelaksana Olimpiade 27</p>
                <div className="sig-space h-16" />
                <p className="sig-line font-bold text-black border-t border-black pt-1 inline-block min-w-[180px]">
                  ( Ketua Pelaksana )
                </p>
              </div>

              <div className="sig-box">
                <p className="text-neutral-700">Pekanbaru, {currentDateStr || "Hari ini"}</p>
                <p className="font-bold text-black">Bendahara Pelaksana Olimpiade 27</p>
                <div className="sig-space h-16" />
                <p className="sig-line font-bold text-black border-t border-black pt-1 inline-block min-w-[180px]">
                  ( {currentUser?.full_name || "Bendahara Pelaksana"} )
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
