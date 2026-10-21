"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { AdminTopBar } from "@/components/admin/admin-sidebar";
import { getCurrentUserProfile, getFriendlyErrorMessage } from "@/lib/supabase/admin";
import { ErrorBanner } from "@/components/admin/error-banner";
import { hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/supabase/database.types";
import { formatRupiah } from "@/lib/data/menu-data";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  Calendar,
  User,
  Trash2,
  Edit2,
  Printer,
  Sparkles,
  RefreshCw,
  FileText,
  AlertCircle,
  Tag,
  ArrowDownRight,
  CheckCircle2,
  ChevronDown,
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

const CATEGORY_MAP: Record<string, { label: string; cls: string }> = {
  bahan_baku: {
    label: "Bahan Baku",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200",
  },
  kemasan: {
    label: "Kemasan & Packaging",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200",
  },
  operasional: {
    label: "Operasional Stand",
    cls: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200",
  },
  transportasi: {
    label: "Transportasi",
    cls: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200",
  },
  publikasi: {
    label: "Publikasi & Banner",
    cls: "bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200",
  },
  lainnya: {
    label: "Lainnya",
    cls: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200",
  },
};

export default function AdminExpensesPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Modal Dialogs
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("bahan_baku");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formDate, setFormDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formCreatedBy, setFormCreatedBy] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [currentDateStr, setCurrentDateStr] = useState("");

  useEffect(() => {
    setFormDate(new Date().toISOString().split("T")[0]);
    setCurrentDateStr(new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }));
  }, []);

  // Dynamically compute all categories from expenses data + defaults
  const dynamicCategories = useMemo(() => {
    const map = new Map<string, { label: string; cls: string }>();
    Object.entries(CATEGORY_MAP).forEach(([key, val]) => {
      map.set(key, val);
    });
    expenses.forEach((e) => {
      if (e.category && !map.has(e.category)) {
        const formattedLabel = e.category
          .split(/_|-|\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        map.set(e.category, {
          label: formattedLabel,
          cls: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200",
        });
      }
    });
    return map;
  }, [expenses]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const [profile, { data: expensesData, error }] = await Promise.all([
        getCurrentUserProfile(),
        supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      ]);

      if (profile) setCurrentUser(profile);
      if (error) throw error;
      if (expensesData) setExpenses(expensesData as ExpenseRecord[]);
    } catch (err: unknown) {
      setErrorMessage(
        getFriendlyErrorMessage(err, "Gagal memuat daftar pengeluaran kas dari Supabase.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Supabase Real-time Channel for expenses
    const supabase = createClient();
    const channel = supabase
      .channel("admin-expenses-realtime")
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
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const canEdit = hasPermission(currentUser, "reports:edit");

  // Filtered List
  const filteredExpenses = useMemo(() => {
    let result = expenses;
    if (selectedCategory !== "all") {
      result = result.filter((e) => e.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.notes && e.notes.toLowerCase().includes(q)) ||
          (e.created_by && e.created_by.toLowerCase().includes(q))
      );
    }
    return result;
  }, [expenses, selectedCategory, searchQuery]);

  // Statistics
  const totalAmount = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [expenses]
  );

  const averageAmount = useMemo(
    () => (expenses.length > 0 ? Math.round(totalAmount / expenses.length) : 0),
    [expenses, totalAmount]
  );

  const topCategory = useMemo(() => {
    if (expenses.length === 0) return "-";
    const catSums: Record<string, number> = {};
    for (const e of expenses) {
      catSums[e.category] = (catSums[e.category] || 0) + Number(e.amount || 0);
    }
    let maxCat = "";
    let maxVal = 0;
    for (const [cat, val] of Object.entries(catSums)) {
      if (val > maxVal) {
        maxVal = val;
        maxCat = cat;
      }
    }
    return CATEGORY_MAP[maxCat]?.label || maxCat;
  }, [expenses]);

  // Open Form Dialog
  const handleOpenAdd = () => {
    setEditingExpense(null);
    setIsCustomCategory(false);
    setCustomCategoryInput("");
    setFormTitle("");
    setFormCategory("bahan_baku");
    setFormAmount(0);
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormNotes("");
    setFormCreatedBy(currentUser?.full_name || "Bendahara Panitia");
    setExpenseModalOpen(true);
  };

  const handleOpenEdit = (item: ExpenseRecord) => {
    const isCustom = !CATEGORY_MAP[item.category];
    setEditingExpense(item);
    setIsCustomCategory(isCustom);
    setCustomCategoryInput(isCustom ? item.category : "");
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormAmount(Number(item.amount));
    setFormDate(item.expense_date || new Date().toISOString().split("T")[0]);
    setFormNotes(item.notes || "");
    setFormCreatedBy(item.created_by || "");
    setExpenseModalOpen(true);
  };

  // Submit Save
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast("Judul pengeluaran wajib diisi.");
      return;
    }
    if (formAmount <= 0) {
      showToast("Nominal pengeluaran harus lebih besar dari 0.");
      return;
    }

    const finalCategory = isCustomCategory && customCategoryInput.trim()
      ? customCategoryInput.trim().toLowerCase().replace(/\s+/g, "_")
      : formCategory;

    setIsSaving(true);
    try {
      const supabase = createClient();
      if (editingExpense) {
        const { error } = await (supabase.from("expenses") as any)
          .update({
            title: formTitle.trim(),
            category: finalCategory,
            amount: formAmount,
            expense_date: formDate,
            notes: formNotes.trim() || null,
            created_by: formCreatedBy.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingExpense.id);

        if (error) throw error;
        showToast("Catatan pengeluaran berhasil diperbarui.");
      } else {
        const { error } = await (supabase.from("expenses") as any).insert({
          title: formTitle.trim(),
          category: finalCategory,
          amount: formAmount,
          expense_date: formDate,
          notes: formNotes.trim() || null,
          created_by: formCreatedBy.trim() || null,
        });

        if (error) throw error;
        showToast("Pengeluaran kas baru berhasil dicatat.");
      }

      setExpenseModalOpen(false);
      loadData();
    } catch (err: unknown) {
      showToast(getFriendlyErrorMessage(err, "Gagal menyimpan pengeluaran kas ke Supabase."));
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Delete
  const handleDeleteExpense = async () => {
    if (!deleteConfirmId) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("expenses").delete().eq("id", deleteConfirmId);
      if (error) throw error;

      showToast("Data pengeluaran berhasil dihapus.");
      setDeleteConfirmId(null);
      loadData();
    } catch (err: unknown) {
      alert(getFriendlyErrorMessage(err, "Gagal menghapus pengeluaran."));
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background text-foreground">
      <AdminTopBar title="Pengeluaran Kas" />

      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Toast feedback */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {errorMessage && (
          <ErrorBanner message={errorMessage} onRetry={loadData} />
        )}

        {/* Header & Main Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              Manajemen Pengeluaran Kas Operasional
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Pencatatan real-time arus kas keluar untuk bahan baku, kemasan, dan perlengkapan booth stand.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPrintPreviewOpen(true)}
              className="gap-1.5 rounded-xl font-semibold cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rekap Kas</span>
            </Button>

            {canEdit && (
              <Button
                size="sm"
                onClick={handleOpenAdd}
                className="gap-1.5 rounded-xl font-bold cursor-pointer shadow-sm shadow-primary/20"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Pengeluaran</span>
              </Button>
            )}
          </div>
        </div>

        {/* KPI Metrics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-3xl border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Total Kas Keluar</span>
              <div className="size-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {formatRupiah(totalAmount)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Akumulasi seluruh biaya operasional
              </p>
            </div>
          </Card>

          <Card className="rounded-3xl border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Jumlah Transaksi</span>
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {expenses.length} Transaksi
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Tercatat pada database Supabase
              </p>
            </div>
          </Card>

          <Card className="rounded-3xl border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Rata-rata Transaksi</span>
              <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {formatRupiah(averageAmount)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Pengeluaran per nota transaksi
              </p>
            </div>
          </Card>

          <Card className="rounded-3xl border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Kategori Terbesar</span>
              <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-xl font-bold text-foreground truncate">
                {topCategory}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Alokasi porsi belanja tertinggi
              </p>
            </div>
          </Card>
        </div>

        {/* Filter & Search Bar */}
        <Card className="rounded-3xl border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari judul belanja, catatan, atau penanggung jawab..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl text-xs bg-muted/30"
              />
            </div>

            {/* Quick Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Sinkron</span>
            </Button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
              className="rounded-xl text-xs font-semibold h-8 cursor-pointer shrink-0"
            >
              Semua ({expenses.length})
            </Button>
            {Array.from(dynamicCategories.entries()).map(([key, info]) => {
              const count = expenses.filter((e) => e.category === key).length;
              return (
                <Button
                  key={key}
                  variant={selectedCategory === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(key)}
                  className="rounded-xl text-xs font-semibold h-8 shrink-0 cursor-pointer"
                >
                  {info.label} ({count})
                </Button>
              );
            })}
          </div>
        </Card>

        {/* Expenses Table */}
        <Card className="rounded-3xl border-border bg-card overflow-hidden shadow-sm p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <Table className="min-w-[650px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-32 text-xs font-bold">Tanggal</TableHead>
                  <TableHead className="text-xs font-bold">Uraian Pengeluaran</TableHead>
                  <TableHead className="w-40 text-xs font-bold">Kategori</TableHead>
                  <TableHead className="w-40 text-xs font-bold">Penanggung Jawab</TableHead>
                  <TableHead className="w-36 text-right text-xs font-bold">Nominal</TableHead>
                  {canEdit && <TableHead className="w-24 text-center text-xs font-bold">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 6 : 5} className="h-32 text-center text-xs text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      Memuat data pengeluaran kas...
                    </TableCell>
                  </TableRow>
                ) : filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 6 : 5} className="h-32 text-center text-xs text-muted-foreground">
                      Tidak ada catatan pengeluaran kas yang sesuai.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => {
                    const catInfo = CATEGORY_MAP[expense.category] || CATEGORY_MAP.lainnya;
                    return (
                      <TableRow key={expense.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs font-mono font-medium text-muted-foreground">
                          {new Date(expense.expense_date).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-foreground">
                              {expense.title}
                            </span>
                            {expense.notes && (
                              <span className="text-[11px] text-muted-foreground line-clamp-1">
                                {expense.notes}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-bold rounded-lg ${catInfo.cls}`}>
                            {catInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-medium">
                          {expense.created_by || "Panitia"}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold font-mono text-destructive">
                          -{formatRupiah(expense.amount)}
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleOpenEdit(expense)}
                                className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Edit Catatan"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setDeleteConfirmId(expense.id)}
                                className="size-8 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
                                title="Hapus Catatan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Modal: Tambah / Edit Pengeluaran */}
        <Dialog open={expenseModalOpen} onOpenChange={setExpenseModalOpen}>
          <DialogContent className="max-w-md p-6 rounded-3xl">
            <DialogHeader className="p-0 space-y-1">
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                <span>{editingExpense ? "Edit Catatan Pengeluaran" : "Catat Pengeluaran Kas Baru"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Arus kas keluar akan dicatat langsung pada database Supabase secara transparan.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveExpense} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Uraian Belanja / Pengeluaran *
                </Label>
                <Input
                  required
                  placeholder="Contoh: Belanja Ayam Segar 10kg & Bumbu"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Kategori Belanja
                  </Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between h-9 px-3 rounded-xl bg-card border border-border text-foreground text-xs font-semibold cursor-pointer shadow-2xs hover:bg-muted"
                      >
                        <span className="capitalize">
                          {isCustomCategory
                            ? (customCategoryInput ? customCategoryInput : "+ Kategori Baru")
                            : (dynamicCategories.get(formCategory)?.label || formCategory)}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 p-1.5 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                      {Array.from(dynamicCategories.entries()).map(([key, info]) => (
                        <DropdownMenuItem
                          key={key}
                          onClick={() => {
                            setIsCustomCategory(false);
                            setFormCategory(key);
                          }}
                          className={`text-xs rounded-lg py-2 px-3 cursor-pointer ${
                            !isCustomCategory && formCategory === key
                              ? "bg-accent font-bold text-accent-foreground"
                              : ""
                          }`}
                        >
                          {info.label}
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

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Tanggal Transaksi
                  </Label>
                  <Input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="rounded-xl text-xs h-9"
                  />
                </div>
              </div>

              {/* Custom Category input if enabled */}
              {isCustomCategory && (
                <div className="space-y-1.5 p-3 rounded-2xl bg-primary/5 border border-primary/20 animate-in fade-in">
                  <Label className="text-xs font-bold text-primary">
                    Nama Kategori Pengeluaran Baru *
                  </Label>
                  <Input
                    placeholder="Contoh: sewa alat, dekorasi, hadiah lomba"
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    className="rounded-xl text-xs bg-background h-9"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Kategori pengeluaran ini akan langsung tersimpan di Supabase secara dinamis.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Nominal Pengeluaran (Rp) *
                </Label>
                <Input
                  type="number"
                  min={100}
                  step={500}
                  required
                  value={formAmount || ""}
                  onChange={(e) => setFormAmount(Number(e.target.value) || 0)}
                  className="rounded-xl text-xs font-mono font-bold"
                  placeholder="0"
                />
                {/* Preset increment buttons */}
                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                  {[10000, 50000, 100000, 500000].map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormAmount((prev) => prev + preset)}
                      className="rounded-lg text-[10px] h-6 px-2 font-mono font-semibold"
                    >
                      +{formatRupiah(preset)}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormAmount(0)}
                    className="rounded-lg text-[10px] h-6 px-2 text-muted-foreground"
                  >
                    Reset
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Penanggung Jawab / Pembeli
                </Label>
                <Input
                  placeholder="Contoh: Bendahara Panitia / Tim Logistik"
                  value={formCreatedBy}
                  onChange={(e) => setFormCreatedBy(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Catatan Tambahan / Nomor Nota
                </Label>
                <Input
                  placeholder="Contoh: Nota Pasar Panam Toko Berkah No. 042"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <DialogFooter className="pt-2 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setExpenseModalOpen(false)}
                  disabled={isSaving}
                  className="rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl text-xs font-bold cursor-pointer"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Pengeluaran"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Konfirmasi Hapus */}
        <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <DialogContent className="max-w-sm p-6 text-center rounded-3xl">
            <div className="size-12 rounded-full bg-destructive/10 text-destructive mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <DialogHeader className="p-0 text-center space-y-1">
              <DialogTitle className="text-base font-bold text-foreground">
                Hapus Catatan Pengeluaran?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Tindakan ini permanen dan akan menghapus catatan kas keluar dari sistem Supabase.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-3 gap-2 sm:gap-0 flex-row justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl text-xs font-semibold cursor-pointer flex-1"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteExpense}
                className="rounded-xl text-xs font-bold cursor-pointer flex-1"
              >
                Ya, Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Cetak Rekap Kas Keluar */}
        <Dialog open={printPreviewOpen} onOpenChange={setPrintPreviewOpen}>
          <DialogContent className="max-w-2xl p-6 rounded-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="p-0 space-y-1 border-b pb-3 text-center">
              <DialogTitle className="text-base font-bold text-foreground">
                Rekap Kas Pengeluaran Operasional MathBites
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Penggalangan Dana Olimpiade Matematika Ke-27 &middot; FKIP Universitas Riau
              </DialogDescription>
            </DialogHeader>

            <div className="py-3 space-y-3 text-xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Tanggal Cetak: {currentDateStr || "Hari ini"}</span>
                <span>Total Data: {expenses.length} transaksi</span>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted font-bold">
                    <tr className="border-b border-border">
                      <th className="p-2 text-left">No</th>
                      <th className="p-2 text-left">Tanggal</th>
                      <th className="p-2 text-left">Uraian</th>
                      <th className="p-2 text-left">Kategori</th>
                      <th className="p-2 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {expenses.map((e, idx) => (
                      <tr key={e.id}>
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2">{e.expense_date}</td>
                        <td className="p-2 font-medium">{e.title}</td>
                        <td className="p-2">{CATEGORY_MAP[e.category]?.label || e.category}</td>
                        <td className="p-2 text-right font-mono font-bold">{formatRupiah(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/60 font-bold border-t border-border">
                    <tr>
                      <td colSpan={4} className="p-2 text-right">TOTAL PENGELUARAN</td>
                      <td className="p-2 text-right font-mono text-destructive">{formatRupiah(totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 pt-6 text-center text-xs">
                <div>
                  <p className="text-muted-foreground">Mengetahui,</p>
                  <p className="font-bold text-foreground mt-0.5">Ketua Panitia Olimpiade 27</p>
                  <div className="h-16" />
                  <p className="font-semibold text-foreground underline">( ........................................ )</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dibuat oleh,</p>
                  <p className="font-bold text-foreground mt-0.5">Bendahara MathBites</p>
                  <div className="h-16" />
                  <p className="font-semibold text-foreground underline">( {currentUser?.full_name || "Bendahara"} )</p>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t flex-row justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrintPreviewOpen(false)}
                className="rounded-xl text-xs font-semibold cursor-pointer"
              >
                Tutup
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (typeof window !== "undefined") window.print();
                }}
                className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar Kas</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
