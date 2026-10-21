"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Navigation,
  ExternalLink,
  Copy,
  Check,
  Clock,
  Compass,
  Building2,
  Sparkles,
} from "lucide-react";

export function BoothMapSection() {
  const [copied, setCopied] = useState(false);

  const googleMapsUrl = "https://maps.app.goo.gl/av5pboJNQJ3Jofbe8";
  const fullAddress =
    "Gedung Pendidikan Matematika, Fakultas Keguruan dan Ilmu Pendidikan (FKIP), Universitas Riau, Kampus Bina Widya Km 12.5, Simpang Baru, Kec. Tampan, Kota Pekanbaru, Riau 28293";

  const handleCopy = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <section
      id="lokasi-booth"
      aria-labelledby="booth-location-heading"
      className="w-full border-t border-border/60 py-16 sm:py-20 bg-background relative overflow-hidden"
    >
      {/* Decorative ambient gradient */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 blur-3xl pointer-events-none -z-10"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-10 flex flex-col items-center gap-3"
        >
          <Badge
            variant="outline"
            className="px-3.5 py-1 rounded-full text-xs font-bold text-primary border-primary/25 bg-primary/5 gap-1.5 shadow-2xs"
          >
            <Compass className="w-3.5 h-3.5 text-primary" />
            <span>Peta Lokasi & Panduan Rute</span>
          </Badge>

          <h2
            id="booth-location-heading"
            className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Kunjungi Booth MathBites di Kampus FKIP UNRI
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Pengambilan pesanan dan santap siang berlokasi strategis di Lobi Depan Gedung Pendidikan Matematika, Kampus Bina Widya Universitas Riau.
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Interactive Map Embed (7 cols) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-7 flex flex-col"
          >
            <Card className="rounded-3xl border-border bg-card overflow-hidden shadow-lg p-0 flex-1 flex flex-col">
              {/* Map Container */}
              <div className="relative aspect-[16/10] sm:aspect-[16/10] w-full bg-muted border-b border-border overflow-hidden">
                <iframe
                  title="Peta Lokasi Booth MathBites Kampus Pendidikan Matematika FKIP UNRI"
                  src="https://maps.google.com/maps?q=0.4734833,101.3773146&hl=id&z=17&output=embed"
                  className="w-full h-full border-0"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />

                {/* Floating GPS Badge on Map */}
                <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-border text-[11px] font-bold text-foreground shadow-sm flex items-center gap-1.5 pointer-events-none">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>0°28&apos;24.5&quot;N 101°22&apos;38.3&quot;E</span>
                </div>
              </div>

              {/* Map Footer Bar with Buttons */}
              <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 bg-card">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground leading-tight">
                      Kampus Pendidikan Matematika FKIP
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      Universitas Riau &middot; Pekanbaru
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="rounded-xl text-xs font-semibold gap-1.5 flex-1 sm:flex-none cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Salin Alamat</span>
                      </>
                    )}
                  </Button>

                  <Button
                    asChild
                    size="sm"
                    className="rounded-xl text-xs font-bold gap-1.5 flex-1 sm:flex-none shadow-sm shadow-primary/25 cursor-pointer"
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
            </Card>
          </motion.div>

          {/* Right Column: Direction Guide & Booth Hours (5 cols) */}
          <motion.div
            initial={{ opacity: 0, x: 18 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-5 flex flex-col gap-4"
          >
            {/* Booth Information Card */}
            <Card className="rounded-3xl border-border bg-card p-5 sm:p-6 shadow-md flex flex-col gap-4">
              <div className="flex items-center justify-between pb-1 border-b border-border/80">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-primary" />
                  Detail Titik Pengambilan
                </span>
                <Badge variant="secondary" className="text-[10px] font-bold rounded-lg px-2">
                  Stand Aktif
                </Badge>
              </div>

              {/* Info Items */}
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 flex items-start gap-3">
                  <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-foreground">Jam Operasional Booth</span>
                    <span className="text-muted-foreground">
                      Pukul 11:30 &ndash; 14:00 WIB (Buka saat jam istirahat santap siang kampus).
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-foreground">Posisi Stand Booth</span>
                    <span className="text-muted-foreground">
                      Lobi Depan Gedung Pendidikan Matematika FKIP UNRI (ditandai banner kuning-ungu Olimpiade 27).
                    </span>
                  </div>
                </div>
              </div>

              {/* Route Guide */}
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-primary">
                  <Navigation className="w-4 h-4 shrink-0" />
                  <span>Petunjuk Rute Masuk Kampus</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Masuk dari Gerbang Utama UNRI (Jl. HR. Soebrantas Panam) &rarr; Masuki jalan lingkar utama kampus menuju komplek Fakultas Keguruan dan Ilmu Pendidikan (FKIP) &rarr; Gedung Pendidikan Matematika terletak di sisi tengah komplek.
                </p>
              </div>

              {/* Bottom Quick Notice */}
              <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Cukup tunjukkan <strong>QR Bukti Ambil</strong> dari pesanan Anda ke panitia stand.</span>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
