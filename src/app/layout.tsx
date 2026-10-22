import type { Metadata } from "next";
import { Merriweather, Inter } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import { OAuthCodeListener } from "@/components/common/oauth-listener";
import "./globals.css";

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MathBites — Pemesanan Makanan & Penggalangan Dana Olimpiade 27",
  description:
    "Pemesanan makanan dan minuman lezat di kampus sekaligus mendukung penggalangan dana kegiatan Olimpiade Matematika ke-27 (Olimpiade 27). Praktis, higienis, dan transparan.",
  icons: {
    icon: "/images/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      data-scroll-behavior="smooth"
      className={`${merriweather.variable} ${inter.variable} h-full antialiased font-sans`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <OAuthCodeListener />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
