-- =============================================================
-- Méra SelfStudio 2.0 — Database Schema
-- Apply via: Supabase Dashboard > SQL Editor > Run
-- =============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enums ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE status_gaji_enum AS ENUM ('FULL_TIME', 'PART_TIME', 'INTERN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE registration_status_enum AS ENUM ('pending', 'confirmed', 'ongoing', 'done', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type_enum AS ENUM ('income', 'expense', 'refund');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Table: crew ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crew (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'crew',
  status_gaji  status_gaji_enum NOT NULL DEFAULT 'FULL_TIME',
  base_salary  NUMERIC(12, 0) NOT NULL DEFAULT 0,
  bonus        NUMERIC(12, 0) NOT NULL DEFAULT 0,
  denda        NUMERIC(12, 0) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.crew IS 'Méra crew members (staff) with salary metadata';
COMMENT ON COLUMN public.crew.denda IS 'Accumulated penalty/fine in IDR — reset monthly';
COMMENT ON COLUMN public.crew.status_gaji IS 'INTERN = skip penalty & bonus calculations';

-- ── Table: attendance ────────────────────────────────────────
-- NOTE: Intentionally ISOLATED from customer tables.
-- This table is HR-only; never join with registrations or transactions.
CREATE TABLE IF NOT EXISTS public.attendance (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crew_id      UUID NOT NULL REFERENCES public.crew(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  check_in     TIMESTAMPTZ,
  check_out    TIMESTAMPTZ,
  shift_count  SMALLINT NOT NULL DEFAULT 1,
  late_minutes SMALLINT NOT NULL DEFAULT 0,
  photo_url    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_crew_date_unique UNIQUE (crew_id, date)
);
COMMENT ON TABLE public.attendance IS 'HR attendance log — isolated from customer transaction data';
COMMENT ON COLUMN public.attendance.late_minutes IS 'Minutes late from scheduled shift start. Penalty = late_minutes / 10 * 5000';
COMMENT ON COLUMN public.attendance.photo_url IS 'Supabase Storage URL for check-in face photo';

-- ── Table: products ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'package',
  price            NUMERIC(12, 0) NOT NULL DEFAULT 0,
  duration_minutes SMALLINT NOT NULL DEFAULT 60,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.products IS 'Photostudio packages and add-on products';

-- ── Table: registrations ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.registrations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id     TEXT NOT NULL UNIQUE,               -- sanitized: alpha, nums, hyphens only
  customer_name  TEXT NOT NULL,
  package_id     UUID REFERENCES public.products(id) ON DELETE SET NULL,
  addons         JSONB NOT NULL DEFAULT '[]'::jsonb,
  booking_date   TIMESTAMPTZ NOT NULL,
  status         registration_status_enum NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'cash',
  crew_id        UUID REFERENCES public.crew(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.registrations IS 'Customer studio sessions — drives POS Realtime board';
COMMENT ON COLUMN public.registrations.session_id IS 'macOS-safe ID: only [a-zA-Z0-9-]. Used as Capture One folder name.';

-- Index for Realtime subscriptions and POS board queries
CREATE INDEX IF NOT EXISTS idx_registrations_status ON public.registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_booking_date ON public.registrations(booking_date);

-- ── Table: transactions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  amount          NUMERIC(12, 0) NOT NULL DEFAULT 0,
  type            transaction_type_enum NOT NULL DEFAULT 'income',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.transactions IS 'Financial ledger for studio income, expenses, refunds';
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE public.crew          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions  ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically (used by Edge Functions)

-- Products: public read (needed for booking page)
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (is_active = TRUE);

-- Registrations: authenticated users can insert (customer booking)
CREATE POLICY "registrations_anon_insert" ON public.registrations
  FOR INSERT WITH CHECK (TRUE);

-- Registrations: authenticated users can read their own (by session_id)
CREATE POLICY "registrations_anon_read" ON public.registrations
  FOR SELECT USING (TRUE);  -- POS needs full read; tighten in production

-- All other tables: require authenticated session (POS/Admin use service role)
CREATE POLICY "crew_authenticated" ON public.crew
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "attendance_authenticated" ON public.attendance
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "transactions_authenticated" ON public.transactions
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ── Realtime Publication ──────────────────────────────────────
-- Enable Realtime on registrations for POS board live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- ── Seed: Sample products ─────────────────────────────────────
INSERT INTO public.products (name, category, price, duration_minutes, is_active) VALUES
  ('Basic Session',     'package', 150000, 60,  TRUE),
  ('Standard Session',  'package', 250000, 90,  TRUE),
  ('Premium Session',   'package', 400000, 120, TRUE),
  ('Extra Print Set',   'addon',   50000,  0,   TRUE),
  ('Digital Files',     'addon',   75000,  0,   TRUE),
  ('Instant Print x4',  'addon',   35000,  0,   TRUE)
ON CONFLICT DO NOTHING;
