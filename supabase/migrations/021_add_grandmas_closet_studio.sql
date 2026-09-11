-- ============================================================
-- Migration 021: Add Granma's Closet Studio & Product
-- Harga 70.000 (1-2 pax), durasi 10 menit, background "dalam lemari"
-- Slot fisik independen (shared_slots_group = NULL, tidak sharing dengan studio lain)
-- ============================================================

-- 1. Upsert Studio Granma's Closet
INSERT INTO public.studios (
    id,
    name,
    emoji,
    description,
    image_url,
    sort_order,
    allowed_categories,
    shared_slots_group,
    is_active
)
VALUES (
    'Granma''s Closet',
    'Granma''s Closet',
    '👗',
    'Background "Dalam Lemari"',
    '/4.grandma''s-closet-card.png',
    4,
    '["granma''s closet", "grandma''s closet"]'::jsonb,
    NULL, -- Tidak sharing slot dengan studio lain
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

-- 2. Clean up any previous duplicates if any
DELETE FROM public.products 
WHERE nama IN ('Granma''s Closet Session', 'Grandma''s Closet Session')
   OR kategori IN ('Granma''s Closet', 'Grandma''s Closet');

-- 3. Insert Product for Granma's Closet (10 menit, background dalam lemari)
INSERT INTO public.products (
    nama,
    kategori,
    tipe_harga,
    harga_dasar,
    max_orang,
    default_bw,
    is_addon,
    is_active,
    pricing_basis,
    deskripsi
)
VALUES (
    'Granma''s Closet Session',
    'Granma''s Closet',
    'normal',
    70000,
    2,
    FALSE,
    FALSE,
    TRUE,
    'qty',
    '1-2 orang • 10 menit sesi foto • sesi foto di dalam lemari • unlimited jepret • free 1 print special frame • soft files berwarna'
);
