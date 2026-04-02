-- =============================================================
-- Méra SelfStudio 2.0 — Revised Production Schema (v2)
-- Supersedes 001_schema.sql
-- Apply via: Supabase Dashboard > SQL Editor > Run
-- =============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Drop old tables if doing a fresh apply ───────────────────
-- (Safe to run only on a fresh Supabase project)
DROP TABLE IF EXISTS public.transactions  CASCADE;
DROP TABLE IF EXISTS public.registrations CASCADE;
DROP TABLE IF EXISTS public.attendance    CASCADE;
DROP TABLE IF EXISTS public.products      CASCADE;
DROP TABLE IF EXISTS public.crew          CASCADE;

-- Drop old enum types if they exist
DROP TYPE IF EXISTS status_gaji_enum CASCADE;
DROP TYPE IF EXISTS registration_status_enum CASCADE;
DROP TYPE IF EXISTS transaction_type_enum CASCADE;

-- =============================================================
-- 1. CREW TABLE — Integritas HR
-- =============================================================
CREATE TABLE public.crew (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'Crew',
  -- role values: 'Admin' | 'Crew' | 'Intern'
  status_gaji TEXT NOT NULL DEFAULT 'PRO',
  -- status_gaji values: 'PRO' | 'INTERN'
  -- INTERN = skip semua kalkulasi penalti & bonus omset
  pin_hash    TEXT,
  -- PIN untuk otorisasi tindakan khusus (Refund/Admin override)
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.crew IS 'HR crew data untuk POS operator dan payroll';
COMMENT ON COLUMN public.crew.pin_hash IS 'Hashed PIN untuk otorisasi Refund/Admin actions di POS';
COMMENT ON COLUMN public.crew.status_gaji IS 'PRO = full payroll; INTERN = log operasional only (no penalty/bonus)';

-- =============================================================
-- 2. ATTENDANCE TABLE — Terisolasi Murni untuk Payroll
-- =============================================================
-- PENTING: Tabel ini TIDAK boleh di-JOIN dengan tabel customer.
-- Ini adalah rekaman absensi HR murni untuk kalkulasi payroll.
CREATE TABLE public.attendance (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crew_id        UUID NOT NULL REFERENCES public.crew(id) ON DELETE CASCADE,
  clock_in       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out      TIMESTAMPTZ,
  shift_type     TEXT NOT NULL,
  -- shift_type examples: 'Weekday Full', 'Weekend Half', 'Weekend Full'
  base_rate      INT NOT NULL,
  -- Gaji pokok dikunci saat clock-in (contoh: 75000)
  late_minutes   INT NOT NULL DEFAULT 0,
  -- Dihitung otomatis oleh edge function vs jadwal baku
  penalty_amount INT NOT NULL DEFAULT 0,
  -- Formula: late_minutes / 10 * 5000
  status         TEXT NOT NULL DEFAULT 'ACTIVE',
  -- 'ACTIVE' = sedang kerja | 'COMPLETED' = sudah clock-out
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.attendance IS 'Absensi HR — TERISOLASI dari tabel transaksi pelanggan';
COMMENT ON COLUMN public.attendance.base_rate IS 'Gaji pokok dikunci saat clock-in, tidak berubah jika admin update crew';
COMMENT ON COLUMN public.attendance.penalty_amount IS 'late_minutes / 10 * 5000 IDR. INTERN selalu 0.';
COMMENT ON COLUMN public.attendance.status IS 'ACTIVE = masih shift | COMPLETED = sudah clock-out';

CREATE INDEX IF NOT EXISTS idx_attendance_crew_id ON public.attendance(crew_id);
CREATE INDEX IF NOT EXISTS idx_attendance_clock_in ON public.attendance(clock_in);

-- =============================================================
-- 3. PRODUCTS TABLE — Tiered Pricing Engine
-- =============================================================
CREATE TABLE public.products (
  id          SERIAL PRIMARY KEY,
  nama        TEXT NOT NULL,
  kategori    TEXT NOT NULL,
  -- kategori examples: 'Paket Studio', 'Addon Print', 'Addon Digital'
  tipe_harga  TEXT NOT NULL DEFAULT 'normal',
  -- 'normal' = harga_dasar saja | 'bertingkat' = gunakan tier_1..tier_lebih
  harga_dasar INT NOT NULL DEFAULT 0,
  -- Harga dasar (digunakan jika tipe_harga = 'normal')
  tier_1      INT,
  -- Harga untuk orang ke-1 s/d batas tier 1
  tier_2      INT,
  -- Harga per-orang tier 2
  tier_3      INT,
  -- Harga per-orang tier 3
  tier_lebih  INT,
  -- Harga per-orang jika melebihi tier 3
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE public.products IS 'Katalog produk studio dengan dukungan tiered pricing';
COMMENT ON COLUMN public.products.tipe_harga IS 'normal = flat price; bertingkat = gunakan kolom tier_1..tier_lebih';
COMMENT ON COLUMN public.products.tier_1 IS 'Harga tier pertama — jumlah orang paling sedikit';
COMMENT ON COLUMN public.products.tier_lebih IS 'Harga per-orang jika melebihi semua tier yang didefinisikan';

-- Seed: paket dasar
INSERT INTO public.products (nama, kategori, tipe_harga, harga_dasar, tier_1, tier_2, tier_3, tier_lebih) VALUES
  ('Paket Solo',    'Paket Studio', 'normal',     150000, NULL,   NULL,   NULL,  NULL),
  ('Paket Pasangan','Paket Studio', 'normal',     250000, NULL,   NULL,   NULL,  NULL),
  ('Paket Group',   'Paket Studio', 'bertingkat',      0, 80000, 60000,  50000, 45000),
  ('Extra Print',   'Addon Print',  'normal',      50000, NULL,   NULL,   NULL,  NULL),
  ('Digital File',  'Addon Digital','normal',      75000, NULL,   NULL,   NULL,  NULL),
  ('Instant x4',    'Addon Print',  'normal',      35000, NULL,   NULL,   NULL,  NULL)
ON CONFLICT DO NOTHING;

-- =============================================================
-- 4. REGISTRATIONS TABLE — Antrean Pelanggan dari Pulau 1
-- =============================================================
CREATE TABLE public.registrations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name    TEXT NOT NULL,
  instagram_handle TEXT NOT NULL,
  booking_type     TEXT NOT NULL DEFAULT 'ONLINE_KEEPSLOT',
  -- 'ONLINE_QRIS' | 'ONLINE_KEEPSLOT'
  status           TEXT NOT NULL DEFAULT 'PENDING',
  -- 'PENDING' | 'VERIFIED' | 'PROCESSED' | 'EXPIRED'
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.registrations IS 'Antrean pelanggan dari Customer Portal (Pulau 1). Status dikelola oleh POS.';
COMMENT ON COLUMN public.registrations.booking_type IS 'ONLINE_QRIS = bayar online via QRIS; ONLINE_KEEPSLOT = jaga slot saja';
COMMENT ON COLUMN public.registrations.instagram_handle IS 'Handle IG pelanggan untuk follow-up. Konfirmasi booking diproses via DM @mera.selfstudio';

CREATE INDEX IF NOT EXISTS idx_registrations_status     ON public.registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON public.registrations(created_at DESC);

-- =============================================================
-- 5. TRANSACTIONS TABLE — Pusat Kebenaran POS Pulau 2
-- =============================================================
CREATE TABLE public.transactions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id           TEXT UNIQUE NOT NULL,
  -- Format: DD-NAME-CODE (contoh: 27-AYU-MR)
  -- CRITICAL: Harus macOS-safe — only alphanumerics and hyphens
  registration_id      UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  processed_by         UUID REFERENCES public.crew(id) ON DELETE SET NULL,
  -- FK ke crew — audit trail kasir yang melayani
  selection_start_time TIMESTAMPTZ,
  -- Waktu mulai seleksi foto di Kiosk Tablet (timer 5 menit)
  total_amount         INT NOT NULL DEFAULT 0,
  discount_amount      INT NOT NULL DEFAULT 0,
  discount_reason      TEXT,
  -- Audit trail untuk Owner: alasan diskon apapun
  payment_method       TEXT,
  -- 'CASH' | 'TRANSFER' | 'QRIS' | 'ONLINE_QRIS'
  status               TEXT NOT NULL DEFAULT 'ACTIVE',
  -- 'ACTIVE' | 'PAID' | 'REFUNDED' | 'VOID'
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.transactions IS 'Ledger POS — sumber kebenaran finansial Pulau 2';
COMMENT ON COLUMN public.transactions.session_id IS 'Format DD-NAME-CODE. Harus macOS-safe (no spaces/special chars). Digunakan sebagai nama folder Capture One.';
COMMENT ON COLUMN public.transactions.selection_start_time IS 'Start time untuk 5-menit timer seleksi foto di Tablet Kiosk';
COMMENT ON COLUMN public.transactions.discount_reason IS 'WAJIB diisi jika discount_amount > 0. Audit trail untuk Owner.';
COMMENT ON COLUMN public.transactions.processed_by IS 'crew.id kasir — dilacak untuk performa & audit';

CREATE INDEX IF NOT EXISTS idx_transactions_session_id   ON public.transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status       ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at   ON public.transactions(created_at DESC);

-- =============================================================
-- Row Level Security
-- =============================================================
ALTER TABLE public.crew          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions  ENABLE ROW LEVEL SECURITY;

-- Products: public read untuk booking page (Pulau 1)
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (is_active = TRUE);

-- Registrations: anon dapat INSERT (form booking Pulau 1)
CREATE POLICY "registrations_anon_insert" ON public.registrations
  FOR INSERT WITH CHECK (TRUE);

-- Registrations: semua dapat baca (POS Realtime perlu full read)
CREATE POLICY "registrations_public_read" ON public.registrations
  FOR SELECT USING (TRUE);

-- Crew & Attendance & Transactions: hanya authenticated / service_role
CREATE POLICY "crew_auth" ON public.crew
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "attendance_auth" ON public.attendance
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "transactions_auth" ON public.transactions
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

-- =============================================================
-- Realtime Publication
-- POS Pulau 2 menggunakan WebSocket subscription — NO polling
-- =============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
