-- =============================================================
-- Migration 025: Méra Hause POS — Cafe Inventory, Recipes (BOM), & Stock Opname
-- Apply via: Supabase Dashboard > SQL Editor > Run
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Cafe Ingredients (Master Bahan Baku) ──────────────────
CREATE TABLE IF NOT EXISTS public.cafe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Bahan Baku', -- 'Kopi & Susu', 'Sirup & Puree', 'Bubuk & Teh', 'Kemasan & Cup', 'Dessert & Pastry'
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
  product_id UUID NOT NULL REFERENCES public.cafe_products(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.cafe_ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, ingredient_id)
);

-- ── 3. Cafe Stock Mutations & Opname Log ─────────────────────
CREATE TABLE IF NOT EXISTS public.cafe_stock_mutations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_id UUID NOT NULL REFERENCES public.cafe_ingredients(id) ON DELETE CASCADE,
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
ALTER TABLE public.cafe_ingredients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_recipes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_stock_mutations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cafe_ingredients_select" ON public.cafe_ingredients;
CREATE POLICY "cafe_ingredients_select" ON public.cafe_ingredients FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "cafe_ingredients_all" ON public.cafe_ingredients;
CREATE POLICY "cafe_ingredients_all" ON public.cafe_ingredients FOR ALL USING (
  auth.role() = 'service_role' OR public.is_pos_client()
);

DROP POLICY IF EXISTS "cafe_recipes_select" ON public.cafe_recipes;
CREATE POLICY "cafe_recipes_select" ON public.cafe_recipes FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "cafe_recipes_all" ON public.cafe_recipes;
CREATE POLICY "cafe_recipes_all" ON public.cafe_recipes FOR ALL USING (
  auth.role() = 'service_role' OR public.is_pos_client()
);

DROP POLICY IF EXISTS "cafe_stock_mutations_select" ON public.cafe_stock_mutations;
CREATE POLICY "cafe_stock_mutations_select" ON public.cafe_stock_mutations FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "cafe_stock_mutations_all" ON public.cafe_stock_mutations;
CREATE POLICY "cafe_stock_mutations_all" ON public.cafe_stock_mutations FOR ALL USING (
  auth.role() = 'service_role' OR public.is_pos_client()
);

-- ── Seed Bahan Baku Default Méra Hause ───────────────────────
INSERT INTO public.cafe_ingredients (code, name, category, unit, current_stock, minimum_stock, cost_per_unit) VALUES
  ('ESPR-BEANS', 'Biji Kopi House Blend', 'Kopi & Susu', 'gram', 2500, 350, 160),
  ('MILK-UHT', 'Susu Fresh Milk UHT', 'Kopi & Susu', 'ml', 16000, 2000, 20),
  ('SYR-AREN', 'Sirup Gula Aren', 'Sirup & Puree', 'ml', 3000, 500, 35),
  ('SYR-BS', 'Sirup Butterscotch', 'Sirup & Puree', 'ml', 2000, 300, 60),
  ('SYR-TR', 'Sirup Tiramisu', 'Sirup & Puree', 'ml', 2000, 300, 55),
  ('POW-GT', 'Bubuk Green Tea Matcha', 'Bubuk & Teh', 'gram', 1000, 200, 250),
  ('POW-CHOC', 'Bubuk Cokelat Dark', 'Bubuk & Teh', 'gram', 1000, 200, 200),
  ('SYR-BLUE', 'Sirup Blueberry Puree', 'Sirup & Puree', 'ml', 2000, 300, 65),
  ('SYR-SAK', 'Sirup Sakura Blossom', 'Sirup & Puree', 'ml', 1000, 200, 70),
  ('SYR-PEACH', 'Sirup Peach', 'Sirup & Puree', 'ml', 1000, 200, 60),
  ('TEA-BAG', 'Kantong Daun Teh Pilihan', 'Bubuk & Teh', 'pcs', 100, 20, 1000),
  ('EXT-LEMON', 'Ekstrak Sari Lemon', 'Sirup & Puree', 'ml', 1000, 200, 45),
  ('PACK-BOTOL', 'Botol Minuman 250ml', 'Kemasan & Cup', 'pcs', 80, 15, 2200),
  ('PACK-CUP16', 'Cup 16oz + Tutup Lid', 'Kemasan & Cup', 'pcs', 300, 40, 850),
  ('PACK-STRAW', 'Sedotan Steril', 'Kemasan & Cup', 'pcs', 300, 40, 120),
  ('CAKE-BCC', 'Blueberry Cheese Cake Slice', 'Dessert & Pastry', 'slice', 12, 3, 15938),
  ('CAKE-LCC', 'London Choco Cake Slice', 'Dessert & Pastry', 'slice', 12, 3, 21250),
  ('CAKE-TRT', 'Tiramisu Tart Slice', 'Dessert & Pastry', 'slice', 12, 3, 23800),
  ('CAKE-MMO', 'Meramisu Original Cup', 'Dessert & Pastry', 'pcs', 16, 4, 8267),
  ('CAKE-MMB', 'Meramisu Blueberry Cup', 'Dessert & Pastry', 'pcs', 16, 4, 11517),
  ('CAKE-MMBS', 'Meramisu Biscoff Cup', 'Dessert & Pastry', 'pcs', 16, 4, 12100)
ON CONFLICT (code) DO NOTHING;
