-- Migration 014: Expenses Tracker Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'operasional',
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  receipt_url TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on expenses" ON public.expenses;
CREATE POLICY "Allow public read on expenses" ON public.expenses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all on expenses" ON public.expenses;
CREATE POLICY "Allow all on expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  END IF;
END $$;

INSERT INTO public.expenses (title, category, amount, expense_date, notes, created_by)
VALUES 
  ('Bahan Baku Utama (Ayam, Sayur & Bumbu)', 'bahan_baku', 1250000, CURRENT_DATE - INTERVAL '2 days', 'Belanja pasar bahan olahan fresh', 'Bendahara Panitia'),
  ('Kemasan Food Box & Gelas Paper Eco', 'kemasan', 420000, CURRENT_DATE - INTERVAL '1 day', '500 set kemasan ramah lingkungan', 'Bendahara Panitia'),
  ('Cetak Banner & Signage Stand Booth', 'publikasi', 180000, CURRENT_DATE - INTERVAL '1 day', 'Banner stand 2x1 meter FKIP', 'Tim Publikasi'),
  ('Es Kristal & Air Galon Stand', 'operasional', 95000, CURRENT_DATE, 'Kebutuhan racikan minuman dingin', 'Staff Stand Booth');
