"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/data/menu-data";
import { updateOrderStatus, type OrderWithItems } from "@/lib/supabase/admin";
import type { OrderStatus } from "@/lib/supabase/database.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  Clock,
  User,
  Phone,
  Search,
  Upload,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  CreditCard,
  CheckCheck,
  Volume2,
  VolumeX,
  RotateCcw,
  Lock,
  AlertCircle,
} from "lucide-react";

/**
 * Web Audio API synthesized sound effects
 */
function playScanSound(type: "recognized" | "success" | "warning" | "error") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const now = ctx.currentTime;

    if (type === "recognized") {
      // Quick crisp blip when QR is detected
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === "success") {
      // Upbeat 3-tone chime: C5 -> E5 -> G5
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
      // 2 quick warning buzzes
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
      // Low error tone
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
  } catch (e) {
    // Audio might fail if user has not interacted with DOM yet
  }
}

interface QrScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderUpdated?: (orderId: string, newStatus: OrderStatus) => void;
}

export function QrScannerModal({
  open,
  onOpenChange,
  onOrderUpdated,
}: QrScannerModalProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [foundOrder, setFoundOrder] = useState<OrderWithItems | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isAlreadyCompleted, setIsAlreadyCompleted] = useState(false);

  // Status update state
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState<OrderStatus | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-reader-viewport";

  // Parse order number from raw QR data (handles plain string or JSON payload)
  const extractOrderNumber = (text: string): string => {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && parsed.orderNumber) {
        return String(parsed.orderNumber).trim();
      }
    } catch {
      // not JSON, use text as-is
    }
    return text.trim();
  };

  // Stop camera helper
  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Failed to stop scanner cleanly:", err);
      }
      html5QrCodeRef.current = null;
    }
    setScannerActive(false);
  }, []);

  // Reset scan state and re-arm camera (triggered manually by admin button)
  const handleResetScan = useCallback(() => {
    setScannedResult(null);
    setFoundOrder(null);
    setNotFound(false);
    setIsAlreadyCompleted(false);
    setStatusSuccess(null);
    startCamera();
  }, []);

  // Lookup order in database by order_number and display details for confirmation
  const processOrderScan = useCallback(
    async (orderNumber: string) => {
      setLoadingOrder(true);
      setNotFound(false);
      setFoundOrder(null);
      setIsAlreadyCompleted(false);
      setStatusSuccess(null);

      try {
        const supabase = createClient();
        const { data, error } = await (supabase.from("orders") as any)
          .select(
            `
            *,
            order_items (
              id,
              order_id,
              menu_item_id,
              quantity,
              unit_price,
              subtotal,
              menu_item:menu_items (
                id,
                name,
                image_url,
                category,
                price
              )
            )
          `
          )
          .ilike("order_number", orderNumber.trim())
          .single();

        if (error || !data) {
          if (soundEnabled) playScanSound("error");
          setNotFound(true);
          return;
        }

        const order = data as OrderWithItems;
        setFoundOrder(order);

        // Check status state
        if (order.status === "completed" || order.status === "selesai") {
          setIsAlreadyCompleted(true);
          if (soundEnabled) playScanSound("warning");
        } else if (order.status !== "menunggu_selesai" && order.status !== "ready") {
          // Not ready yet
          if (soundEnabled) playScanSound("warning");
        } else {
          // Ready for pickup
          if (soundEnabled) playScanSound("recognized");
        }
      } catch (err) {
        console.error("Error looking up order by QR:", err);
        if (soundEnabled) playScanSound("error");
        setNotFound(true);
      } finally {
        setLoadingOrder(false);
      }
    },
    [soundEnabled]
  );

  // Start camera scanner
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }

      const qrConfig = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        qrConfig,
        (decodedText) => {
          const ordNum = extractOrderNumber(decodedText);
          setScannedResult(ordNum);
          stopCamera();
          processOrderScan(ordNum);
        },
        () => {
          // ignore frame decode misses
        }
      );

      setScannerActive(true);
    } catch (err: any) {
      console.warn("Camera start error:", err);
      setCameraError(
        "Kamera tidak dapat diakses. Pastikan izin kamera aktif di browser atau gunakan input manual / upload foto."
      );
      setScannerActive(false);
    }
  }, [stopCamera, processOrderScan]);

  // Handle image upload scanning
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }
      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      const ordNum = extractOrderNumber(decodedText);
      setScannedResult(ordNum);
      await stopCamera();
      processOrderScan(ordNum);
    } catch (err) {
      if (soundEnabled) playScanSound("error");
      alert("QR Code tidak terbaca dari foto yang diunggah. Pastikan gambar jelas dan tidak blur.");
    }
  };

  // Toggle modal lifecycle
  useEffect(() => {
    if (open) {
      setScannedResult(null);
      setFoundOrder(null);
      setNotFound(false);
      setIsAlreadyCompleted(false);
      setStatusSuccess(null);
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
  }, [open, startCamera, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Admin marks status as ready for pickup ("menunggu_selesai")
  const handleSetReadyForPickup = async () => {
    if (!foundOrder) return;
    setUpdatingStatus(true);
    try {
      await updateOrderStatus(foundOrder.id, "menunggu_selesai");
      setFoundOrder((prev) => (prev ? { ...prev, status: "menunggu_selesai" } : null));
      if (soundEnabled) playScanSound("success");
      if (onOrderUpdated) {
        onOrderUpdated(foundOrder.id, "menunggu_selesai");
      }
    } catch (err: any) {
      if (soundEnabled) playScanSound("error");
      alert(err.message || "Gagal memperbarui status ke Siap Diambil.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Admin executes confirmation to complete order
  const handleConfirmAndComplete = async () => {
    if (!foundOrder) return;
    // Strict guard: Only orders in ready state ("menunggu_selesai" or "ready") can be completed
    if (foundOrder.status !== "menunggu_selesai" && foundOrder.status !== "ready") {
      if (soundEnabled) playScanSound("error");
      alert(
        "Pesanan belum siap diambil! Pesanan harus berada dalam tahapan 'Siap Diambil' sebelum dapat diselesaikan dengan scan QR."
      );
      return;
    }

    setUpdatingStatus(true);
    try {
      await updateOrderStatus(foundOrder.id, "selesai");
      setFoundOrder((prev) => (prev ? { ...prev, status: "selesai" } : null));
      setStatusSuccess("selesai");
      if (soundEnabled) playScanSound("success");
      if (onOrderUpdated) {
        onOrderUpdated(foundOrder.id, "selesai");
      }
    } catch (err: any) {
      if (soundEnabled) playScanSound("error");
      alert(err.message || "Gagal memperbarui status pesanan.");
    } finally {
      setUpdatingStatus(false);
    }
  };



  const isReadyForPickup =
    foundOrder?.status === "menunggu_selesai" || foundOrder?.status === "ready";
  const isNotReadyYet = Boolean(
    foundOrder &&
      !isReadyForPickup &&
      foundOrder.status !== "completed" &&
      foundOrder.status !== "selesai"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-lg p-0 overflow-hidden rounded-3xl border-outline-variant shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 bg-muted/40 border-b">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs">
              <Camera className="w-4 h-4 shrink-0" />
              <span className="truncate">Booth Kasir Olimpiade 27</span>
            </div>

            <Button
              variant="outline"
              size="icon-xs"
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className={cn(
                "cursor-pointer shrink-0 transition-colors",
                soundEnabled
                  ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                  : "text-muted-foreground opacity-60"
              )}
              title={soundEnabled ? "Suara Efek: Aktif" : "Suara Efek: Senyap"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </Button>
          </div>

          <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2 pt-1">
            <span>Scan & Verifikasi QR Pesanan</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Arahkan kamera ke QR pembeli untuk melihat rincian pesanan dan konfirmasi penyerahan.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Active Camera Viewport */}
          {!foundOrder && !notFound && !loadingOrder && (
            <div className="space-y-3">
              <div className="relative w-full aspect-square max-w-[280px] mx-auto bg-black rounded-2xl overflow-hidden shadow-inner border flex items-center justify-center">
                <div id={scannerContainerId} className="w-full h-full" />
                {!scannerActive && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-2 p-4 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-xs">Menyiapkan kamera...</span>
                  </div>
                )}
                {cameraError && (
                  <div className="absolute inset-0 bg-muted/90 p-4 flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
                    <CameraOff className="w-8 h-8 text-destructive" />
                    <p className="text-xs leading-relaxed">{cameraError}</p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={startCamera}
                      className="cursor-pointer font-semibold"
                    >
                      Coba Lagi
                    </Button>
                  </div>
                )}
              </div>

              {/* Upload image option */}
              <div className="flex items-center justify-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 hover:bg-muted text-xs font-semibold text-foreground border transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-primary" />
                  <span>Upload Foto QR</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Loading order state */}
          {loadingOrder && (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-semibold text-foreground">
                Memverifikasi QR #{scannedResult}...
              </p>
              <span className="text-xs text-muted-foreground">
                Mengambil rincian data pesanan...
              </span>
            </div>
          )}

          {/* Not found state */}
          {notFound && !loadingOrder && (
            <div className="p-6 bg-destructive/10 dark:bg-destructive/20 rounded-2xl border border-destructive/30 text-center space-y-3 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto text-destructive">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-destructive">
                  QR Tidak Dikenali / Tidak Ada
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Nomor pesanan <strong className="font-mono text-foreground">{scannedResult}</strong> tidak ditemukan di database Olimpiade 27.
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleResetScan}
                className="font-bold cursor-pointer"
              >
                Scan Ulang
              </Button>
            </div>
          )}

          {/* Order Found: Display Full Details and Confirmation Actions */}
          {foundOrder && !loadingOrder && (
            <div className="space-y-4 animate-in fade-in zoom-in-95">
              {/* SUCCESS BANNER: Displayed once confirmed */}
              {(statusSuccess === "completed" || statusSuccess === "selesai") && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500 shadow-md flex items-center gap-3 text-emerald-950 dark:text-emerald-100">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCheck className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                      Pesanan berhasil diselesaikan!
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      Makanan telah diserahkan kepada <strong>{foundOrder.customer_name}</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* WARNING BANNER: Order was already completed before this scan */}
              {isAlreadyCompleted && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-500 shadow-md flex items-start gap-3 text-amber-950 dark:text-amber-100">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-amber-800 dark:text-amber-300">
                      Peringatan: Pesanan sudah pernah diambil!
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                      Pesanan ini sudah berstatus <strong>Selesai</strong> sebelumnya. Pastikan tidak terjadi penyerahan makanan ganda!
                    </p>
                  </div>
                </div>
              )}

              {/* WARNING BANNER: Order is not ready for pickup yet */}
              {isNotReadyYet && (
                <div className="p-4 rounded-2xl bg-destructive/10 dark:bg-destructive/20 border-2 border-destructive/50 shadow-md flex items-start gap-3 text-destructive">
                  <div className="w-10 h-10 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm">
                      Kode belum dapat digunakan (Pesanan belum siap)
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Kode pesanan <strong className="text-foreground">{foundOrder.order_number}</strong> belum dapat digunakan karena status saat ini masih <strong>{foundOrder.status === "dikerjakan" ? "Baru Dikerjakan" : foundOrder.status === "menunggu_pembayaran" ? "Menunggu Pembayaran" : foundOrder.status}</strong>. Kode baru dapat di-scan &amp; diselesaikan setelah pesanan berstatus <strong>Siap Diambil</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* ORDER DETAILS CARD */}
              <Card className="p-4 rounded-2xl border space-y-3 gap-0">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block">
                      Nomor Order
                    </span>
                    <span className="font-mono text-base font-bold text-primary">
                      {foundOrder.order_number}
                    </span>
                  </div>
                  <Badge
                    variant={
                      foundOrder.status === "completed" || foundOrder.status === "selesai"
                        ? "success"
                        : foundOrder.status === "confirmed" || foundOrder.status === "dikerjakan"
                        ? "info"
                        : foundOrder.status === "menunggu_selesai"
                        ? "purple"
                        : "warning"
                    }
                    className="px-3 py-1 text-xs font-medium"
                  >
                    {foundOrder.status === "menunggu_selesai"
                      ? "Siap Diambil"
                      : foundOrder.status === "dikerjakan"
                      ? "Baru Dikerjakan"
                      : foundOrder.status === "menunggu_pembayaran"
                      ? "Menunggu Pembayaran"
                      : foundOrder.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-semibold text-foreground truncate">
                      {foundOrder.customer_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{foundOrder.customer_phone || "-"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CreditCard className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{foundOrder.payment_method || "Tunai"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <ShoppingBag className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-bold text-primary truncate">
                      {formatRupiah(foundOrder.total_amount)}
                    </span>
                  </div>
                </div>

                {/* Items breakdown list */}
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                    Menu yang Harus Diserahkan ({foundOrder.order_items?.length || 0} Item):
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {foundOrder.order_items?.map((it: any) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between text-xs bg-muted/40 p-2.5 rounded-xl border"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                            {it.quantity}×
                          </span>
                          <span className="font-semibold text-foreground">
                            {it.menu_item?.name || "Item Menu"}
                          </span>
                        </div>
                        <span className="font-bold text-muted-foreground shrink-0">
                          {formatRupiah(it.subtotal || it.unit_price * it.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* ACTION BUTTONS (Responsive stacked on mobile, inline on tablet/desktop) */}
              <div className="pt-1 space-y-2">
                {!isAlreadyCompleted && foundOrder.status !== "completed" && foundOrder.status !== "selesai" ? (
                  isNotReadyYet ? (
                    // ORDER NOT READY YET: Block complete button, allow setting ready
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Button
                        type="button"
                        disabled
                        variant="secondary"
                        className="flex-1 py-3 px-4 font-bold text-xs sm:text-sm gap-2 cursor-not-allowed select-none h-11"
                        title="Pesanan harus berstatus Siap Diambil sebelum dapat diselesaikan"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Kode Terkunci (Pesanan Belum Siap)</span>
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSetReadyForPickup}
                        disabled={updatingStatus}
                        className="py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm gap-1.5 shadow-sm cursor-pointer shrink-0 h-11"
                      >
                        {updatingStatus ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>Ubah ke &apos;Siap Diambil&apos;</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleResetScan}
                        disabled={updatingStatus}
                        className="px-4 py-2.5 sm:py-3 text-xs font-semibold cursor-pointer h-11"
                      >
                        Scan Ulang
                      </Button>
                    </div>
                  ) : (
                    // ORDER IS READY: Allow confirmation & completion
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Button
                        type="button"
                        onClick={handleConfirmAndComplete}
                        disabled={updatingStatus}
                        className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm gap-2 shadow-sm cursor-pointer h-11"
                      >
                        {updatingStatus ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Konfirmasi & Selesaikan Pesanan</span>
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleResetScan}
                        disabled={updatingStatus}
                        className="px-4 py-2.5 sm:py-3 text-xs font-semibold cursor-pointer h-11"
                      >
                        Batal / Scan Ulang
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleResetScan}
                      className="flex-1 py-3 px-4 font-bold text-xs sm:text-sm gap-2 shadow-xs cursor-pointer h-11"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Scan Antrean Pembeli Berikutnya</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      className="px-4 py-2.5 sm:py-3 text-xs font-semibold cursor-pointer h-11"
                    >
                      Tutup
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
