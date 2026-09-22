// =============================================================
// Méra Hause POS — Default Master Ingredients & Recipes (BOM)
// =============================================================

import type { CafeIngredient, CafeRecipeItem } from './types'

export const DEFAULT_CAFE_INGREDIENTS: CafeIngredient[] = [
  // ─── Kopi & Susu ───────────────────────────────────────────
  {
    id: 'ing-espr-beans',
    code: 'ESPR-BEANS',
    name: 'Biji Kopi House Blend',
    category: 'Kopi & Susu',
    unit: 'gram',
    current_stock: 2500, // 2.5 kg
    minimum_stock: 350,
    cost_per_unit: 160,
    is_active: true,
  },
  {
    id: 'ing-milk-uht',
    code: 'MILK-UHT',
    name: 'Susu Fresh Milk UHT',
    category: 'Kopi & Susu',
    unit: 'ml',
    current_stock: 16000, // 16 Liter
    minimum_stock: 2000,
    cost_per_unit: 20,
    is_active: true,
  },

  // ─── Sirup & Puree ─────────────────────────────────────────
  {
    id: 'ing-syr-aren',
    code: 'SYR-AREN',
    name: 'Sirup Gula Aren',
    category: 'Sirup & Puree',
    unit: 'ml',
    current_stock: 3000,
    minimum_stock: 500,
    cost_per_unit: 35,
    is_active: true,
  },
  {
    id: 'ing-syr-bs',
    code: 'SYR-BS',
    name: 'Sirup Butterscotch',
    category: 'Sirup & Puree',
    unit: 'ml',
    current_stock: 2000,
    minimum_stock: 300,
    cost_per_unit: 60,
    is_active: true,
  },
  {
    id: 'ing-syr-tr',
    code: 'SYR-TR',
    name: 'Sirup Tiramisu',
    category: 'Sirup & Puree',
    unit: 'ml',
    current_stock: 2000,
    minimum_stock: 300,
    cost_per_unit: 55,
    is_active: true,
  },
  {
    id: 'ing-syr-blue',
    code: 'SYR-BLUE',
    name: 'Sirup Blueberry Puree',
    category: 'Sirup & Puree',
    unit: 'ml',
    current_stock: 2000,
    minimum_stock: 300,
    cost_per_unit: 65,
    is_active: true,
  },
  {
    id: 'ing-syr-sak',
    code: 'SYR-SAK',
    name: 'Sirup Sakura Blossom',
    category: 'Sirup & Puree',
    unit: 'ml',
    current_stock: 1000,
    minimum_stock: 200,
    cost_per_unit: 70,
    is_active: true,
  },
  {
    id: 'ing-syr-peach',
    code: 'SYR-PEACH',
    name: 'Sirup Peach',
    category: 'Sirup & Puree',
    unit: 'ml',
    current_stock: 1000,
    minimum_stock: 200,
    cost_per_unit: 60,
    is_active: true,
  },
  {
    id: 'ing-ext-lemon',
    code: 'EXT-LEMON',
    name: 'Ekstrak Sari Lemon',
    category: 'Sirup & Puree',
    unit: 'ml',
    current_stock: 1000,
    minimum_stock: 200,
    cost_per_unit: 45,
    is_active: true,
  },

  // ─── Bubuk & Teh ───────────────────────────────────────────
  {
    id: 'ing-pow-gt',
    code: 'POW-GT',
    name: 'Bubuk Green Tea Matcha',
    category: 'Bubuk & Teh',
    unit: 'gram',
    current_stock: 1000,
    minimum_stock: 200,
    cost_per_unit: 250,
    is_active: true,
  },
  {
    id: 'ing-pow-choc',
    code: 'POW-CHOC',
    name: 'Bubuk Cokelat Dark',
    category: 'Bubuk & Teh',
    unit: 'gram',
    current_stock: 1000,
    minimum_stock: 200,
    cost_per_unit: 200,
    is_active: true,
  },
  {
    id: 'ing-tea-bag',
    code: 'TEA-BAG',
    name: 'Kantong Daun Teh Pilihan',
    category: 'Bubuk & Teh',
    unit: 'pcs',
    current_stock: 100,
    minimum_stock: 20,
    cost_per_unit: 1000,
    is_active: true,
  },

  // ─── Kemasan & Cup ─────────────────────────────────────────
  {
    id: 'ing-pack-botol',
    code: 'PACK-BOTOL',
    name: 'Botol Minuman 250ml',
    category: 'Kemasan & Cup',
    unit: 'pcs',
    current_stock: 80,
    minimum_stock: 15,
    cost_per_unit: 2200,
    is_active: true,
  },
  {
    id: 'ing-pack-cup16',
    code: 'PACK-CUP16',
    name: 'Cup 16oz + Tutup Lid',
    category: 'Kemasan & Cup',
    unit: 'pcs',
    current_stock: 300,
    minimum_stock: 40,
    cost_per_unit: 850,
    is_active: true,
  },
  {
    id: 'ing-pack-straw',
    code: 'PACK-STRAW',
    name: 'Sedotan Steril',
    category: 'Kemasan & Cup',
    unit: 'pcs',
    current_stock: 300,
    minimum_stock: 40,
    cost_per_unit: 120,
    is_active: true,
  },

  // ─── Dessert & Pastry ──────────────────────────────────────
  {
    id: 'ing-cake-bcc',
    code: 'CAKE-BCC',
    name: 'Blueberry Cheese Cake Slice',
    category: 'Dessert & Pastry',
    unit: 'slice',
    current_stock: 12,
    minimum_stock: 3,
    cost_per_unit: 15938,
    is_active: true,
  },
  {
    id: 'ing-cake-lcc',
    code: 'CAKE-LCC',
    name: 'London Choco Cake Slice',
    category: 'Dessert & Pastry',
    unit: 'slice',
    current_stock: 12,
    minimum_stock: 3,
    cost_per_unit: 21250,
    is_active: true,
  },
  {
    id: 'ing-cake-trt',
    code: 'CAKE-TRT',
    name: 'Tiramisu Tart Slice',
    category: 'Dessert & Pastry',
    unit: 'slice',
    current_stock: 12,
    minimum_stock: 3,
    cost_per_unit: 23800,
    is_active: true,
  },
  {
    id: 'ing-cake-mmo',
    code: 'CAKE-MMO',
    name: 'Meramisu Original Cup',
    category: 'Dessert & Pastry',
    unit: 'pcs',
    current_stock: 16,
    minimum_stock: 4,
    cost_per_unit: 8267,
    is_active: true,
  },
  {
    id: 'ing-cake-mmb',
    code: 'CAKE-MMB',
    name: 'Meramisu Blueberry Cup',
    category: 'Dessert & Pastry',
    unit: 'pcs',
    current_stock: 16,
    minimum_stock: 4,
    cost_per_unit: 11517,
    is_active: true,
  },
  {
    id: 'ing-cake-mmbs',
    code: 'CAKE-MMBS',
    name: 'Meramisu Biscoff Cup',
    category: 'Dessert & Pastry',
    unit: 'pcs',
    current_stock: 16,
    minimum_stock: 4,
    cost_per_unit: 12100,
    is_active: true,
  },
]

