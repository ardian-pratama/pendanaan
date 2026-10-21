import Image from "next/image";
import Link from "next/link";
import { MenuSection } from "@/components/sections/menu-sections";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ShoppingCart,
  ArrowRight,
  Sparkles,
  Target,
  Trophy,
  ClipboardList,
  CreditCard,
  BadgeCheck,
  MapPin,
  Clock,
  ShieldCheck,
  Users,
  CheckCircle2,
  MessageSquareHeart,
  Star,
  Award,
} from "lucide-react";
import { BoothMapSection } from "@/components/home/booth-map-section";

export const metadata = {
  title: "MathBites — Pemesanan Makanan & Penggalangan Dana Olimpiade 27",
  description:
    "Pemesanan makanan dan minuman lezat untuk santap siang di kampus sekaligus mendukung pendanaan kegiatan Olimpiade Matematika ke-27 (Olimpiade 27).",
};

export default function Home() {
  return (
    <main id="main-content" className="w-full pt-20 bg-background text-foreground" tabIndex={-1}>

      {/* ============================================
          1. HERO SECTION (Maia Style - Rounded & Spacious)
      ============================================= */}
      <section
        aria-labelledby="hero-heading"
        className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 sm:pt-14 sm:pb-24 overflow-hidden"
      >
        {/* Soft Background Accents */}
        <div aria-hidden="true" className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none -z-10" />
        <div aria-hidden="true" className="absolute top-1/2 -right-20 w-80 h-80 rounded-full bg-secondary/10 blur-3xl pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

          {/* LEFT COLUMN (7 cols) */}
          <div className="flex flex-col gap-5 lg:col-span-7 order-2 lg:order-1">
            
            {/* Live Event Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="px-3 py-1 rounded-full bg-primary/10 text-primary border-primary/20 text-xs font-semibold gap-1.5 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>Penggalangan Dana Olimpiade Matematika Ke-27</span>
              </Badge>
            </div>

            {/* H1 Heading */}
            <h1
              id="hero-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-[1.18] tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Pemesanan Makanan Lezat,{" "}
              <br className="hidden sm:inline" />
              <span className="text-primary">Dukung Suksesnya Olimpiade 27</span>
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
              Nikmati santap siang praktis, lezat, dan higienis di lingkungan kampus. Setiap pesanan
              Anda berkontribusi langsung pada pendanaan operasional dan fasilitas pelaksanaan{" "}
              <strong className="font-semibold text-foreground">Olimpiade Matematika ke-27 (Olimpiade 27)</strong>.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button asChild size="lg" className="rounded-2xl font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all gap-2 text-sm">
                <Link href="/menu">
                  <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                  Lihat Katalog Menu
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-2xl font-semibold gap-2 text-sm hover:bg-muted">
                <a href="#cara-pesan">
                  Cara Pesan
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
              </Button>
            </div>

            {/* Key Assurance Badges */}
            <div className="pt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/70 border border-border font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                Segar &amp; Higienis
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/70 border border-border font-medium">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                Kampus Pendidikan Matematika FKIP UNRI
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/70 border border-border font-medium">
                <CreditCard className="w-3.5 h-3.5 text-primary shrink-0" />
                QRIS, Transfer &amp; Tunai
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN — Visual Card & Target (5 cols) */}
          <div className="lg:col-span-5 order-1 lg:order-2 flex flex-col items-center">
            <Card className="w-full max-w-sm sm:max-w-md rounded-3xl border-border bg-card shadow-lg overflow-hidden p-3 sm:p-4">
              <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  alt="Aneka makanan dan minuman lezat dari MathBites untuk kegiatan Olimpiade 27"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGv2rk2LKCe_MvlpO5N0OoGxN1Rb1Dc3XVTUA_jpS74lbwfJHDqbELab7wdryb5x0ZT_UKUc5wU1NxYSrcoigwtedM0oc3sufJJARarSe_fE9NYd1QsUvNXia1uHsVdOTzIuyyAcyOn7L-PGm4Am7dTEzTeLa3u6FjY4MdrY3fymMphKaZW-9nIEuogl39EYK-sBt-cvuRLCojhYAMkVOX2Th3OkiKqhM5JZ2u4aAWxXllxywSqacB"
                  loading="eager"
                  width={420}
                  height={315}
                />
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-border shadow-xs">
                  <div className="size-5 relative shrink-0">
                    <Image src="/images/logo.png" alt="" fill sizes="20px" className="object-contain" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">MathBites Olimpiade 27</span>
                </div>
              </div>

              {/* Stand Quality & Event Assurance Block */}
              <div className="mt-3.5 p-3.5 rounded-2xl bg-muted/50 border border-border/80 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                    Kualitas &amp; Jaminan Stand
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/25">
                    100% Halal &amp; Higienis
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/60">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Bahan Segar Terpilih</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Siap Ambil Tepat Waktu</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </section>

      {/* ============================================
          2. MENU SECTION (Unified Menu Catalog)
      ============================================= */}
      <div id="menu" className="border-t border-border/60 bg-muted/20">
        <MenuSection />
      </div>

      {/* ============================================
          3. CARA PESAN (4 Clear Steps in Maia Cards)
      ============================================= */}
      <section id="cara-pesan" aria-labelledby="how-heading" className="w-full border-t border-border/60 py-16 sm:py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10">
          
          <div className="text-center flex flex-col gap-2.5 max-w-xl mx-auto">
            <Badge variant="outline" className="w-fit mx-auto px-3 py-1 rounded-full text-xs font-semibold text-primary border-primary/20 bg-primary/5">
              Alur Pemesanan
            </Badge>
            <h2 id="how-heading" className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Cara Pesan di MathBites
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pemesanan praktis, aman, dan tanpa repot hanya dalam 4 langkah mudah.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              {
                num: "01",
                Icon: ClipboardList,
                title: "Pilih Menu",
                desc: "Pilih makanan berat, minuman segar, atau camilan lezat yang tersedia di katalog menu kami.",
                badge: "Katalog Lengkap",
              },
              {
                num: "02",
                Icon: ShieldCheck,
                title: "Masuk & Data WA",
                desc: "Masuk dengan akun Google secara instan dan cantumkan nomor WhatsApp aktif untuk notifikasi pesanan.",
                badge: "Mudah & Cepat",
              },
              {
                num: "03",
                Icon: CreditCard,
                title: "Bayar Fleksibel",
                desc: "Lakukan pembayaran mudah melalui QRIS atau transfer bank, atau bayar tunai langsung di booth.",
                badge: "QRIS / Tunai",
              },
              {
                num: "04",
                Icon: BadgeCheck,
                title: "Ambil di Booth",
                desc: "Tunjukkan nomor ID pesanan Anda di Kampus Pendidikan Matematika FKIP UNRI pada jadwal pengambilan.",
                badge: "Kampus FKIP UNRI",
              },
            ].map((step) => (
              <Card key={step.num} className="rounded-2xl border-border bg-card shadow-2xs hover:shadow-md transition-shadow flex flex-col">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs" aria-hidden="true">
                      {step.num}
                    </span>
                    <step.Icon className="w-5 h-5 text-muted-foreground/70" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-base font-bold text-foreground">{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between gap-3">
                  <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {step.desc}
                  </CardDescription>
                  <span className="text-[11px] font-semibold text-primary self-start">
                    {step.badge}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

        </div>
      </section>

      {/* ============================================
          4. MISI PENGGALANGAN DANA OLIMPIADE 27
      ============================================= */}
      <section aria-labelledby="mission-heading" className="w-full border-t border-border/60 py-16 sm:py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

            {/* Left Description */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <Badge variant="outline" className="w-fit px-3 py-1 rounded-full text-xs font-bold text-primary border-primary/20 bg-primary/5">
                <Trophy className="w-3.5 h-3.5 mr-1.5 text-primary" />
                Misi Olimpiade Matematika Ke-27
              </Badge>
              <h2 id="mission-heading" className="text-2xl sm:text-3xl font-bold text-foreground leading-tight" style={{ fontFamily: "var(--font-heading)" }}>
                Partisipasi Nyata untuk Suksesnya Kegiatan Kampus
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Olimpiade Matematika ke-27 (Olimpiade 27) adalah ajang kompetisi sains tahunan bergengsi yang mewadahi talenta pelajar dan mahasiswa. Melalui MathBites, panitia menyelenggarakan penggalangan dana mandiri secara transparan.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Seluruh surplus penjualan dialokasikan untuk perlengkapan lomba, konsumsi peserta &amp; juri, hadiah penghargaan, serta sarana penunjang kegiatan di Kampus Pendidikan Matematika FKIP UNRI.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <Button asChild size="sm" className="rounded-xl font-semibold gap-1.5">
                  <Link href="/menu">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Pesan &amp; Berkontribusi
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-xl font-semibold">
                  <Link href="/menu#ulasan">
                    Lihat Ulasan Menu
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Information Card */}
            <div className="lg:col-span-5">
              <Card className="rounded-3xl border-border bg-card p-5 sm:p-6 shadow-md flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Informasi Penyelenggaraan
                  </span>
                  <Badge variant="default" className="rounded-full text-[11px] font-bold">
                    Olimpiade 27
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-muted/60 border border-border/80 flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground font-medium">Edisi Kegiatan</span>
                    <span className="text-base font-bold text-foreground">Ke-27 (OM-27)</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-muted/60 border border-border/80 flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground font-medium">Penyelenggara</span>
                    <span className="text-base font-bold text-primary">FKIP UNRI</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-foreground">Lokasi Booth Pengambilan</span>
                    <span className="text-xs text-muted-foreground">
                      Kampus Pendidikan Matematika FKIP UNRI
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 flex items-start gap-3">
                  <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-foreground">Waktu Pengambilan Pesanan</span>
                    <span className="text-xs text-muted-foreground">
                      Pukul 11:30 – 14:00 WIB di booth kampus
                    </span>
                  </div>
                </div>
              </Card>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================
          PETA LOKASI BOOTH & PANDUAN RUTE KAMPUS
      ============================================= */}
      <BoothMapSection />

      {/* ============================================
          5. CTA TO CATALOG & REVIEWS (Interactive & Dynamic)
      ============================================= */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <Card className="rounded-3xl border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-10 text-center shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center gap-4 max-w-lg mx-auto">
            <div className="size-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
              <MessageSquareHeart className="w-6 h-6" />
            </div>

            <h3 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Pesan Menu Favorit Anda Hari Ini
            </h3>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Jelajahi beragam pilihan hidangan terbaik, baca ulasan jujur dari pembeli lain, atau berikan rating untuk pesanan Anda.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button asChild size="lg" className="rounded-2xl font-bold shadow-md shadow-primary/20 gap-2">
                <Link href="/menu">
                  <ShoppingCart className="w-4 h-4" />
                  Buka Katalog Menu
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-2xl font-semibold gap-2">
                <Link href="/pesanan">
                  <BadgeCheck className="w-4 h-4" />
                  Cek Riwayat Pesanan
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </section>

    </main>
  );
}
