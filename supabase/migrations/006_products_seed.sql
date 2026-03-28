-- ============================================================
-- Migration 006: Méra Studio — Product Catalog Seed (v2)
-- Self Photo & Party Photo → BW by default
-- Pas Photo removed from Basic Studio
-- Thematic (BW) → Elevator + Majestic
-- ============================================================

-- Clear existing products
DELETE FROM public.products WHERE is_active = TRUE;

-- ── Basic Studio ──────────────────────────────────────────────
-- Self Photo Session (1–2 orang, default BW — no phone → add-on needed for color)
INSERT INTO public.products (nama, kategori, tipe_harga, harga_dasar, max_orang, default_bw, is_addon, is_active)
VALUES ('Self Photo Session', 'Basic Studio', 'normal', 50000, 2, TRUE, FALSE, TRUE);

-- Party Photo Session (max 8 orang, default BW — no phone → add-on needed for color)
INSERT INTO public.products (nama, kategori, tipe_harga, harga_dasar, max_orang, default_bw, is_addon, is_active)
VALUES ('Party Photo Session', 'Basic Studio', 'normal', 135000, 8, TRUE, FALSE, TRUE);

-- ── Pas Photo (standalone studio, separate category) ──────────
INSERT INTO public.products (nama, kategori, tipe_harga, harga_dasar, max_orang, default_bw, is_addon, is_active)
VALUES ('Pas Photo Basic', 'Pas Photo', 'normal', 80000, 1, FALSE, FALSE, TRUE);

-- ── Pas Photo (standalone studio, separate category) ──────────
INSERT INTO public.products (nama, kategori, tipe_harga, harga_dasar, max_orang, default_bw, is_addon, is_active)
VALUES ('Pas Photo Package', 'Pas Photo', 'normal', 100000, 1, FALSE, FALSE, TRUE);

-- ── Thematic (Elevator + Majestic share these packages) ──────
-- Thematic Basic: 1 orang, default BW — no phone → add-on needed for color
INSERT INTO public.products (nama, kategori, tipe_harga, harga_dasar, max_orang, default_bw, is_addon, is_active)
VALUES ('Thematic Basic', 'Thematic', 'normal', 200000, 1, TRUE, FALSE, TRUE);

-- Thematic Package: 1–2 orang, berwarna (tidak perlu add-on)
INSERT INTO public.products (nama, kategori, tipe_harga, harga_dasar, max_orang, default_bw, is_addon, is_active)
VALUES ('Thematic Package', 'Thematic', 'normal', 300000, 2, FALSE, FALSE, TRUE);

-- ── Add-Ons ──────────────────────────────────────────────────
-- Edited + Colored: hanya tampil untuk paket dengan default_bw = TRUE
INSERT INTO public.products (nama, kategori, tipe_harga, harga_dasar, max_orang, default_bw, is_addon, is_active)
VALUES ('Edited + Colored', 'Add On', 'normal', 50000, 99, FALSE, TRUE, TRUE);
