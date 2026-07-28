-- ============================================================
-- Migration 014: RLS Hardening — SEC-01
-- Méra OS Security Maintenance
-- ============================================================
-- Tujuan:
--   1. Blokir semua operasi DELETE dari anon sembarangan
--   2. Sembunyikan kolom pin_hash dari akses publik via View
--   3. Bedakan "anon POS internal" vs "anon publik" via
--      custom request header (x-mera-pos-key)
--   4. Batasi akses transaksi & absensi dari Customer Portal
--
-- Strategi:
--   POS mengirimkan header `x-mera-pos-key` di setiap request.
--   RLS Policy membaca header ini via current_setting().
--   Jika header cocok dengan secret yang dikonfigurasi di
--   Supabase (app.settings.pos_secret), maka operasi diizinkan.
--
-- Tidak ada perubahan kode aplikasi untuk SELECT/INSERT/UPDATE
-- yang sudah berjalan. Hanya DELETE yang memerlukan klien baru.
-- ============================================================

-- ── 0. Helper function: verifikasi POS secret header ─────────
-- Catatan: Secret di-hardcode dalam fungsi karena Supabase hosted
-- tidak mengizinkan ALTER DATABASE SET app.settings.
-- Source code fungsi PostgreSQL TIDAK bisa dibaca oleh klien anon,
-- sehingga secret ini aman.
-- Untuk rotasi secret: UPDATE fungsi ini + VITE_POS_SECRET di .env.local
CREATE OR REPLACE FUNCTION public.is_pos_client()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT coalesce(
    current_setting('request.headers', true)::json->>'x-mera-pos-key'
    = '9514fefb4ba4f05cc81ab45311adf1226ff64fac309c5636c352b74e89b2d8f0',
    false
  )
$$;

-- ── 1. PRODUCTS — Bersihkan & perketat ───────────────────────
-- Publik hanya bisa SELECT produk yang aktif.
-- Tidak ada operasi tulis dari anon.

DROP POLICY IF EXISTS "products_public_read" ON public.products;

CREATE POLICY "products_anon_select" ON public.products
  FOR SELECT USING (is_active = TRUE);

-- ── 2. REGISTRATIONS — Pisahkan operasi secara eksplisit ─────

DROP POLICY IF EXISTS "registrations_public_read"   ON public.registrations;
DROP POLICY IF EXISTS "registrations_public_insert" ON public.registrations;
DROP POLICY IF EXISTS "registrations_anon_insert"   ON public.registrations;
DROP POLICY IF EXISTS "registrations_anon_update"   ON public.registrations;
DROP POLICY IF EXISTS "registrations_self_checkin"  ON public.registrations;
DROP POLICY IF EXISTS "registrations_crew_all"      ON public.registrations;
DROP POLICY IF EXISTS "registrations_anon_read"     ON public.registrations;

-- SELECT: Siapapun boleh baca (portal checkin, POS board, Realtime)
CREATE POLICY "registrations_anon_select" ON public.registrations
  FOR SELECT USING (TRUE);

-- INSERT: Portal pelanggan boleh buat booking baru
CREATE POLICY "registrations_anon_insert" ON public.registrations
  FOR INSERT WITH CHECK (TRUE);

-- UPDATE: Portal boleh update checked_in_at (self check-in)
--         POS boleh update semua field (status, addons, dll)
--         Semua anon diizinkan UPDATE — tidak bisa dibatasi per-kolom
--         tanpa mengubah kode, tapi setidaknya kita blokir DELETE.
CREATE POLICY "registrations_anon_update" ON public.registrations
  FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

-- DELETE: HANYA dari klien POS yang memiliki secret header
--         (blokir semua akses publik sembarangan)
CREATE POLICY "registrations_pos_delete" ON public.registrations
  FOR DELETE USING (
    auth.role() = 'service_role'
    OR public.is_pos_client()
  );

-- ── 3. TRANSACTIONS — Batasi akses dari publik ────────────────

DROP POLICY IF EXISTS "transactions_public_select" ON public.transactions;
DROP POLICY IF EXISTS "transactions_public_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_public_update" ON public.transactions;
DROP POLICY IF EXISTS "transactions_auth"           ON public.transactions;

-- SELECT: Hanya POS dan service_role
--         Portal pelanggan TIDAK perlu baca data transaksi
CREATE POLICY "transactions_pos_select" ON public.transactions
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR public.is_pos_client()
  );

-- INSERT: Hanya POS (POS membuat transaksi saat bayar)
CREATE POLICY "transactions_pos_insert" ON public.transactions
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_pos_client()
  );

-- UPDATE: Hanya POS (update status, payment_method)
CREATE POLICY "transactions_pos_update" ON public.transactions
  FOR UPDATE USING (
    auth.role() = 'service_role'
    OR public.is_pos_client()
  ) WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_pos_client()
  );

