"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/client";
import {
  Compass,
  ReceiptText,
  ChefHat,
  UserCheck,
  CircleDollarSign,
  SlidersHorizontal,
  LogOut,
  ChevronDown,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight,
  Store,
  Eye,
  Receipt,
  BookOpen,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  Phone,
  MapPin,
  Clock,
  MessageSquare,
} from "lucide-react";
import { AdminChatDrawer } from "@/components/chat/admin-chat-drawer";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarFooter,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { getCurrentUserProfile, fetchAppSettings } from "@/lib/supabase/admin";
import { hasPermission, ROLE_CONFIG, isStaffOrAdmin, ALL_PERMISSIONS } from "@/lib/auth/permissions";
import type { UserProfile, PermissionKey, UserRole } from "@/lib/supabase/database.types";
import { evaluateStoreStatus, DEFAULT_STORE_SETTINGS, type StoreSettingsMap } from "@/lib/utils/store-schedule";

interface NavItemDef {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  permission?: PermissionKey;
}

interface NavGroupDef {
  groupLabel: string;
  items: NavItemDef[];
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let currentUserId: string | null = null;

    async function loadData() {
      try {
        const [profile, { count }] = await Promise.all([
          getCurrentUserProfile(),
          supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .in("status", ["pending", "menunggu_pembayaran"]),
        ]);
        if (profile) {
          currentUserId = profile.id;
          if (!isStaffOrAdmin(profile.role)) {
            window.location.href = "/?unauthorized=admin";
            return;
          }
          setCurrentUser(profile);
        }
        if (count !== null) setPendingCount(count);
      } catch (err) {
        console.error("Error loading sidebar data:", err);
      } finally {
        setLoadingProfile(false);
      }
    }
    loadData();

