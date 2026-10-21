import { createClient } from "@/lib/supabase/client";
import type {
  MenuItem,
  Order,
  OrderItem,
  DonationProgress,
  UserProfile,
  AppSetting,
  OrderStatus,
  UserRole,
} from "./database.types";

export interface OrderWithItems extends Order {
  order_items?: (OrderItem & { menu_item?: MenuItem | null })[];
}

/**
 * Menerjemahkan pesan error teknis menjadi bahasa Indonesia yang ramah & mudah dimengerti pengguna
 */
export function getFriendlyErrorMessage(err: unknown, defaultMessage = "Terjadi kendala saat memproses data."): string {
  if (!err) return defaultMessage;

  const rawMessage =
    err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : (err as any)?.message || (err as any)?.error_description || (err as any)?.details || "";

  if (/permission denied/i.test(rawMessage)) {
    return "Akses Ditolak: Akun Anda tidak memiliki izin untuk tindakan ini. Hubungi Super Admin.";
  }
  if (/jwt expired|invalid jwt|token expired/i.test(rawMessage)) {
    return "Sesi masuk akun Anda telah berakhir. Silakan muat ulang halaman atau login kembali.";
  }
  if (/violates foreign key/i.test(rawMessage)) {
    return "Data tidak dapat dihapus karena masih terkait dengan data transaksi atau pesanan lainnya.";
  }
  if (/violates check constraint/i.test(rawMessage)) {
    return "Data yang diinput tidak sesuai dengan batasan sistem yang ditentukan.";
  }
  if (/duplicate key|unique constraint/i.test(rawMessage)) {
    return "Data dengan nama atau nomor tersebut sudah terdaftar di sistem.";
  }
  if (/failed to fetch|networkerror/i.test(rawMessage)) {
    return "Koneksi internet bermasalah atau server tidak merespons. Periksa koneksi Anda dan coba lagi.";
  }
  if (/row level security/i.test(rawMessage)) {
    return "Kebijakan keamanan sistem membatasi akses ini untuk akun Anda.";
  }
  if (/bucket not found/i.test(rawMessage)) {
    return "Penyimpanan gambar (bucket storage) tidak ditemukan di server.";
  }

  return rawMessage || defaultMessage;
}

/**
 * Upload image file to Supabase Storage bucket 'menu-images'
 * Returns the public URL of the uploaded image
 */
export async function uploadMenuImage(file: File): Promise<string> {
  // Validasi ukuran & tipe file di client terlebih dahulu
  if (!file.type.startsWith("image/")) {
    throw new Error("Format file harus berupa gambar (JPG, PNG, atau WebP).");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Ukuran foto maksimal 5 MB. Silakan kompres atau pilih foto yang lebih kecil.");
  }

  const supabase = createClient();
  const fileExt = file.name.split(".").pop() || "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `menu/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("menu-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(getFriendlyErrorMessage(uploadError, "Gagal mengunggah foto menu ke server storage."));
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("menu-images").getPublicUrl(filePath);

  return publicUrl;
}

// ─────────────────────────────────────────────────────────────
// Menu Items Management
// ─────────────────────────────────────────────────────────────

export async function fetchMenuItems(): Promise<MenuItem[]> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("menu_items") as any)
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching menu items:", getFriendlyErrorMessage(error));
    return [];
  }
  return data || [];
}

export async function createMenuItem(
  item: Omit<MenuItem, "id" | "created_at" | "updated_at" | "pickup_time"> & {
    pickup_time?: string | null;
  }
): Promise<MenuItem | null> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("menu_items") as any)
    .insert(item)
    .select()
    .single();

  if (error) {
    throw new Error(getFriendlyErrorMessage(error, "Gagal menambahkan menu baru."));
  }
  return data;
}

export async function updateMenuItem(
  id: string,
  updates: Partial<MenuItem>
): Promise<MenuItem | null> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("menu_items") as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(getFriendlyErrorMessage(error, "Gagal memperbarui informasi menu."));
  }
  return data;
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await (supabase.from("menu_items") as any).delete().eq("id", id);
  if (error) {
    throw new Error(getFriendlyErrorMessage(error, "Gagal menghapus menu. Menu ini mungkin terhubung dengan pesanan yang ada."));
  }
  return true;
}

