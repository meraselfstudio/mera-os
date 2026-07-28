-- ============================================================
-- Migration 015: Restore tiered add-ons and missing items
-- ============================================================

-- Ensure 'Add Person', 'Add Time', 'Add Print', 'Special Frame' exist in the database with their proper tiers.

-- Since there is no UNIQUE constraint on nama, let's delete them first to avoid duplicates if they exist, then re-insert.
DELETE FROM public.products WHERE nama IN ('Add Person', 'Add Time (5 menit)', 'Add Print', 'Special Frame');

INSERT INTO public.products (nama, kategori, tipe_harga, harga_dasar, tier_1, tier_2, tier_3, tier_lebih, max_orang, default_bw, is_addon, is_active, pricing_basis)
VALUES 
('Add Person', 'Add On', 'normal', 25000, NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, TRUE, 'qty'),
('Add Time (5 menit)', 'Add On', 'normal', 15000, NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, TRUE, 'qty'),
('Add Print', 'Add On', 'bertingkat', 15000, 15000, 30000, 35000, 13000, NULL, FALSE, TRUE, TRUE, 'qty'),
('Special Frame', 'Add On', 'bertingkat', 25000, 25000, 40000, 50000, 15000, NULL, FALSE, TRUE, TRUE, 'qty');
