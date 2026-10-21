"use client";

import { useEffect, useState, useTransition, useCallback, useMemo } from "react";
import Image from "next/image";
import { AdminTopBar } from "@/components/admin/admin-sidebar";
import {
  fetchAppSettings,
  updateAppSetting,
  getCurrentUserProfile,
  getFriendlyErrorMessage,
} from "@/lib/supabase/admin";
import { ErrorBanner } from "@/components/admin/error-banner";
import { hasPermission } from "@/lib/auth/permissions";
import type { UserProfile } from "@/lib/supabase/database.types";
import {
  DEFAULT_STORE_SETTINGS,
  evaluateStoreStatus,
  type StoreSettingsMap,
} from "@/lib/utils/store-schedule";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Store,
  MapPin,
  Clock,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  Save,
  Calendar,
  Megaphone,
  Phone,
  QrCode,
  ShieldCheck,
  Power,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  Eye,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<StoreSettingsMap>(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [data, profile] = await Promise.all([
        fetchAppSettings(),
        getCurrentUserProfile(),
      ]);
      const map: Record<string, string> = {};
      for (const s of data) {
        map[s.key] = typeof s.value === "string" ? s.value : String(s.value ?? "");
      }

      setSettings((prev) => ({ ...prev, ...map }));
      if (profile) setCurrentUser(profile);
    } catch (err: unknown) {
      setErrorMessage(
        getFriendlyErrorMessage(err, "Gagal memuat pengaturan sistem. Periksa koneksi internet Anda.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const canEdit = hasPermission(currentUser, "settings:edit");

  // Calculate live store status based on current form input
  const liveStatus = useMemo(() => evaluateStoreStatus(settings), [settings]);

  const updateField = (key: keyof StoreSettingsMap, val: string) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canEdit) {
      showToast("Anda tidak memiliki izin (settings:edit) untuk mengubah pengaturan.");
      return;
    }
    startTransition(async () => {
      try {
        const promises = Object.entries(settings).map(([key, value]) =>
          updateAppSetting(key, value || "")
        );
        await Promise.all(promises);
        showToast("Semua pengaturan toko & operasional berhasil disimpan!");
      } catch (err: unknown) {
        showToast(getFriendlyErrorMessage(err, "Gagal menyimpan pengaturan aplikasi."));
      }
    });
  };

  const handleToggleStoreInstant = () => {
    if (!canEdit) {
      showToast("Anda tidak memiliki izin (settings:edit).");
      return;
    }
    const currentVal = settings.is_ordering_open === "true";
    const nextVal = currentVal ? "false" : "true";
    setSettings((prev) => ({ ...prev, is_ordering_open: nextVal }));

    startTransition(async () => {
      try {
        await updateAppSetting("is_ordering_open", nextVal);
        showToast(
          nextVal === "true"
            ? "Toko berhasil dibuka untuk umum!"
            : "Toko berhasil ditutup sementara."
        );
      } catch (err) {
        showToast(getFriendlyErrorMessage(err, "Gagal mengubah status toko."));
      }
    });
  };

  if (!canEdit && !loading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <AdminTopBar title="Pengaturan Sistem Toko" />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 text-center rounded-2xl shadow-md border-border">
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground">Akses Pengaturan Dibatasi</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Pengaturan sistem, kontrol buka/tutup toko, dan nomor rekening hanya dapat dikelola oleh akun dengan izin <code>settings:edit</code> (Super Admin).
            </p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminTopBar title="Pengaturan Sistem & Toko" />

      {/* Floating Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto flex flex-col gap-6 pb-20 min-w-0">
        {/* Error notification banner */}
        {errorMessage && (
          <ErrorBanner
            message={errorMessage}
            onRetry={loadSettings}
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2
              className="text-xl sm:text-2xl font-bold text-foreground tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Pengaturan Sistem Toko &amp; Operasional
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Konfigurasi status buka/tutup toko, jadwal pre-order, lokasi booth di kampus, dan rekening bank.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadSettings}
              disabled={loading || isSaving}
              className="rounded-xl gap-1.5 h-9 text-xs border-border bg-card shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Muat Ulang</span>
            </Button>

            <Button
              onClick={() => handleSave()}
              disabled={isSaving || !canEdit}
              className="rounded-xl gap-1.5 h-9 px-4 text-xs font-bold shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Menyimpan..." : "Simpan Perubahan"}</span>
            </Button>
          </div>
        </div>

        {/* Live Hero Status Card & Instant Killswitch */}
        <Card className="border-border bg-card shadow-xs overflow-hidden rounded-2xl">
          <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className={`size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  liveStatus.isOpen
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                }`}
              >
                <Power className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base text-foreground">
                    Status Pemesanan Saat Ini:
                  </h3>
                  <Badge
                    variant={liveStatus.isOpen ? "default" : "destructive"}
                    className="px-2.5 py-0.5 text-xs font-bold gap-1.5"
                  >
                    <span
                      className={`size-2 rounded-full ${
                        liveStatus.isOpen ? "bg-emerald-400 animate-pulse" : "bg-rose-300"
                      }`}
                    />
                    {liveStatus.badgeLabel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {liveStatus.isOpen
                    ? liveStatus.scheduleSummary
                    : liveStatus.reason || "Pemesanan ditutup sementara."}
                </p>
              </div>
            </div>

            {/* Instant Toggle Button */}
            <div className="flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
              <Button
                type="button"
                variant={settings.is_ordering_open === "true" ? "outline" : "default"}
                size="sm"
                onClick={handleToggleStoreInstant}
                disabled={isSaving}
                className="rounded-xl text-xs font-bold gap-1.5 shadow-2xs"
              >
                <Power className="w-3.5 h-3.5" />
                <span>
                  {settings.is_ordering_open === "true" ? "Tutup Toko Cepat" : "Buka Toko Sekarang"}
                </span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Tabbed Configuration Panels */}
        <form onSubmit={handleSave}>
          <Tabs defaultValue="schedule" className="w-full space-y-6">
            <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex p-1 h-auto bg-muted border border-border rounded-2xl gap-1">
              <TabsTrigger value="schedule" className="rounded-xl py-2 px-3 sm:px-4 gap-2 text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Jadwal &amp; Buka/Tutup</span>
              </TabsTrigger>
              <TabsTrigger value="pickup" className="rounded-xl py-2 px-3 sm:px-4 gap-2 text-xs font-bold">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>Lokasi Booth &amp; Ambil</span>
              </TabsTrigger>
              <TabsTrigger value="payment" className="rounded-xl py-2 px-3 sm:px-4 gap-2 text-xs font-bold">
                <CreditCard className="w-3.5 h-3.5 text-primary" />
                <span>Metode Bayar &amp; QRIS</span>
              </TabsTrigger>
              <TabsTrigger value="announcement" className="rounded-xl py-2 px-3 sm:px-4 gap-2 text-xs font-bold">
                <Megaphone className="w-3.5 h-3.5 text-primary" />
                <span>Banner Pengumuman</span>
              </TabsTrigger>
            </TabsList>

            {/* ── TAB 1: JADWAL & OPERASIONAL ── */}
            <TabsContent value="schedule" className="space-y-4 outline-none">
              <Card className="border-border bg-card rounded-2xl p-5 flex flex-col gap-5">
                <div>
                  <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Store className="w-4 h-4 text-primary" />
                    Kontrol Pemesanan Toko
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Aktifkan atau nonaktifkan pemesanan bagi pelanggan.
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border">
                  <div className="space-y-0.5">
                    <Label className="text-xs sm:text-sm font-bold text-foreground">
                      Status Buka Toko (Publik)
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Jika dimatikan, pelanggan tidak dapat checkout dan tombol pemesanan akan dinonaktifkan.
                    </p>
                  </div>
                  <Switch
                    checked={settings.is_ordering_open === "true"}
                    onCheckedChange={(checked) =>
                      updateField("is_ordering_open", checked ? "true" : "false")
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="closed-reason" className="text-xs font-bold text-foreground">
                    Pesan Alasan Toko Tutup (Ditampilkan kepada Pembeli)
                  </Label>
                  <Textarea
                    id="closed-reason"
                    value={settings.closed_reason_message || ""}
                    onChange={(e) => updateField("closed_reason_message", e.target.value)}
                    placeholder="Contoh: Pemesanan sementara ditutup untuk persiapan bahan dan stok makanan..."
                    className="rounded-xl text-xs sm:text-sm"
                    rows={2}
                  />
                </div>

                <Separator />

                <div>
                  <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Jadwal Operasional Otomatis (Auto-Schedule)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sistem akan otomatis menutup toko di luar jam operasional harian.
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border">
                  <div className="space-y-0.5">
                    <Label className="text-xs sm:text-sm font-bold text-foreground">
                      Aktifkan Jadwal Otomatis
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Otomatis tutup di luar rentang jam buka harian.
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_schedule_enabled === "true"}
                    onCheckedChange={(checked) =>
                      updateField("auto_schedule_enabled", checked ? "true" : "false")
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="operating-days" className="text-xs font-bold text-foreground">
                      Hari Operasional
                    </Label>
                    <Input
                      id="operating-days"
                      value={settings.operating_days || ""}
                      onChange={(e) => updateField("operating_days", e.target.value)}
                      placeholder="Contoh: Setiap Hari / Senin - Sabtu"
                      className="rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="open-time" className="text-xs font-bold text-foreground">
                      Jam Buka Harian (WIB)
                    </Label>
                    <Input
                      id="open-time"
                      type="time"
                      value={settings.open_time || "08:00"}
                      onChange={(e) => updateField("open_time", e.target.value)}
                      className="rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="close-time" className="text-xs font-bold text-foreground">
                      Jam Tutup Harian (WIB)
                    </Label>
                    <Input
                      id="close-time"
                      type="time"
                      value={settings.close_time || "20:00"}
                      onChange={(e) => updateField("close_time", e.target.value)}
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>

                <Separator />

                {/* Pre-order Deadline */}
                <div>
                  <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Batas Waktu Pre-Order (Deadline Pemesanan)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pemesanan akan otomatis dikunci setelah batas waktu pre-order ini berakhir.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="deadline-date" className="text-xs font-bold text-foreground">
                      Tanggal Batas Pre-Order
                    </Label>
                    <Input
                      id="deadline-date"
                      type="date"
                      value={settings.order_deadline_date || "2026-10-23"}
                      onChange={(e) => updateField("order_deadline_date", e.target.value)}
                      className="rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="deadline-time" className="text-xs font-bold text-foreground">
                      Jam Batas Pre-Order (WIB)
                    </Label>
                    <Input
                      id="deadline-time"
                      type="time"
                      value={settings.order_deadline_time || "23:59"}
                      onChange={(e) => updateField("order_deadline_time", e.target.value)}
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* ── TAB 2: LOKASI BOOTH & AMBIL ── */}
            <TabsContent value="pickup" className="space-y-4 outline-none">
              <Card className="border-border bg-card rounded-2xl p-5 flex flex-col gap-4">
                <div>
                  <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Lokasi Stand Booth &amp; Jadwal Pengambilan
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Informasi lokasi bagi pelanggan untuk mengambil pesanan makanan mereka di kampus.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pickup-location" className="text-xs font-bold text-foreground">
                    Lokasi Stand Booth
                  </Label>
                  <Input
                    id="pickup-location"
                    value={settings.pickup_location || ""}
                    onChange={(e) => updateField("pickup_location", e.target.value)}
                    placeholder="Contoh: Kampus Pendidikan Matematika FKIP UNRI"
                    className="rounded-xl text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Ditampilkan di footer, halaman rincian pesanan, dan konfirmasi WhatsApp.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pickup-date" className="text-xs font-bold text-foreground">
                      Hari &amp; Tanggal Pengambilan
                    </Label>
                    <Input
                      id="pickup-date"
                      value={settings.pickup_date || ""}
                      onChange={(e) => updateField("pickup_date", e.target.value)}
                      placeholder="Contoh: Kamis, 24 Oktober 2026"
                      className="rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pickup-hours" className="text-xs font-bold text-foreground">
                      Jam Pengambilan Pesanan
                    </Label>
                    <Input
                      id="pickup-hours"
                      value={settings.pickup_hours || ""}
                      onChange={(e) => updateField("pickup_hours", e.target.value)}
                      placeholder="Contoh: 11:30 - 14:00 WIB"
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact-wa" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    Nomor WhatsApp Panitia (Hotline Bantuan)
                  </Label>
                  <Input
                    id="contact-wa"
                    value={settings.contact_whatsapp || ""}
                    onChange={(e) => updateField("contact_whatsapp", e.target.value)}
                    placeholder="Contoh: 6281234567890"
                    className="rounded-xl text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Format diawali kode negara 62 tanpa spasi atau strip.
                  </p>
                </div>
              </Card>
            </TabsContent>

            {/* ── TAB 3: REKENING & QRIS & METODE ── */}
            <TabsContent value="payment" className="space-y-4 outline-none">
              {/* Card 1: Toggle Metode Pembayaran Aktif */}
              <Card className="border-border bg-card rounded-2xl p-5 flex flex-col gap-4">
                <div>
                  <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Opsi Metode Pembayaran yang Diterima
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tentukan metode pembayaran yang dapat dipilih oleh pembeli saat checkout.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold text-foreground">
                        QRIS Digital
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Barcode scan instan
                      </p>
                    </div>
                    <Switch
                      checked={settings.payment_qris_enabled !== "false"}
                      onCheckedChange={(checked) =>
                        updateField("payment_qris_enabled", checked ? "true" : "false")
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold text-foreground">
                        Transfer Bank
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Transfer ke rekening panitia
                      </p>
                    </div>
                    <Switch
                      checked={settings.payment_transfer_enabled !== "false"}
                      onCheckedChange={(checked) =>
                        updateField("payment_transfer_enabled", checked ? "true" : "false")
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold text-foreground">
                        Tunai di Booth
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Bayar saat ambil makanan
                      </p>
                    </div>
                    <Switch
                      checked={settings.payment_cash_enabled !== "false"}
                      onCheckedChange={(checked) =>
                        updateField("payment_cash_enabled", checked ? "true" : "false")
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div className="space-y-1.5">
                    <Label htmlFor="min-order" className="text-xs font-bold text-foreground">
                      Batas Minimal Transaksi Pemesanan (Rp)
                    </Label>
                    <Input
                      id="min-order"
                      type="number"
                      min="0"
                      step="1000"
                      value={settings.min_order_amount || "0"}
                      onChange={(e) => updateField("min_order_amount", e.target.value)}
                      placeholder="0 (tanpa batas minimal)"
                      className="rounded-xl text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Isi 0 jika tidak ada batas minimal pembelian.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="receipt-note" className="text-xs font-bold text-foreground">
                      Pesan Catatan Kaki pada Struk Pembelian
                    </Label>
                    <Input
                      id="receipt-note"
                      value={settings.receipt_footer_note || ""}
                      onChange={(e) => updateField("receipt_footer_note", e.target.value)}
                      placeholder="Contoh: Terima kasih atas dukungan Anda untuk Olimpiade 27!"
                      className="rounded-xl text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Tercetak di bagian bawah nota / struk verifikasi pembeli.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Card 2: Rekening Bank & QRIS */}
              <Card className="border-border bg-card rounded-2xl p-5 flex flex-col gap-4">
                <div>
                  <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Informasi Rekening Bank &amp; Barcode QRIS
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Data rekening resmi panitia untuk menerima transfer dana dari pemesan.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="bank-name" className="text-xs font-bold text-foreground">
                      Nama Bank / E-Wallet
                    </Label>
                    <Input
                      id="bank-name"
                      value={settings.bank_name || ""}
                      onChange={(e) => updateField("bank_name", e.target.value)}
                      placeholder="Contoh: Bank Syariah Indonesia (BSI)"
                      className="rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bank-account-num" className="text-xs font-bold text-foreground">
                      Nomor Rekening
                    </Label>
                    <Input
                      id="bank-account-num"
                      value={settings.bank_account_number || ""}
                      onChange={(e) => updateField("bank_account_number", e.target.value)}
                      placeholder="Contoh: 7212345678"
                      className="rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bank-account-holder" className="text-xs font-bold text-foreground">
                      Atas Nama Pemilik (a.n)
                    </Label>
                    <Input
                      id="bank-account-holder"
                      value={settings.bank_account_holder || ""}
                      onChange={(e) => updateField("bank_account_holder", e.target.value)}
                      placeholder="Contoh: Bendahara Olimpiade 27"
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="qris-url" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-primary" />
                    Link Gambar Barcode QRIS Resmi
                  </Label>
                  <Input
                    id="qris-url"
                    value={settings.qris_image_url || ""}
                    onChange={(e) => updateField("qris_image_url", e.target.value)}
                    placeholder="https://...supabase.co/storage/v1/object/public/..."
                    className="rounded-xl text-xs"
                  />
                </div>

                {settings.qris_image_url && (
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center gap-3">
                    <div className="size-20 relative rounded-lg border border-border overflow-hidden bg-white shrink-0 p-1">
                      <Image
                        src={settings.qris_image_url}
                        alt="QRIS Preview"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Barcode QRIS Terintegrasi</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Gambar barcode ini akan otomatis muncul pada layar popup instruksi bayar pelanggan saat mereka memilih metode QRIS.
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* ── TAB 4: BANNER PENGUMUMAN ── */}
            <TabsContent value="announcement" className="space-y-4 outline-none">
              <Card className="border-border bg-card rounded-2xl p-5 flex flex-col gap-4">
                <div>
                  <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-primary" />
                    Banner Siaran Pengumuman Toko
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pengumuman penting yang ditampilkan di bagian atas beranda toko.
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border">
                  <div className="space-y-0.5">
                    <Label className="text-xs sm:text-sm font-bold text-foreground">
                      Tampilkan Banner Pengumuman
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Aktifkan untuk memunculkan pesan berjalan/banner kepada semua pengunjung.
                    </p>
                  </div>
                  <Switch
                    checked={settings.announcement_banner_enabled === "true"}
                    onCheckedChange={(checked) =>
                      updateField("announcement_banner_enabled", checked ? "true" : "false")
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="announcement-text" className="text-xs font-bold text-foreground">
                    Isi Teks Pengumuman
                  </Label>
                  <Textarea
                    id="announcement-text"
                    value={settings.announcement_banner_text || ""}
                    onChange={(e) => updateField("announcement_banner_text", e.target.value)}
                    placeholder="Contoh: Pesanan untuk hari Kamis sudah dibuka! Dapatkan bonus stiker Olimpiade 27 untuk setiap pemesanan di atas Rp 25.000."
                    className="rounded-xl text-xs sm:text-sm"
                    rows={3}
                  />
                </div>

                {settings.announcement_banner_text && (
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Pratinjau Live Banner di Website</span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">
                      {settings.announcement_banner_text}
                    </p>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>

          {/* Sticky Bottom Save Action Bar */}
          <div className="sticky bottom-4 z-20 mt-8 p-4 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-lg flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <span>Pengaturan langsung disinkronkan secara realtime ke seluruh sistem toko.</span>
            </div>
            <Button
              type="submit"
              disabled={isSaving || !canEdit}
              className="rounded-xl gap-2 px-5 h-9 text-xs font-bold shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Menyimpan..." : "Simpan Semua Pengaturan"}</span>
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
