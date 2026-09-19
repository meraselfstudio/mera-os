-- =============================================================
-- Migration 022: Add Cafe Crew (Méra Hause)
-- Apply via: Supabase Dashboard > SQL Editor > Run
-- =============================================================
-- Menambahkan Nona dan Rara sebagai kru cafe Méra Hause
-- Base rate: Rp 50.000 / shift (Rp 100.000 jika hanya 1 orang bertugas)
-- Shift 1: 11.00 - 20.00 (Rp 50.000)
-- Shift 2: 15.00 - 23.00 (Rp 50.000)
-- Full Time: 11.00 - 23.00 (Rp 100.000)

INSERT INTO public.crew (nama, role, status_gaji, is_active) VALUES
  ('Nona', 'Méra Hause', 'PRO', TRUE),
  ('Rara', 'Méra Hause', 'PRO', TRUE)
ON CONFLICT DO NOTHING;

-- Izinkan POS client dengan header x-mera-pos-key untuk INSERT/UPDATE data crew jika diperlukan
DROP POLICY IF EXISTS "crew_pos_insert" ON public.crew;
CREATE POLICY "crew_pos_insert" ON public.crew
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_pos_client()
  );

DROP POLICY IF EXISTS "crew_pos_update" ON public.crew;
CREATE POLICY "crew_pos_update" ON public.crew
  FOR UPDATE USING (
    auth.role() = 'service_role'
    OR public.is_pos_client()
  );
