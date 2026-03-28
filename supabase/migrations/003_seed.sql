-- =============================================================
-- Méra SelfStudio 2.0 — Seed Data (003_seed.sql)
-- Generated from: docs/crew.csv + docs/produk.csv
-- Apply AFTER 002_revised_schema.sql
-- =============================================================

-- =============================================================
-- CREW SEED — From docs/crew.csv
-- Satria, Feby = PRO (full payroll + bonus)
-- Ena, David, Abel = INTERN (log operasional only — skip penalty/bonus)
-- =============================================================
INSERT INTO public.crew (nama, role, status_gaji, is_active) VALUES
  ('Satria', 'Crew',   'PRO',    TRUE),
  ('Feby',   'Crew',   'PRO',    TRUE),
  ('Ena',    'Intern', 'INTERN', TRUE),
  ('David',  'Intern', 'INTERN', TRUE),
  ('Abel',   'Intern', 'INTERN', TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================
-- PRODUCTS SEED — From docs/produk.csv
-- tipe_harga: 'normal' = flat price via harga_dasar
--             'bertingkat' = tier_1..tier_lebih per print/frame
-- =============================================================

-- ── Basic Studio Packages ─────────────────────────────────────
INSERT INTO public.products (nama, kategori, tipe_harga, harga_dasar, tier_1, tier_2, tier_3, tier_lebih, is_active) VALUES
  ('Self Photo Session',  'Basic Studio',   'normal', 50000,  NULL,  NULL,  NULL,  NULL, TRUE),
  ('Party Photo Session', 'Basic Studio',   'normal', 135000, NULL,  NULL,  NULL,  NULL, TRUE),
  ('Thematic Basic',      'Thematic Studio','normal', 15000,  NULL,  NULL,  NULL,  NULL, TRUE),
  ('Thematic Package',    'Thematic Studio','normal', 50000,  NULL,  NULL,  NULL,  NULL, TRUE),
  ('Pas Photo Basic',     'Basic Studio',   'normal', 80000,  NULL,  NULL,  NULL,  NULL, TRUE),
  ('Pas Photo Package',   'Basic Studio',   'normal', 100000, NULL,  NULL,  NULL,  NULL, TRUE)
ON CONFLICT DO NOTHING;

-- ── Add-ons ───────────────────────────────────────────────────
INSERT INTO public.products (nama, kategori, tipe_harga, harga_dasar, tier_1, tier_2, tier_3, tier_lebih, is_active) VALUES
  ('Edited + Colored Photo', 'Add Ons', 'normal',     20000, NULL,  NULL,  NULL,  NULL,  TRUE),
  ('Add Person',             'Add Ons', 'normal',     25000, NULL,  NULL,  NULL,  NULL,  TRUE),
  ('Add Print',              'Add Ons', 'bertingkat',     0, 15000, 30000, 35000, 13000, TRUE),
  ('Special Frame',          'Add Ons', 'bertingkat',     0, 25000, 40000, 50000, 15000, TRUE),
  ('Add Time (5m)',           'Add Ons', 'normal',    15000, NULL,  NULL,  NULL,  NULL,  TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================
-- PAYROLL SHIFT RATES (hard-coded in docs/4-payroll-and-crew.md)
-- These are inserted as reference data for the attendance system.
-- Used when crew clocks in to lock base_rate.
-- =============================================================
-- Weekday Full Day  → 75,000
-- Weekend Half Shift → 35,000
-- Weekend Full Day  → 100,000
-- (No separate table needed — base_rate is locked at attendance clock-in)
-- These values are documented in: docs/4-payroll-and-crew.md §4.2

-- =============================================================
-- AUTO-EXPIRE TRIGGER — From docs/2-database-schema.md §2.2
-- Prevents "ghost queue" in POS Column 1 (Lobby)
-- =============================================================
CREATE OR REPLACE FUNCTION public.purge_expired_slots()
RETURNS void AS $$
BEGIN
  -- 1. Expire ONLINE bookings after 6 hours of inactivity
  UPDATE public.registrations
  SET status = 'EXPIRED'
  WHERE status IN ('PENDING', 'KEEPSLOT')
    AND booking_type IN ('ONLINE_QRIS', 'ONLINE_KEEPSLOT')
    AND created_at < NOW() - INTERVAL '6 hours';

  -- 2. Expire OTS (Walk-in) after 30 minutes
  UPDATE public.registrations
  SET status = 'EXPIRED'
  WHERE status IN ('PENDING', 'KEEPSLOT')
    AND booking_type = 'OTS'
    AND created_at < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.purge_expired_slots IS
  'Called by pg_cron or Supabase scheduled function to clean ghost queue from POS Column 1.
   Online: expires after 6 hours. OTS: expires after 30 minutes.';

-- =============================================================
-- Session ID Format Reference (not stored — used in transactions)
-- Format: DD-NAME-CODE
--   DD   = two-digit day of month (real clock)
--   NAME = sanitized customer first name (UPPERCASE, max 5 chars)
--   CODE = background_code (MR, LG, DG, etc.)
-- Example: 02-AYU-MR (March 2nd, customer Ayu, background Maroon)
-- CRITICAL: No spaces, no special chars — macOS Capture One folder safe
-- =============================================================
