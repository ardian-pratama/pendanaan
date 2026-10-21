import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk Akun — MathBites Olimpiade 27",
  description:
    "Masuk ke akun MathBites untuk pre-order makanan dan minuman serta mendukung kegiatan Olimpiade Matematika ke-27 (Olimpiade 27).",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen h-full bg-surface text-on-surface antialiased overflow-x-hidden">
      {children}
    </div>
  );
}
