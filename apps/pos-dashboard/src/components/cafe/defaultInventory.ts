// =============================================================
// Méra Hause POS — Master Ingredients & Recipes (BOM)
// Diselaraskan 100% dengan Google Spreadsheet Master HPP & Bar
// =============================================================

import type { CafeIngredient, CafeRecipeItem } from './types'

export const DEFAULT_CAFE_INGREDIENTS: CafeIngredient[] = [
  // ─── 1. Biji Kopi & Susu ──────────────────────────────────
  {
    id: 'ing-beans-robusta',
    code: 'BEANS-ROB',
    name: 'Robusta Beans (Lord RB)',
    category: 'Biji Kopi & Susu',
    unit: 'gram',
    current_stock: 2000,
    minimum_stock: 300,
    cost_per_unit: 160.0,
    is_active: true,
  },
  {
    id: 'ing-beans-arabica',
    code: 'BEANS-ARA',
    name: 'Arabica Beans (Cherry Ruby)',
    category: 'Biji Kopi & Susu',
    unit: 'gram',
    current_stock: 1000,
    minimum_stock: 200,
    cost_per_unit: 340.0,
    is_active: true,
  },
  {
    id: 'ing-milk-uht-diamond',
    code: 'MILK-UHT-DMD',
    name: 'Susu UHT (Diamond)',
    category: 'Biji Kopi & Susu',
    unit: 'ml',
    current_stock: 15000,
    minimum_stock: 2000,
    cost_per_unit: 22.5,
    is_active: true,
  },
  {
    id: 'ing-milk-fresh-greenfields',
    code: 'MILK-FRESH-GF',
    name: 'Fresh Milk (Greenfields)',
    category: 'Biji Kopi & Susu',
    unit: 'ml',
    current_stock: 5000,
    minimum_stock: 1000,
    cost_per_unit: 19.0,
    is_active: true,
  },

  // ─── 2. Bahan Olahan & Gula ──────────────────────────────
  {
    id: 'ing-creamer-powder',
    code: 'CRM-POWDER',
    name: 'Creamer Powder (RC-ND-08)',
    category: 'Bahan Olahan & Gula',
    unit: 'gram',
    current_stock: 5000,
    minimum_stock: 1000,
    cost_per_unit: 71.0,
    is_active: true,
  },
  {
    id: 'ing-skm-dairy-champ',
    code: 'SKM-DC',
    name: 'SKM (Dairy Champ)',
    category: 'Bahan Olahan & Gula',
    unit: 'ml',
    current_stock: 4000,
    minimum_stock: 1000,
    cost_per_unit: 30.0,
    is_active: true,
  },
  {
    id: 'ing-sugar-curah',
    code: 'SUGAR-CURAH',
    name: 'Gula Pasir (Curah)',
    category: 'Bahan Olahan & Gula',
    unit: 'gram',
    current_stock: 5000,
    minimum_stock: 1000,
    cost_per_unit: 17.5,
    is_active: true,
  },
  {
    id: 'ing-palm-sugar',
    code: 'PALM-SUGAR',
    name: 'Palm Sugar (Pigo)',
    category: 'Bahan Olahan & Gula',
    unit: 'gram',
    current_stock: 2000,
    minimum_stock: 500,
    cost_per_unit: 28.0,
    is_active: true,
  },
  {
    id: 'ing-butter-unsalted',
    code: 'BUTTER-UNSALT',
    name: 'Unsalted Butter (BlueBand)',
    category: 'Bahan Olahan & Gula',
    unit: 'gram',
    current_stock: 1000,
    minimum_stock: 250,
    cost_per_unit: 76.0,
    is_active: true,
  },
  {
    id: 'ing-heavy-cream',
    code: 'HEAVY-CREAM',
    name: 'Heavy Cream (BlueBand)',
    category: 'Bahan Olahan & Gula',
    unit: 'ml',
    current_stock: 3000,
    minimum_stock: 500,
    cost_per_unit: 65.0,
    is_active: true,
  },
  {
    id: 'ing-whip-cream',
    code: 'WHIP-CREAM',
    name: 'Whip Cream (Rich Creme)',
    category: 'Bahan Olahan & Gula',
    unit: 'gram',
    current_stock: 1200,
    minimum_stock: 300,
    cost_per_unit: 135.0,
    is_active: true,
  },
  {
    id: 'ing-biscuit-lotus',
    code: 'BIS-LOTUS',
    name: 'Lotus Biscoff Biscuit',
    category: 'Bahan Olahan & Gula',
    unit: 'gram',
    current_stock: 500,
    minimum_stock: 100,
    cost_per_unit: 176.0,
    is_active: true,
  },

  // ─── 3. Bubuk & Teh ──────────────────────────────────────
  {
    id: 'ing-powder-greentea',
    code: 'POWDER-GT',
    name: 'Green Tea Powder (Chatramue)',
    category: 'Bubuk & Teh',
    unit: 'gram',
    current_stock: 600,
    minimum_stock: 100,
    cost_per_unit: 300.0,
    is_active: true,
  },
  {
    id: 'ing-tea-dandang',
    code: 'TEA-DANDANG',
    name: 'Black Tea (Dandang)',
    category: 'Bubuk & Teh',
    unit: 'pcs',
    current_stock: 100,
    minimum_stock: 20,
    cost_per_unit: 117.2,
    is_active: true,
  },
  {
    id: 'ing-powder-choco',
    code: 'POWDER-CHOCO',
    name: 'Chocolate Powder (Mili)',
    category: 'Bubuk & Teh',
    unit: 'gram',
    current_stock: 2000,
    minimum_stock: 300,
    cost_per_unit: 67.0,
    is_active: true,
  },
  {
    id: 'ing-powder-cocoa',
    code: 'POWDER-COCOA',
    name: 'Cocoa Powder (Windmolen)',
    category: 'Bubuk & Teh',
    unit: 'gram',
    current_stock: 240,
    minimum_stock: 50,
    cost_per_unit: 256.25,
    is_active: true,
  },

  // ─── 4. Sirup & Buah ─────────────────────────────────────
  {
    id: 'ing-syr-strawberry-denali',
    code: 'SYR-STR-DEN',
    name: 'Strawberry Syrup (Denali)',
    category: 'Sirup & Buah',
    unit: 'ml',
    current_stock: 1500,
    minimum_stock: 300,
    cost_per_unit: 140.0,
    is_active: true,
  },
  {
    id: 'ing-syr-vanilla-delifru',
    code: 'SYR-VAN-DEL',
    name: 'Vanilla Syrup (Delifru)',
    category: 'Sirup & Buah',
    unit: 'ml',
    current_stock: 2000,
    minimum_stock: 300,
    cost_per_unit: 110.0,
    is_active: true,
  },
  {
    id: 'ing-syr-peach-delifru',
    code: 'SYR-PCH-DEL',
    name: 'Peach Syrup (Delifru)',
    category: 'Sirup & Buah',
    unit: 'ml',
    current_stock: 2000,
    minimum_stock: 300,
    cost_per_unit: 110.0,
    is_active: true,
  },
  {
    id: 'ing-syr-sakura-arunika',
    code: 'SYR-SAK-ARU',
    name: 'Sakura Syrup (Arunika)',
    category: 'Sirup & Buah',
    unit: 'ml',
    current_stock: 2000,
    minimum_stock: 300,
    cost_per_unit: 85.0,
    is_active: true,
  },
  {
    id: 'ing-syr-airis-arunika',
    code: 'SYR-AIR-ARU',
    name: 'Airis Cream Syrup (Arunika)',
    category: 'Sirup & Buah',
    unit: 'ml',
    current_stock: 2000,
    minimum_stock: 300,
    cost_per_unit: 85.0,
    is_active: true,
  },
  {
    id: 'ing-syr-blueberry-arunika',
    code: 'SYR-BLU-ARU',
    name: 'Blueberry Syrup (Arunika)',
    category: 'Sirup & Buah',
    unit: 'ml',
    current_stock: 2000,
    minimum_stock: 300,
    cost_per_unit: 85.0,
    is_active: true,
  },
  {
    id: 'ing-syr-pistachio-arunika',
    code: 'SYR-PIS-ARU',
    name: 'Pistachio Syrup (Arunika)',
    category: 'Sirup & Buah',
    unit: 'ml',
    current_stock: 2000,
    minimum_stock: 300,
    cost_per_unit: 85.0,
    is_active: true,
  },
  {
    id: 'ing-syr-lemon-marjan',
    code: 'SYR-LEM-MAR',
    name: 'Lemon Syrup (Marjan)',
    category: 'Sirup & Buah',
    unit: 'ml',
    current_stock: 1380,
    minimum_stock: 250,
    cost_per_unit: 53.26,
    is_active: true,
  },
  {
    id: 'ing-syr-lychee-marjan',
    code: 'SYR-LYC-MAR',
    name: 'Lychee Syrup (Marjan)',
    category: 'Sirup & Buah',
    unit: 'ml',
    current_stock: 1380,
    minimum_stock: 250,
    cost_per_unit: 53.26,
    is_active: true,
  },
  {
    id: 'ing-fruit-lychee-naraya',
    code: 'FRU-LYC-NAR',
    name: 'Leci Buah (Naraya Kaleng)',
    category: 'Sirup & Buah',
    unit: 'gram',
    current_stock: 1695,
    minimum_stock: 300,
    cost_per_unit: 61.95,
    is_active: true,
  },
  {
    id: 'ing-fruit-blueberry-frozen',
    code: 'FRU-BLU-FRO',
    name: 'Blueberry Frozen (Ilham)',
    category: 'Sirup & Buah',
    unit: 'gram',
    current_stock: 2000,
    minimum_stock: 400,
    cost_per_unit: 65.0,
    is_active: true,
  },
  {
    id: 'ing-fruit-strawberry-frozen',
    code: 'FRU-STR-FRO',
    name: 'Strawberry Frozen (Ilham)',
    category: 'Sirup & Buah',
    unit: 'gram',
    current_stock: 2000,
    minimum_stock: 400,
    cost_per_unit: 35.0,
    is_active: true,
  },
  {
    id: 'ing-fruit-lemon-superindo',
    code: 'FRU-LEM-SUP',
    name: 'Lemon Fresh (Superindo)',
    category: 'Sirup & Buah',
    unit: 'gram',
    current_stock: 1000,
    minimum_stock: 200,
    cost_per_unit: 63.24,
    is_active: true,
  },

  // ─── 5. Bahan Pendukung & Kemasan ────────────────────────
  {
    id: 'ing-water-cleo',
    code: 'WTR-CLEO',
    name: 'Air Galon Cleo',
    category: 'Bahan Pendukung & Kemasan',
    unit: 'ml',
    current_stock: 38000,
    minimum_stock: 5000,
    cost_per_unit: 1.05,
    is_active: true,
  },
  {
    id: 'ing-ice-cube',
    code: 'ICE-CUBE',
    name: 'Es Batu Kristal',
    category: 'Bahan Pendukung & Kemasan',
    unit: 'gram',
    current_stock: 25000,
    minimum_stock: 5000,
    cost_per_unit: 1.3,
    is_active: true,
  },
  {
    id: 'ing-cup-ice',
    code: 'CUP-ICE',
    name: 'Cup Ice Plastik',
    category: 'Bahan Pendukung & Kemasan',
    unit: 'pcs',
    current_stock: 200,
    minimum_stock: 50,
    cost_per_unit: 520.0,
    is_active: true,
  },
  {
    id: 'ing-straw',
    code: 'STRAW',
    name: 'Sedotan Steril',
    category: 'Bahan Pendukung & Kemasan',
    unit: 'pcs',
    current_stock: 500,
    minimum_stock: 100,
    cost_per_unit: 100.0,
    is_active: true,
  },
  {
    id: 'ing-bottle-gepeng',
    code: 'BOTOL-GEPENG',
    name: 'Botol Gepeng 250ml',
    category: 'Bahan Pendukung & Kemasan',
    unit: 'pcs',
    current_stock: 100,
    minimum_stock: 20,
    cost_per_unit: 1950.0,
    is_active: true,
  },

  // ─── 6. Dessert & Pastry ─────────────────────────────────
  {
    id: 'ing-cake-bcc',
    code: 'CAKE-BCC',
    name: 'Blueberry Cheese Cake (Bunda Kika)',
    category: 'Dessert & Pastry',
    unit: 'slice',
    current_stock: 16,
    minimum_stock: 4,
    cost_per_unit: 15937.5,
    is_active: true,
  },
  {
    id: 'ing-cake-lcc',
    code: 'CAKE-LCC',
    name: 'London Choco Cake (Bunda Kika)',
    category: 'Dessert & Pastry',
    unit: 'slice',
    current_stock: 16,
    minimum_stock: 4,
    cost_per_unit: 17000.0,
    is_active: true,
  },
  {
    id: 'ing-cake-trt',
    code: 'CAKE-TRT',
    name: 'Tiramisu Tart (Bunda Kika)',
    category: 'Dessert & Pastry',
    unit: 'slice',
    current_stock: 16,
    minimum_stock: 4,
    cost_per_unit: 23800.0,
    is_active: true,
  },
  {
    id: 'ing-cake-mmo',
    code: 'CAKE-MMO',
    name: 'Meramisu Original Cup',
    category: 'Dessert & Pastry',
    unit: 'pcs',
    current_stock: 18,
    minimum_stock: 6,
    cost_per_unit: 8266.67,
    is_active: true,
  },
  {
    id: 'ing-cake-mmb',
    code: 'CAKE-MMB',
    name: 'Meramisu Blueberry Cup',
    category: 'Dessert & Pastry',
    unit: 'pcs',
    current_stock: 18,
    minimum_stock: 6,
    cost_per_unit: 11516.67,
    is_active: true,
  },
  {
    id: 'ing-cake-mmbs',
    code: 'CAKE-MMBS',
    name: 'Meramisu Biscoff Cup',
    category: 'Dessert & Pastry',
    unit: 'pcs',
    current_stock: 18,
    minimum_stock: 6,
    cost_per_unit: 12100.0,
    is_active: true,
  },

  // ─── 7. Bahan Olahan Bar (Prep) ──────────────────────────
  {
    id: 'ing-prep-white-syrup',
    code: 'PREP-WS',
    name: 'White Syrup (Prep)',
    category: 'Bahan Olahan (Prep)',
    unit: 'ml',
    current_stock: 3000,
    minimum_stock: 500,
    cost_per_unit: 48.4,
    is_active: true,
  },
  {
    id: 'ing-prep-simple-syrup',
    code: 'PREP-SS',
    name: 'Simple Syrup (Prep)',
    category: 'Bahan Olahan (Prep)',
    unit: 'ml',
    current_stock: 2500,
    minimum_stock: 500,
    cost_per_unit: 13.9,
    is_active: true,
  },
  {
    id: 'ing-prep-butterscotch-sauce',
    code: 'PREP-BS',
    name: 'Butterscotch Sauce (Prep)',
    category: 'Bahan Olahan (Prep)',
    unit: 'ml',
    current_stock: 1500,
    minimum_stock: 300,
    cost_per_unit: 74.0,
    is_active: true,
  },
  {
    id: 'ing-prep-cold-creme',
    code: 'PREP-CC',
    name: 'Cold Creme (Prep)',
    category: 'Bahan Olahan (Prep)',
    unit: 'ml',
    current_stock: 1500,
    minimum_stock: 300,
    cost_per_unit: 67.6,
    is_active: true,
  },
  {
    id: 'ing-prep-pistachio-creme',
    code: 'PREP-PC',
    name: 'Pistachio Creme (Prep)',
    category: 'Bahan Olahan (Prep)',
    unit: 'ml',
    current_stock: 1000,
    minimum_stock: 200,
    cost_per_unit: 83.4,
    is_active: true,
  },
  {
    id: 'ing-prep-greentea-base',
    code: 'PREP-GT',
    name: 'Green Tea Base (Prep)',
    category: 'Bahan Olahan (Prep)',
    unit: 'ml',
    current_stock: 2000,
    minimum_stock: 400,
    cost_per_unit: 44.0,
    is_active: true,
  },
  {
    id: 'ing-prep-choco-base',
    code: 'PREP-CB',
    name: 'Choco Base (Prep)',
    category: 'Bahan Olahan (Prep)',
    unit: 'ml',
    current_stock: 2000,
    minimum_stock: 400,
    cost_per_unit: 45.0,
    is_active: true,
  },
  {
    id: 'ing-prep-base-tea',
    code: 'PREP-BT',
    name: 'Base Tea (Prep)',
    category: 'Bahan Olahan (Prep)',
    unit: 'ml',
    current_stock: 4000,
    minimum_stock: 800,
    cost_per_unit: 2.2,
    is_active: true,
  },
  {
    id: 'ing-prep-sakura-base',
    code: 'PREP-SB',
    name: 'Sakura Base (Prep)',
    category: 'Bahan Olahan (Prep)',
    unit: 'ml',
    current_stock: 1500,
    minimum_stock: 300,
    cost_per_unit: 37.5,
    is_active: true,
  },
  {
    id: 'ing-prep-strawberry-jam',
    code: 'PREP-SJ',
    name: 'Strawberry Jam (Prep)',
    category: 'Bahan Olahan (Prep)',
    unit: 'gram',
    current_stock: 1000,
    minimum_stock: 200,
    cost_per_unit: 48.1,
    is_active: true,
  },
  {
    id: 'ing-prep-blueberry-jam',
    code: 'PREP-BJ',
    name: 'Blueberry Jam (Prep)',
    category: 'Bahan Olahan (Prep)',
    unit: 'gram',
    current_stock: 1000,
    minimum_stock: 200,
    cost_per_unit: 102.5,
    is_active: true,
  },
]

