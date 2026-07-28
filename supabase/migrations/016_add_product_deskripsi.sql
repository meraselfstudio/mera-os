-- 016_add_product_deskripsi.sql
-- Adds the deskripsi column to products if it doesn't already exist.
-- The column was referenced in seed scripts but missing from the main table definition.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deskripsi TEXT;

COMMENT ON COLUMN public.products.deskripsi IS 'Deskripsi paket atau add-on yang ditampilkan di halaman pricelist pelanggan';
