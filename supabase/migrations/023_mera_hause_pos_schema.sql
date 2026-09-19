-- =============================================================
-- Migration 023: Méra Hause POS Schema & Official Menu Seed
-- Apply via: Supabase Dashboard > SQL Editor > Run
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Cafe Categories ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cafe_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Cafe Products ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cafe_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES public.cafe_categories(id) ON DELETE SET NULL,
  code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  price INT NOT NULL DEFAULT 0,
  cost_price INT NOT NULL DEFAULT 0,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Cafe Orders (Bills) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cafe_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  order_type TEXT NOT NULL DEFAULT 'DINE_IN', -- 'DINE_IN' | 'TAKEAWAY'
  table_number TEXT,
  customer_name TEXT,
  subtotal INT NOT NULL DEFAULT 0,
  discount_amount INT NOT NULL DEFAULT 0,
  discount_type TEXT DEFAULT 'NONE', -- 'PERCENT' | 'NOMINAL' | 'NONE'
  total_amount INT NOT NULL DEFAULT 0,
  payment_method TEXT, -- 'CASH' | 'QRIS' | 'TRANSFER'
  cash_tendered INT NOT NULL DEFAULT 0,
  change_amount INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PAID', -- 'OPEN_BILL' | 'PAID' | 'CANCELLED' | 'REFUNDED'
  cashier_id UUID REFERENCES public.crew(id) ON DELETE SET NULL,
  cashier_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. Cafe Order Items ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cafe_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.cafe_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.cafe_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  price INT NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT,
  subtotal INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cafe_orders_created_at ON public.cafe_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cafe_orders_status ON public.cafe_orders(status);
CREATE INDEX IF NOT EXISTS idx_cafe_order_items_order_id ON public.cafe_order_items(order_id);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE public.cafe_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cafe_categories_select" ON public.cafe_categories;
CREATE POLICY "cafe_categories_select" ON public.cafe_categories FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "cafe_categories_all" ON public.cafe_categories;
CREATE POLICY "cafe_categories_all" ON public.cafe_categories FOR ALL USING (
  auth.role() = 'service_role' OR public.is_pos_client()
);

DROP POLICY IF EXISTS "cafe_products_select" ON public.cafe_products;
CREATE POLICY "cafe_products_select" ON public.cafe_products FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "cafe_products_all" ON public.cafe_products;
CREATE POLICY "cafe_products_all" ON public.cafe_products FOR ALL USING (
  auth.role() = 'service_role' OR public.is_pos_client()
);

DROP POLICY IF EXISTS "cafe_orders_select" ON public.cafe_orders;
CREATE POLICY "cafe_orders_select" ON public.cafe_orders FOR SELECT USING (
  auth.role() = 'service_role' OR public.is_pos_client()
);

DROP POLICY IF EXISTS "cafe_orders_all" ON public.cafe_orders;
CREATE POLICY "cafe_orders_all" ON public.cafe_orders FOR ALL USING (
  auth.role() = 'service_role' OR public.is_pos_client()
);

DROP POLICY IF EXISTS "cafe_order_items_select" ON public.cafe_order_items;
CREATE POLICY "cafe_order_items_select" ON public.cafe_order_items FOR SELECT USING (
  auth.role() = 'service_role' OR public.is_pos_client()
);

DROP POLICY IF EXISTS "cafe_order_items_all" ON public.cafe_order_items;
CREATE POLICY "cafe_order_items_all" ON public.cafe_order_items FOR ALL USING (
  auth.role() = 'service_role' OR public.is_pos_client()
);

-- ── Seed Official Menu from Menu Méra Hause.xlsx ─────────────
DO $$
DECLARE
  cat_togo UUID;
  cat_espr UUID;
  cat_milk UUID;
  cat_refr UUID;
  cat_dsrt UUID;
