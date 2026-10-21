"use client";

import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  TrendingUp,
  Loader2,
  AlertTriangle,
  MapPin,
  ShoppingBag,
  Users,
  CheckCircle2,
} from "lucide-react";
import { GoogleLogo } from "@/components/common/google-logo";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ────────────────────────────────────────────────────────────
// Login Page — Responsive Google OAuth (Pembeli & Panitia)
// ────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);

    try {
      const searchParams =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
      const nextParam = searchParams?.get("next") || "/";

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            nextParam
          )}`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setError("Gagal terhubung ke Google. Silakan coba lagi.");
        setLoading(false);
      }
    } catch {
      setError("Terjadi kesalahan saat memproses login. Silakan coba lagi.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex overflow-x-hidden bg-surface">
      {/* ── LEFT PANEL: Desktop Brand Showcase (hidden on mobile for clean UX) ── */}
      <div
        className="hidden lg:flex relative lg:w-[44%] xl:w-[42%] flex-col justify-between p-10 xl:p-12 overflow-hidden min-h-screen shrink-0"
        style={{
          background:
            "linear-gradient(145deg, #f4f0ff 0%, #ede8ff 35%, #e4dcff 65%, #dbd3ff 100%)",
          borderRight: "1px solid #cac4d8",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background: "rgba(167,139,250,0.3)",
            filter: "blur(60px)",
            animation: "pulseGlow 9s ease-in-out infinite",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-8 right-0 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: "rgba(124,58,237,0.15)",
            filter: "blur(70px)",
            animation: "pulseGlow 11s ease-in-out -4s infinite",
          }}
          aria-hidden="true"
        />

        {/* Top brand badge */}
        <div className="relative z-10 flex items-center">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold text-primary"
            style={{
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
              borderColor: "rgba(202,196,216,0.6)",
            }}
          >
            <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
            Pemesanan MathBites
          </div>
        </div>

        {/* Central Hero Showcase */}
        <div className="relative z-10 my-auto py-8 flex flex-col gap-6">
          <div className="w-16 h-16 xl:w-20 xl:h-20 relative">
            <Image
              src="/images/logo.png"
              alt="MathBites logo"
              fill
              sizes="80px"
              className="object-contain drop-shadow-md"
              priority
            />
          </div>

          <div>
            <h1
              className="text-3xl xl:text-4xl font-extrabold tracking-tight text-on-surface mb-2"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              MathBites
            </h1>
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold text-primary"
              style={{
                background: "rgba(196,181,253,0.3)",
                borderColor: "rgba(167,139,250,0.4)",
              }}
            >
              <TrendingUp className="w-3 h-3" aria-hidden="true" />
              Pemesanan Dana Olimpiade 27
            </div>
          </div>

          <p className="text-sm text-on-surface-variant leading-relaxed max-w-sm">
            Sarana pemesanan makanan dan minuman praktis di kampus sekaligus penggalangan dana
            mandiri untuk menyukseskan rangkaian kegiatan Olimpiade Matematika ke-27 (Olimpiade 27).
          </p>

          {/* Mini progress card */}
          <div
            className="p-4 rounded-2xl max-w-sm"
            style={{
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(202,196,216,0.5)",
              boxShadow: "0 4px 20px -4px rgba(124,58,237,0.12)",
            }}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-on-surface-variant font-semibold flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                Target Dana Olimpiade 27
              </span>
              <span className="font-bold text-primary">74%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: "74%",
                  background: "linear-gradient(90deg, #7C3AED 0%, #A855F7 100%)",
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-on-surface-variant mt-2">
              <span>Rp 14,8 Jt terkumpul</span>
              <span className="font-medium">Target Rp 20 Jt</span>
            </div>
          </div>
        </div>

        {/* User Info Note */}
        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border"
            style={{
              background: "rgba(237,232,255,0.85)",
              backdropFilter: "blur(4px)",
              borderColor: "rgba(202,196,216,0.5)",
            }}
          >
            <Users className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <span className="text-xs font-semibold text-on-surface-variant">
              Untuk Pembeli &amp; Panitia Kegiatan Olimpiade 27
            </span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Main Auth Form (Responsive on all viewports) ── */}
      <div className="flex-1 w-full flex flex-col justify-between p-4 sm:p-8 lg:p-10 xl:p-12 overflow-y-auto min-h-screen">
        {/* Top Navigation Bar */}
        <div className="w-full flex items-center justify-between gap-3 mb-6 sm:mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 group"
            aria-label="Kembali ke beranda"
          >
            <div className="w-8 h-8 relative shrink-0">
              <Image
                src="/images/logo.png"
                alt="MathBites logo"
                fill
                sizes="32px"
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col leading-none">
              <span
                className="font-bold text-sm text-on-surface"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                MathBites
              </span>
              <span className="text-[10px] text-primary font-bold">
                Olimpiade 27
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all"
          >
            <ArrowLeft
              className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>

        {/* Central Login Card with Shadcn Card */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-2 sm:py-6">
          <Card className="rounded-3xl p-6 sm:p-8 border-border bg-card shadow-xl py-6 sm:py-8">
            {/* Card Header */}
            <div className="flex items-center justify-between mb-4">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/15 font-semibold text-xs border border-primary/25">
                <span className="size-1.5 rounded-full bg-primary mr-1.5" aria-hidden="true" />
                Masuk Akun
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">
                Olimpiade 27
              </span>
            </div>

            {/* Title & Description */}
            <div className="mb-6">
              <h2
                className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Selamat Datang
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Gunakan akun Google untuk melakukan pemesanan makanan, mencatat riwayat pesanan,
                atau mengakses panel panitia.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div
                className="flex items-start gap-2.5 p-3.5 rounded-2xl mb-5 text-xs sm:text-sm bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300"
                role="alert"
                aria-live="polite"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Google OAuth Button with Shadcn Button */}
            <Button
              id="btn-google-login"
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-12 rounded-2xl font-bold text-sm shadow-md transition-all gap-3 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  <span>Menghubungkan ke Google...</span>
                </>
              ) : (
                <>
                  <GoogleLogo className="w-5 h-5 shrink-0" />
                  <span>Masuk dengan Google</span>
                </>
              )}
            </Button>

            {/* Benefit info card with Shadcn Card */}
            <Card className="mt-5 p-3.5 rounded-2xl bg-muted/40 border-border space-y-1.5 py-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Pemesanan Praktis &amp; Terverifikasi</span>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                Data nama dan email terhubung otomatis untuk kemudahan validasi nomor pesanan
                serta konfirmasi via WhatsApp.
              </p>
            </Card>



            {/* Help / Guide Link */}
            <div className="mt-5 text-center">
              <p className="text-xs text-on-surface-variant">
                Belum tahu alur pemesanan?{" "}
                <Link
                  href="/#cara-pesan"
                  className="font-semibold text-primary hover:underline transition-colors"
                >
                  Lihat cara pesan
                </Link>
              </p>
            </div>
          </Card>
        </div>

        {/* Micro Footer */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between text-outline text-xs gap-2 pt-6 mt-4 border-t border-outline-variant/40">
          <span className="text-center sm:text-left">
            &copy; 2025 MathBites — Kegiatan Olimpiade 27
          </span>
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:text-primary transition-colors">
              Beranda
            </Link>
            <span aria-hidden="true">&middot;</span>
            <Link href="/#menu" className="hover:text-primary transition-colors">
              Menu Pesanan
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative pulse glow animation */}
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
