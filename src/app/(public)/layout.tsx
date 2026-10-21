import { Suspense } from "react";
import Image from "next/image";
import { PubblicHeader } from "@/components/layout/pubblic-header";
import { CartProvider } from "@/lib/context/cart-context";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { FloatingCart } from "@/components/cart/floating-cart";
import { CustomerChatWidget } from "@/components/chat/customer-chat-widget";
import Link from "next/link";
import {
  MapPin,
  Clock,
  ArrowRight,
  CreditCard,
} from "lucide-react";

const footerLinks = [
  { label: "Beranda", href: "/" },
  { label: "Katalog Menu", href: "/menu" },
  { label: "Masuk Akun", href: "/login" },
];

const footerInfo = [
  { Icon: Clock, label: "Pengambilan Pesanan", value: "Kamis, 24 Oktober · 11:30–14:00 WIB" },
  { Icon: MapPin, label: "Lokasi Booth", value: "Kampus Pendidikan Matematika FKIP UNRI" },
  { Icon: CreditCard, label: "Metode Pembayaran", value: "QRIS · Transfer Bank · Tunai di Booth" },
];

function Footer() {
  return (
    <footer className="w-full bg-surface-container-low border-t border-outline-variant mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5 w-fit">
              <div className="w-8 h-8 relative shrink-0">
                <Image
                  src="/images/logo.png"
                  alt="MathBites logo"
                  fill
                  sizes="32px"
                  className="object-contain"
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
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Layanan pemesanan makanan &amp; minuman yang dikelola panitia untuk mendukung
              operasional dan persiapan pelaksanaan kegiatan Olimpiade Matematika ke-27 (Olimpiade 27).
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" aria-hidden="true" />
                Kampus Pendidikan Matematika FKIP UNRI
              </div>
              <span className="text-outline-variant" aria-hidden="true">·</span>
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Clock className="w-3.5 h-3.5 shrink-0 text-primary" aria-hidden="true" />
                11:30–14:00 WIB
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav aria-label="Footer navigation">
            <h4 className="text-xs font-semibold text-on-surface mb-4">
              Navigasi
            </h4>
            <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
              {footerLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors focus-visible:text-primary"
                  >
                    <ArrowRight className="w-3 h-3 opacity-50" aria-hidden="true" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Info */}
          <div>
            <h4 className="text-xs font-semibold text-on-surface mb-4">
              Info Pemesanan
            </h4>
            <ul className="flex flex-col gap-4 list-none p-0 m-0">
              {footerInfo.map((info) => (
                <li key={info.label} className="flex items-start gap-2.5">
                  <info.Icon
                    className="w-4 h-4 text-primary shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-on-surface">
                      {info.label}
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {info.value}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-8 mt-8 border-t border-outline-variant">
          <p className="text-xs text-on-surface-variant text-center sm:text-left">
            &copy; 2025 MathBites — Sarana Penjualan &amp; Penggalangan Dana Kegiatan Olimpiade 27.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-on-surface-variant">Penggunaan dana transparan &amp;</span>
            <span className="text-xs font-semibold text-primary">100% untuk kegiatan</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col bg-surface">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-primary focus:text-on-primary focus:text-sm focus:font-semibold"
        >
          Lewati ke konten utama
        </a>
        <Suspense fallback={<header className="h-16 w-full" />}>
          <PubblicHeader />
        </Suspense>
        <div className="flex-1">{children}</div>
        <Footer />
        <CartDrawer />
        <FloatingCart />
        <CustomerChatWidget />
      </div>
    </CartProvider>
  );
}