// ─── Default Recipe Mappings (BOM) ───────────────────────────
// Maps product code or product name keywords to list of ingredients & quantities
export const DEFAULT_CAFE_RECIPES_DATA: Array<{
  productCodeOrName: string
  items: Array<{ ingredientId: string; quantity: number }>
}> = [
  // 1. TO-GO (Botol 250ml)
  {
    productCodeOrName: 'BOTOL-KS',
    items: [
      { ingredientId: 'ing-espr-beans', quantity: 20 },
      { ingredientId: 'ing-milk-uht', quantity: 150 },
      { ingredientId: 'ing-syr-aren', quantity: 25 },
      { ingredientId: 'ing-pack-botol', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'BOTOL-BS',
    items: [
      { ingredientId: 'ing-espr-beans', quantity: 20 },
      { ingredientId: 'ing-milk-uht', quantity: 150 },
      { ingredientId: 'ing-syr-bs', quantity: 30 },
      { ingredientId: 'ing-pack-botol', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'BOTOL-GT',
    items: [
      { ingredientId: 'ing-pow-gt', quantity: 18 },
      { ingredientId: 'ing-milk-uht', quantity: 180 },
      { ingredientId: 'ing-pack-botol', quantity: 1 },
    ],
  },

  // 2. ESPRESSO
  {
    productCodeOrName: 'ESPRS-KS',
    items: [
      { ingredientId: 'ing-espr-beans', quantity: 18 },
      { ingredientId: 'ing-milk-uht', quantity: 120 },
      { ingredientId: 'ing-syr-aren', quantity: 20 },
      { ingredientId: 'ing-pack-cup16', quantity: 1 },
      { ingredientId: 'ing-pack-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'ESPRS-BS',
    items: [
      { ingredientId: 'ing-espr-beans', quantity: 18 },
      { ingredientId: 'ing-milk-uht', quantity: 120 },
      { ingredientId: 'ing-syr-bs', quantity: 25 },
      { ingredientId: 'ing-pack-cup16', quantity: 1 },
      { ingredientId: 'ing-pack-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'ESPRS-TR',
    items: [
      { ingredientId: 'ing-espr-beans', quantity: 18 },
      { ingredientId: 'ing-milk-uht', quantity: 120 },
      { ingredientId: 'ing-syr-tr', quantity: 25 },
      { ingredientId: 'ing-pack-cup16', quantity: 1 },
      { ingredientId: 'ing-pack-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'ESPRS-AM',
    items: [
      { ingredientId: 'ing-espr-beans', quantity: 18 },
      { ingredientId: 'ing-pack-cup16', quantity: 1 },
      { ingredientId: 'ing-pack-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'ESPRS-MR',
    items: [
      { ingredientId: 'ing-espr-beans', quantity: 18 },
      { ingredientId: 'ing-syr-peach', quantity: 20 },
      { ingredientId: 'ing-pack-cup16', quantity: 1 },
      { ingredientId: 'ing-pack-straw', quantity: 1 },
    ],
  },

  // 3. MILK
  {
    productCodeOrName: 'MILK-GT',
    items: [
      { ingredientId: 'ing-pow-gt', quantity: 15 },
      { ingredientId: 'ing-milk-uht', quantity: 150 },
      { ingredientId: 'ing-pack-cup16', quantity: 1 },
      { ingredientId: 'ing-pack-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'MILK-CB',
    items: [
      { ingredientId: 'ing-pow-choc', quantity: 20 },
      { ingredientId: 'ing-milk-uht', quantity: 120 },
      { ingredientId: 'ing-syr-blue', quantity: 20 },
      { ingredientId: 'ing-pack-cup16', quantity: 1 },
      { ingredientId: 'ing-pack-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'MILK-CP',
    items: [
      { ingredientId: 'ing-pow-choc', quantity: 20 },
      { ingredientId: 'ing-milk-uht', quantity: 140 },
      { ingredientId: 'ing-pack-cup16', quantity: 1 },
      { ingredientId: 'ing-pack-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'MILK-BS',
    items: [
      { ingredientId: 'ing-milk-uht', quantity: 140 },
      { ingredientId: 'ing-syr-blue', quantity: 30 },
      { ingredientId: 'ing-pack-cup16', quantity: 1 },
      { ingredientId: 'ing-pack-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'MILK-SB',
    items: [
      { ingredientId: 'ing-milk-uht', quantity: 140 },
      { ingredientId: 'ing-syr-sak', quantity: 25 },
      { ingredientId: 'ing-pack-cup16', quantity: 1 },
      { ingredientId: 'ing-pack-straw', quantity: 1 },
    ],
  },

  // 4. REFRESHER
  {
    productCodeOrName: 'REFRS-LM',
    items: [
      { ingredientId: 'ing-tea-bag', quantity: 1 },
      { ingredientId: 'ing-ext-lemon', quantity: 20 },
      { ingredientId: 'ing-pack-cup16', quantity: 1 },
      { ingredientId: 'ing-pack-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'REFRS-LY',
    items: [
      { ingredientId: 'ing-tea-bag', quantity: 1 },
      { ingredientId: 'ing-syr-peach', quantity: 20 },
      { ingredientId: 'ing-pack-cup16', quantity: 1 },
      { ingredientId: 'ing-pack-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'REFRS-ST',
    items: [
      { ingredientId: 'ing-tea-bag', quantity: 1 },
      { ingredientId: 'ing-syr-blue', quantity: 20 },
      { ingredientId: 'ing-pack-cup16', quantity: 1 },
      { ingredientId: 'ing-pack-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'REFRS-BT',
    items: [
      { ingredientId: 'ing-tea-bag', quantity: 1 },
      { ingredientId: 'ing-syr-blue', quantity: 25 },
      { ingredientId: 'ing-pack-cup16', quantity: 1 },
      { ingredientId: 'ing-pack-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'REFRS-BP',
    items: [
      { ingredientId: 'ing-tea-bag', quantity: 1 },
      { ingredientId: 'ing-syr-peach', quantity: 25 },
      { ingredientId: 'ing-pack-cup16', quantity: 1 },
      { ingredientId: 'ing-pack-straw', quantity: 1 },
    ],
  },
  {
    productCodeOrName: 'REFRS-GL',
    items: [
      { ingredientId: 'ing-ext-lemon', quantity: 25 },
      { ingredientId: 'ing-syr-peach', quantity: 20 },
      { ingredientId: 'ing-pack-cup16', quantity: 1 },
      { ingredientId: 'ing-pack-straw', quantity: 1 },
    ],
  },

  // 5. DESSERT
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
  // First check if explicit recipe in database exists
  const explicit = recipes.filter((r) => r.product_id === product.id)
  if (explicit.length > 0) {
    return explicit
      .map((r) => {
        const ing = ingredients.find((i) => i.id === r.ingredient_id)
        return ing ? { ingredient: ing, quantity: r.quantity } : null
      })
      .filter(Boolean) as Array<{ ingredient: CafeIngredient; quantity: number }>
  }

  // Fallback to default recipe matching by code or name
  const pCode = (product.code || '').toUpperCase()
  const pName = (product.name || '').toUpperCase()

  const match = DEFAULT_CAFE_RECIPES_DATA.find((r) => {
    const key = r.productCodeOrName.toUpperCase()
    if (pCode && pCode.includes(key)) return true
    if (key.includes('BOTOL-KS') && pName.includes('KOPI SUSU BOTOL')) return true
    if (key.includes('BOTOL-BS') && pName.includes('BUTTERSCOTCH BOTOL')) return true
    if (key.includes('BOTOL-GT') && pName.includes('GREEN TEA') && pName.includes('BOTOL')) return true
    if (key.includes('ESPRS-KS') && pName === 'KOPI SUSU') return true
    if (key.includes('ESPRS-BS') && pName === 'BUTTERSCOTCH') return true
    if (key.includes('ESPRS-TR') && pName === 'TIRAMISU') return true
    if (key.includes('ESPRS-AM') && pName === 'AMERICANO') return true
    if (key.includes('ESPRS-MR') && pName === 'MERARICANO') return true
    if (key.includes('MILK-GT') && pName === 'GREEN TEA LATTE') return true
    if (key.includes('MILK-CB') && pName.includes('CHOCO BERRIES')) return true
    if (key.includes('MILK-CP') && pName.includes('CHOCO PISTACHIO')) return true
    if (key.includes('MILK-BS') && pName.includes('BLUEBERRY SUNDAE')) return true
    if (key.includes('MILK-SB') && pName.includes('SAKURA')) return true
    if (key.includes('REFRS-GL') && pName.includes('LIMUNA')) return true
    if (key.includes('REFRS-BP') && pName.includes('PEACHY')) return true
    if (key.includes('REFRS-BT') && pName.includes('BLUEBERRY TEA')) return true
    if (key.includes('REFRS-LM') && pName.includes('LEMON TEA')) return true
    if (key.includes('REFRS-LY') && pName.includes('LYCHEE')) return true
    if (key.includes('REFRS-ST') && pName.includes('STRAWBERRY')) return true
    if (key.includes('DSSRT-BCC') && pName.includes('CHEESE CAKE')) return true
    if (key.includes('DSSRT-LCC') && pName.includes('LONDON CHOCO')) return true
    if (key.includes('DSSRT-TRT') && pName.includes('TART')) return true
    if (key.includes('DSSRT-MMO') && pName.includes('MERAMISU ORIGINAL')) return true
    if (key.includes('DSSRT-MMB') && pName.includes('MERAMISU BLUEBERRY')) return true
    if (key.includes('DSSRT-MMBS') && pName.includes('BISCOFF')) return true
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
