import type { MenuItem, MenuCategory } from "../supabase/database.types";

/**
 * Static fallback data used when Supabase is not configured or unreachable.
 * This keeps the site functional during development without a database.
 */
export const fallbackMenuItems: MenuItem[] = [
  {
    id: "bd51780d-234c-4c7a-95e6-05fb327707db",
    name: "Nasi Ayam Sambal Matah",
    description:
      "Nasi pandan wangi dengan ayam goreng krispi, tempe renyah, dan sambal matah serai segar khas Bali.",
    price: 28000,
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAnrQTlPibyAAylozdPhgMiMZ8ZC2wWwsQqpB-FmFNzPGH1ouuxSP-jPy7egZQMk-zXn_QBYX1kWhTYt5G8w0VDLqDLQwxflSNcz8EhOkXDBWvaHisQU0SCh_DrS81EvB12KCloUFb_3SGfLnp9qxh2GIIkhUyJjPMp05h2NqJyHiJF6VLfTTRHfToBTJCLxoz0Igksy_Zw3QmNJodqVVXjzX-N4qr-7iwtneOPmglifdKod-NUQaDx",
    category: "makanan",
    badge: "Terlaris",
    badge_style: "bg-secondary-container text-on-secondary-container",
    is_featured: true,
    is_available: true,
    wave: 2,
    pickup_time: "12:00 WIB",
    sold_count: 87,
    sort_order: 1,
    created_at: "",
    updated_at: "",
  },
  {
    id: "8e11dd05-316d-489c-91b4-9990a8d564ba",
    name: "Signature Matcha Boba Latte",
    description:
      "Matcha ceremonial grade Uji, susu oat lembut, dan boba gula aren kenyal buatan tangan.",
    price: 22000,
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCNiSMdriUwBSCB7EbHhbls7zVH5hTr3srlwdU-LeFsRLwdYR0hhQhs0JEiDTB-S0yOIRxOzFGxrQHZMhRfHQISu3OfJHrqGKwFVZPH-y7ow5geil0dx8U_b9osLYGdEY7ST8sk0g0Mbgj3-VfJIR2w6h4JWqGWNoORPq8LZfEfRNHRR5DDTlR7KF-cbiuNizsxb5Oe4O8TuEDMWZnoZYDGtFyT_ybVaA-8MB962GaTycp4-cZBnGuz",
    category: "minuman",
    badge: "Favorit Mahasiswa",
    badge_style: "bg-tertiary text-on-tertiary",
    is_featured: true,
    is_available: true,
    wave: 2,
    pickup_time: "11:30 WIB",
    sold_count: 74,
    sort_order: 2,
    created_at: "",
    updated_at: "",
  },
  {
    id: "a859cb47-d912-4f57-916c-4a630edf6c53",
    name: "Roti Bakar Cokelat Keju",
    description:
      "Brioche tebal dipanggang butter harum, dark chocolate Belgia lumer, dan keju cheddar melimpah.",
    price: 20000,
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDCUQ0U8RBYUx1wbH_5PXW18gruru7ZExcP69Gl-JBO6pLVMOOQTlevWFvU6cyt2sl0ohn7Ad_Eg-CC7kUjUszaCuLlhrMwEhR8G22-LB71BbozX_dYhEZaRgDhsjnb43vSchNYJVha2DkBkHEvSnHpcvfbnhaoKHnkjoz5LjsL6hpd1wy6100Uwun-71P4mhuQwvW3sOVPTcDmWTEcLaXWfuzTE6mH5X6ZtPhBS90nBMJBWGw7vpd7",
    category: "camilan",
    badge: "Camilan Populer",
    badge_style: "bg-primary-fixed text-on-primary-fixed-variant",
    is_featured: true,
    is_available: true,
    wave: 2,
    pickup_time: "11:30 WIB",
    sold_count: 68,
    sort_order: 3,
    created_at: "",
    updated_at: "",
  },
  {
    id: "4f4c3ad0-fbbc-47b0-a241-b60d6055622b",
    name: "Mie Goreng Spesial Olympiad",
    description:
      "Mie telur tumis bumbu rahasia, katsu ayam renyah, dan telur mata sapi setengah matang.",
    price: 24000,
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAsaiDiXR3PgttOaNVk4H9U4sqA-1KndlWlvf20-SImo6BwM_Yb3qYpMKegZXMYkUC99YOmLXzS2ZTTFsb_jSnFzWMXYOwPmU0iwrFH-in5QFpOO9zmtprd7aDK1ILOnQDJYx17NfB4sxRshGxCW6uNrDTFFYh-wTU2oKtZuAiYyLf2HHOJc2nMCoh5DqVpB7NDcr1JMQ1c3B3K2m34jGoExND-MtNHgBBpMQT-RtD_vZcjt4V4NZiE",
    category: "makanan",
    badge: null,
    badge_style: null,
    is_featured: false,
    is_available: true,
    wave: 2,
    pickup_time: "12:00 WIB",
    sold_count: 55,
    sort_order: 4,
    created_at: "",
    updated_at: "",
  },
  {
    id: "43e3433b-8816-424f-98c6-d4d9b751289a",
    name: "Japanese Beef Bento Bowl",
    description:
      "Sapi yakiniku tipis, nasi pulen hangat, brokoli kukus, dan tamagoyaki manis.",
    price: 32000,
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC9vHHBAaAE_iSiB0Rt8D3CveZFudd086inwjv2w1wO17FQSQXqKqVTw6_Sieho4JFb7Y7g9UqyisiFR-tlanZri8K7rCCtS1bTN5U6SKs8esVun0tnVfZrNa7KeFAJjMvuWj0wP9MoC7xbnXwHrqDIaHVEM7OIc3jZIiQ3kyCE8raFmcNy-vsTFhpOgC_6iFPTAedmLSO6YcAfjAdeY1ah5DSoDEJuGaKutsc81P_VLs8UqF5Wuqym",
    category: "makanan",
    badge: null,
    badge_style: null,
    is_featured: false,
    is_available: true,
    wave: 2,
    pickup_time: "12:00 WIB",
    sold_count: 49,
    sort_order: 5,
    created_at: "",
    updated_at: "",
  },
  {
    id: "60c8633d-40ce-4b32-894c-a6f6a660f618",
    name: "Thai Milk Tea + Cincau",
    description:
      "Teh Thailand otentik, susu kental manis, dan cincau hitam kenyal menyegarkan.",
    price: 18000,
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCTxbWPRe_azuNcI35MmK_P3a8ng62K7GY5Yj0szT0dbCQ4rBroxFHHtay6mNJDqsDpemYThcLyPfV7jgeNO39elEjrodCQgMX4rAgSQHHzgm2MvT7PkiAFqqzTZ3Nj149Nwfe6z6TkDLwgG3PWyOeo6iq0PgAg-LxKfLVnelkuWrjigKzpDzEsupIMDgR1f83E8PjE51uA686RH5m1Ajejn_yhH8PhyNwx9yaxzfkFmY7d0e3RkmjL",
    category: "minuman",
    badge: null,
    badge_style: null,
    is_featured: false,
    is_available: true,
    wave: 2,
    pickup_time: "11:30 WIB",
    sold_count: 45,
    sort_order: 6,
    created_at: "",
    updated_at: "",
  },
  {
    id: "b948bf38-a564-43b8-acb1-1712cae04af9",
    name: "Classic Cinnamon Roll",
    description:
      "Baru keluar oven — roti kayu manis hangat dengan cream cheese vanilla lumer.",
    price: 18000,
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAJ-mTctYannqjQqEUEKR0_S8k-kGiTBu9NUurHRDqa4sKfGNs5pucffvU5zXAvn7CzOCa7AxN5zgOpSI1MkjiDgT_GvZ-FRiiYgNX_sLHdne8AIEsXUuqVnI-UJ4Rvd6c1EzpKrBU7k97v_8BNU250JPDHnn256jEAw4pd7vvYzUt_14nMbYy7LgjYiPdfEfYt0z7PDrJJxB8IxPDQKzDqHjJcL_VO8N1UmQBfcPWJiqPpGGs_5UI_",
    category: "camilan",
    badge: null,
    badge_style: null,
    is_featured: false,
    is_available: true,
    wave: 2,
    pickup_time: "11:30 WIB",
    sold_count: 42,
    sort_order: 7,
    created_at: "",
    updated_at: "",
  },
  {
    id: "f570cdb5-c393-40c7-878c-a109f0ec7fb0",
    name: "Brownies Fudgy Almond",
    description:
      "Dark chocolate Belgia lumer dengan topping almond panggang renyah.",
    price: 16000,
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDYA-xdyICjL5zmzZdTT3kQ2-gcmiXDtRB46vv3mqaJTlcc9FFBb4oSG8hOX6K6qJCkqMsZkVTbqFHQvrUDGnTDKtTd0SMfmr4WDc1tLBlxMQBkQ-yAgZkUF1jekX8nA3ASVuitRUrbQTb6G1yKaKMf5qyJK3i4o2RKfW61I9l5LcgBUUjpyeIlx8K07lDsrY2RV8NsSj4hxOB8sHhIGRZjDBRNwsY5S9Vga6umq3NpU-VjbhPXlK_Q",
    category: "camilan",
    badge: null,
    badge_style: null,
    is_featured: false,
    is_available: true,
    wave: 2,
    pickup_time: "11:30 WIB",
    sold_count: 38,
    sort_order: 8,
    created_at: "",
    updated_at: "",
  },
  {
    id: "4cb62397-1d7c-41db-a96e-28c5d3ada169",
    name: "Crispy Pisang Coklat",
    description:
      "Pisang manis berbalut kulit renyah dengan cokelat ganache lumer di setiap gigitan.",
    price: 15000,
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBxG3wm_MMClRgq-xLicjop7iZhKTQgga6LRcUQt1mibXHeO12SraZgUl-dgtlaJiC9BP-N9rTyJLOFtC5RUVLXYaXAdSA2pW7Co1_JskHEw3rPgA82cJLiSnkP2gVb5FDl0_aFuMdT9NZwZCQwqjR-Y8KMsMMicgf3uu2iJG_w8CJY2-7u0ivvvQ2LYFUrBOgdz8kMDUpXaUPImrlrzWQ7o-Sox7k5katHU_X0YZOv6lPWS6tqGDB9",
    category: "camilan",
    badge: null,
    badge_style: null,
    is_featured: false,
    is_available: true,
    wave: 2,
    pickup_time: "12:00 WIB",
    sold_count: 35,
    sort_order: 9,
    created_at: "",
    updated_at: "",
  },
];

/**
 * Format price as Indonesian Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get category counts from a list of items
 */
export function getCategoryCounts(items: MenuItem[]) {
  const counts: Record<string, number> = { semua: items.length };
  for (const item of items) {
    counts[item.category] = (counts[item.category] ?? 0) + 1;
  }
  return counts;
}
