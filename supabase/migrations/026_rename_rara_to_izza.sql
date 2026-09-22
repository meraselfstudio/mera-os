-- =============================================================
-- Migration 026: Rename Cafe Crew Rara to Izza (Méra Hause)
-- =============================================================

UPDATE public.crew
SET nama = 'Izza'
WHERE nama = 'Rara' AND role = 'Méra Hause';