-- DELETE: HANYA service_role atau POS dengan secret
--         (menghapus transaksi yang belum PAID sebelum hapus registrasi)
CREATE POLICY "transactions_pos_delete" ON public.transactions
  FOR DELETE USING (
    auth.role() = 'service_role'
    OR public.is_pos_client()
  );

-- ── 4. ATTENDANCE — Isolasi ketat (HR-only) ──────────────────

DROP POLICY IF EXISTS "attendance_public_select" ON public.attendance;
DROP POLICY IF EXISTS "attendance_public_insert" ON public.attendance;
DROP POLICY IF EXISTS "attendance_public_update" ON public.attendance;
DROP POLICY IF EXISTS "attendance_auth"           ON public.attendance;

-- SELECT: Hanya POS dan service_role (calculate-payroll edge function)
CREATE POLICY "attendance_pos_select" ON public.attendance
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR public.is_pos_client()
  );

-- INSERT: Hanya POS (clock-in kru)
CREATE POLICY "attendance_pos_insert" ON public.attendance
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_pos_client()
  );

-- UPDATE: Hanya POS (clock-out kru)
CREATE POLICY "attendance_pos_update" ON public.attendance
  FOR UPDATE USING (
    auth.role() = 'service_role'
    OR public.is_pos_client()
  ) WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_pos_client()
  );

-- DELETE: Tidak ada yang boleh hapus data absensi selain service_role
CREATE POLICY "attendance_nodelete" ON public.attendance
  FOR DELETE USING (auth.role() = 'service_role');

-- ── 5. CREW — Sembunyikan pin_hash via Security Definer View ─

DROP POLICY IF EXISTS "crew_public_select"  ON public.crew;
DROP POLICY IF EXISTS "crew_service_write"  ON public.crew;
DROP POLICY IF EXISTS "crew_auth"           ON public.crew;
DROP POLICY IF EXISTS "crew_authenticated"  ON public.crew;

-- SELECT: Hanya POS (via view aman) dan service_role
--         Akses langsung ke kolom pin_hash DIBLOKIR dari anon
CREATE POLICY "crew_pos_select" ON public.crew
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR public.is_pos_client()
  );

-- WRITE: Hanya service_role (crew management)
CREATE POLICY "crew_service_write" ON public.crew
  FOR ALL USING (auth.role() = 'service_role');

-- ── View aman: crew tanpa pin_hash ───────────────────────────
-- POS hanya perlu nama, role, dan status untuk tampilan.
-- View ini bisa diakses oleh anon publik (untuk dropdown nama kru jika diperlukan).
DROP VIEW IF EXISTS public.crew_safe;
CREATE OR REPLACE VIEW public.crew_safe
  WITH (security_invoker = false)
AS
  SELECT
    id,
    nama,
    role,
    status_gaji,
    is_active,
    created_at
    -- pin_hash sengaja TIDAK diekspos
  FROM public.crew
  WHERE is_active = TRUE;

-- Grant SELECT pada view ini ke anon (aman karena pin_hash tidak ada)
GRANT SELECT ON public.crew_safe TO anon;
GRANT SELECT ON public.crew_safe TO authenticated;

-- ── 6. EXPENSES — Proteksi dari akses publik ─────────────────

DROP POLICY IF EXISTS "expenses_public_select" ON public.expenses;

-- SELECT: Hanya POS dan service_role
CREATE POLICY "expenses_pos_select" ON public.expenses
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR public.is_pos_client()
  );

-- INSERT: Hanya POS (input pengeluaran dari finance panel)
CREATE POLICY "expenses_pos_insert" ON public.expenses
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_pos_client()
  );

-- UPDATE: Hanya service_role (koreksi pengeluaran)
CREATE POLICY "expenses_service_update" ON public.expenses
  FOR UPDATE USING (auth.role() = 'service_role');

-- DELETE: Hanya service_role
CREATE POLICY "expenses_service_delete" ON public.expenses
  FOR DELETE USING (auth.role() = 'service_role');

-- ── 7. PHONEBOOTH_PHOTOS — Tetap publik untuk INSERT ─────────

-- Policy yang ada sudah cukup baik (insert publik, select authenticated).
-- Tidak ada perubahan.

-- ── 8. Pastikan RLS aktif di semua tabel ─────────────────────

ALTER TABLE public.crew             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses         ENABLE ROW LEVEL SECURITY;
-- phonebooth_photos: dilewati — tabel mungkin belum ada jika migration 010 belum dijalankan
DO $$ BEGIN
  ALTER TABLE public.phonebooth_photos ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── CATATAN SETUP ─────────────────────────────────────────────
-- Secret POS sudah di-hardcode di fungsi is_pos_client() di atas.
-- Pastikan nilai VITE_POS_SECRET di apps/pos-dashboard/.env.local
-- identik dengan nilai di dalam fungsi.
--
-- Untuk rotasi secret:
--   1. UPDATE fungsi is_pos_client() di SQL Editor dengan secret baru
--   2. UPDATE VITE_POS_SECRET di .env.local POS
--   3. Rebuild POS dashboard
-- ============================================================
