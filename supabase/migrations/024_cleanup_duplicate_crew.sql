-- =============================================================
-- Migration 024: Cleanup Duplicate Crew & Ensure Unique Constraint
-- Apply via: Supabase Dashboard > SQL Editor > Run
-- =============================================================

-- 1. Hapus duplikat kru non-aktif
DELETE FROM public.crew
WHERE is_active = FALSE
  AND nama IN ('Nona', 'Rara');

-- 2. Pastikan hanya ada 1 row untuk setiap nama kru (pertahankan ID tertua)
DELETE FROM public.crew a
USING public.crew b
WHERE a.id > b.id
  AND LOWER(TRIM(a.nama)) = LOWER(TRIM(b.nama));

-- 3. Buat indeks unik agar nama kru tidak bisa diduplikat lagi
CREATE UNIQUE INDEX IF NOT EXISTS idx_crew_unique_nama
  ON public.crew (LOWER(TRIM(nama)));
