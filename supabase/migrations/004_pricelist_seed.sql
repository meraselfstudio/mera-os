-- 004_pricelist_seed.sql
-- Reseeding the products table to match the 2026 Pricelist exactly.

-- Warning: This deletes all existing product data!
TRUNCATE TABLE public.products CASCADE;
ALTER SEQUENCE public.products_id_seq RESTART WITH 1;

INSERT INTO public.products (nama, kategori, deskripsi, tipe_harga, harga_dasar, tier_1, tier_2, tier_3, max_orang) VALUES
-- Basic Studio
('Self Photo Session', 'Basic Studio', '1-2 Orang | 10 Menit Sesi Foto | Unlimited Jepret | 1 Foto Cetak | All Soft File B&W', 'bertingkat', 50000, 50000, 50000, 25000, 8),
('Party Photo Session', 'Basic Studio', 'Max 8 Orang | 15 Menit Sesi Foto | Unlimited Jepret | 2 Foto Cetak | All Soft File B&W', 'flat', 135000, NULL, NULL, NULL, 8),
('Pas Photo Personal', 'Basic Studio', '1 Orang | 10 Menit Sesi Foto | Unlimited Jepret | 2 Foto Cetak (4x6/3x4/2x3) | All Soft File', 'flat', 80000, NULL, NULL, NULL, 1),
('Pas Photo 2 Orang', 'Basic Studio', '2 Orang | 10 Menit Sesi Foto | Unlimited Jepret | 3 Foto Cetak (4x6/3x4/2x3) | All Soft File', 'flat', 100000, NULL, NULL, NULL, 2),

-- Majestic Studio
('Majestic Session', 'Majestic Studio', '1-2 Orang | 10 Menit Sesi Foto | Unlimited Jepret | 1 Foto Cetak | All Soft File', 'bertingkat', 50000, 50000, 50000, 25000, 8),

-- Elevator Studio
('Elevator Session', 'Elevator Studio', '1-2 Orang | 10 Menit Sesi Foto | Unlimited Jepret | 1 Foto Cetak | All Soft File', 'bertingkat', 50000, 50000, 50000, 25000, 8),

-- Add-Ons
('Colored + Edited Photo', 'Add Ons', 'Semua Soft File & Cetak Ter-edit dan Berwarna', 'flat', 20000, NULL, NULL, NULL, NULL),
('Add Person', 'Add Ons', 'Per 1 Orang', 'flat', 25000, NULL, NULL, NULL, NULL),
('Add Time', 'Add Ons', 'Per 5 Menit', 'flat', 15000, NULL, NULL, NULL, NULL),
('Add Basic Print', 'Add Ons', '1 Print: 15k | 2 Print: 30k | 3 Print: 35k | >3 Print: 13k/ea', 'bertingkat', 15000, 15000, 30000, 35000, NULL),
('Add Special Frame', 'Add Ons', '1 Print: 25k | 2 Print: 40k | 3 Print: 50k | >3 Print: 19k/ea', 'bertingkat', 25000, 25000, 40000, 50000, NULL);
