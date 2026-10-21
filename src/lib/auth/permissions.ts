import type { PermissionKey, UserRole, UserProfile } from "@/lib/supabase/database.types";

export interface PermissionDetail {
  key: PermissionKey;
  label: string;
  category: "Pesanan" | "Menu & Produk" | "Pelanggan & Hak Akses" | "Laporan Keuangan" | "Pengaturan Toko";
  description: string;
}

export const ALL_PERMISSIONS: PermissionDetail[] = [
  // Pesanan
  {
    key: "orders:view",
    label: "Lihat Pesanan",
    category: "Pesanan",
    description: "Melihat daftar seluruh pesanan yang masuk dan riwayatnya.",
  },
  {
    key: "orders:update",
    label: "Update Status Pesanan",
    category: "Pesanan",
    description: "Mengonfirmasi pesanan dan menandai selesai saat makanan diambil.",
  },
  {
    key: "orders:delete",
    label: "Hapus Pesanan",
    category: "Pesanan",
    description: "Membatalkan atau menghapus pesanan dari sistem database.",
  },

  // Menu & Produk
  {
    key: "menu:view",
    label: "Lihat Menu Admin",
    category: "Menu & Produk",
    description: "Melihat daftar menu dan status ketersediaan di panel admin.",
  },
  {
    key: "menu:create",
    label: "Tambah Menu Baru",
    category: "Menu & Produk",
    description: "Menambahkan menu baru beserta upload foto ke storage.",
  },
  {
    key: "menu:update",
    label: "Edit Menu & Stok",
    category: "Menu & Produk",
    description: "Mengubah harga, deskripsi, badge, dan toggle status tersedia/habis.",
  },
  {
    key: "menu:delete",
    label: "Hapus Menu",
    category: "Menu & Produk",
    description: "Menghapus menu dari katalog secara permanen.",
  },

  // Pelanggan & Hak Akses
  {
    key: "users:view",
    label: "Lihat Pengguna",
    category: "Pelanggan & Hak Akses",
    description: "Melihat daftar akun pelanggan dan panitia terdaftar.",
  },
  {
    key: "users:manage",
    label: "Kelola Role & Permission",
    category: "Pelanggan & Hak Akses",
    description: "Mengubah role (Superadmin, Admin, Bendahara, Staff) dan permission tiap akun.",
  },

  // Laporan Dana
  {
    key: "reports:view",
    label: "Lihat Laporan Dana",
    category: "Laporan Keuangan",
    description: "Melihat grafik pendanaan olimpiade dan ringkasan omzet penjualan.",
  },
  {
    key: "reports:edit",
    label: "Ubah Target & Donasi",
    category: "Laporan Keuangan",
    description: "Mengedit nominal target kebutuhan olimpiade dan dana terkumpul.",
  },

  // Pengaturan
  {
    key: "settings:edit",
    label: "Kelola Pengaturan",
    category: "Pengaturan Toko",
    description: "Mengatur buka/tutup toko, jam operasional, lokasi booth, dan rekening bank.",
  },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  superadmin: [
    "orders:view",
    "orders:update",
    "orders:delete",
    "menu:view",
    "menu:create",
    "menu:update",
    "menu:delete",
    "users:view",
    "users:manage",
    "reports:view",
    "reports:edit",
    "settings:edit",
  ],
  admin: [
    "orders:view",
    "orders:update",
    "menu:view",
    "menu:create",
    "menu:update",
    "users:view",
    "reports:view",
  ],
  bendahara: [
    "orders:view",
    "orders:update",
    "reports:view",
    "reports:edit",
  ],
  staff: [
    "orders:view",
    "orders:update",
  ],
  user: [],
};

export const ROLE_CONFIG: Record<
  UserRole,
  { label: string; badgeCls: string; description: string }
> = {
  superadmin: {
    label: "Super Admin",
    badgeCls: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300",
    description: "Akses penuh tanpa batas ke seluruh fitur & pengelolaan role panitia",
  },
  admin: {
    label: "Admin Panitia",
    badgeCls: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300",
    description: "Mengelola pesanan, mengedit katalog menu, dan memantau laporan",
  },
  bendahara: {
    label: "Bendahara",
    badgeCls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300",
    description: "Mengelola dana olimpiade, memverifikasi pembayaran pesanan",
  },
  staff: {
    label: "Staff Booth",
    badgeCls: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300",
    description: "Petugas stand booth untuk memeriksa & menyerahkan pesanan",
  },
  user: {
    label: "Pelanggan",
    badgeCls: "bg-surface-container text-on-surface-variant border-outline-variant",
    description: "Pengguna umum untuk pemesanan makanan",
  },
};

/**
 * Check if a user has a specific permission.
 * - Superadmin always has all permissions
 * - Otherwise checks if the permission is in user.permissions array or falls back to role defaults
 */
export function hasPermission(
  user: UserProfile | null | undefined,
  permission: PermissionKey
): boolean {
  if (!user) return false;
  if (user.role === "superadmin") return true;

  // Check explicit permissions array
  if (user.permissions && Array.isArray(user.permissions)) {
    if (user.permissions.includes(permission)) return true;
  }

  // Fallback to role defaults
  const role = (user.role as UserRole) || "user";
  const defaultPerms = ROLE_DEFAULT_PERMISSIONS[role] || [];
  return defaultPerms.includes(permission);
}

/**
 * Check if a user has ANY of the specified permissions
 */
export function hasAnyPermission(
  user: UserProfile | null | undefined,
  permissions: PermissionKey[]
): boolean {
  if (!user) return false;
  if (user.role === "superadmin") return true;
  return permissions.some((perm) => hasPermission(user, perm));
}

/**
 * Check if a role has access to admin area
 */
export function isStaffOrAdmin(role: string | null | undefined): boolean {
  if (!role) return false;
  return ["superadmin", "admin", "bendahara", "staff"].includes(role);
}
