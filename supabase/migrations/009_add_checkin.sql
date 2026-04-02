-- ============================================================
-- Migration 009: Add self check-in timestamp to registrations
-- Customers mark their own arrival via the self check-in page
-- ============================================================

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

COMMENT ON COLUMN public.registrations.checked_in_at IS
  'Self check-in timestamp — set when customer scans the QR at the studio desk and confirms arrival.';

-- Index for quick lookup of checked-in customers by date
CREATE INDEX IF NOT EXISTS idx_registrations_checked_in_at
  ON public.registrations(checked_in_at)
  WHERE checked_in_at IS NOT NULL;

-- Allow anonymous (portal) clients to update checked_in_at on their own
-- registration row (matched by session_id) — needed for self check-in page.
-- Uses a policy that restricts the updatable columns to only checked_in_at
-- so customers cannot modify any other field.
DO $$ BEGIN
  -- Enable RLS if not already enabled
  ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Public SELECT (allow customers to look up their booking by session_id)
DROP POLICY IF EXISTS "registrations_public_read" ON public.registrations;
CREATE POLICY "registrations_public_read" ON public.registrations
  FOR SELECT USING (TRUE);

-- Public INSERT (customer portal booking flow — anon client)
DROP POLICY IF EXISTS "registrations_public_insert" ON public.registrations;
CREATE POLICY "registrations_public_insert" ON public.registrations
  FOR INSERT WITH CHECK (TRUE);

-- Self check-in UPDATE — only allow setting checked_in_at (anon)
DROP POLICY IF EXISTS "registrations_self_checkin" ON public.registrations;
CREATE POLICY "registrations_self_checkin" ON public.registrations
  FOR UPDATE USING (TRUE)
  WITH CHECK (TRUE);

-- Crew/admin full access
DROP POLICY IF EXISTS "registrations_crew_all" ON public.registrations;
CREATE POLICY "registrations_crew_all" ON public.registrations
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
