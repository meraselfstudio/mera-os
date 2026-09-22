// =============================================================
// Méra Hause POS — Type Definitions (FreeKasir Architecture)
// =============================================================

export interface CafeCategory {
  id: string
  name: string
  icon?: string
  sort_order: number
  is_active: boolean
}

export interface CafeProduct {
  id: string
  category_id?: string | null
  name: string
  description?: string | null
  price: number
  cost_price?: number
  image_url?: string | null
  is_available: boolean
  sort_order: number
}

export interface CafeCartItem {
  product: CafeProduct
  quantity: number
  notes?: string
  subtotal: number
}

export type CafeOrderType = 'DINE_IN' | 'TAKEAWAY'
export type CafePaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER'
export type CafeOrderStatus = 'OPEN_BILL' | 'PAID' | 'CANCELLED' | 'REFUNDED'

export interface CafeOrderItem {
  id?: string
  order_id?: string
  product_id?: string | null
  product_name: string
  price: number
  quantity: number
  notes?: string
  subtotal: number
}

export interface CafeOrder {
  id: string
  order_number: string
  order_type: CafeOrderType
  table_number?: string | null
  customer_name?: string | null
  subtotal: number
  discount_amount: number
  discount_type?: 'PERCENT' | 'NOMINAL' | 'NONE'
  total_amount: number
  payment_method?: CafePaymentMethod | null
  cash_tendered: number
  change_amount: number
  status: CafeOrderStatus
  cashier_id?: string | null
  cashier_name?: string | null
  notes?: string | null
  created_at: string
  items?: CafeOrderItem[]
}

// ─── Inventory & Stock Management ────────────────────────────
export type CafeIngredientUnit = 'gram' | 'ml' | 'pcs' | 'slice'
export type CafeMutationType = 'SALE' | 'RESTOCK' | 'OPNAME' | 'WASTE' | 'CANCEL_RESTORE'

export interface CafeIngredient {
  id: string
  code?: string
  name: string
  category: string
  unit: CafeIngredientUnit
  current_stock: number
  minimum_stock: number
  cost_per_unit: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface CafeRecipeItem {
  id?: string
  product_id: string
  ingredient_id: string
  quantity: number
  ingredient?: CafeIngredient
}

export interface CafeStockMutation {
  id: string
  ingredient_id: string
  ingredient_name?: string
  type: CafeMutationType
  quantity: number
  previous_stock: number
  final_stock: number
  reference_id?: string | null
  notes?: string | null
  created_by?: string | null
  created_at: string
}

