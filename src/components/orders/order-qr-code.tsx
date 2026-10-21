"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Download, CheckCircle2, Copy, Check, Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface OrderQrCodeProps {
  orderNumber: string;
  customerName?: string;
  status?: string;
  totalAmount?: number;
  size?: number;
  showDetails?: boolean;
  requireReadyStatus?: boolean; // if true, only show QR when status is ready/completed
}

export function OrderQrCode({
  orderNumber,
  customerName,
  status,
  totalAmount,
  size = 200,
  showDetails = true,
  requireReadyStatus = true,
}: OrderQrCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const isReady = status === "menunggu_selesai" || status === "ready";
  const isCompleted = status === "completed" || status === "selesai";
  const isLocked = Boolean(requireReadyStatus && status && !isReady && !isCompleted);

  useEffect(() => {
    if (isLocked) {
      setQrDataUrl("");
      return;
    }

    // Generate QR with payload containing order number and validation key
    const qrPayload = JSON.stringify({
      app: "mathbites",
      orderNumber,
      timestamp: Date.now(),
    });

    QRCode.toDataURL(qrPayload, {
      width: size,
      margin: 1.5,
      color: {
        dark: "#1e1b4b", // deep purple / primary
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Error generating QR code:", err));
  }, [orderNumber, size, isLocked]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `QR-${orderNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLocked) {
    return (
      <div className="flex flex-col items-center text-center p-3 max-w-xs mx-auto">
        <div className="w-full p-5 bg-muted/60 rounded-3xl border border-dashed flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <Badge variant="warning" className="gap-1.5 px-3 py-1 text-xs mb-2 font-semibold shadow-none">
            <Clock className="w-3 h-3 animate-pulse" />
            Pesanan Sedang Diproses
          </Badge>
          <h4 className="text-xs sm:text-sm font-bold text-foreground">
            Kode &amp; QR Belum Digenerate
          </h4>
          <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
            Kode bukti pengambilan <strong>belum digenerate</strong> dan <strong>belum dapat digunakan</strong>. Sistem baru akan meng-generate QR dan mengaktifkan kode saat pesanan selesai disiapkan (status: <strong className="text-primary font-bold">Siap Diambil</strong>).
          </p>
        </div>

        {showDetails && (
          <div className="mt-3 flex flex-col items-center gap-1.5 w-full">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border text-[11px] font-mono text-muted-foreground">
              <span className="font-sans font-medium">No. Registrasi</span>
              <span className="font-bold text-foreground">{orderNumber}</span>
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-sans font-semibold">
                (Kode Belum Aktif)
              </span>
            </div>
            {customerName && (
              <p className="text-xs text-muted-foreground font-medium">
                Atas Nama <strong className="text-foreground">{customerName}</strong>
              </p>
            )}
            <p className="text-[10px] text-destructive font-medium">
              ⛔ Kode tidak dapat digunakan untuk pengambilan sebelum pesanan siap.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative p-3.5 bg-white rounded-2xl shadow-sm border flex items-center justify-center">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt={`QR Code Pesanan ${orderNumber}`}
            width={size}
            height={size}
            className="rounded-lg object-contain"
          />
        ) : (
          <div
            style={{ width: size, height: size }}
            className="flex items-center justify-center bg-muted/40 rounded-lg animate-pulse"
          >
            <QrCode className="w-8 h-8 text-muted-foreground opacity-40" />
          </div>
        )}

        {isCompleted && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center p-2 text-emerald-700 animate-in fade-in">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mb-1" />
            <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300">
              Sudah Selesai
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              Pesanan Telah Diambil
            </span>
          </div>
        )}
      </div>

      {showDetails && (
        <div className="mt-3 flex flex-col items-center gap-1.5 w-full">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border text-xs font-mono font-bold text-foreground">
            <span>{orderNumber}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              type="button"
              onClick={handleCopy}
              className="text-muted-foreground hover:text-primary transition-colors cursor-pointer h-6 w-6 p-0"
              title="Salin No. Pesanan"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>

          {customerName && (
            <p className="text-xs text-muted-foreground font-medium">
              Atas Nama <strong className="text-foreground">{customerName}</strong>
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={handleDownload}
              className="gap-1.5 font-semibold text-xs cursor-pointer rounded-xl h-8 px-3"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Unduh QR</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
