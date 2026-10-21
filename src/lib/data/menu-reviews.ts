export interface ReviewComment {
  id: string;
  review_id: string;
  user_id?: string | null;
  user_name: string;
  user_role?: string;
  is_admin?: boolean;
  comment: string;
  created_at: string;
}

export interface MenuReview {
  id: string;
  menu_id: string;
  reviewer_name: string;
  reviewer_role?: string;
  rating: number;
  created_at: string;
  comment: string;
  is_verified_buyer: boolean;
  helpful_count: number;
  tags?: string[];
  comments_count?: number;
}

// Preset verified reviews for menu items
export const INITIAL_REVIEWS: Record<string, MenuReview[]> = {
  // Nasi Ayam Sambal Matah
  "bd51780d-234c-4c7a-95e6-05fb327707db": [
    {
      id: "rev-1",
      menu_id: "bd51780d-234c-4c7a-95e6-05fb327707db",
      reviewer_name: "Dinda Pratiwi",
      reviewer_role: "Mahasiswi Pendidikan Matematika 2023",
      rating: 5,
      created_at: "2 hari lalu",
      comment:
        "Ayamnya krispi di luar dan juicy di dalem! Sambal matahnya beneran wangi serai dan jeruk limau asli, gak pelit porsi. Sangat mengenyangkan buat makan siang sebelum masuk lab.",
      is_verified_buyer: true,
      helpful_count: 14,
      tags: ["Porsi Banyak", "Ayam Crispy", "Sambal Segar", "Recommended"],
    },
    {
      id: "rev-2",
      menu_id: "bd51780d-234c-4c7a-95e6-05fb327707db",
      reviewer_name: "Rizky Ramadhan",
      reviewer_role: "Mahasiswa FMIPA UNRI",
      rating: 5,
      created_at: "3 hari lalu",
      comment:
        "Pengambilan di booth Kampus FKIP UNRI cepet dan rapi banget. Kemasan boxnya bersih dan higienis. Rasanya bintang 5, sekaligus seneng bisa support dana Olimpiade 27!",
      is_verified_buyer: true,
      helpful_count: 9,
      tags: ["Kemasan Rapi", "Pelayanan Cepat"],
    },
    {
      id: "rev-3",
      menu_id: "bd51780d-234c-4c7a-95e6-05fb327707db",
      reviewer_name: "Fauzan Akbar",
      reviewer_role: "Alumni FKIP",
      rating: 4,
      created_at: "5 hari lalu",
      comment:
        "Pedesnya pas buat yang suka pedas sedang. Nasi pandannya harum banget. Next time kalau bisa sambalnya ditambah sedikit lagi ya panitia!",
      is_verified_buyer: true,
      helpful_count: 6,
      tags: ["Nasi Harum", "Pedes Pas"],
    },
  ],

  // Signature Matcha Boba Latte
  "8e11dd05-316d-489c-91b4-9990a8d564ba": [
    {
      id: "rev-4",
      menu_id: "8e11dd05-316d-489c-91b4-9990a8d564ba",
      reviewer_name: "Annisa Larasati",
      reviewer_role: "Mahasiswi FKIP",
      rating: 5,
      created_at: "1 hari lalu",
      comment:
        "Matcha aslinya berasa banget, bukan perasa bubuk murahan! Bobanya kenyal lembut, manis arennya pas gak bikin enek. Penyelamat pas cuaca siang lagi terik di kampus.",
      is_verified_buyer: true,
      helpful_count: 18,
      tags: ["Matcha Asli", "Boba Lembut", "Segar"],
    },
    {
      id: "rev-5",
      menu_id: "8e11dd05-316d-489c-91b4-9990a8d564ba",
      reviewer_name: "Kevin Sanjaya",
      reviewer_role: "Peserta Olimpiade",
      rating: 5,
      created_at: "4 hari lalu",
      comment:
        "Kemasan cup-nya tebal dan rapi, gak bocor pas dibawa jalan. Worth it banget harganya dibanding cafe luar.",
      is_verified_buyer: true,
      helpful_count: 8,
      tags: ["Cup Tebal", "Best Value"],
    },
  ],

  // Roti Bakar Cokelat Keju
  "a859cb47-d912-4f57-916c-4a630edf6c53": [
    {
      id: "rev-6",
      menu_id: "a859cb47-d912-4f57-916c-4a630edf6c53",
      reviewer_name: "Putri Anggraini",
      reviewer_role: "Mahasiswi FKIP",
      rating: 5,
      created_at: "2 hari lalu",
      comment:
        "Keju dan cokelatnya melimpah tumpah-tumpah! Rotinya tebel dan wangi butter. Cocok banget buat ganjel perut bareng temen-temen pas rapat kepanitiaan.",
      is_verified_buyer: true,
      helpful_count: 11,
      tags: ["Topping Melimpah", "Wangi Butter"],
    },
  ],
};

