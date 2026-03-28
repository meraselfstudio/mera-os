-- ============================================================
-- Migration 007: Méra OS Bookings Schema
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE booking_status_enum AS ENUM ('PENDING', 'VERIFIED', 'PROCESSED', 'PAID', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_type_enum AS ENUM ('OTS', 'KEEP_SLOT', 'QRIS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('UNPAID', 'PARTIAL', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Table: bookings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookings (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id         VARCHAR(50) UNIQUE,
  customer_name      VARCHAR(255) NOT NULL,
  instagram_username VARCHAR(255),
  studio_type        VARCHAR(50) NOT NULL, -- 'BASIC', 'WIDE', 'MAJESTIC', 'ELEVATOR'
  booking_time       TIMESTAMPTZ NOT NULL,
  status             booking_status_enum NOT NULL DEFAULT 'PENDING',
  booking_type       booking_type_enum NOT NULL DEFAULT 'OTS',
  payment_status     payment_status_enum NOT NULL DEFAULT 'UNPAID',
  total_amount       NUMERIC(12, 0) NOT NULL DEFAULT 0,
  expired_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_time ON public.bookings(booking_time);
CREATE INDEX IF NOT EXISTS idx_bookings_session_id ON public.bookings(session_id);

-- ── Automated Expiration Logic (Trigger) ────────────────────
-- Note: pg_cron is preferred for periodic cleanup, but a trigger on creation 
-- can handle the initial expiration set.

CREATE OR REPLACE FUNCTION set_booking_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_type = 'KEEP_SLOT' AND NEW.status = 'PENDING' THEN
    NEW.expired_at := NEW.created_at + INTERVAL '6 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_booking_expiration
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_expiration();

-- ── Updated At Trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ── RLS Policies ─────────────────────────────────────────────
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_public_read" ON public.bookings
  FOR SELECT USING (TRUE);

CREATE POLICY "bookings_crew_all" ON public.bookings
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ── Realtime ─────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
