"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Navigation,
  Clock,
  Compass,
} from "lucide-react";

interface BoothLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickupLocation?: string;
  pickupDate?: string;
  pickupHours?: string;
}

export function BoothLocationModal({
  open,
  onOpenChange,
  pickupLocation = "Kampus Pendidikan Matematika FKIP UNRI",
  pickupDate = "Kamis, 24 Oktober",
  pickupHours = "11:30 – 14:00 WIB",
}: BoothLocationModalProps) {
  const [copied, setCopied] = useState(false);

  const fullAddress =
    "Gedung Pendidikan Matematika, Fakultas Keguruan dan Ilmu Pendidikan (FKIP), Universitas Riau, Kampus Bina Widya Km 12.5, Simpang Baru, Kec. Tampan, Kota Pekanbaru, Riau 28293";

  const googleMapsUrl = "https://maps.app.goo.gl/av5pboJNQJ3Jofbe8";

  const handleCopy = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-2xl p-0 overflow-hidden rounded-3xl border-border shadow-2xl">
        <DialogHeader className="p-5 pb-3 bg-muted/40 border-b">
          <div className="flex items-center gap-2 text-primary text-xs font-semibold">
            <Compass className="w-4 h-4" />
            <span>Panduan Lokasi & Peta Stand</span>
          </div>
          <DialogTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2 pt-1">
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            <span>Lokasi Booth MathBites Olimpiade 27</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Peta navigasi rute pengambilan makanan dan pesanan di lingkungan Kampus FKIP UNRI.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Interactive Google Maps Embed with Exact Coordinates */}
          <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-muted border border-border shadow-inner">
            <iframe
              title="Peta Lokasi Booth MathBites Kampus Pendidikan Matematika FKIP UNRI"
              src="https://maps.google.com/maps?q=0.4734833,101.3773146&hl=id&z=17&output=embed"
              className="w-full h-full border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* Location & Schedule Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                Titik Booth Pengambilan
              </span>
              <p className="text-foreground font-semibold text-xs">{pickupLocation}</p>
              <p className="text-muted-foreground text-[11px] leading-relaxed pt-1">
                Lobi depan Gedung Pendidikan Matematika FKIP UNRI.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                Jadwal Operasional Stand
              </span>
              <p className="text-foreground font-semibold text-xs">{pickupDate}</p>
              <p className="text-muted-foreground text-[11px] leading-relaxed pt-1">
                Pukul {pickupHours} (Buka saat jam istirahat).
              </p>
            </div>
          </div>

          {/* Route directions tip */}
          <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-xs space-y-1.5">
            <span className="font-bold text-primary flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 shrink-0" />
              Petunjuk Rute Masuk Kampus
            </span>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              Masuk melalui Gerbang Utama UNRI (Jl. HR. Soebrantas Panam) &rarr; Ikuti jalan lingkar utama kampus menuju area FKIP &rarr; Gedung Pendidikan Matematika berada di sisi tengah kompleks FKIP. Booth MathBites ditandai dengan banner kuning-ungu Olimpiade 27.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Alamat Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Salin Alamat Lengkap</span>
                </>
              )}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                asChild
                size="sm"
                className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer flex-1 sm:flex-none"
              >
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Buka di Google Maps</span>
                  <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