const DEFAULT_GENERIC_REVIEWS: MenuReview[] = [
  {
    id: "rev-gen-1",
    menu_id: "default",
    reviewer_name: "Nadia Safitri",
    reviewer_role: "Mahasiswi FKIP UNRI",
    rating: 5,
    created_at: "2 hari lalu",
    comment:
      "Porsinya pas, rasa bumbunya meresap dan sangat lezat! Pengambilan di Kampus FKIP UNRI sangat praktis dan lancar. Sangat memuaskan!",
    is_verified_buyer: true,
    helpful_count: 12,
    tags: ["Enak Banget", "Porsi Pas", "Recommended"],
  },
  {
    id: "rev-gen-2",
    menu_id: "default",
    reviewer_name: "Bima Arya",
    reviewer_role: "Pengunjung Kampus",
    rating: 5,
    created_at: "4 hari lalu",
    comment:
      "Kualitas makanan terjamin bersih dan higienis. Senang bisa ikut berkontribusi untuk pendanaan acara adik-adik Olimpiade 27.",
    is_verified_buyer: true,
    helpful_count: 7,
    tags: ["Higienis", "Dukung Olimpiade 27"],
  },
  {
    id: "rev-gen-3",
    menu_id: "default",
    reviewer_name: "Tari Wulandari",
    reviewer_role: "Mahasiswi Matematika",
    rating: 4,
    created_at: "5 hari lalu",
    comment:
      "Rasanya mantap dan packaging rapi! Pasti bakal reorder lagi untuk batch berikutnya.",
    is_verified_buyer: true,
    helpful_count: 5,
    tags: ["Kemasan Rapi", "Rasa Mantap"],
  },
];

import { createClient } from "@/lib/supabase/client";

/**
 * Mengambil ulasan menu secara realtime dari tabel public.menu_reviews di Supabase
 */
export async function fetchMenuReviewsFromSupabase(menuId: string): Promise<MenuReview[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("menu_reviews")
      .select("*")
      .eq("menu_id", menuId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        menu_id: d.menu_id,
        reviewer_name: d.reviewer_name,
        reviewer_role: d.reviewer_role || "Pembeli Terverifikasi",
        rating: d.rating,
        created_at: new Date(d.created_at).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        comment: d.comment,
        is_verified_buyer: d.is_verified_buyer ?? true,
        helpful_count: d.helpful_count ?? 0,
        tags: d.tags || ["Ulasan Terverifikasi"],
      }));
    }
  } catch (err) {
    console.warn("Gagal memuat ulasan dari Supabase, menggunakan data lokal:", err);
  }

  // Fallback to local
  return getMenuReviews(menuId);
}

/**
 * Menambahkan ulasan baru langsung ke Supabase dan localStorage
 */
export async function createMenuReviewInSupabase(
  menuId: string,
  newReview: {
    reviewer_name: string;
    reviewer_role?: string;
    rating: number;
    comment: string;
    tags?: string[];
    user_id?: string;
  }
): Promise<MenuReview> {
  const localItem = addMenuReview(menuId, newReview);

  try {
    const supabase = createClient();
    const { data, error } = await (supabase.from("menu_reviews" as any) as any)
      .insert({
        menu_id: menuId,
        user_id: newReview.user_id || null,
        reviewer_name: newReview.reviewer_name.trim() || "Pelanggan MathBites",
        reviewer_role: newReview.reviewer_role?.trim() || "Pembeli Terverifikasi",
        rating: Math.min(5, Math.max(1, newReview.rating)),
        comment: newReview.comment.trim(),
        tags: newReview.tags && newReview.tags.length > 0 ? newReview.tags : ["Ulasan Pelanggan"],
        is_verified_buyer: true,
        helpful_count: 0,
      })
      .select()
      .single();

    if (!error && data) {
      return {
        id: (data as any).id,
        menu_id: (data as any).menu_id,
        reviewer_name: (data as any).reviewer_name,
        reviewer_role: (data as any).reviewer_role,
        rating: (data as any).rating,
        created_at: "Baru saja",
        comment: (data as any).comment,
        is_verified_buyer: (data as any).is_verified_buyer,
        helpful_count: (data as any).helpful_count,
        tags: (data as any).tags,
      };
    }
  } catch (err) {
    console.warn("Gagal mengirim ulasan ke Supabase:", err);
  }

  return localItem;
}

/**
 * Mengambil ulasan menu dari preset dan localStorage
 */
export function getMenuReviews(menuId: string): MenuReview[] {
  if (typeof window === "undefined") {
    return INITIAL_REVIEWS[menuId] || DEFAULT_GENERIC_REVIEWS;
  }

  const baseReviews = INITIAL_REVIEWS[menuId] || DEFAULT_GENERIC_REVIEWS;

  try {
    const stored = localStorage.getItem(`mathbites_reviews_${menuId}`);
    if (stored) {
      const parsed = JSON.parse(stored) as MenuReview[];
      return [...parsed, ...baseReviews];
    }
  } catch (err) {
    console.error("Gagal membaca ulasan lokal:", err);
  }

  return baseReviews;
}

