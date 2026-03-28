-- ============================================================
-- Migration 004: Booking System Upgrade
-- Adds jumlah_orang, preferred_date, session_id to registrations
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS jumlah_orang   INT          NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS preferred_date DATE,
  ADD COLUMN IF NOT EXISTS session_id     TEXT         UNIQUE;

-- Add index for session_id lookup (used by POS to link session)
CREATE INDEX IF NOT EXISTS idx_registrations_session_id
  ON public.registrations(session_id);

COMMENT ON COLUMN public.registrations.jumlah_orang   IS 'Jumlah orang dalam sesi — digunakan untuk kalkulasi harga bertingkat';
COMMENT ON COLUMN public.registrations.preferred_date IS 'Tanggal preferensi booking dari customer (nullable = walk-in fleksibel)';
COMMENT ON COLUMN public.registrations.session_id     IS 'Format: DD-SANITIZEDNAME-RANDOMCODE. Digunakan sebagai nama folder Capture One di Mac Mini.';
