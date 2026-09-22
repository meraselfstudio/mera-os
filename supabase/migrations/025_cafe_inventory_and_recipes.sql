-- =============================================================
-- Migration 025: Méra Hause POS — Cafe Inventory, Recipes (BOM), & Stock Opname
-- Diselaraskan 100% dengan Google Spreadsheet Master HPP & Bar
-- Apply via: Supabase Dashboard > SQL Editor > Run
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Cafe Ingredients (Master Bahan Baku) ──────────────────
CREATE TABLE IF NOT EXISTS public.cafe_ingredients (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Bahan Baku',
  unit TEXT NOT NULL DEFAULT 'pcs', -- 'gram', 'ml', 'pcs', 'slice'
  current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
  minimum_stock NUMERIC(12, 2) NOT NULL DEFAULT 10,
  cost_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Cafe Recipes (Resep Takaran Bahan per Menu / BOM) ─────
CREATE TABLE IF NOT EXISTS public.cafe_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT NOT NULL,
  ingredient_id TEXT NOT NULL REFERENCES public.cafe_ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, ingredient_id)
);

-- ── 3. Cafe Stock Mutations & Opname Log ─────────────────────
CREATE TABLE IF NOT EXISTS public.cafe_stock_mutations (
  id TEXT PRIMARY KEY,
  ingredient_id TEXT NOT NULL REFERENCES public.cafe_ingredients(id) ON DELETE CASCADE,
  ingredient_name TEXT,
  type TEXT NOT NULL, -- 'SALE' | 'RESTOCK' | 'OPNAME' | 'WASTE' | 'CANCEL_RESTORE'
  quantity NUMERIC(12, 2) NOT NULL, -- negatif jika keluar, positif jika masuk
  previous_stock NUMERIC(12, 2) NOT NULL,
  final_stock NUMERIC(12, 2) NOT NULL,
  reference_id TEXT, -- Order number atau Expense ID
  notes TEXT,
  created_by TEXT, -- Nama kasir / kru (e.g. Nona, Rara, Owner)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cafe_ingredients_category ON public.cafe_ingredients(category);
CREATE INDEX IF NOT EXISTS idx_cafe_recipes_product_id ON public.cafe_recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_cafe_recipes_ingredient_id ON public.cafe_recipes(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_cafe_stock_mutations_ingredient_id ON public.cafe_stock_mutations(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_cafe_stock_mutations_created_at ON public.cafe_stock_mutations(created_at DESC);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE public.cafe_ingredients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_recipes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_stock_mutations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cafe_ingredients_select" ON public.cafe_ingredients;
CREATE POLICY "cafe_ingredients_select" ON public.cafe_ingredients FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "cafe_ingredients_all" ON public.cafe_ingredients;
CREATE POLICY "cafe_ingredients_all" ON public.cafe_ingredients FOR ALL USING (TRUE);

DROP POLICY IF EXISTS "cafe_recipes_select" ON public.cafe_recipes;
CREATE POLICY "cafe_recipes_select" ON public.cafe_recipes FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "cafe_recipes_all" ON public.cafe_recipes;
CREATE POLICY "cafe_recipes_all" ON public.cafe_recipes FOR ALL USING (TRUE);

DROP POLICY IF EXISTS "cafe_stock_mutations_select" ON public.cafe_stock_mutations;
CREATE POLICY "cafe_stock_mutations_select" ON public.cafe_stock_mutations FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "cafe_stock_mutations_all" ON public.cafe_stock_mutations;
CREATE POLICY "cafe_stock_mutations_all" ON public.cafe_stock_mutations FOR ALL USING (TRUE);

-- ── Seed Master Ingredients (Item Bar & Item Cake Sesuai Spreadsheet) ──
INSERT INTO public.cafe_ingredients (id, code, name, category, unit, current_stock, minimum_stock, cost_per_unit, is_active) VALUES
-- Biji Kopi & Susu
('ing-beans-robusta', 'BEANS-ROB', 'Robusta Beans (Lord RB)', 'Biji Kopi & Susu', 'gram', 2000, 300, 160.00, true),
('ing-beans-arabica', 'BEANS-ARA', 'Arabica Beans (Cherry Ruby)', 'Biji Kopi & Susu', 'gram', 1000, 200, 340.00, true),
('ing-milk-uht-diamond', 'MILK-UHT-DMD', 'Susu UHT (Diamond)', 'Biji Kopi & Susu', 'ml', 15000, 2000, 22.50, true),
('ing-milk-fresh-greenfields', 'MILK-FRESH-GF', 'Fresh Milk (Greenfields)', 'Biji Kopi & Susu', 'ml', 5000, 1000, 19.00, true),

-- Bahan Olahan & Gula
('ing-creamer-powder', 'CRM-POWDER', 'Creamer Powder (RC-ND-08)', 'Bahan Olahan & Gula', 'gram', 5000, 1000, 71.00, true),
('ing-skm-dairy-champ', 'SKM-DC', 'SKM (Dairy Champ)', 'Bahan Olahan & Gula', 'ml', 4000, 1000, 30.00, true),
('ing-sugar-curah', 'SUGAR-CURAH', 'Gula Pasir (Curah)', 'Bahan Olahan & Gula', 'gram', 5000, 1000, 17.50, true),
('ing-palm-sugar', 'PALM-SUGAR', 'Palm Sugar (Pigo)', 'Bahan Olahan & Gula', 'gram', 2000, 500, 28.00, true),
('ing-butter-unsalted', 'BUTTER-UNSALT', 'Unsalted Butter (BlueBand)', 'Bahan Olahan & Gula', 'gram', 1000, 250, 76.00, true),
('ing-heavy-cream', 'HEAVY-CREAM', 'Heavy Cream (BlueBand)', 'Bahan Olahan & Gula', 'ml', 3000, 500, 65.00, true),
('ing-whip-cream', 'WHIP-CREAM', 'Whip Cream (Rich Creme)', 'Bahan Olahan & Gula', 'gram', 1200, 300, 135.00, true),
('ing-biscuit-lotus', 'BIS-LOTUS', 'Lotus Biscoff Biscuit', 'Bahan Olahan & Gula', 'gram', 500, 100, 176.00, true),

-- Bubuk & Teh
('ing-powder-greentea', 'POWDER-GT', 'Green Tea Powder (Chatramue)', 'Bubuk & Teh', 'gram', 600, 100, 300.00, true),
('ing-tea-dandang', 'TEA-DANDANG', 'Black Tea (Dandang)', 'Bubuk & Teh', 'pcs', 100, 20, 117.20, true),
('ing-powder-choco', 'POWDER-CHOCO', 'Chocolate Powder (Mili)', 'Bubuk & Teh', 'gram', 2000, 300, 67.00, true),
('ing-powder-cocoa', 'POWDER-COCOA', 'Cocoa Powder (Windmolen)', 'Bubuk & Teh', 'gram', 240, 50, 256.25, true),

-- Sirup & Buah
('ing-syr-strawberry-denali', 'SYR-STR-DEN', 'Strawberry Syrup (Denali)', 'Sirup & Buah', 'ml', 1500, 300, 140.00, true),
('ing-syr-vanilla-delifru', 'SYR-VAN-DEL', 'Vanilla Syrup (Delifru)', 'Sirup & Buah', 'ml', 2000, 300, 110.00, true),
('ing-syr-peach-delifru', 'SYR-PCH-DEL', 'Peach Syrup (Delifru)', 'Sirup & Buah', 'ml', 2000, 300, 110.00, true),
('ing-syr-sakura-arunika', 'SYR-SAK-ARU', 'Sakura Syrup (Arunika)', 'Sirup & Buah', 'ml', 2000, 300, 85.00, true),
('ing-syr-airis-arunika', 'SYR-AIR-ARU', 'Airis Cream Syrup (Arunika)', 'Sirup & Buah', 'ml', 2000, 300, 85.00, true),
('ing-syr-blueberry-arunika', 'SYR-BLU-ARU', 'Blueberry Syrup (Arunika)', 'Sirup & Buah', 'ml', 2000, 300, 85.00, true),
('ing-syr-pistachio-arunika', 'SYR-PIS-ARU', 'Pistachio Syrup (Arunika)', 'Sirup & Buah', 'ml', 2000, 300, 85.00, true),
('ing-syr-lemon-marjan', 'SYR-LEM-MAR', 'Lemon Syrup (Marjan)', 'Sirup & Buah', 'ml', 1380, 250, 53.26, true),
('ing-syr-lychee-marjan', 'SYR-LYC-MAR', 'Lychee Syrup (Marjan)', 'Sirup & Buah', 'ml', 1380, 250, 53.26, true),
('ing-fruit-lychee-naraya', 'FRU-LYC-NAR', 'Leci Buah (Naraya Kaleng)', 'Sirup & Buah', 'gram', 1695, 300, 61.95, true),
('ing-fruit-blueberry-frozen', 'FRU-BLU-FRO', 'Blueberry Frozen (Ilham)', 'Sirup & Buah', 'gram', 2000, 400, 65.00, true),
('ing-fruit-strawberry-frozen', 'FRU-STR-FRO', 'Strawberry Frozen (Ilham)', 'Sirup & Buah', 'gram', 2000, 400, 35.00, true),
('ing-fruit-lemon-superindo', 'FRU-LEM-SUP', 'Lemon Fresh (Superindo)', 'Sirup & Buah', 'gram', 1000, 200, 63.24, true),

-- Bahan Pendukung & Kemasan
('ing-water-cleo', 'WTR-CLEO', 'Air Galon Cleo', 'Bahan Pendukung & Kemasan', 'ml', 38000, 5000, 1.05, true),
('ing-ice-cube', 'ICE-CUBE', 'Es Batu Kristal', 'Bahan Pendukung & Kemasan', 'gram', 25000, 5000, 1.30, true),
('ing-cup-ice', 'CUP-ICE', 'Cup Ice Plastik', 'Bahan Pendukung & Kemasan', 'pcs', 200, 50, 520.00, true),
('ing-straw', 'STRAW', 'Sedotan Steril', 'Bahan Pendukung & Kemasan', 'pcs', 500, 100, 100.00, true),
('ing-bottle-gepeng', 'BOTOL-GEPENG', 'Botol Gepeng 250ml', 'Bahan Pendukung & Kemasan', 'pcs', 100, 20, 1950.00, true),

-- Dessert & Pastry
('ing-cake-bcc', 'CAKE-BCC', 'Blueberry Cheese Cake (Bunda Kika)', 'Dessert & Pastry', 'slice', 16, 4, 15937.50, true),
('ing-cake-lcc', 'CAKE-LCC', 'London Choco Cake (Bunda Kika)', 'Dessert & Pastry', 'slice', 16, 4, 17000.00, true),
('ing-cake-trt', 'CAKE-TRT', 'Tiramisu Tart (Bunda Kika)', 'Dessert & Pastry', 'slice', 16, 4, 23800.00, true),
('ing-cake-mmo', 'CAKE-MMO', 'Meramisu Original Cup', 'Dessert & Pastry', 'pcs', 18, 6, 8266.67, true),
('ing-cake-mmb', 'CAKE-MMB', 'Meramisu Blueberry Cup', 'Dessert & Pastry', 'pcs', 18, 6, 11516.67, true),
('ing-cake-mmbs', 'CAKE-MMBS', 'Meramisu Biscoff Cup', 'Dessert & Pastry', 'pcs', 18, 6, 12100.00, true),

-- Bahan Olahan Bar (Prep)
('ing-prep-white-syrup', 'PREP-WS', 'White Syrup (Prep)', 'Bahan Olahan (Prep)', 'ml', 3000, 500, 48.40, true),
('ing-prep-simple-syrup', 'PREP-SS', 'Simple Syrup (Prep)', 'Bahan Olahan (Prep)', 'ml', 2500, 500, 13.90, true),
('ing-prep-butterscotch-sauce', 'PREP-BS', 'Butterscotch Sauce (Prep)', 'Bahan Olahan (Prep)', 'ml', 1500, 300, 74.00, true),
('ing-prep-cold-creme', 'PREP-CC', 'Cold Creme (Prep)', 'Bahan Olahan (Prep)', 'ml', 1500, 300, 67.60, true),
('ing-prep-pistachio-creme', 'PREP-PC', 'Pistachio Creme (Prep)', 'Bahan Olahan (Prep)', 'ml', 1000, 200, 83.40, true),
('ing-prep-greentea-base', 'PREP-GT', 'Green Tea Base (Prep)', 'Bahan Olahan (Prep)', 'ml', 2000, 400, 44.00, true),
('ing-prep-choco-base', 'PREP-CB', 'Choco Base (Prep)', 'Bahan Olahan (Prep)', 'ml', 2000, 400, 45.00, true),
('ing-prep-base-tea', 'PREP-BT', 'Base Tea (Prep)', 'Bahan Olahan (Prep)', 'ml', 4000, 800, 2.20, true),
('ing-prep-sakura-base', 'PREP-SB', 'Sakura Base (Prep)', 'Bahan Olahan (Prep)', 'ml', 1500, 300, 37.50, true),
('ing-prep-strawberry-jam', 'PREP-SJ', 'Strawberry Jam (Prep)', 'Bahan Olahan (Prep)', 'gram', 1000, 200, 48.10, true),
('ing-prep-blueberry-jam', 'PREP-BJ', 'Blueberry Jam (Prep)', 'Bahan Olahan (Prep)', 'gram', 1000, 200, 102.50, true)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  cost_per_unit = EXCLUDED.cost_per_unit,
  minimum_stock = EXCLUDED.minimum_stock;
