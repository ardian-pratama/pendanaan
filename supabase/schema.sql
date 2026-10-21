-- =====================================================
-- MathBites Supabase Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Menu Items
CREATE TABLE IF NOT EXISTS public.menu_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price       INTEGER NOT NULL,                        -- harga dalam rupiah
  image_url   TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL CHECK (category IN ('makanan','minuman','camilan')),
  badge       TEXT,                                     -- e.g. "Terlaris"
  badge_style TEXT,                                     -- Tailwind classes
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  wave        INTEGER NOT NULL DEFAULT 2,               -- gelombang pre-order
  pickup_time TEXT,                                     -- e.g. "12:00 WIB"
  sold_count  INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    TEXT NOT NULL UNIQUE DEFAULT ('MB-' || LPAD(nextval('order_seq')::TEXT, 4, '0')),
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL,
  customer_email  TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  total_amount    INTEGER NOT NULL DEFAULT 0,
  pickup_time     TEXT NOT NULL,
  payment_method  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_seq START 200;

-- 3. Order Items (junction)
CREATE TABLE IF NOT EXISTS public.order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id  UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  quantity      INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price    INTEGER NOT NULL,
  subtotal      INTEGER GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Donation Progress
CREATE TABLE IF NOT EXISTS public.donation_progress (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label            TEXT NOT NULL,
  target_amount    INTEGER NOT NULL,
  collected_amount INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_menu_items_category    ON public.menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_featured    ON public.menu_items(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_menu_items_available   ON public.menu_items(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_orders_status          ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created         ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order      ON public.order_items(order_id);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE public.menu_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_progress ENABLE ROW LEVEL SECURITY;

-- Public read for menu_items & donation_progress
CREATE POLICY "Menu items are viewable by everyone"
  ON public.menu_items FOR SELECT
  USING (true);

CREATE POLICY "Donation progress is viewable by everyone"
  ON public.donation_progress FOR SELECT
  USING (true);

-- Orders: anyone can insert, only own or admin can read
CREATE POLICY "Anyone can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Orders are viewable by everyone"
  ON public.orders FOR SELECT
  USING (true);

CREATE POLICY "Order items are insertable"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Order items are viewable by everyone"
  ON public.order_items FOR SELECT
  USING (true);

-- =====================================================
-- Seed Data — Menu Items
-- =====================================================
INSERT INTO public.menu_items (name, description, price, image_url, category, badge, badge_style, is_featured, pickup_time, sold_count, sort_order) VALUES
  ('Nasi Ayam Sambal Matah', 'Nasi pandan wangi dengan ayam goreng krispi, tempe renyah, dan sambal matah serai segar khas Bali.', 28000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuAnrQTlPibyAAylozdPhgMiMZ8ZC2wWwsQqpB-FmFNzPGH1ouuxSP-jPy7egZQMk-zXn_QBYX1kWhTYt5G8w0VDLqDLQwxflSNcz8EhOkXDBWvaHisQU0SCh_DrS81EvB12KCloUFb_3SGfLnp9qxh2GIIkhUyJjPMp05h2NqJyHiJF6VLfTTRHfToBTJCLxoz0Igksy_Zw3QmNJodqVVXjzX-N4qr-7iwtneOPmglifdKod-NUQaDx', 'makanan', 'Terlaris', 'bg-secondary-container text-on-secondary-container', true, '12:00 WIB', 87, 1),
  ('Signature Matcha Boba Latte', 'Matcha ceremonial grade Uji, susu oat lembut, dan boba gula aren kenyal buatan tangan.', 22000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCNiSMdriUwBSCB7EbHhbls7zVH5hTr3srlwdU-LeFsRLwdYR0hhQhs0JEiDTB-S0yOIRxOzFGxrQHZMhRfHQISu3OfJHrqGKwFVZPH-y7ow5geil0dx8U_b9osLYGdEY7ST8sk0g0Mbgj3-VfJIR2w6h4JWqGWNoORPq8LZfEfRNHRR5DDTlR7KF-cbiuNizsxb5Oe4O8TuEDMWZnoZYDGtFyT_ybVaA-8MB962GaTycp4-cZBnGuz', 'minuman', 'Favorit Mahasiswa', 'bg-tertiary text-on-tertiary', true, '11:30 WIB', 74, 2),
  ('Roti Bakar Cokelat Keju', 'Brioche tebal dipanggang butter harum, dark chocolate Belgia lumer, dan keju cheddar melimpah.', 20000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCUQ0U8RBYUx1wbH_5PXW18gruru7ZExcP69Gl-JBO6pLVMOOQTlevWFvU6cyt2sl0ohn7Ad_Eg-CC7kUjUszaCuLlhrMwEhR8G22-LB71BbozX_dYhEZaRgDhsjnb43vSchNYJVha2DkBkHEvSnHpcvfbnhaoKHnkjoz5LjsL6hpd1wy6100Uwun-71P4mhuQwvW3sOVPTcDmWTEcLaXWfuzTE6mH5X6ZtPhBS90nBMJBWGw7vpd7', 'camilan', 'Camilan Populer', 'bg-primary-fixed text-on-primary-fixed-variant', true, '11:30 WIB', 68, 3),
  ('Mie Goreng Spesial Olympiad', 'Mie telur tumis bumbu rahasia, katsu ayam renyah, dan telur mata sapi setengah matang.', 24000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsaiDiXR3PgttOaNVk4H9U4sqA-1KndlWlvf20-SImo6BwM_Yb3qYpMKegZXMYkUC99YOmLXzS2ZTTFsb_jSnFzWMXYOwPmU0iwrFH-in5QFpOO9zmtprd7aDK1ILOnQDJYx17NfB4sxRshGxCW6uNrDTFFYh-wTU2oKtZuAiYyLf2HHOJc2nMCoh5DqVpB7NDcr1JMQ1c3B3K2m34jGoExND-MtNHgBBpMQT-RtD_vZcjt4V4NZiE', 'makanan', NULL, NULL, false, '12:00 WIB', 55, 4),
  ('Japanese Beef Bento Bowl', 'Sapi yakiniku tipis, nasi pulen hangat, brokoli kukus, dan tamagoyaki manis.', 32000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9vHHBAaAE_iSiB0Rt8D3CveZFudd086inwjv2w1wO17FQSQXqKqVTw6_Sieho4JFb7Y7g9UqyisiFR-tlanZri8K7rCCtS1bTN5U6SKs8esVun0tnVfZrNa7KeFAJjMvuWj0wP9MoC7xbnXwHrqDIaHVEM7OIc3jZIiQ3kyCE8raFmcNy-vsTFhpOgC_6iFPTAedmLSO6YcAfjAdeY1ah5DSoDEJuGaKutsc81P_VLs8UqF5Wuqym', 'makanan', NULL, NULL, false, '12:00 WIB', 49, 5),
  ('Thai Milk Tea + Cincau', 'Teh Thailand otentik, susu kental manis, dan cincau hitam kenyal menyegarkan.', 18000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTxbWPRe_azuNcI35MmK_P3a8ng62K7GY5Yj0szT0dbCQ4rBroxFHHtay6mNJDqsDpemYThcLyPfV7jgeNO39elEjrodCQgMX4rAgSQHHzgm2MvT7PkiAFqqzTZ3Nj149Nwfe6z6TkDLwgG3PWyOeo6iq0PgAg-LxKfLVnelkuWrjigKzpDzEsupIMDgR1f83E8PjE51uA686RH5m1Ajejn_yhH8PhyNwx9yaxzfkFmY7d0e3RkmjL', 'minuman', NULL, NULL, false, '11:30 WIB', 45, 6),
  ('Classic Cinnamon Roll', 'Baru keluar oven — roti kayu manis hangat dengan cream cheese vanilla lumer.', 18000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJ-mTctYannqjQqEUEKR0_S8k-kGiTBu9NUurHRDqa4sKfGNs5pucffvU5zXAvn7CzOCa7AxN5zgOpSI1MkjiDgT_GvZ-FRiiYgNX_sLHdne8AIEsXUuqVnI-UJ4Rvd6c1EzpKrBU7k97v_8BNU250JPDHnn256jEAw4pd7vvYzUt_14nMbYy7LgjYiPdfEfYt0z7PDrJJxB8IxPDQKzDqHjJcL_VO8N1UmQBfcPWJiqPpGGs_5UI_', 'camilan', NULL, NULL, false, '11:30 WIB', 42, 7),
  ('Brownies Fudgy Almond', 'Dark chocolate Belgia lumer dengan topping almond panggang renyah.', 16000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDYA-xdyICjL5zmzZdTT3kQ2-gcmiXDtRB46vv3mqaJTlcc9FFBb4oSG8hOX6K6qJCkqMsZkVTbqFHQvrUDGnTDKtTd0SMfmr4WDc1tLBlxMQBkQ-yAgZkUF1jekX8nA3ASVuitRUrbQTb6G1yKaKMf5qyJK3i4o2RKfW61I9l5LcgBUUjpyeIlx8K07lDsrY2RV8NsSj4hxOB8sHhIGRZjDBRNwsY5S9Vga6umq3NpU-VjbhPXlK_Q', 'camilan', NULL, NULL, false, '11:30 WIB', 38, 8),
  ('Crispy Pisang Coklat', 'Pisang manis berbalut kulit renyah dengan cokelat ganache lumer di setiap gigitan.', 15000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxG3wm_MMClRgq-xLicjop7iZhKTQgga6LRcUQt1mibXHeO12SraZgUl-dgtlaJiC9BP-N9rTyJLOFtC5RUVLXYaXAdSA2pW7Co1_JskHEw3rPgA82cJLiSnkP2gVb5FDl0_aFuMdT9NZwZCQwqjR-Y8KMsMMicgf3uu2iJG_w8CJY2-7u0ivvvQ2LYFUrBOgdz8kMDUpXaUPImrlrzWQ7o-Sox7k5katHU_X0YZOv6lPWS6tqGDB9', 'camilan', NULL, NULL, false, '12:00 WIB', 35, 9);

-- Seed Data — Donation Progress
INSERT INTO public.donation_progress (label, target_amount, collected_amount) VALUES
  ('Biaya Akomodasi', 8000000, 7200000),
  ('Materi & Workshop', 5000000, 4100000),
  ('Tiket & Transport', 4000000, 2400000),
  ('Perlengkapan Lomba', 3000000, 1100000);

-- =====================================================
-- Updated-at trigger
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_menu_items
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_donation
  BEFORE UPDATE ON public.donation_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