    const ordersChannel = supabase
      .channel("sidebar-orders-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          loadData();
        }
      )
      .subscribe();

    const profileChannel = supabase
      .channel("sidebar-profile-sync")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_profiles",
        },
        (payload) => {
          const updated = payload.new as UserProfile;
          if (updated && currentUserId && updated.id === currentUserId) {
            if (!isStaffOrAdmin(updated.role)) {
              window.location.href = "/?unauthorized=admin";
              return;
            }
            setCurrentUser(updated);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(profileChannel);
    };
  }, []);

  // Menu navigasi operasional, keuangan, dan sistem
  const navGroups: NavGroupDef[] = useMemo(() => {
    const rawGroups: NavGroupDef[] = [
      {
        groupLabel: "Operasional",
        items: [
          { label: "Overview", href: "/admin", icon: Compass },
          {
            label: "Pesanan Masuk",
            href: "/admin/orders",
            icon: ReceiptText,
            badge: pendingCount && pendingCount > 0 ? pendingCount.toString() : undefined,
            permission: "orders:view",
          },
          {
            label: "Menu & Produk",
            href: "/admin/products",
            icon: ChefHat,
            permission: "menu:view",
          },
          {
            label: "Ulasan & Komentar",
            href: "/admin/reviews",
            icon: MessageSquare,
            permission: "menu:view",
          },
        ],
      },
      {
        groupLabel: "Keuangan & Kas",
        items: [
          {
            label: "Laporan Dana",
            href: "/admin/reports",
            icon: CircleDollarSign,
            permission: "reports:view",
          },
          {
            label: "Pengeluaran Kas",
            href: "/admin/expenses",
            icon: Receipt,
            permission: "reports:view",
          },
        ],
      },
      {
        groupLabel: "Sistem & Hak Akses",
        items: [
          {
            label: "Kelola Pengguna",
            href: "/admin/customers",
            icon: UserCheck,
            permission: "users:view",
          },
          {
            label: "Pengaturan Toko",
            href: "/admin/settings",
            icon: SlidersHorizontal,
            permission: "settings:edit",
          },
        ],
      },
    ];

    if (loadingProfile || !currentUser) {
      return [
        {
          groupLabel: "Memuat...",
          items: [{ label: "Overview", href: "/admin", icon: Compass }],
        },
      ];
    }

    return rawGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (!item.permission) return true;
          return hasPermission(currentUser, item.permission);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [pendingCount, currentUser, loadingProfile]);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Sidebar Header: Brand Logo & Title */}
      <SidebarHeader className="h-16 border-b border-sidebar-border px-4 flex items-center justify-center">
        <Link
          href="/admin"
          className="flex items-center gap-2.5 w-full group-data-[collapsible=icon]:justify-center transition-all overflow-hidden"
        >
          <div className="w-8 h-8 relative shrink-0">
            <Image
              src="/images/logo.png"
              alt="MathBites logo"
              fill
              sizes="32px"
              className="object-contain"
            />
          </div>
          <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span
              className="text-sm font-bold text-sidebar-foreground tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              MathBites
            </span>
            <span className="text-[10px] text-sidebar-primary font-bold">Panel Admin</span>
          </div>
        </Link>
      </SidebarHeader>

      {/* Sidebar Content: Navigation Links per Group */}
      <SidebarContent className="px-2 py-3">
        {navGroups.map((group) => (
          <SidebarGroup key={group.groupLabel} className="mb-2">
            <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs font-semibold px-2">
              {group.groupLabel}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname === item.href || pathname.startsWith(item.href + "/");

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className={
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground shadow-xs"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }
                      >
                        <Link href={item.href} onClick={() => setOpenMobile(false)}>
                          <item.icon className="size-4 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>

                      {item.badge && (
                        <SidebarMenuBadge
                          className={
                            isActive
                              ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                              : "bg-primary text-primary-foreground font-semibold"
                          }
                        >
                          {item.badge}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Sidebar Footer: Kembali ke Toko */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Kembali ke Toko"
              className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Link href="/" onClick={() => setOpenMobile(false)}>
                <ArrowUpRight className="size-4 shrink-0" />
                <span>Kembali ke Toko</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Sidebar Rail for collapsibility */}
      <SidebarRail />
    </Sidebar>
  );
}

export function AdminTopBar({ title }: { title: string }) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [storeSettings, setStoreSettings] = useState<StoreSettingsMap>(DEFAULT_STORE_SETTINGS);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Sync unread chat messages for admin badge
  useEffect(() => {
    const supabase = createClient();
    async function loadUnreadCount() {
      try {
        const { count, error } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .neq("sender_role", "admin")
          .eq("is_read", false);
        if (!error && typeof count === "number") {
          setUnreadChatCount(count);
        }
      } catch (err) {
        console.warn("Gagal menghitung unread chat:", err);
      }
    }
    loadUnreadCount();

    const channel = supabase
      .channel("admin-chat-unread-counter")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let currentUserId: string | null = null;

    async function loadData() {
      try {
        const [profile, appSettings] = await Promise.all([
          getCurrentUserProfile(),
          fetchAppSettings(),
        ]);
        if (profile) {
          currentUserId = profile.id;
          if (!isStaffOrAdmin(profile.role)) {
            window.location.href = "/?unauthorized=admin";
            return;
          }
          setCurrentUser(profile);
        }

        const map: Record<string, string> = {};
        for (const s of appSettings) {
          map[s.key] = typeof s.value === "string" ? s.value : String(s.value ?? "");
        }
        const fullSettings = { ...DEFAULT_STORE_SETTINGS, ...map } as StoreSettingsMap;
        setStoreSettings(fullSettings);
        const evaluated = evaluateStoreStatus(fullSettings);
        setIsStoreOpen(evaluated.isOpen);
      } catch (err) {
        console.error("Error loading topbar data:", err);
      }
    }
    loadData();

    const channel = supabase
      .channel("topbar-profile-sync")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_profiles",
        },
        (payload) => {
          const updated = payload.new as UserProfile;
          if (updated && currentUserId && updated.id === currentUserId) {
            if (!isStaffOrAdmin(updated.role)) {
              window.location.href = "/?unauthorized=admin";
              return;
            }
            setCurrentUser(updated);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const initials = (currentUser?.full_name || currentUser?.email || "Ad")
    .substring(0, 2);

  const roleInfo = currentUser?.role && ROLE_CONFIG[currentUser.role as UserRole]
    ? ROLE_CONFIG[currentUser.role as UserRole]
    : { label: "Panitia", badgeCls: "" };

  const userPermissions = useMemo(() => {
    if (!currentUser) return [];
    return ALL_PERMISSIONS.filter((perm) => hasPermission(currentUser, perm.key));
  }, [currentUser]);

  return (
    <>
      <header className="h-16 border-b border-border bg-card/90 backdrop-blur-md sticky top-0 z-30 shrink-0 flex items-center">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Sidebar trigger + Dynamic Breadcrumbs & Page Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <SidebarTrigger className="size-9 rounded-xl border border-border hover:bg-muted" />

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <span className="hidden sm:inline">Admin</span>
              <ChevronRight className="w-3.5 h-3.5 hidden sm:inline opacity-50" />
              <h1
                className="text-sm sm:text-base font-bold text-foreground truncate"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {title}
              </h1>
            </div>
          </div>

          {/* Right: Live Store Badge & Enriched User Profile Menu */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Live Store Status Indicator */}
            <div
              title={isStoreOpen ? "Toko Sedang Aktif Menerima Pesanan" : "Toko Sedang Tutup"}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-border bg-muted/40 shadow-2xs"
            >
              <span
                className={`size-2 rounded-full ${
                  isStoreOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                }`}
              />
              <span className={isStoreOpen ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                {isStoreOpen ? "Toko Buka" : "Toko Tutup"}
              </span>
            </div>

            {/* Live Chat Pelanggan Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setChatDrawerOpen(true)}
              className="relative size-9 rounded-xl border-border bg-card hover:bg-muted shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Buka Live Chat Pelanggan"
              title="Live Chat Pelanggan Stand Booth"
            >
              <MessageSquare className="size-4 text-foreground" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 size-4 rounded-full bg-rose-600 text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                  {unreadChatCount > 9 ? "9+" : unreadChatCount}
                </span>
              )}
            </Button>

            {/* Menu User Administrator yang Kaya Navigasi & Non-Duplikat */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 flex items-center gap-2 pl-1.5 pr-2.5 rounded-xl border-border bg-card hover:bg-muted shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Menu akun administrator"
                >
                  <Avatar className="size-6 ring-1 ring-primary/30">
                    <AvatarImage src={currentUser?.avatar_url || ""} />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col text-left leading-none">
                    <span className="text-xs font-semibold text-foreground truncate max-w-[110px]">
                      {currentUser?.full_name || "Petugas"}
                    </span>
                    <span className="text-[10px] font-bold text-primary truncate mt-0.5">
                      {roleInfo.label}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-70 shrink-0" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" sideOffset={8} className="w-72 p-2 rounded-2xl shadow-xl">
                {/* Profile Header */}
                <DropdownMenuLabel className="p-2.5 font-normal bg-muted/40 rounded-xl mb-1 border border-border">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-10 ring-2 ring-primary/20">
                      <AvatarImage src={currentUser?.avatar_url || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 flex-1 leading-tight">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {currentUser?.full_name || "Admin MathBites"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {currentUser?.email || "panitia@mathbites.com"}
                      </span>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Badge variant="default" className="text-[10px] px-2 py-0 font-medium">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          {roleInfo.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>

                {/* Section: Akses Toko Publik */}
                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Akses Toko Publik
                </div>

                <DropdownMenuItem asChild>
                  <Link
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between py-2 px-2.5 rounded-xl cursor-pointer text-xs group hover:bg-accent"
                  >
                    <div className="flex items-center gap-2.5">
                      <Store className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <span className="font-semibold block text-foreground">Kembali ke Toko Publik</span>
                        <span className="text-[10px] text-muted-foreground block">Buka beranda &amp; etalase toko</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-60 group-hover:opacity-100 shrink-0" />
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    href="/menu"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between py-2 px-2.5 rounded-xl cursor-pointer text-xs group hover:bg-accent"
                  >
                    <div className="flex items-center gap-2.5">
                      <Eye className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <span className="font-semibold block text-foreground">Katalog Menu Pelanggan</span>
                        <span className="text-[10px] text-muted-foreground block">Pratinjau tampilan pembeli</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-60 group-hover:opacity-100 shrink-0" />
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    href="/pesanan"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between py-2 px-2.5 rounded-xl cursor-pointer text-xs group hover:bg-accent"
                  >
                    <div className="flex items-center gap-2.5">
                      <Receipt className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <span className="font-semibold block text-foreground">Pelacakan Pesanan</span>
                        <span className="text-[10px] text-muted-foreground block">Simulasi status &amp; QR ambil</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-60 group-hover:opacity-100 shrink-0" />
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />

                {/* Section: Bantuan & Informasi Akun */}
                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Pusat Bantuan &amp; Akun
                </div>

                <DropdownMenuItem
                  onClick={() => setProfileModalOpen(true)}
                  className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl cursor-pointer text-xs hover:bg-accent"
                >
                  <UserCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <span className="font-semibold block text-foreground">Profil &amp; Hak Akses</span>
                    <span className="text-[10px] text-muted-foreground block">Lihat wewenang akun aktif</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setGuideModalOpen(true)}
                  className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl cursor-pointer text-xs hover:bg-accent"
                >
                  <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <span className="font-semibold block text-foreground">Buku Panduan Operasional</span>
                    <span className="text-[10px] text-muted-foreground block">SOP verifikasi &amp; scan QR stand</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setHelpModalOpen(true)}
                  className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl cursor-pointer text-xs hover:bg-accent"
                >
                  <HelpCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <span className="font-semibold block text-foreground">Pusat Bantuan &amp; Kontak IT</span>
                    <span className="text-[10px] text-muted-foreground block">Bantuan teknis panitia Olimpiade</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />

                {/* Section: Logout */}
                <form action={signOut} className="w-full">
                  <DropdownMenuItem
                    variant="destructive"
                    asChild
                    className="cursor-pointer rounded-xl py-2 px-2.5"
                  >
                    <button
                      type="submit"
                      className="w-full flex items-center gap-2.5 text-xs font-semibold text-destructive focus:text-destructive cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar dari Akun</span>
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* 1. Modal: Profil & Hak Akses Akun */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl">
          <DialogHeader className="gap-1">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              <span>Profil &amp; Hak Akses Akun</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Identitas dan rincian wewenang operasional panitia aktif di sistem MathBites.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-muted/40 border border-border">
              <Avatar className="size-12 ring-2 ring-primary/20">
                <AvatarImage src={currentUser?.avatar_url || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-foreground truncate">
                  {currentUser?.full_name || "Petugas Panitia"}
                </h4>
                <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="default" className="text-[10px] font-semibold py-0 px-2">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    {roleInfo.label}
                  </Badge>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Sesi Aktif
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
                <span>Daftar Izin &amp; Wewenang Anda</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {userPermissions.length} Hak Akses Aktif
                </span>
              </h5>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-none">
                {userPermissions.map((perm) => (
                  <div
                    key={perm.key}
                    className="p-2.5 rounded-xl bg-card border border-border text-xs flex items-start gap-2.5 shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-foreground block text-[11px]">
                        {perm.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1">
                        {perm.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setProfileModalOpen(false)}
              className="rounded-xl text-xs font-semibold cursor-pointer"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Modal: Buku Panduan Operasional Panitia */}
      <Dialog open={guideModalOpen} onOpenChange={setGuideModalOpen}>
        <DialogContent className="max-w-lg p-6 rounded-3xl">
          <DialogHeader className="gap-1">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span>Buku Panduan Operasional Panitia</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Standar operasional layanan kasir dan serah terima pesanan booth Olimpiade 27.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-1.5">
              <span className="font-bold text-primary flex items-center gap-1.5 text-xs">
                <Store className="w-4 h-4 shrink-0" />
                1. Alur Verifikasi Pesanan Masuk
              </span>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Pantau menu <strong>Pesanan Masuk</strong>. Verifikasi pembayaran manual atau QRIS, lalu ubah status bertahap dari <em>Dikerjakan</em> hingga <em>Siap Diambil di Booth</em> agar sistem mengaktifkan QR bukti ambil pembeli.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-1.5">
              <span className="font-bold text-primary flex items-center gap-1.5 text-xs">
                <Receipt className="w-4 h-4 shrink-0" />
                2. Scan QR Bukti Pengambilan di Stand
              </span>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Ketika pembeli datang ke booth, minta mereka menunjukkan <strong>QR Bukti Ambil</strong> dari kartu pesanan mereka. Buka tombol scanner kamera di panel pesanan untuk validasi otomatis instan.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-1.5">
              <span className="font-bold text-primary flex items-center gap-1.5 text-xs">
                <MapPin className="w-4 h-4 shrink-0" />
                3. Lokasi Stand &amp; Jam Layanan
              </span>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Lokasi <strong>{storeSettings.pickup_location || "Kampus Pendidikan Matematika FKIP UNRI"}</strong>. Waktu <strong>{storeSettings.pickup_date || "Kamis, 24 Okt"}</strong> ({storeSettings.pickup_hours || "11:30 – 14:00 WIB"}).
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setGuideModalOpen(false)}
              className="rounded-xl text-xs font-semibold cursor-pointer"
            >
              Mengerti &amp; Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Modal: Pusat Bantuan & Kontak Tim IT */}
      <Dialog open={helpModalOpen} onOpenChange={setHelpModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl">
          <DialogHeader className="gap-1">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              <span>Pusat Bantuan &amp; Kontak IT</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Bantuan teknis aplikasi &amp; penanganan kendala sistem pemesanan panitia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Status Infrastruktur</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Operasional Normal
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Database Supabase Cloud, autentikasi sesi, dan sinkronisasi realtime berjalan aktif.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 space-y-1.5">
              <span className="font-bold block text-xs">Butuh Bantuan Mendesak saat Acara?</span>
              <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                Jika terjadi kendala sinyal, cetak transaksi, atau validasi QR di booth, hubungi tim IT &amp; Publikasi Olimpiade 27.
              </p>
            </div>

            <Button
              asChild
              className="w-full rounded-xl text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              <a
                href="https://wa.me/?text=Halo%20Tim%20IT%20Olimpiade%2027,%20saya%20panitia%20MathBites%20membutuhkan%20bantuan%20terkait%20sistem"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Phone className="w-4 h-4" />
                <span>Hubungi Helpdesk WhatsApp</span>
              </a>
            </Button>
          </div>

          <div className="pt-1 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHelpModalOpen(false)}
              className="rounded-xl text-xs font-semibold cursor-pointer"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Drawer: Live Chat Pelanggan Stand Booth */}
      <AdminChatDrawer
        open={chatDrawerOpen}
        onOpenChange={setChatDrawerOpen}
        adminName={currentUser?.full_name || "Admin Stand Booth"}
      />
    </>
  );
}