BEGIN
  -- Insert categories
  INSERT INTO public.cafe_categories (name, icon, sort_order) VALUES
    ('TO-GO', 'CupSoda', 1)
  ON CONFLICT (name) DO UPDATE SET sort_order = 1 RETURNING id INTO cat_togo;

  INSERT INTO public.cafe_categories (name, icon, sort_order) VALUES
    ('ESPRESSO', 'Coffee', 2)
  ON CONFLICT (name) DO UPDATE SET sort_order = 2 RETURNING id INTO cat_espr;

  INSERT INTO public.cafe_categories (name, icon, sort_order) VALUES
    ('MILK', 'Milk', 3)
  ON CONFLICT (name) DO UPDATE SET sort_order = 3 RETURNING id INTO cat_milk;

  INSERT INTO public.cafe_categories (name, icon, sort_order) VALUES
    ('REFRESHER', 'Sparkles', 4)
  ON CONFLICT (name) DO UPDATE SET sort_order = 4 RETURNING id INTO cat_refr;

  INSERT INTO public.cafe_categories (name, icon, sort_order) VALUES
    ('DESSERT', 'Cake', 5)
  ON CONFLICT (name) DO UPDATE SET sort_order = 5 RETURNING id INTO cat_dsrt;

  -- 1. TO-GO
  INSERT INTO public.cafe_products (category_id, code, name, price, cost_price, sort_order) VALUES
    (cat_togo, 'BOTOL-KS', 'Kopi Susu Botol', 23000, 9764, 1),
    (cat_togo, 'BOTOL-BS', 'Butterscotch Botol', 23000, 10966, 2),
    (cat_togo, 'BOTOL-GT', 'Green Tea Latte Botol', 23000, 11498, 3);

  -- 2. ESPRESSO
  INSERT INTO public.cafe_products (category_id, code, name, price, cost_price, sort_order) VALUES
    (cat_espr, 'ESPRS-KS', 'Kopi Susu', 23000, 7915, 4),
    (cat_espr, 'ESPRS-BS', 'Butterscotch', 23000, 10872, 5),
    (cat_espr, 'ESPRS-TR', 'Tiramisu', 23000, 10724, 6),
    (cat_espr, 'ESPRS-AM', 'Americano', 23000, 5992, 7),
    (cat_espr, 'ESPRS-MR', 'Meraricano', 23000, 8362, 8);

  -- 3. MILK
  INSERT INTO public.cafe_products (category_id, code, name, price, cost_price, sort_order) VALUES
    (cat_milk, 'MILK-GT', 'Green Tea Latte', 23000, 7732, 9),
    (cat_milk, 'MILK-CB', 'Choco Berries', 23000, 12709, 10),
    (cat_milk, 'MILK-CP', 'Choco Pistachio', 23000, 8976, 11),
    (cat_milk, 'MILK-BS', 'Blueberry Sundae', 23000, 7327, 12),
    (cat_milk, 'MILK-SB', 'Sakura Blossoms', 23000, 6178, 13);

  -- 4. REFRESHER
  INSERT INTO public.cafe_products (category_id, code, name, price, cost_price, sort_order) VALUES
    (cat_refr, 'REFRS-GL', 'Green Limuna', 20000, 4645, 14),
    (cat_refr, 'REFRS-BP', 'Bloomy Peachy', 20000, 5149, 15),
    (cat_refr, 'REFRS-BT', 'Blueberry Tea', 18000, 4504, 16),
    (cat_refr, 'REFRS-LM', 'Lemon Tea', 18000, 2560, 17),
    (cat_refr, 'REFRS-LY', 'Lychee Tea', 18000, 4276, 18),
    (cat_refr, 'REFRS-ST', 'Strawberry Tea', 18000, 4275, 19);

  -- 5. DESSERT
  INSERT INTO public.cafe_products (category_id, code, name, price, cost_price, sort_order) VALUES
    (cat_dsrt, 'DSSRT-BCC', 'Blueberry Cheese Cake', 28000, 15938, 20),
    (cat_dsrt, 'DSSRT-LCC', 'London Choco Cake', 38000, 21250, 21),
    (cat_dsrt, 'DSSRT-TRT', 'Tiramisu Tart', 38000, 23800, 22),
    (cat_dsrt, 'DSSRT-MMO', 'Meramisu Original', 28000, 8267, 23),
    (cat_dsrt, 'DSSRT-MMB', 'Meramisu Blueberry', 28000, 11517, 24),
    (cat_dsrt, 'DSSRT-MMBS', 'Meramisu Biscoff', 28000, 12100, 25);
END $$;
