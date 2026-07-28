-- ============================================================
-- Migration 019: Update Products & Studios from Pricelist Catalog (2026)
-- Separate UI studio entries for Close Up Room & Pas Photo, sharing slots
-- ============================================================

-- 1. Ensure deskripsi & pricing_basis columns exist on products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deskripsi TEXT,
  ADD COLUMN IF NOT EXISTS pricing_basis TEXT DEFAULT 'flat';

-- 2. Remove obsolete studios (Elevator Studio & Majestic Studio)
DELETE FROM public.studios WHERE id IN ('Majestic Studio', 'Elevator Studio');

-- 3. Upsert Studios for UI/UX (Basic Studio, Close Up Room, Pas Photo)
-- Close Up Room & Pas Photo share physical studio slots via shared_slots_group = 'shared_closeup'
INSERT INTO public.studios (id, name, emoji, description, image_url, sort_order, allowed_categories, shared_slots_group, is_active)
VALUES 
    (
        'Basic Studio',
        'Basic Studio',
        '🖤',
        'Self Photo & Party Photo Session',
        '/photo-basic-lg-1.png',
        1,
        '["basic studio"]'::jsonb,
        NULL,
        true
    ),
    (
        'Close Up Room',
        'Close Up Room',
        '✨',
        'Ganti 3 Background dalam Satu Sesi',
        '/photo-basic-mr-1.png',
        2,
        '["close up room"]'::jsonb,
        'shared_closeup',
        true
    ),
    (
        'Pas Photo',
        'Pas Photo',
        '🎩',
        'Pas Photo Formal & Studio',
        '/photo-pasphoto-bl.png',
        3,
        '["pas photo"]'::jsonb,
        'shared_closeup',
        true
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    emoji = EXCLUDED.emoji,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    sort_order = EXCLUDED.sort_order,
    allowed_categories = EXCLUDED.allowed_categories,
    shared_slots_group = EXCLUDED.shared_slots_group,
    is_active = EXCLUDED.is_active;

-- 4. Clean up old/obsolete products to prevent duplicates
UPDATE public.products SET is_active = FALSE WHERE kategori IN ('Thematic', 'Thematic Studio', 'thematic') OR nama LIKE '%Thematic%' OR nama LIKE '%Elevator%' OR nama LIKE '%Majestic%';
DELETE FROM public.products WHERE nama IN ('Self Photo Session', 'Party Photo Session', 'Close Up Session', 'Pas Photo Basic', 'Pas Photo Couple', 'Edited + Colored', 'Add Person', 'Add Time (5 menit)', 'Add Print', 'Special Frame');

-- ── Basic Studio ──────────────────────────────────────────────
INSERT INTO public.products (nama, kategori, tipe_harga, harga_dasar, max_orang, default_bw, is_addon, is_active, deskripsi)
VALUES 
('Self Photo Session', 'Basic Studio', 'normal', 50000, 2, TRUE, FALSE, TRUE, '1-2 orang • 10 menit sesi foto • unlimited jepret • free 1 print basic frame • semua soft file (hitam putih)'),
('Party Photo Session', 'Basic Studio', 'normal', 135000, 8, TRUE, FALSE, TRUE, '3-8 orang • 15 menit sesi foto • unlimited jepret • free 2 print basic frame • semua soft file (hitam putih)');

-- ── Close Up Room ─────────────────────────────────────────────
INSERT INTO public.products (nama, kategori, tipe_harga, harga_dasar, max_orang, default_bw, is_addon, is_active, deskripsi)
VALUES 
('Close Up Session', 'Close Up Room', 'normal', 70000, 2, FALSE, FALSE, TRUE, '1-2 orang • 15 menit sesi foto • ganti 3 background dalam 1 sesi • unlimited jepret • free 1 print special frame • soft files berwarna');

-- ── Pas Photo ─────────────────────────────────────────────────
INSERT INTO public.products (nama, kategori, tipe_harga, harga_dasar, max_orang, default_bw, is_addon, is_active, deskripsi)
VALUES 
('Pas Photo Basic', 'Pas Photo', 'normal', 70000, 1, FALSE, FALSE, TRUE, 'Untuk 1 orang • 10 menit sesi foto • unlimited jepret • 2 photo print • semua soft file berwarna (Cetak 2 lembar 4x6, 5 lembar 3x4, 3 lembar 2x3)'),
('Pas Photo Couple', 'Pas Photo', 'normal', 100000, 2, FALSE, FALSE, TRUE, 'Untuk 2 orang • 10 menit sesi foto • unlimited jepret • 3 photo print • semua soft file berwarna (Cetak 2 lembar 4x6, 5 lembar 3x4, 3 lembar 2x3)');

-- ── Add-Ons ───────────────────────────────────────────────────
INSERT INTO public.products (nama, kategori, tipe_harga, harga_dasar, tier_1, tier_2, tier_3, tier_lebih, max_orang, default_bw, is_addon, is_active, pricing_basis, deskripsi)
VALUES 
('Edited + Colored', 'Add On', 'normal', 20000, NULL, NULL, NULL, NULL, 99, FALSE, TRUE, TRUE, 'qty', 'Semua foto teredit dan berwarna'),
('Add Person', 'Add On', 'normal', 25000, NULL, NULL, NULL, NULL, 99, FALSE, TRUE, TRUE, 'qty', 'Tambahan 1 orang tiap sesi foto'),
('Add Time (5 menit)', 'Add On', 'normal', 15000, NULL, NULL, NULL, NULL, 99, FALSE, TRUE, TRUE, 'qty', 'Tambahan 5 menit tiap sesi foto'),
('Add Print', 'Add On', 'bertingkat', 15000, 15000, 30000, 35000, 13000, 99, FALSE, TRUE, TRUE, 'qty', 'Cetak foto tambahan (Basic Frame)'),
('Special Frame', 'Add On', 'bertingkat', 25000, 25000, 40000, 50000, 19000, 99, FALSE, TRUE, TRUE, 'qty', 'Cetak foto tambahan (Special Frame)');
