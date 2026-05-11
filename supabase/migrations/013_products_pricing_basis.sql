-- Migration 013: Add pricing_basis to products
--
-- Background:
--   Add Print (id=15) and Special Frame (id=16) are tipe_harga='bertingkat'.
--   Their tiers represent price per UNIT ordered (1 print = tier_1, 2 prints = tier_1+tier_2).
--   The previous code used pax instead of qty as the tier dimension, causing Add Print qty=1
--   to be priced as if 4 people each ordered a print → 15.000+30.000+35.000+13.000 = 93.000
--   instead of the correct tier_1 = 15.000.
--
-- Column semantics:
--   pricing_basis = 'qty' (default) → tier dimension = units ordered  (Add Print, Special Frame)
--   pricing_basis = 'pax'           → tier dimension = group size      (reserved for future add-ons)
--
-- Current products:
--   Edited + Colored Photo (id=13) → tipe_harga='normal', pricing_basis irrelevant
--   Add Print (id=15)              → 'qty'  (1 print=15rb, 2=45rb, 3=80rb, 4+=93rb)
--   Special Frame (id=16)          → 'qty'  (1 frame=25rb, 2=65rb, 3=115rb, 4+=130rb)

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS pricing_basis VARCHAR(10) NOT NULL DEFAULT 'qty'
  CHECK (pricing_basis IN ('pax', 'qty'));

-- All existing add-ons stay 'qty' (the default).
-- No UPDATE needed for current data — just document the intent above.
