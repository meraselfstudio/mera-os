-- ============================================================
-- Migration 008: Fix RLS Policies for POS Dashboard
-- ============================================================
-- The POS dashboard operates as anon (no Supabase Auth).
-- Previous policies only allowed anon to INSERT registrations
-- and READ registrations/products. All UPDATE/INSERT on
-- transactions, attendance, expenses, and crew were blocked.
-- ============================================================

-- ── Registrations: allow anon UPDATE (POS advances booking status) ──
CREATE POLICY "registrations_anon_update" ON public.registrations
  FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

-- ── Transactions: allow anon full access (POS creates & pays) ───────
DROP POLICY IF EXISTS "transactions_auth" ON public.transactions;

CREATE POLICY "transactions_public_select" ON public.transactions
  FOR SELECT USING (TRUE);

CREATE POLICY "transactions_public_insert" ON public.transactions
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "transactions_public_update" ON public.transactions
  FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

-- ── Attendance: allow anon full access (crew clock-in/out from POS) ─
DROP POLICY IF EXISTS "attendance_auth" ON public.attendance;

CREATE POLICY "attendance_public_select" ON public.attendance
  FOR SELECT USING (TRUE);

CREATE POLICY "attendance_public_insert" ON public.attendance
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "attendance_public_update" ON public.attendance
  FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

-- ── Crew: allow anon SELECT (AttendanceBoard reads crew list) ───────
-- Keep crew write-protected — only service_role should modify crew.
DROP POLICY IF EXISTS "crew_auth" ON public.crew;

CREATE POLICY "crew_public_select" ON public.crew
  FOR SELECT USING (TRUE);

CREATE POLICY "crew_service_write" ON public.crew
  FOR ALL USING (auth.role() = 'service_role');

-- ── Expenses: allow anon SELECT (finance recap reads expenses) ──────
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "expenses_public_select" ON public.expenses
    FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
END $$;
