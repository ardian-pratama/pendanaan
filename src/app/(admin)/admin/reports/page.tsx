"use client";

import { useEffect, useState, useTransition, useCallback, useMemo } from "react";
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
  PieChart,
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
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Expense management state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("bahan_baku");
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [currentDateStr, setCurrentDateStr] = useState("");
  const [currentYear, setCurrentYear] = useState<number>(2026);

  useEffect(() => {
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setCurrentDateStr(new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }));
    setCurrentYear(new Date().getFullYear());
  }, []);
  const [savingExpense, setSavingExpense] = useState(false);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");

  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const [ordersData, profile, { data: expensesData }] = await Promise.all([
        fetchAdminOrders(),
        getCurrentUserProfile(),
        supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      ]);
      setOrders(ordersData);
      if (profile) setCurrentUser(profile);
      if (expensesData) setExpenses(expensesData as ExpenseRecord[]);
    } catch (err: unknown) {
      setErrorMessage(
        getFriendlyErrorMessage(
          err,
          "Gagal memuat data laporan dana & keuangan. Periksa koneksi internet Anda."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Realtime listener for expenses
    const supabase = createClient();
    const expChannel = supabase
      .channel("expenses-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => {
          supabase
            .from("expenses")
            .select("*")
            .order("expense_date", { ascending: false })
            .then(({ data }) => {
              if (data) setExpenses(data as ExpenseRecord[]);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(expChannel);
    };
  }, [loadData]);

  const canEdit = hasPermission(currentUser, "reports:edit");
  const canView = hasPermission(currentUser, "reports:view");

  // Order Revenue Calculations
  const validOrders = useMemo(
    () => orders.filter((o) => o.status !== "cancelled"),
    [orders]
  );
  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === "selesai" || o.status === "completed"),
    [orders]
  );
  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === "menunggu_pembayaran" || o.status === "pending"),
    [orders]
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
    () => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [expenses]
  );

  const netProfit = useMemo(
    () => completedRevenue - totalExpenses,
    [completedRevenue, totalExpenses]
  );

  const profitMarginPct = useMemo(() => {
    return totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0;
  }, [totalRevenue, totalExpenses]);

  const filteredExpenses = useMemo(() => {
    if (expenseCategoryFilter === "all") return expenses;
    return expenses.filter((e) => e.category === expenseCategoryFilter);
  }, [expenses, expenseCategoryFilter]);

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
        setExpenses((prev) => [data as ExpenseRecord, ...prev]);
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
      setExpenses((prev) => prev.filter((e) => e.id !== id));
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
            onRetry={loadData}
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

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData()}
              className="gap-1.5 text-xs font-semibold rounded-xl border-border bg-card shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Segarkan</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPrintPreviewOpen(true)}
              className="gap-1.5 text-xs font-semibold rounded-xl border-border bg-card shadow-2xs print:hidden"
            >
              <Printer className="w-3.5 h-3.5 text-primary" />
              <span>Cetak Ringkasan</span>
            </Button>

            {canEdit && (
              <Button
                size="sm"
                onClick={() => setExpenseModalOpen(true)}
                className="gap-1.5 text-xs font-bold rounded-xl shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Catat Beban Kas</span>
              </Button>
            )}
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
