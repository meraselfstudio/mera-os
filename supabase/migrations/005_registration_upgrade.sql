-- ============================================================
-- Migration 005: Registration + Product Table Upgrade
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- ── Registrations: add booking portal columns ────────────────
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS preferred_date  DATE,
  ADD COLUMN IF NOT EXISTS preferred_time  TEXT,
  ADD COLUMN IF NOT EXISTS session_id      TEXT         UNIQUE,
  ADD COLUMN IF NOT EXISTS addons          JSONB        NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS expires_at      TIMESTAMPTZ;

-- Index for session_id lookup (used by POS to link session)
CREATE INDEX IF NOT EXISTS idx_registrations_session_id
  ON public.registrations(session_id);

CREATE INDEX IF NOT EXISTS idx_registrations_expires_at
  ON public.registrations(expires_at)
  WHERE expires_at IS NOT NULL;

COMMENT ON COLUMN public.registrations.session_id     IS 'Format: DD-SANITIZEDNAME-RANDOMCODE. Digunakan sebagai nama folder di Mac Mini.';
COMMENT ON COLUMN public.registrations.addons         IS 'JSONB: { room, variant, selected_addons[] } — studio, backdrop, dan add-on dipilih customer';
COMMENT ON COLUMN public.registrations.preferred_date IS 'Tanggal preferensi booking dari customer';
COMMENT ON COLUMN public.registrations.preferred_time IS 'Jam kedatangan yang dipilih customer (contoh: 14:30)';
COMMENT ON COLUMN public.registrations.expires_at     IS 'Auto-expiry untuk ONLINE_KEEPSLOT — diset 6 jam dari created_at';

-- ── Products: add metadata columns ──────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS max_orang    INT     NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS default_bw   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_addon     BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.products.max_orang  IS 'Batas maksimal peserta dalam satu sesi (e.g. 2 untuk Self Photo, 8 untuk Party)';
COMMENT ON COLUMN public.products.default_bw IS 'TRUE = hasil foto hitam-putih secara default (customer perlu beli Add On untuk berwarna)';
COMMENT ON COLUMN public.products.is_addon   IS 'TRUE = ini adalah add-on (bukan paket utama), tampil sebagai checkbox di form booking';
