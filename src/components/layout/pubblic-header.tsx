"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/context/cart-context";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  BookOpenText,
  Home,
  Menu as MenuIcon,
  UtensilsCrossed,
  X,
  ArrowRight,
  LogIn,
  LogOut,
  ShieldCheck,
  ChevronDown,
  Receipt,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  HeartHandshake,
  FileText,
} from "lucide-react";

import { ROLE_CONFIG } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/supabase/database.types";
import { GoogleLogo } from "@/components/common/google-logo";

/**
 * Navigasi publik utama (Hanya fitur yang dapat diakses oleh semua orang/tamu)
 * Fitur yang memerlukan login atau hak akses dipindahkan ke dalam dropdown profil pengguna.
 */
const publicNavItems = [
  { label: "Beranda", href: "/", id: "beranda", icon: Home },
  { label: "Katalog Menu", href: "/menu", id: "menu", icon: UtensilsCrossed },
  { label: "Cara Pesan", href: "/#cara-pesan", id: "cara-pesan", icon: BookOpenText },
];

export function PubblicHeader() {
  const pathname = usePathname();
  const { user, userRole, isStaffOrAdmin, signOut, isStoreOpen, storeStatus } = useCart();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("beranda");
  const [loginHref, setLoginHref] = useState("/login");
  const [unauthorizedNotice, setUnauthorizedNotice] = useState(false);

  // Track active section only when viewport actually reaches the ID
  useEffect(() => {
    if (pathname !== "/") {
      if (pathname === "/menu" || pathname.startsWith("/menu/")) {
        setActiveSection("menu");
      } else {
        setActiveSection("");
      }
      return;
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      const scrollPosition = scrollY + viewportHeight / 3;

      const caraPesanEl = document.getElementById("cara-pesan");
      const menuGridEl = document.getElementById("menu-grid");

      if (caraPesanEl && scrollPosition >= caraPesanEl.offsetTop) {
        setActiveSection("cara-pesan");
      } else if (menuGridEl && scrollPosition >= menuGridEl.offsetTop) {
        setActiveSection("menu");
      } else {
        setActiveSection("beranda");
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateHref = () => {
        const dest = window.location.pathname + window.location.search + window.location.hash;
        setLoginHref(`/login?next=${encodeURIComponent(dest || "/")}`);
      };
      updateHref();
      window.addEventListener("hashchange", updateHref);
      return () => window.removeEventListener("hashchange", updateHref);
    }
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("unauthorized") === "admin") {
        setUnauthorizedNotice(true);
        url.searchParams.delete("unauthorized");
        window.history.replaceState({}, "", url.pathname + (url.hash || ""));
      }
    }
  }, []);

  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Pengguna";

  const userEmail = user?.email || "";
  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    "";
  const userInitials = (userName || "U")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleInfo = userRole && ROLE_CONFIG[userRole as UserRole]
    ? ROLE_CONFIG[userRole as UserRole]
    : { label: "Pelanggan", badgeCls: "" };

  return (
    <>
      {/* Pemberitahuan jika bukan staf panitia */}
      {unauthorizedNotice && (
        <div
          role="alert"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 shadow-xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-3"
        >
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-100">
                Akses Dibatasi: Panel Khusus Panitia
              </p>
              <p className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-300 leading-relaxed mt-0.5">
                Dashboard admin hanya diperuntukkan bagi panitia dan staf MathBites.
              </p>
            </div>
          </div>
          <button
            onClick={() => setUnauthorizedNotice(false)}
            className="text-amber-700 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-100 p-1 shrink-0"
            aria-label="Tutup pesan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <header
        className={`fixed top-0 left-0 right-0 z-40 flex flex-col items-center transition-all duration-300 ${
          scrolled ? "py-1.5 px-3 sm:px-6" : "py-2 sm:py-3 px-3 sm:px-6"
        }`}
      >
        <nav
          aria-label="Navigasi utama"
          className={`w-full max-w-5xl flex items-center justify-between rounded-2xl px-3 sm:px-5 py-2 transition-all duration-300 ${
            scrolled
              ? "bg-card/95 backdrop-blur-xl shadow-md border border-border"
              : "bg-card/85 backdrop-blur-md shadow-xs border border-border/60"
          }`}
        >
          {/* Brand Logo & Live Store Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 sm:gap-2.5 shrink-0 focus-visible:ring-2 focus-visible:ring-ring rounded-lg group"
              aria-label="MathBites — Kembali ke beranda"
            >
              <div className="w-8 h-8 relative shrink-0">
                <Image
                  src="/images/logo.png"
                  alt="MathBites logo"
                  fill
                  sizes="32px"
                  className="object-contain transition-transform duration-300 group-hover:scale-105"
                  priority
                />
              </div>
              <div className="flex flex-col leading-none">
                <span
                  className="font-bold text-sm text-foreground tracking-tight"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  MathBites
                </span>
                <span className="text-[10px] text-primary font-bold">
                  Olimpiade 27
                </span>
              </div>
            </Link>

            {/* Live Store Status Chip */}
            <div
              title={isStoreOpen ? storeStatus.scheduleSummary : storeStatus.statusText}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-border bg-background/80 shadow-2xs"
            >
              {isStoreOpen ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Buka
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                  <span className="size-1.5 rounded-full bg-rose-500" />
                  Tutup
                </span>
              )}
            </div>
          </div>

          {/* Desktop Navigation Links — MURNI HANYA FITUR PUBLIK */}
          <div className="hidden md:flex items-center gap-1" role="list">
            {publicNavItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="listitem"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs lg:text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-ring ${
                    isActive
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Actions: Dropdown Profil (Memuat semua hak akses user) / Tombol Masuk + CTA */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 px-2 py-1 h-9 rounded-xl border-border bg-card hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Buka menu profil akun"
                  >
                    <Avatar className="size-6 ring-1 ring-primary/30">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-xs font-semibold text-foreground max-w-[90px] truncate">
                      {userName.split(" ")[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-70 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-2 rounded-2xl shadow-xl">
                  {/* User Profile Header */}
                  <DropdownMenuLabel className="p-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-9 ring-2 ring-primary/20">
                        {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {userName}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {userEmail}
                        </span>
                        <div className="mt-1">
                          <Badge
                            variant={isStaffOrAdmin ? "default" : "secondary"}
                            className="text-xs px-2 py-0 font-medium"
                          >
                            {isStaffOrAdmin ? (
                              <>
                                <ShieldCheck className="w-3 h-3 mr-1" />
                                {roleInfo.label}
                              </>
                            ) : (
                              "Pelanggan"
                            )}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuLabel>

                  {/* Fitur & Navigasi Pelanggan (Tidak duplikasi dengan menu admin) */}
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/pesanan" className="flex items-center gap-2.5 py-2 cursor-pointer text-sm text-foreground">
                        <Receipt className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>Riwayat Pesanan Saya</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link href="/#cara-pesan" className="flex items-center gap-2.5 py-2 cursor-pointer text-sm text-foreground">
                        <BookOpenText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>Panduan Cara Pesan</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <a
                        href="https://wa.me/6281234567890?text=Halo%20Panitia%20MathBites%20Olimpiade%2027,%20saya%20ingin%20bertanya"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 py-2 cursor-pointer text-sm text-foreground"
                      >
                        <MessageCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>Bantuan &amp; CS Panitia</span>
                      </a>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link href="/#cara-pesan" className="flex items-center gap-2.5 py-2 cursor-pointer text-sm text-foreground">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>Lokasi Booth FKIP UNRI</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  {/* Akses Panitia / Admin */}
                  {isStaffOrAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Akses Panitia
                        </p>
                      </div>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/admin"
                          className="flex items-center gap-2.5 py-2 text-sm text-foreground hover:bg-accent rounded-lg cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span>Panel Administrator</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />

                  {/* Logout */}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={signOut}
                    className="flex items-center gap-2.5 py-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar dari Akun</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" asChild className="rounded-xl h-9 px-3 gap-1.5 shadow-2xs">
                <Link href={loginHref}>
                  <GoogleLogo className="w-4 h-4 shrink-0" />
                  <span>Masuk</span>
                </Link>
              </Button>
            )}

            {/* CTA Order Button */}
            <Button size="sm" asChild className="hidden sm:inline-flex rounded-xl h-9 px-3.5 gap-1.5 shadow-sm">
              <Link href="/menu">
                <span>Pesan Menu</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </Button>

            {/* Mobile Menu Toggle Button */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="md:hidden rounded-xl size-9 border border-border/60 hover:bg-muted cursor-pointer shrink-0"
              aria-label={mobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            >
              {mobileOpen ? (
                <X className="w-4 h-4 text-foreground" />
              ) : (
                <MenuIcon className="w-4 h-4 text-foreground" />
              )}
            </Button>

            {/* Mobile Sheet Drawer */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetContent side="right" showCloseButton={false} className="w-[85vw] sm:w-80 max-w-sm p-0 flex flex-col bg-card border-border shadow-2xl">
                {/* Drawer Header with Brand & Close Button */}
                <SheetHeader className="px-5 py-4 border-b border-border text-left flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 relative shrink-0">
                      <Image
                        src="/images/logo.png"
                        alt="MathBites logo"
                        fill
                        sizes="32px"
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <SheetTitle
                        className="font-bold text-sm text-foreground block leading-tight"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        MathBites
                      </SheetTitle>
                      <span className="text-[10px] text-primary font-bold">
                        Olimpiade 27
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setMobileOpen(false)}
                    className="size-8 rounded-xl border border-border/50 hover:bg-muted cursor-pointer shrink-0"
                    aria-label="Tutup menu navigasi"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </SheetHeader>

                {/* Mobile Live Store Status */}
                <div className="px-5 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between text-xs">
                  <span className="text-foreground font-semibold">Status Operasional</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold ${isStoreOpen ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/15 text-rose-700 dark:text-rose-300"}`}>
                    <span className={`size-1.5 rounded-full ${isStoreOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                    {isStoreOpen ? "Buka" : "Tutup"}
                  </span>
                </div>

                {/* User Card in Drawer (jika login) / Tombol Masuk */}
                {user ? (
                  <div className="p-4 bg-muted/30 border-b border-border">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9 ring-2 ring-primary/20 shrink-0">
                        {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {userName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {userEmail}
                        </p>
                        <Badge
                          variant={isStaffOrAdmin ? "default" : "secondary"}
                          className="mt-1 text-xs px-2 py-0 font-medium"
                        >
                          {isStaffOrAdmin ? roleInfo.label : "Pelanggan Terdaftar"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-b border-border">
                    <Button asChild className="w-full rounded-xl gap-2 shadow-sm">
                      <Link href={loginHref} onClick={() => setMobileOpen(false)}>
                        <GoogleLogo className="w-4 h-4 shrink-0" />
                        <span>Masuk Akun Google</span>
                      </Link>
                    </Button>
                  </div>
                )}

                {/* Mobile Navigation Links */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                  {/* Seksi Publik */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground px-2 mb-1.5">
                      Menu Publik
                    </p>
                    <nav className="flex flex-col gap-1">
                      {publicNavItems.map((item) => {
                        const isActive = activeSection === item.id;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                              isActive
                                ? "bg-accent text-accent-foreground font-semibold"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                          >
                            <item.icon className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </nav>
                  </div>

                  {/* Seksi Hak User & Area Pelanggan */}
                  {user && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground px-2 mb-1.5">
                        Area Pelanggan
                      </p>
                      <nav className="flex flex-col gap-1">
                        <Link
                          href="/pesanan"
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                            pathname === "/pesanan"
                              ? "bg-accent text-accent-foreground font-semibold"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          <Receipt className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span>Riwayat Pesanan Saya</span>
                        </Link>


                        <a
                          href="https://wa.me/6281234567890?text=Halo%20Panitia%20MathBites%20Olimpiade%2027,%20saya%20ingin%20bertanya"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                        >
                          <MessageCircle className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span>Bantuan &amp; CS Panitia</span>
                        </a>
                      </nav>
                    </div>
                  )}

                  {/* Seksi Hak Akses Panitia (Jika Ada) */}
                  {isStaffOrAdmin && (
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border">
                      <p className="text-xs font-semibold text-foreground px-1 mb-1.5 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                        Akses Panitia
                      </p>
                      <nav className="flex flex-col gap-1">
                        <Link
                          href="/admin"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-all"
                        >
                          <ShieldCheck className="w-4 h-4 shrink-0 text-muted-foreground" />
                          <span>Panel Administrator</span>
                        </Link>
                      </nav>
                    </div>
                  )}
                </div>

                {/* Mobile Drawer Footer */}
                <div className="p-4 border-t border-border flex flex-col gap-2 shrink-0">
                  <Button asChild className="w-full rounded-xl gap-2 shadow-sm">
                    <Link href="/menu" onClick={() => setMobileOpen(false)}>
                      <UtensilsCrossed className="w-4 h-4" />
                      <span>Pesan Menu Sekarang</span>
                    </Link>
                  </Button>

                  {user && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setMobileOpen(false);
                        signOut();
                      }}
                      className="w-full rounded-xl gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar dari Akun</span>
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>
    </>
  );
}