/**
 * Menyimpan ulasan baru dari pembeli ke localStorage
 */
export function addMenuReview(
  menuId: string,
  newReview: {
    reviewer_name: string;
    reviewer_role?: string;
    rating: number;
    comment: string;
    tags?: string[];
  }
): MenuReview {
  const item: MenuReview = {
    id: `user-rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    menu_id: menuId,
    reviewer_name: newReview.reviewer_name.trim() || "Pelanggan MathBites",
    reviewer_role: newReview.reviewer_role?.trim() || "Pembeli Terverifikasi",
    rating: Math.min(5, Math.max(1, newReview.rating)),
    created_at: "Baru saja",
    comment: newReview.comment.trim(),
    is_verified_buyer: true,
    helpful_count: 1,
    tags: newReview.tags || ["Ulasan Baru"],
  };

  if (typeof window !== "undefined") {
    try {
      const current = localStorage.getItem(`mathbites_reviews_${menuId}`);
      const list: MenuReview[] = current ? JSON.parse(current) : [];
      list.unshift(item);
      localStorage.setItem(`mathbites_reviews_${menuId}`, JSON.stringify(list));
    } catch (err) {
      console.error("Gagal menyimpan ulasan lokal:", err);
    }
  }

  return item;
}

/**
 * Menghitung ringkasan skor rating, jumlah ulasan, dan breakdown persentase bintang
 */
export function getRatingSummary(reviews: MenuReview[]) {
  if (!reviews || reviews.length === 0) {
    return {
      average: 5.0,
      totalCount: 0,
      breakdown: { 5: 100, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }

  const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;

  reviews.forEach((r) => {
    const star = Math.round(r.rating);
    if (counts[star] !== undefined) {
      counts[star]++;
    }
    sum += r.rating;
  });

  const average = Number((sum / reviews.length).toFixed(1));
  const totalCount = reviews.length;

  const breakdown: Record<number, number> = {
    5: Math.round((counts[5] / totalCount) * 100),
    4: Math.round((counts[4] / totalCount) * 100),
    3: Math.round((counts[3] / totalCount) * 100),
    2: Math.round((counts[2] / totalCount) * 100),
    1: Math.round((counts[1] / totalCount) * 100),
  };

  return { average, totalCount, breakdown };
}

/**
 * Mengambil daftar komentar/tanggapan untuk ulasan tertentu dari Supabase & fallback
 */
export async function fetchReviewComments(reviewId: string): Promise<ReviewComment[]> {
  try {
    const supabase = createClient();
    const { data, error } = await (supabase.from("review_comments" as any) as any)
      .select("*")
      .eq("review_id", reviewId)
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        review_id: d.review_id,
        user_id: d.user_id,
        user_name: d.user_name,
        user_role: d.user_role,
        is_admin: Boolean(d.is_admin),
        comment: d.comment,
        created_at: d.created_at
          ? new Date(d.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Baru saja",
      }));
    }
  } catch (err) {
    console.warn("Gagal mengambil komentar ulasan dari Supabase:", err);
  }

  // Fallback localStorage
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`mathbites_comments_${reviewId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
  }

  return [];
}

/**
 * Menyimpan komentar/tanggapan baru pada ulasan ke Supabase & local storage
 */
export async function addReviewComment(
  reviewId: string,
  newComment: {
    user_id?: string;
    user_name: string;
    user_role?: string;
    is_admin?: boolean;
    comment: string;
  }
): Promise<ReviewComment> {
  const localItem: ReviewComment = {
    id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    review_id: reviewId,
    user_id: newComment.user_id || null,
    user_name: newComment.user_name.trim() || "Pengguna",
    user_role: newComment.user_role || "Pelanggan",
    is_admin: Boolean(newComment.is_admin),
    comment: newComment.comment.trim(),
    created_at: "Baru saja",
  };

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`mathbites_comments_${reviewId}`);
      const list = stored ? JSON.parse(stored) : [];
      list.push(localItem);
      localStorage.setItem(`mathbites_comments_${reviewId}`, JSON.stringify(list));
    } catch {}
  }

  try {
    const supabase = createClient();
    const { data, error } = await (supabase.from("review_comments" as any) as any)
      .insert({
        review_id: reviewId,
        user_id: newComment.user_id || null,
        user_name: newComment.user_name.trim() || "Pengguna",
        user_role: newComment.user_role || "Pelanggan",
        is_admin: Boolean(newComment.is_admin),
        comment: newComment.comment.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      return {
        id: data.id,
        review_id: data.review_id,
        user_id: data.user_id,
        user_name: data.user_name,
        user_role: data.user_role,
        is_admin: Boolean(data.is_admin),
        comment: data.comment,
        created_at: "Baru saja",
      };
    }
  } catch (err) {
    console.warn("Gagal menyimpan komentar ke Supabase:", err);
  }

  return localItem;
}
