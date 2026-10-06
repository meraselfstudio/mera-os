-- =============================================================
-- Migration 027: Add Cafe Crew Bhagas (Méra Hause)
-- =============================================================

INSERT INTO public.crew (nama, role, status_gaji, is_active)
VALUES ('Bhagas', 'Méra Hause', 'PRO', TRUE)
ON CONFLICT DO NOTHING;