// ─── Default Recipe Mappings (BOM) ───────────────────────────
// Pemotongan stok otomatis presisi per cup/porsi sesuai spreadsheet
export const DEFAULT_CAFE_RECIPES_DATA: Array<{
  productCodeOrName: string
  items: Array<{ ingredientId: string; quantity: number }>
}> = [
  // 1. TO-GO (Botol 250ml)
  {
    productCodeOrName: 'BOTOL-KS',
    items: [
      { ingredientId: 'ing-prep-white-syrup', quantity: 50 },
      { ingredientId: 'ing-milk-uht-diamond', quantity: 120 },
      { ingredientId: 'ing-prep-simple-syrup', quantity: 20 },
      { ingredientId: 'ing-beans-robusta', quantity: 15 },
      { ingredientId: 'ing-bottle-gepeng', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'BOTOL-BS',
    items: [
      { ingredientId: 'ing-prep-white-syrup', quantity: 50 },
      { ingredientId: 'ing-prep-butterscotch-sauce', quantity: 20 },
      { ingredientId: 'ing-milk-uht-diamond', quantity: 120 },
      { ingredientId: 'ing-beans-robusta', quantity: 15 },
      { ingredientId: 'ing-bottle-gepeng', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'BOTOL-GT',
    items: [
      { ingredientId: 'ing-prep-white-syrup', quantity: 50 },
      { ingredientId: 'ing-milk-uht-diamond', quantity: 120 },
      { ingredientId: 'ing-prep-greentea-base', quantity: 50 },
      { ingredientId: 'ing-prep-simple-syrup', quantity: 20 },
      { ingredientId: 'ing-bottle-gepeng', quantity: 1 },
    ],
  },

  // 2. ESPRESSO BASED
  {
    productCodeOrName: 'ESPRS-KS',
    items: [
      { ingredientId: 'ing-prep-white-syrup', quantity: 50 },
      { ingredientId: 'ing-milk-uht-diamond', quantity: 100 },
      { ingredientId: 'ing-prep-simple-syrup', quantity: 15 },
      { ingredientId: 'ing-beans-robusta', quantity: 15 },
      { ingredientId: 'ing-prep-cold-creme', quantity: 10 },
      { ingredientId: 'ing-ice-cube', quantity: 100 },
      { ingredientId: 'ing-cup-ice', quantity: 1 },
      { ingredientId: 'ing-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'ESPRS-BS',
    items: [
      { ingredientId: 'ing-prep-white-syrup', quantity: 50 },
      { ingredientId: 'ing-prep-butterscotch-sauce', quantity: 20 },
      { ingredientId: 'ing-milk-uht-diamond', quantity: 100 },
      { ingredientId: 'ing-beans-robusta', quantity: 15 },
      { ingredientId: 'ing-prep-cold-creme', quantity: 10 },
      { ingredientId: 'ing-biscuit-lotus', quantity: 5 },
      { ingredientId: 'ing-ice-cube', quantity: 100 },
      { ingredientId: 'ing-cup-ice', quantity: 1 },
      { ingredientId: 'ing-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'ESPRS-TR',
    items: [
      { ingredientId: 'ing-prep-white-syrup', quantity: 50 },
      { ingredientId: 'ing-syr-airis-arunika', quantity: 20 },
      { ingredientId: 'ing-milk-uht-diamond', quantity: 100 },
      { ingredientId: 'ing-beans-robusta', quantity: 15 },
      { ingredientId: 'ing-prep-cold-creme', quantity: 10 },
      { ingredientId: 'ing-powder-cocoa', quantity: 2 },
      { ingredientId: 'ing-ice-cube', quantity: 100 },
      { ingredientId: 'ing-cup-ice', quantity: 1 },
      { ingredientId: 'ing-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'ESPRS-AM',
    items: [
      { ingredientId: 'ing-beans-arabica', quantity: 15 },
      { ingredientId: 'ing-water-cleo', quantity: 150 },
      { ingredientId: 'ing-ice-cube', quantity: 100 },
      { ingredientId: 'ing-cup-ice', quantity: 1 },
      { ingredientId: 'ing-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'ESPRS-MR',
    items: [
      { ingredientId: 'ing-beans-arabica', quantity: 15 },
      { ingredientId: 'ing-water-cleo', quantity: 150 },
      { ingredientId: 'ing-syr-peach-delifru', quantity: 15 },
      { ingredientId: 'ing-ice-cube', quantity: 100 },
      { ingredientId: 'ing-cup-ice', quantity: 1 },
      { ingredientId: 'ing-straw', quantity: 1 },
    ],
  },

  // 3. MILK BASED
  {
    productCodeOrName: 'MILK-GT',
    items: [
      { ingredientId: 'ing-prep-white-syrup', quantity: 30 },
      { ingredientId: 'ing-milk-uht-diamond', quantity: 80 },
      { ingredientId: 'ing-prep-greentea-base', quantity: 50 },
      { ingredientId: 'ing-prep-cold-creme', quantity: 20 },
      { ingredientId: 'ing-prep-simple-syrup', quantity: 20 },
      { ingredientId: 'ing-ice-cube', quantity: 100 },
      { ingredientId: 'ing-cup-ice', quantity: 1 },
      { ingredientId: 'ing-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'MILK-CB',
    items: [
      { ingredientId: 'ing-prep-choco-base', quantity: 45 },
      { ingredientId: 'ing-prep-strawberry-jam', quantity: 20 },
      { ingredientId: 'ing-syr-strawberry-denali', quantity: 15 },
      { ingredientId: 'ing-prep-white-syrup', quantity: 30 },
      { ingredientId: 'ing-milk-uht-diamond', quantity: 80 },
      { ingredientId: 'ing-fruit-strawberry-frozen', quantity: 15 },
      { ingredientId: 'ing-ice-cube', quantity: 100 },
      { ingredientId: 'ing-cup-ice', quantity: 1 },
      { ingredientId: 'ing-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'MILK-CP',
    items: [
      { ingredientId: 'ing-prep-choco-base', quantity: 45 },
      { ingredientId: 'ing-prep-pistachio-creme', quantity: 20 },
      { ingredientId: 'ing-powder-cocoa', quantity: 5 },
      { ingredientId: 'ing-prep-white-syrup', quantity: 30 },
      { ingredientId: 'ing-milk-uht-diamond', quantity: 80 },
      { ingredientId: 'ing-ice-cube', quantity: 100 },
      { ingredientId: 'ing-cup-ice', quantity: 1 },
      { ingredientId: 'ing-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'MILK-BS',
    items: [
      { ingredientId: 'ing-prep-blueberry-jam', quantity: 20 },
      { ingredientId: 'ing-syr-blueberry-arunika', quantity: 15 },
      { ingredientId: 'ing-prep-white-syrup', quantity: 30 },
      { ingredientId: 'ing-milk-uht-diamond', quantity: 80 },
      { ingredientId: 'ing-ice-cube', quantity: 100 },
      { ingredientId: 'ing-cup-ice', quantity: 1 },
      { ingredientId: 'ing-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'MILK-SB',
    items: [
      { ingredientId: 'ing-prep-sakura-base', quantity: 40 },
      { ingredientId: 'ing-prep-cold-creme', quantity: 10 },
      { ingredientId: 'ing-prep-white-syrup', quantity: 30 },
      { ingredientId: 'ing-milk-uht-diamond', quantity: 80 },
      { ingredientId: 'ing-ice-cube', quantity: 100 },
      { ingredientId: 'ing-cup-ice', quantity: 1 },
      { ingredientId: 'ing-straw', quantity: 1 },
    ],
  },

  // 4. REFRESHMENT
  {
    productCodeOrName: 'REFRS-GL',
    items: [
      { ingredientId: 'ing-syr-lemon-marjan', quantity: 20 },
      { ingredientId: 'ing-prep-simple-syrup', quantity: 15 },
      { ingredientId: 'ing-water-cleo', quantity: 100 },
      { ingredientId: 'ing-prep-greentea-base', quantity: 50 },
      { ingredientId: 'ing-fruit-lemon-superindo', quantity: 5 },
      { ingredientId: 'ing-ice-cube', quantity: 100 },
      { ingredientId: 'ing-cup-ice', quantity: 1 },
      { ingredientId: 'ing-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'REFRS-BP',
    items: [
      { ingredientId: 'ing-prep-blueberry-jam', quantity: 20 },
      { ingredientId: 'ing-syr-peach-delifru', quantity: 20 },
      { ingredientId: 'ing-prep-base-tea', quantity: 20 },
      { ingredientId: 'ing-water-cleo', quantity: 100 },
      { ingredientId: 'ing-ice-cube', quantity: 100 },
      { ingredientId: 'ing-cup-ice', quantity: 1 },
      { ingredientId: 'ing-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'REFRS-BT',
    items: [
      { ingredientId: 'ing-prep-blueberry-jam', quantity: 20 },
      { ingredientId: 'ing-syr-blueberry-arunika', quantity: 15 },
      { ingredientId: 'ing-prep-base-tea', quantity: 100 },
      { ingredientId: 'ing-prep-simple-syrup', quantity: 15 },
      { ingredientId: 'ing-ice-cube', quantity: 100 },
      { ingredientId: 'ing-cup-ice', quantity: 1 },
      { ingredientId: 'ing-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'REFRS-LM',
    items: [
      { ingredientId: 'ing-syr-lemon-marjan', quantity: 20 },
      { ingredientId: 'ing-prep-base-tea', quantity: 100 },
      { ingredientId: 'ing-prep-simple-syrup', quantity: 15 },
      { ingredientId: 'ing-fruit-lemon-superindo', quantity: 5 },
      { ingredientId: 'ing-ice-cube', quantity: 100 },
      { ingredientId: 'ing-cup-ice', quantity: 1 },
      { ingredientId: 'ing-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'REFRS-LY',
    items: [
      { ingredientId: 'ing-syr-lychee-marjan', quantity: 20 },
      { ingredientId: 'ing-fruit-lychee-naraya', quantity: 50 },
      { ingredientId: 'ing-prep-base-tea', quantity: 100 },
      { ingredientId: 'ing-prep-simple-syrup', quantity: 15 },
      { ingredientId: 'ing-ice-cube', quantity: 100 },
      { ingredientId: 'ing-cup-ice', quantity: 1 },
      { ingredientId: 'ing-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'REFRS-ST',
    items: [
      { ingredientId: 'ing-prep-strawberry-jam', quantity: 20 },
      { ingredientId: 'ing-syr-strawberry-denali', quantity: 15 },
      { ingredientId: 'ing-prep-base-tea', quantity: 100 },
      { ingredientId: 'ing-prep-simple-syrup', quantity: 15 },
      { ingredientId: 'ing-ice-cube', quantity: 100 },
      { ingredientId: 'ing-cup-ice', quantity: 1 },
      { ingredientId: 'ing-straw', quantity: 1 },
    ],
  },

  // 5. DESSERT & PASTRY
  {
    productCodeOrName: 'DSSRT-BCC',
    items: [{ ingredientId: 'ing-cake-bcc', quantity: 1 }],
  },
  {
    productCodeOrName: 'DSSRT-LCC',
    items: [{ ingredientId: 'ing-cake-lcc', quantity: 1 }],
  },
  {
    productCodeOrName: 'DSSRT-TRT',
    items: [{ ingredientId: 'ing-cake-trt', quantity: 1 }],
  },
  {
    productCodeOrName: 'DSSRT-MMO',
    items: [{ ingredientId: 'ing-cake-mmo', quantity: 1 }],
  },
  {
    productCodeOrName: 'DSSRT-MMB',
    items: [{ ingredientId: 'ing-cake-mmb', quantity: 1 }],
  },
  {
    productCodeOrName: 'DSSRT-MMBS',
    items: [{ ingredientId: 'ing-cake-mmbs', quantity: 1 }],
  },
]

/**
 * Match a product to its recipe ingredients
 */
export function getRecipeItemsForProduct(
  product: { id: string; name: string; code?: string },
  recipes: CafeRecipeItem[],
  ingredients: CafeIngredient[]
): Array<{ ingredient: CafeIngredient; quantity: number }> {
  const explicit = recipes.filter((r) => r.product_id === product.id)
  if (explicit.length > 0) {
    return explicit
      .map((r) => {
        const ing = ingredients.find((i) => i.id === r.ingredient_id)
        return ing ? { ingredient: ing, quantity: r.quantity } : null
      })
      .filter(Boolean) as Array<{ ingredient: CafeIngredient; quantity: number }>
  }

  const pCode = (product.code || '').toUpperCase()
  const pName = (product.name || '').toUpperCase()

  const match = DEFAULT_CAFE_RECIPES_DATA.find((r) => {
    const key = r.productCodeOrName.toUpperCase()
    if (pCode && pCode.includes(key)) return true
    if (key === 'BOTOL-KS' && pName.includes('KOPI SUSU BOTOL')) return true
    if (key === 'BOTOL-BS' && pName.includes('BUTTERSCOTCH BOTOL')) return true
    if (key === 'BOTOL-GT' && pName.includes('GREEN TEA') && pName.includes('BOTOL')) return true
    if (key === 'ESPRS-KS' && (pName === 'KOPI SUSU' || pName === 'KOPI SUSU CUP')) return true
    if (key === 'ESPRS-BS' && pName === 'BUTTERSCOTCH') return true
    if (key === 'ESPRS-TR' && pName === 'TIRAMISU') return true
    if (key === 'ESPRS-AM' && pName === 'AMERICANO') return true
    if (key === 'ESPRS-MR' && pName === 'MERARICANO') return true
    if (key === 'MILK-GT' && pName === 'GREEN TEA LATTE') return true
    if (key === 'MILK-CB' && pName.includes('CHOCO BERRIES')) return true
    if (key === 'MILK-CP' && pName.includes('CHOCO PISTACHIO')) return true
    if (key === 'MILK-BS' && pName.includes('BLUEBERRY SUNDAE')) return true
    if (key === 'MILK-SB' && pName.includes('SAKURA')) return true
    if (key === 'REFRS-GL' && pName.includes('LIMUNA')) return true
    if (key === 'REFRS-BP' && pName.includes('PEACHY')) return true
    if (key === 'REFRS-BT' && pName.includes('BLUEBERRY TEA')) return true
    if (key === 'REFRS-LM' && pName.includes('LEMON TEA')) return true
    if (key === 'REFRS-LY' && pName.includes('LYCHEE')) return true
    if (key === 'REFRS-ST' && pName.includes('STRAWBERRY')) return true
    if (key === 'DSSRT-BCC' && pName.includes('CHEESE CAKE')) return true
    if (key === 'DSSRT-LCC' && pName.includes('LONDON CHOCO')) return true
    if (key === 'DSSRT-TRT' && pName.includes('TART')) return true
    if (key === 'DSSRT-MMO' && pName.includes('MERAMISU ORIGINAL')) return true
    if (key === 'DSSRT-MMB' && pName.includes('MERAMISU BLUEBERRY')) return true
    if (key === 'DSSRT-MMBS' && pName.includes('BISCOFF')) return true
    return false
  })

  if (match) {
    return match.items
      .map((it) => {
        const ing = ingredients.find((i) => i.id === it.ingredientId || i.code === it.ingredientId)
        return ing ? { ingredient: ing, quantity: it.quantity } : null
      })
      .filter(Boolean) as Array<{ ingredient: CafeIngredient; quantity: number }>
  }

  return []
}

/**
 * Calculate estimated remaining cups/portions of a product
 * based on the lowest stock ratio of its required ingredients.
 */
export function calculateProductStockStatus(
  product: { id: string; name: string; code?: string },
  recipes: CafeRecipeItem[],
  ingredients: CafeIngredient[]
): {
  status: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  estimatedPortions: number
  bottleneckIngredient?: CafeIngredient
} {
  const recipeItems = getRecipeItemsForProduct(product, recipes, ingredients)

  if (recipeItems.length === 0) {
    return { status: 'AVAILABLE', estimatedPortions: 999 }
  }

  let minPortions = Infinity
  let bottleneck: CafeIngredient | undefined = undefined
  let isLow = false

  for (const item of recipeItems) {
    const ing = item.ingredient
    const portionsPossible = Math.floor(Math.max(0, ing.current_stock) / item.quantity)

    if (portionsPossible < minPortions) {
      minPortions = portionsPossible
      bottleneck = ing
    }

    if (ing.current_stock <= ing.minimum_stock) {
      isLow = true
    }
  }

  if (minPortions === Infinity) minPortions = 0

  if (minPortions <= 0) {
    return {
      status: 'OUT_OF_STOCK',
      estimatedPortions: 0,
      bottleneckIngredient: bottleneck,
    }
  }

  if (minPortions <= 5 || isLow) {
    return {
      status: 'LOW_STOCK',
      estimatedPortions: minPortions,
      bottleneckIngredient: bottleneck,
    }
  }

  return {
    status: 'AVAILABLE',
    estimatedPortions: minPortions,
    bottleneckIngredient: bottleneck,
  }
}
