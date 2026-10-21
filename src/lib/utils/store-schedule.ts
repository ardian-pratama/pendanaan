export interface StoreSettingsMap {
  is_ordering_open?: string;
  auto_schedule_enabled?: string;
  operating_days?: string;
  open_time?: string;
  close_time?: string;
  order_deadline_date?: string;
  order_deadline_time?: string;
  pickup_date?: string;
  pickup_hours?: string;
  pickup_location?: string;
  closed_reason_message?: string;
  announcement_banner_enabled?: string;
  announcement_banner_text?: string;
  contact_whatsapp?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  qris_image_url?: string;
  payment_qris_enabled?: string;
  payment_transfer_enabled?: string;
  payment_cash_enabled?: string;
  min_order_amount?: string;
  receipt_footer_note?: string;
  [key: string]: string | undefined;
}

export const DEFAULT_STORE_SETTINGS: StoreSettingsMap = {
  is_ordering_open: "true",
  auto_schedule_enabled: "false",
  operating_days: "Senin - Sabtu",
  open_time: "08:00",
  close_time: "20:00",
  order_deadline_date: "2026-10-23",
  order_deadline_time: "23:59",
  pickup_date: "2026-10-24",
  pickup_hours: "11:30 - 14:00 WIB",
  pickup_location: "Kampus Pendidikan Matematika FKIP UNRI",
  closed_reason_message: "Pemesanan sedang ditutup sementara oleh panitia Olimpiade 27.",
  announcement_banner_enabled: "false",
  announcement_banner_text: "",
  contact_whatsapp: "6281234567890",
  bank_name: "BCA",
  bank_account_number: "1234567890",
  bank_account_holder: "Panitia Olimpiade Matematika 27",
  qris_image_url: "https://zmvgdprqssedrqkzwhdj.supabase.co/storage/v1/object/public/menu-images/menu/1792493011142-visd7u0.jpeg",
  payment_qris_enabled: "true",
  payment_transfer_enabled: "true",
  payment_cash_enabled: "true",
  min_order_amount: "0",
  receipt_footer_note: "Terima kasih telah berpartisipasi menyukseskan Olimpiade Matematika Ke-27.",
};

export interface StoreStatusResult {
  isOpen: boolean;
  statusText: string;
  badgeLabel: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  reason: string;
  scheduleSummary: string;
}

/**
 * Memeriksa status buka / tutup toko berdasarkan pengaturan manual dan jadwal otomatis
 */
export function evaluateStoreStatus(settings: StoreSettingsMap): StoreStatusResult {
  const merged = { ...DEFAULT_STORE_SETTINGS, ...settings };

  const isManualOpen = merged.is_ordering_open !== "false";
  const autoSchedule = merged.auto_schedule_enabled === "true";
  const defaultReason = merged.closed_reason_message || "Pemesanan sedang ditutup oleh panitia.";

  // 1. Jika dimatikan secara manual
  if (!isManualOpen) {
    return {
      isOpen: false,
      statusText: "Toko Tutup (Manual)",
      badgeLabel: "Toko Tutup",
      badgeVariant: "destructive",
      reason: defaultReason,
      scheduleSummary: `Pemesanan dinonaktifkan sementara oleh panitia.`,
    };
  }

  // 2. Jika jadwal otomatis aktif, periksa batas waktu pre-order & jam buka/tutup
  if (autoSchedule) {
    const now = new Date();

    // Periksa batas akhir pemesanan (deadline)
    if (merged.order_deadline_date && merged.order_deadline_time) {
      const deadline = new Date(`${merged.order_deadline_date}T${merged.order_deadline_time}:00`);
      if (!isNaN(deadline.getTime()) && now > deadline) {
        return {
          isOpen: false,
          statusText: "Batas Pemesanan Berakhir",
          badgeLabel: "Pemesanan Ditutup",
          badgeVariant: "destructive",
          reason: `Batas akhir pemesanan telah berakhir pada ${merged.order_deadline_date} pukul ${merged.order_deadline_time} WIB.`,
          scheduleSummary: `Batas akhir: ${merged.order_deadline_date} ${merged.order_deadline_time} WIB`,
        };
      }
    }

    // Periksa jam operasional harian (open_time - close_time)
    if (merged.open_time && merged.close_time) {
      const [openHour, openMin] = merged.open_time.split(":").map(Number);
      const [closeHour, closeMin] = merged.close_time.split(":").map(Number);

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const openMinutes = openHour * 60 + (openMin || 0);
      const closeMinutes = closeHour * 60 + (closeMin || 0);

      if (currentMinutes < openMinutes || currentMinutes >= closeMinutes) {
        return {
          isOpen: false,
          statusText: "Di Luar Jam Operasional",
          badgeLabel: "Tutup (Jadwal)",
          badgeVariant: "secondary",
          reason: `Toko buka setiap ${merged.operating_days || "hari"} pukul ${merged.open_time} – ${merged.close_time} WIB.`,
          scheduleSummary: `Jam Buka: ${merged.open_time} – ${merged.close_time} WIB`,
        };
      }
    }
  }

  // 3. Toko Buka
  return {
    isOpen: true,
    statusText: "Toko Buka",
    badgeLabel: "Buka Sekarang",
    badgeVariant: "default",
    reason: "",
    scheduleSummary: autoSchedule
      ? `Buka: ${merged.open_time || "08:00"} – ${merged.close_time || "20:00"} WIB`
      : "Pemesanan dibuka penuh oleh panitia",
  };
}