export async function toggleMenuItemAvailability(
  id: string,
  isAvailable: boolean
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await (supabase.from("menu_items") as any)
    .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(getFriendlyErrorMessage(error, "Gagal mengubah status ketersediaan menu."));
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// Orders Management
// ─────────────────────────────────────────────────────────────

export async function fetchAdminOrders(filter?: {
  status?: string;
  search?: string;
}): Promise<OrderWithItems[]> {
  const supabase = createClient();
  let query = (supabase.from("orders") as any)
    .select(
      `
      *,
      order_items (
        id,
        order_id,
        menu_item_id,
        quantity,
        unit_price,
        subtotal,
        menu_item:menu_items (
          id,
          name,
          image_url,
          category,
          price
        )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (filter?.status && filter.status !== ("semua" as any)) {
    const st = String(filter.status);
    if (st === "menunggu_pembayaran" || st === "pending") {
      query = query.in("status", ["menunggu_pembayaran", "pending"]);
    } else if (st === "dikerjakan" || st === "confirmed") {
      query = query.in("status", ["dikerjakan", "confirmed"]);
    } else if (st === "menunggu_selesai") {
      query = query.in("status", ["menunggu_selesai"]);
    } else if (st === "selesai" || st === "completed") {
      query = query.in("status", ["selesai", "completed"]);
    } else {
      query = query.eq("status", st);
    }
  }

  if (filter?.search) {
    const s = filter.search.trim();
    query = query.or(
      `order_number.ilike.%${s}%,customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching admin orders:", getFriendlyErrorMessage(error));
    return [];
  }
  return (data as OrderWithItems[]) || [];
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await (supabase.from("orders") as any)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) {
    throw new Error(getFriendlyErrorMessage(error, "Gagal memperbarui status pesanan."));
  }
  return true;
}

export async function deleteOrder(orderId: string): Promise<boolean> {
  const supabase = createClient();
  await (supabase.from("order_items") as any).delete().eq("order_id", orderId);
  const { error } = await (supabase.from("orders") as any).delete().eq("id", orderId);

  if (error) {
    throw new Error(getFriendlyErrorMessage(error, "Gagal menghapus data pesanan."));
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// User Profiles & Role Management
// ─────────────────────────────────────────────────────────────

export async function fetchUserProfiles(): Promise<UserProfile[]> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("user_profiles") as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user profiles:", getFriendlyErrorMessage(error));
    return [];
  }
  return data || [];
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await (supabase.from("user_profiles") as any)
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function updateUserRoleAndPermissions(
  userId: string,
  role: UserRole,
  permissions: string[]
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await (supabase.from("user_profiles") as any)
    .update({
      role,
      permissions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(getFriendlyErrorMessage(error, "Gagal memperbarui role dan izin hak akses pengguna."));
  }
  return true;
}

export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await (supabase.from("user_profiles") as any)
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    throw new Error(getFriendlyErrorMessage(error, "Gagal mengubah role pengguna."));
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// Donation Progress Management
// ─────────────────────────────────────────────────────────────

export async function fetchDonationProgress(): Promise<DonationProgress[]> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("donation_progress") as any)
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching donation progress:", getFriendlyErrorMessage(error));
    return [];
  }
  return data || [];
}

export async function updateDonationItem(
  id: string,
  updates: Partial<DonationProgress>
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await (supabase.from("donation_progress") as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(getFriendlyErrorMessage(error, "Gagal memperbarui target capaian donasi."));
  }
  return true;
}

export async function createDonationItem(
  item: Omit<DonationProgress, "id" | "created_at" | "updated_at">
): Promise<DonationProgress> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("donation_progress") as any)
    .insert([item])
    .select()
    .single();

  if (error) {
    throw new Error(getFriendlyErrorMessage(error, "Gagal menambahkan target pos donasi baru."));
  }
  return data as DonationProgress;
}

export async function deleteDonationItem(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await (supabase.from("donation_progress") as any)
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(getFriendlyErrorMessage(error, "Gagal menghapus pos donasi."));
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// App Settings
// ─────────────────────────────────────────────────────────────

export async function fetchAppSettings(): Promise<AppSetting[]> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("app_settings") as any)
    .select("*");

  if (error) {
    console.error("Error fetching app settings:", getFriendlyErrorMessage(error));
    return [];
  }
  return data || [];
}

export async function updateAppSetting(
  key: string,
  value: string
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await (supabase.from("app_settings") as any)
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) {
    throw new Error(getFriendlyErrorMessage(error, "Gagal memperbarui pengaturan aplikasi."));
  }
  return true;
}
