import React, { useState, useEffect, useMemo } from 'react'
import {
  Coffee,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Receipt,
  RotateCcw,
  Printer,
  Bluetooth,
  Clock,
  CheckCircle2,
  Users,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Banknote,
  LogOut,
  Sparkles,
  FileText,
  AlertCircle,
  Tag,
  Wallet,
  Lock,
  Calendar,
  Send,
  Copy,
  Check,
  Package,
  Layers3,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '@mera/supabase'
import type {
  CafeCategory,
  CafeProduct,
  CafeCartItem,
  CafeOrder,
  CafeOrderType,
  CafeOrderStatus,
  CafePaymentMethod,
  CafeIngredient,
  CafeRecipeItem,
  CafeStockMutation,
} from './types'
import { DEFAULT_CAFE_CATEGORIES, DEFAULT_CAFE_PRODUCTS } from './defaultMenu'
import {
  DEFAULT_CAFE_INGREDIENTS,
  getRecipeItemsForProduct,
  calculateProductStockStatus,
} from './defaultInventory'
import { bluetoothPrinter, type BluetoothPrinterState, type CafeRecapPrintData } from './bluetoothPrinter'
import { CafeCheckoutModal } from './CafeCheckoutModal'
import { CafeReceipt } from './CafeReceipt'
import { CafeClosingReceipt } from './CafeClosingReceipt'
import { CafeInventoryView } from './CafeInventoryView'

export interface CafeExpense {
  id: string
  tanggal: string
  keterangan: string
  kategori: string
  jumlah: number
  metode_bayar: 'CASH' | 'QRIS'
  created_at: string
}

interface CafePosViewProps {
  cashierName?: string
  cashierId?: string
  role?: 'owner' | 'crew' | null
  onOpenAttendance?: () => void
  onLogout?: () => void
}

type CafeSubTab = 'kasir' | 'open_bills' | 'history' | 'inventory' | 'expenses' | 'recap'

export function getWibDate(date = new Date()): string {
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 10)
}

export function toWibDateKey(isoStr?: string | null): string {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000)
    return wib.toISOString().slice(0, 10)
  } catch {
    return (isoStr || '').slice(0, 10)
  }
}

export const CafePosView: React.FC<CafePosViewProps> = ({
  cashierName = 'Kasir Méra Hause',
  cashierId,
  role = 'crew',
  onOpenAttendance,
  onLogout,
}) => {
  // Navigation & Sub-tabs
  const [activeTab, setActiveTab] = useState<CafeSubTab>('kasir')

  // Date Selection for Finance Recap (Defaults to today in WIB)
  const [selectedRecapDate, setSelectedRecapDate] = useState<string>(() => getWibDate())
  const [closingReceiptModal, setClosingReceiptModal] = useState<CafeRecapPrintData | null>(null)

  // Categories & Products
  const [categories, setCategories] = useState<CafeCategory[]>(DEFAULT_CAFE_CATEGORIES)
  const [products, setProducts] = useState<CafeProduct[]>(DEFAULT_CAFE_PRODUCTS)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Active Cart State
  const [cart, setCart] = useState<CafeCartItem[]>([])
  const [orderType, setOrderType] = useState<CafeOrderType>('DINE_IN')
  const [tableNumber, setTableNumber] = useState<string>('')
  const [customerName, setCustomerName] = useState<string>('')
  const [discountNominal, setDiscountNominal] = useState<number>(0)
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [editingNoteItemId, setEditingNoteItemId] = useState<string | null>(null)
  const [itemNoteInput, setItemNoteInput] = useState<string>('')

  // Orders State (Stored in Supabase + local cache fallback)
  const [orders, setOrders] = useState<CafeOrder[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mera_cafe_orders_cache')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          // ignore
        }
      }
    }
    return []
  })

  // Expenses State (Stored in Supabase + local cache fallback)
  const [expenses, setExpenses] = useState<CafeExpense[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mera_cafe_expenses_cache')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          // ignore
        }
      }
    }
    return []
  })

  // ─── Inventory & Ingredients State ──────────────────────────
  const [ingredients, setIngredients] = useState<CafeIngredient[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mera_cafe_ingredients_cache')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        } catch {
          // ignore
        }
      }
    }
    return DEFAULT_CAFE_INGREDIENTS
  })

  const [recipes, setRecipes] = useState<CafeRecipeItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mera_cafe_recipes_cache')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        } catch {
          // ignore
        }
      }
    }
    return []
  })

  const [mutations, setMutations] = useState<CafeStockMutation[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mera_cafe_mutations_cache')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) return parsed
        } catch {
          // ignore
        }
      }
    }
    return []
  })

  // Save ingredients to local cache
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mera_cafe_ingredients_cache', JSON.stringify(ingredients))
    }
  }, [ingredients])

  // Save recipes to local cache
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mera_cafe_recipes_cache', JSON.stringify(recipes))
    }
  }, [recipes])

  // Save mutations to local cache
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mera_cafe_mutations_cache', JSON.stringify(mutations))
    }
  }, [mutations])

  // Low stock count (items with stock <= minimum_stock or stock <= 0)
  const lowStockCount = useMemo(() => {
    return ingredients.filter((i) => i.current_stock <= i.minimum_stock).length
  }, [ingredients])

  // Expense Form State
  const [expenseKeterangan, setExpenseKeterangan] = useState<string>('')
  const [expenseJumlah, setExpenseJumlah] = useState<string>('')
  const [expenseKategori, setExpenseKategori] = useState<string>('Cafe: Bahan Baku')
  const [expenseMetode, setExpenseMetode] = useState<'CASH' | 'QRIS'>('CASH')
  const [expenseSubmitting, setExpenseSubmitting] = useState<boolean>(false)

  // Modals & UI States
  const [checkoutOrder, setCheckoutOrder] = useState<CafeOrder | null>(null)
  const [reprintOrder, setReprintOrder] = useState<CafeOrder | null>(null)
  const [btState, setBtState] = useState<BluetoothPrinterState>(bluetoothPrinter.state)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Sync Bluetooth state
  useEffect(() => {
    const unsub = bluetoothPrinter.subscribe((state) => {
      setBtState(state)
    })
    return () => unsub()
  }, [])

  // Save orders to local cache whenever updated
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mera_cafe_orders_cache', JSON.stringify(orders))
    }
  }, [orders])

  // Save expenses to local cache whenever updated
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mera_cafe_expenses_cache', JSON.stringify(expenses))
    }
  }, [expenses])

  // Try fetching products, orders & expenses from Supabase
  useEffect(() => {
    const fetchSupabaseData = async () => {
      try {
        const [
          { data: catData },
          { data: prodData },
          { data: ordData },
          { data: expData },
          { data: ingData },
          { data: recData },
          { data: mutData },
        ] = await Promise.all([
          supabase.from('cafe_categories').select('*').order('sort_order'),
          supabase.from('cafe_products').select('*').order('sort_order'),
          supabase.from('cafe_orders').select('*, items:cafe_order_items(*)').order('created_at', { ascending: false }).limit(100),
          supabase.from('expenses').select('*').or(`kategori.ilike.Cafe%,keterangan.ilike.%[Méra Hause]%,keterangan.ilike.%[Nona]%,keterangan.ilike.%[Rara]%`).order('tanggal', { ascending: false }).order('created_at', { ascending: false }).limit(100),
          supabase.from('cafe_ingredients').select('*').order('category').order('name'),
          supabase.from('cafe_recipes').select('*'),
          supabase.from('cafe_stock_mutations').select('*').order('created_at', { ascending: false }).limit(100),
        ])

        if (catData && catData.length > 0) setCategories(catData as CafeCategory[])
        if (prodData && prodData.length > 0) setProducts(prodData as CafeProduct[])
        if (ordData && ordData.length > 0) setOrders(ordData as CafeOrder[])
        if (expData && expData.length > 0) setExpenses(expData as CafeExpense[])
        if (ingData && ingData.length > 0) setIngredients(ingData as CafeIngredient[])
        if (recData && recData.length > 0) setRecipes(recData as CafeRecipeItem[])
        if (mutData && mutData.length > 0) setMutations(mutData as CafeStockMutation[])
      } catch (err) {
        console.log('Using local fallback cafe catalog / inventory:', err)
      }
    }
    fetchSupabaseData()
  }, [])

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.is_available) return false
      if (selectedCategoryId !== 'all' && p.category_id !== selectedCategoryId) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [products, selectedCategoryId, searchQuery])

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0)
  }, [cart])

  const effectiveDiscount = useMemo(() => {
    if (discountPercent > 0) {
      return Math.round((cartSubtotal * discountPercent) / 100)
    }
    return discountNominal
  }, [cartSubtotal, discountPercent, discountNominal])

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - effectiveDiscount)
  }, [cartSubtotal, effectiveDiscount])

  const totalItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }, [cart])

  // Cart Handlers
  const handleAddToCart = (product: CafeProduct) => {
    const stockStatus = calculateProductStockStatus(product, recipes, ingredients)
    if (stockStatus.status === 'OUT_OF_STOCK') {
      showToast(
        `Bahan baku untuk ${product.name} sedang habis (${stockStatus.bottleneckIngredient?.name || 'Stok 0'})!`
      )
      return
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === product.id)
      if (existingIdx >= 0) {
        const updated = [...prev]
        const item = updated[existingIdx]
        const newQty = item.quantity + 1
        if (stockStatus.estimatedPortions > 0 && newQty > stockStatus.estimatedPortions) {
          showToast(
            `Sisa bahan baku hanya cukup untuk ${stockStatus.estimatedPortions} porsi!`
          )
          return prev
        }
        updated[existingIdx] = {
          ...item,
          quantity: newQty,
          subtotal: newQty * item.product.price,
        }
        return updated
      } else {
        return [
          ...prev,
          {
            product,
            quantity: 1,
            subtotal: product.price,
          },
        ]
      }
    })
  }

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta
            if (newQty <= 0) return null
            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.product.price,
            }
          }
          return item
        })
        .filter(Boolean) as CafeCartItem[]
    })
  }

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const handleClearCart = () => {
    setCart([])
    setTableNumber('')
    setCustomerName('')
    setDiscountNominal(0)
    setDiscountPercent(0)
  }

  const handleSaveItemNote = (productId: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return { ...item, notes: itemNoteInput.trim() || undefined }
        }
        return item
      })
    )
    setEditingNoteItemId(null)
    setItemNoteInput('')
  }

  // Generate unique Order Number: MH-YYYYMMDD-XXXX
  const generateOrderNumber = (): string => {
    const d = new Date()
    const datePart = d.toISOString().slice(2, 10).replace(/-/g, '')
    const randPart = Math.floor(1000 + Math.random() * 9000)
    return `MH-${datePart}-${randPart}`
  }

  // Open Bill (Save Unpaid Order)
  const handleOpenBill = async () => {
    if (cart.length === 0) return

    const newOrder: CafeOrder = {
      id: `ord-${Date.now()}`,
      order_number: generateOrderNumber(),
      order_type: orderType,
      table_number: tableNumber.trim() || null,
      customer_name: customerName.trim() || null,
      subtotal: cartSubtotal,
      discount_amount: effectiveDiscount,
      discount_type: discountPercent > 0 ? 'PERCENT' : discountNominal > 0 ? 'NOMINAL' : 'NONE',
      total_amount: cartTotal,
      payment_method: null,
      cash_tendered: 0,
      change_amount: 0,
      status: 'OPEN_BILL',
      cashier_id: cashierId || null,
      cashier_name: cashierName,
      created_at: new Date().toISOString(),
      items: cart.map((c) => ({
        id: `item-${Date.now()}-${Math.random()}`,
        product_id: c.product.id,
        product_name: c.product.name,
        price: c.product.price,
        quantity: c.quantity,
        notes: c.notes,
        subtotal: c.subtotal,
      })),
    }

    setOrders((prev) => [newOrder, ...prev])
    handleClearCart()
    showToast(`Order #${newOrder.order_number} berhasil disimpan sebagai Open Bill!`)

    // Attempt saving to Supabase
    try {
      await (supabase.from('cafe_orders') as any).insert({
        id: newOrder.id,
        order_number: newOrder.order_number,
        order_type: newOrder.order_type,
        table_number: newOrder.table_number,
        customer_name: newOrder.customer_name,
        subtotal: newOrder.subtotal,
        discount_amount: newOrder.discount_amount,
        discount_type: newOrder.discount_type,
        total_amount: newOrder.total_amount,
        status: newOrder.status,
        cashier_id: newOrder.cashier_id,
        cashier_name: newOrder.cashier_name,
      })
      if (newOrder.items && newOrder.items.length > 0) {
        await (supabase.from('cafe_order_items') as any).insert(
          newOrder.items.map((it) => ({
            order_id: newOrder.id,
            product_id: it.product_id,
            product_name: it.product_name,
            price: it.price,
            quantity: it.quantity,
            notes: it.notes,
            subtotal: it.subtotal,
          }))
        )
      }
    } catch {
      // ignore
    }
  }

  // Prepare Checkout Modal
  const handleProceedCheckout = () => {
    if (cart.length === 0) return

    const pendingOrder: CafeOrder = {
      id: `ord-${Date.now()}`,
      order_number: generateOrderNumber(),
      order_type: orderType,
      table_number: tableNumber.trim() || null,
      customer_name: customerName.trim() || null,
      subtotal: cartSubtotal,
      discount_amount: effectiveDiscount,
      discount_type: discountPercent > 0 ? 'PERCENT' : discountNominal > 0 ? 'NOMINAL' : 'NONE',
      total_amount: cartTotal,
      payment_method: 'CASH',
      cash_tendered: cartTotal,
      change_amount: 0,
      status: 'OPEN_BILL',
      cashier_id: cashierId || null,
      cashier_name: cashierName,
      created_at: new Date().toISOString(),
      items: cart.map((c) => ({
        id: `item-${Date.now()}-${Math.random()}`,
        product_id: c.product.id,
        product_name: c.product.name,
        price: c.product.price,
        quantity: c.quantity,
        notes: c.notes,
        subtotal: c.subtotal,
      })),
    }

    setCheckoutOrder(pendingOrder)
  }

  // Resume Open Bill
  const handleResumeOpenBill = (order: CafeOrder) => {
    const restoredCart: CafeCartItem[] = (order.items ?? []).map((it) => {
      const prod = products.find((p) => p.id === it.product_id) || {
        id: it.product_id || `prod-${Date.now()}`,
        name: it.product_name,
        price: it.price,
        is_available: true,
        sort_order: 99,
      }
      return {
        product: prod,
        quantity: it.quantity,
        notes: it.notes,
        subtotal: it.subtotal,
      }
    })

    setCart(restoredCart)
    setOrderType(order.order_type)
    setTableNumber(order.table_number || '')
    setCustomerName(order.customer_name || '')
    setDiscountNominal(order.discount_amount || 0)

    // Remove from open bills
    setOrders((prev) => prev.filter((o) => o.id !== order.id))
    setActiveTab('kasir')
    showToast(`Order #${order.order_number} dilanjutkan ke kasir`)
  }

  // Cancel / Void Open Bill
  const handleCancelOpenBill = async (orderId: string) => {
    if (role !== 'owner') {
      showToast('Hanya Owner yang memiliki akses membatalkan pesanan.')
      return
    }
    if (!confirm('Yakin ingin membatalkan open bill ini?')) return
    setOrders((prev) => prev.filter((o) => o.id !== orderId))
    try {
      await (supabase.from('cafe_orders') as any).update({ status: 'CANCELLED' }).eq('id', orderId)
    } catch {
      // ignore
    }
    showToast('Open bill berhasil dibatalkan')
  }

  // Void / Cancel Paid Order (Owner only)
  const handleVoidPaidOrder = async (orderId: string, orderNumber: string) => {
    if (role !== 'owner') {
      showToast('Hanya Owner yang memiliki akses membatalkan transaksi.')
      return
    }
    if (
      !confirm(
        `Yakin ingin membatalkan transaksi #${orderNumber}? Transaksi ini akan dikeluarkan dari omset dan stok bahan akan dikembalikan.`
      )
    )
      return

    const targetOrder = orders.find((o) => o.id === orderId)
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'CANCELLED' as CafeOrderStatus } : o))
    )

    try {
      await (supabase.from('cafe_orders') as any).update({ status: 'CANCELLED' }).eq('id', orderId)
    } catch (err) {
      console.error('Error voiding order:', err)
    }

    // ─── Automatic Inventory Restoration on Void ───
    if (targetOrder?.items && targetOrder.items.length > 0) {
      const restoreMap = new Map<
        string,
        { ingredient: CafeIngredient; qty: number; productsSummary: string[] }
      >()

      for (const item of targetOrder.items) {
        const recipeItems = getRecipeItemsForProduct(
          { id: item.product_id || '', name: item.product_name },
          recipes,
          ingredients
        )
        for (const rItem of recipeItems) {
          const ingId = rItem.ingredient.id
          const totalRestore = rItem.quantity * item.quantity
          const existing = restoreMap.get(ingId)
          if (existing) {
            existing.qty += totalRestore
            existing.productsSummary.push(`${item.quantity}x ${item.product_name}`)
          } else {
            restoreMap.set(ingId, {
              ingredient: rItem.ingredient,
              qty: totalRestore,
              productsSummary: [`${item.quantity}x ${item.product_name}`],
            })
          }
        }
      }

      if (restoreMap.size > 0) {
        const restoreMutations: CafeStockMutation[] = []
        const updatedIngredientsMap = new Map<string, number>()

        setIngredients((prev) => {
          return prev.map((ing) => {
            const restore = restoreMap.get(ing.id)
            if (!restore) return ing
            const prevStock = ing.current_stock
            const newStock = prevStock + restore.qty
            updatedIngredientsMap.set(ing.id, newStock)

            restoreMutations.push({
              id: `MUT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              ingredient_id: ing.id,
              ingredient_name: ing.name,
              type: 'CANCEL_RESTORE',
              quantity: restore.qty,
              previous_stock: prevStock,
              final_stock: newStock,
              reference_id: orderId,
              notes: `Batal Transaksi #${orderNumber} (${restore.productsSummary.join(', ')})`,
              created_by: cashierName,
              created_at: new Date().toISOString(),
            })

            return {
              ...ing,
              current_stock: newStock,
            }
          })
        })

        if (restoreMutations.length > 0) {
          setMutations((prev) => [...restoreMutations, ...prev])
        }

        try {
          for (const [ingId, newStock] of updatedIngredientsMap.entries()) {
            await (supabase.from('cafe_ingredients') as any)
              .update({ current_stock: newStock })
              .eq('id', ingId)
          }
          if (restoreMutations.length > 0) {
            await (supabase.from('cafe_stock_mutations') as any).insert(
              restoreMutations.map((m) => ({
                ingredient_id: m.ingredient_id,
                type: m.type,
                quantity: m.quantity,
                previous_stock: m.previous_stock,
                final_stock: m.final_stock,
                reference_id: m.reference_id,
                notes: m.notes,
                created_by: m.created_by,
              }))
            )
          }
        } catch (err) {
          console.error('Failed to sync inventory restore to Supabase:', err)
        }
      }
    }

    showToast(`Transaksi #${orderNumber} berhasil dibatalkan & stok dikembalikan`)
  }

  // Expense Handlers
  const handleAddExpense = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const cleanNominal = Number(expenseJumlah.replace(/\D/g, ''))
    if (!expenseKeterangan.trim()) {
      showToast('Harap masukkan keterangan pengeluaran')
      return
    }
    if (!cleanNominal || cleanNominal <= 0) {
      showToast('Harap masukkan nominal pengeluaran yang valid')
      return
    }

    setExpenseSubmitting(true)
    const today = getWibDate()
    const newExp: CafeExpense = {
      id: 'exp_' + Date.now(),
      tanggal: today,
      keterangan: `[${cashierName}] ${expenseKeterangan.trim()}`,
      kategori: expenseKategori,
      jumlah: cleanNominal,
      metode_bayar: expenseMetode,
      created_at: new Date().toISOString(),
    }

    setExpenses((prev) => [newExp, ...prev])
    setExpenseKeterangan('')
    setExpenseJumlah('')
    showToast('Pengeluaran berhasil dicatat!')

    try {
      const { data } = await (supabase.from('expenses') as any)
        .insert({
          tanggal: today,
          keterangan: newExp.keterangan,
          kategori: newExp.kategori,
          jumlah: newExp.jumlah,
          metode_bayar: newExp.metode_bayar,
        })
        .select('*')
        .single()

      if (data) {
        setExpenses((prev) => prev.map((item) => (item.id === newExp.id ? (data as CafeExpense) : item)))
      }
    } catch (err) {
      console.error('Error saving expense to Supabase:', err)
    } finally {
      setExpenseSubmitting(false)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (role !== 'owner') {
      showToast('Hanya Owner yang berhak menghapus data pengeluaran.')
      return
    }
    if (!confirm('Yakin ingin menghapus catatan pengeluaran ini?')) return
    setExpenses((prev) => prev.filter((item) => item.id !== id))
    try {
      await supabase.from('expenses').delete().eq('id', id)
    } catch (err) {
      console.error('Error deleting expense:', err)
    }
    showToast('Pengeluaran berhasil dihapus')
  }

  // ─── Inventory Restock & Stock Opname Handlers ────────────
  const handleRestock = async (
    ingredientId: string,
    addQty: number,
    cost: number,
    autoRecordExpense: boolean,
    notes: string
  ) => {
    const target = ingredients.find((i) => i.id === ingredientId)
    if (!target) return

    const prevStock = target.current_stock
    const newStock = prevStock + addQty

    setIngredients((prev) =>
      prev.map((i) => (i.id === ingredientId ? { ...i, current_stock: newStock } : i))
    )

    const newMutation: CafeStockMutation = {
      id: `MUT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ingredient_id: ingredientId,
      ingredient_name: target.name,
      type: 'RESTOCK',
      quantity: addQty,
      previous_stock: prevStock,
      final_stock: newStock,
      notes: notes || 'Pembelian / Restock Bahan Baku',
      created_by: cashierName,
      created_at: new Date().toISOString(),
    }

    setMutations((prev) => [newMutation, ...prev])

    try {
      await (supabase.from('cafe_ingredients') as any)
        .update({ current_stock: newStock })
        .eq('id', ingredientId)
      await (supabase.from('cafe_stock_mutations') as any).insert({
        ingredient_id: ingredientId,
        type: 'RESTOCK',
        quantity: addQty,
        previous_stock: prevStock,
        final_stock: newStock,
        notes: newMutation.notes,
        created_by: cashierName,
      })
    } catch (err) {
      console.error('Supabase restock sync failed:', err)
    }

    // Auto-record expense if requested
    if (autoRecordExpense && cost > 0) {
      const today = getWibDate()
      const newExp: CafeExpense = {
        id: `EXP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        tanggal: today,
        keterangan: `[Restock] ${target.name} (+${addQty} ${target.unit})${notes ? ` - ${notes}` : ''} [${cashierName}]`,
        kategori: 'Cafe: Bahan Baku',
        jumlah: cost,
        metode_bayar: 'CASH',
        created_at: new Date().toISOString(),
      }
      setExpenses((prev) => [newExp, ...prev])
      try {
        await (supabase.from('expenses') as any).insert({
          id: newExp.id,
          tanggal: newExp.tanggal,
          keterangan: newExp.keterangan,
          kategori: newExp.kategori,
          jumlah: newExp.jumlah,
          metode_bayar: newExp.metode_bayar,
          user_name: cashierName,
        })
      } catch {
        // ignore
      }
    }

    showToast(`Restock ${target.name} (+${addQty} ${target.unit}) berhasil disimpan!`)
  }

  const handleOpname = async (
    ingredientId: string,
    physicalStock: number,
    reason: string
  ) => {
    const target = ingredients.find((i) => i.id === ingredientId)
    if (!target) return

    const prevStock = target.current_stock
    const diff = physicalStock - prevStock
    const newStock = physicalStock

    setIngredients((prev) =>
      prev.map((i) => (i.id === ingredientId ? { ...i, current_stock: newStock } : i))
    )

    const newMutation: CafeStockMutation = {
      id: `OPN-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ingredient_id: ingredientId,
      ingredient_name: target.name,
      type: 'OPNAME',
      quantity: diff,
      previous_stock: prevStock,
      final_stock: newStock,
      notes: `Stok Opname Fisik: ${physicalStock} ${target.unit} (${diff >= 0 ? `+${diff}` : diff} ${target.unit})${reason ? ` - ${reason}` : ''}`,
      created_by: cashierName,
      created_at: new Date().toISOString(),
    }

    setMutations((prev) => [newMutation, ...prev])

    try {
      await (supabase.from('cafe_ingredients') as any)
        .update({ current_stock: newStock })
        .eq('id', ingredientId)
      await (supabase.from('cafe_stock_mutations') as any).insert({
        ingredient_id: ingredientId,
        type: 'OPNAME',
        quantity: diff,
        previous_stock: prevStock,
        final_stock: newStock,
        notes: newMutation.notes,
        created_by: cashierName,
      })
    } catch (err) {
      console.error('Supabase opname sync failed:', err)
    }

    showToast(`Stok Opname ${target.name} berhasil disimpan (${physicalStock} ${target.unit})!`)
  }

  // Completed Payment Callback from Checkout Modal
  const handleCompletePayment = async (completedOrder: CafeOrder) => {
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === completedOrder.id)
      if (exists) {
        return prev.map((o) => (o.id === completedOrder.id ? completedOrder : o))
      }
      return [completedOrder, ...prev]
    })

    handleClearCart()

    // ─── Automatic Inventory Deduction (BOM Recipe per Cup/Portion) ───
    if (completedOrder.items && completedOrder.items.length > 0) {
      const deductionsMap = new Map<
        string,
        { ingredient: CafeIngredient; qty: number; productsSummary: string[] }
      >()

      for (const item of completedOrder.items) {
        const recipeItems = getRecipeItemsForProduct(
          { id: item.product_id || '', name: item.product_name },
          recipes,
          ingredients
        )
        for (const rItem of recipeItems) {
          const ingId = rItem.ingredient.id
          const totalDeduct = rItem.quantity * item.quantity
          const existing = deductionsMap.get(ingId)
          if (existing) {
            existing.qty += totalDeduct
            existing.productsSummary.push(`${item.quantity}x ${item.product_name}`)
          } else {
            deductionsMap.set(ingId, {
              ingredient: rItem.ingredient,
              qty: totalDeduct,
              productsSummary: [`${item.quantity}x ${item.product_name}`],
            })
          }
        }
      }

      if (deductionsMap.size > 0) {
        const newMutationsList: CafeStockMutation[] = []
        const updatedIngredientsMap = new Map<string, number>()

        setIngredients((prev) => {
          return prev.map((ing) => {
            const deduction = deductionsMap.get(ing.id)
            if (!deduction) return ing
            const prevStock = ing.current_stock
            const newStock = Math.max(0, prevStock - deduction.qty)
            updatedIngredientsMap.set(ing.id, newStock)

            newMutationsList.push({
              id: `MUT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              ingredient_id: ing.id,
              ingredient_name: ing.name,
              type: 'SALE',
              quantity: -deduction.qty,
              previous_stock: prevStock,
              final_stock: newStock,
              reference_id: completedOrder.id,
              notes: `Terjual di #${completedOrder.order_number} (${deduction.productsSummary.join(', ')})`,
              created_by: completedOrder.cashier_name || cashierName,
              created_at: new Date().toISOString(),
            })

            return {
              ...ing,
              current_stock: newStock,
            }
          })
        })

        if (newMutationsList.length > 0) {
          setMutations((prev) => [...newMutationsList, ...prev])
        }

        // Sync to Supabase in background
        try {
          for (const [ingId, newStock] of updatedIngredientsMap.entries()) {
            await (supabase.from('cafe_ingredients') as any)
              .update({ current_stock: newStock })
              .eq('id', ingId)
          }
          if (newMutationsList.length > 0) {
            await (supabase.from('cafe_stock_mutations') as any).insert(
              newMutationsList.map((m) => ({
                ingredient_id: m.ingredient_id,
                type: m.type,
                quantity: m.quantity,
                previous_stock: m.previous_stock,
                final_stock: m.final_stock,
                reference_id: m.reference_id,
                notes: m.notes,
                created_by: m.created_by,
              }))
            )
          }
        } catch (err) {
          console.error('Failed to sync inventory deduction to Supabase:', err)
        }
      }
    }

    // Sync order to Supabase
    try {
      await (supabase.from('cafe_orders') as any).upsert({
        id: completedOrder.id,
        order_number: completedOrder.order_number,
        order_type: completedOrder.order_type,
        table_number: completedOrder.table_number,
        customer_name: completedOrder.customer_name,
        subtotal: completedOrder.subtotal,
        discount_amount: completedOrder.discount_amount,
        discount_type: completedOrder.discount_type,
        total_amount: completedOrder.total_amount,
        payment_method: completedOrder.payment_method,
        cash_tendered: completedOrder.cash_tendered,
        change_amount: completedOrder.change_amount,
        status: 'PAID',
        cashier_id: completedOrder.cashier_id,
        cashier_name: completedOrder.cashier_name,
      })

      if (completedOrder.items && completedOrder.items.length > 0) {
        await (supabase.from('cafe_order_items') as any).insert(
          completedOrder.items.map((it) => ({
            order_id: completedOrder.id,
            product_id: it.product_id,
            product_name: it.product_name,
            price: it.price,
            quantity: it.quantity,
            notes: it.notes,
            subtotal: it.subtotal,
          }))
        )
      }
    } catch {
      // ignore
    }
  }

  // Open Bills list
  const openBills = useMemo(() => {
    return orders.filter((o) => o.status === 'OPEN_BILL')
  }, [orders])

  // Paid Orders list (History)
  const paidOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'PAID')
  }, [orders])

  // WIB Date Constants
  const todayWibDate = useMemo(() => getWibDate(), [])
  const yesterdayWibDate = useMemo(() => {
    const y = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return getWibDate(y)
  }, [])

  // Today Expenses Memos (For Expenses Tab)
  const todayExpenses = useMemo(() => {
    return expenses.filter(
      (e) => (e.tanggal ? e.tanggal.slice(0, 10) : toWibDateKey(e.created_at)) === todayWibDate
    )
  }, [expenses, todayWibDate])

  const totalExpensesToday = useMemo(() => {
    return todayExpenses.reduce((sum, e) => sum + e.jumlah, 0)
  }, [todayExpenses])

  const cashExpensesToday = useMemo(() => {
    return todayExpenses
      .filter((e) => (e.metode_bayar ?? 'CASH') === 'CASH')
      .reduce((sum, e) => sum + e.jumlah, 0)
  }, [todayExpenses])

  const qrisExpensesToday = useMemo(() => {
    return todayExpenses
      .filter((e) => e.metode_bayar === 'QRIS')
      .reduce((sum, e) => sum + e.jumlah, 0)
  }, [todayExpenses])

  // Selected Date Filtered Data (For Finance Recap Tab)
  const selectedDateOrders = useMemo(() => {
    return paidOrders.filter((o) => toWibDateKey(o.created_at) === selectedRecapDate)
  }, [paidOrders, selectedRecapDate])

  const selectedDateExpenses = useMemo(() => {
    return expenses.filter(
      (e) => (e.tanggal ? e.tanggal.slice(0, 10) : toWibDateKey(e.created_at)) === selectedRecapDate
    )
  }, [expenses, selectedRecapDate])

  const totalSelectedExpenses = useMemo(() => {
    return selectedDateExpenses.reduce((sum, e) => sum + e.jumlah, 0)
  }, [selectedDateExpenses])

  const cashSelectedExpenses = useMemo(() => {
    return selectedDateExpenses
      .filter((e) => (e.metode_bayar ?? 'CASH') === 'CASH')
      .reduce((sum, e) => sum + e.jumlah, 0)
  }, [selectedDateExpenses])

  const qrisSelectedExpenses = useMemo(() => {
    return selectedDateExpenses
      .filter((e) => e.metode_bayar === 'QRIS')
      .reduce((sum, e) => sum + e.jumlah, 0)
  }, [selectedDateExpenses])

  // Comprehensive Finance Recap for Selected Date
  const dateRecap = useMemo(() => {
    const orders = selectedDateOrders
    const omset = orders.reduce((sum, o) => sum + o.total_amount, 0)
    const cashTotal = orders
      .filter((o) => o.payment_method === 'CASH')
      .reduce((sum, o) => sum + o.total_amount, 0)
    const qrisTotal = orders
      .filter((o) => o.payment_method === 'QRIS')
      .reduce((sum, o) => sum + o.total_amount, 0)
    const transferTotal = orders
      .filter((o) => o.payment_method === 'TRANSFER')
      .reduce((sum, o) => sum + o.total_amount, 0)

    let totalCups = 0
    let totalHpp = 0

    const itemMap = new Map<string, { name: string; qty: number; revenue: number }>()
    const cashierMap = new Map<string, { cashier: string; count: number; total: number }>()

    orders.forEach((o) => {
      // Cashier breakdown
      const cName = o.cashier_name || 'Kasir Méra Hause'
      const curCashier = cashierMap.get(cName) ?? { cashier: cName, count: 0, total: 0 }
      curCashier.count += 1
      curCashier.total += o.total_amount
      cashierMap.set(cName, curCashier)

      // Item breakdown
      o.items?.forEach((it) => {
        totalCups += it.quantity
        const prod = products.find((p) => p.id === it.product_id)
        if (prod?.cost_price) {
          totalHpp += prod.cost_price * it.quantity
        }

        const curItem = itemMap.get(it.product_name) ?? { name: it.product_name, qty: 0, revenue: 0 }
        curItem.qty += it.quantity
        curItem.revenue += it.subtotal
        itemMap.set(it.product_name, curItem)
      })
    })

    const topItems = [...itemMap.values()].sort((a, b) => b.qty - a.qty)
    const cashierRows = [...cashierMap.values()].sort((a, b) => b.total - a.total)
    const grossProfit = omset - totalHpp
    const netCashInDrawer = Math.max(0, cashTotal - cashSelectedExpenses)

    return {
      orderCount: orders.length,
      omset,
      cashTotal,
      qrisTotal,
      transferTotal,
      totalCups,
      totalHpp,
      grossProfit,
      netCashInDrawer,
      topItems,
      cashierRows,
    }
  }, [selectedDateOrders, products, cashSelectedExpenses])

  // Formatted data for thermal Bluetooth / Browser closing receipt
  const recapPrintData: CafeRecapPrintData = useMemo(() => {
    return {
      dateStr: new Date(selectedRecapDate + 'T00:00:00').toLocaleDateString('id-ID', { dateStyle: 'full' }),
      printedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      cashierName,
      orderCount: dateRecap.orderCount,
      totalCups: dateRecap.totalCups,
      omset: dateRecap.omset,
      cashTotal: dateRecap.cashTotal,
      qrisTotal: dateRecap.qrisTotal,
      transferTotal: dateRecap.transferTotal,
      expenseTotal: totalSelectedExpenses,
      cashExpenses: cashSelectedExpenses,
      netCashInDrawer: dateRecap.netCashInDrawer,
      topItems: dateRecap.topItems,
      expenses: selectedDateExpenses.map((e) => ({
        keterangan: e.keterangan,
        jumlah: e.jumlah,
        metode_bayar: e.metode_bayar ?? 'CASH',
      })),
    }
  }, [
    selectedRecapDate,
    cashierName,
    dateRecap,
    totalSelectedExpenses,
    cashSelectedExpenses,
    selectedDateExpenses,
  ])

  // Generator WhatsApp Closing Report
  const generateWhatsAppText = () => {
    const formattedDate = new Date(selectedRecapDate + 'T00:00:00').toLocaleDateString('id-ID', {
      dateStyle: 'full',
    })
    let msg = `*LAPORAN CLOSING KEUANGAN MÉRA HAUSE* ☕\n`
    msg += `📅 Tanggal: ${formattedDate}\n`
    msg += `🕒 Waktu Closing: ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB\n`
    msg += `👤 Petugas Kasir: ${cashierName}\n`
    msg += `------------------------------------\n\n`
    msg += `📊 *RINGKASAN PENJUALAN*\n`
    msg += `• Total Pesanan: ${dateRecap.orderCount} transaksi\n`
    msg += `• Total Terjual: ${dateRecap.totalCups} cup\n`
    msg += `• Tunai (Cash): Rp ${dateRecap.cashTotal.toLocaleString('id-ID')}\n`
    msg += `• Non-Tunai (QRIS/TF): Rp ${(dateRecap.qrisTotal + dateRecap.transferTotal).toLocaleString('id-ID')}\n`
    msg += `*TOTAL OMSET: Rp ${dateRecap.omset.toLocaleString('id-ID')}*\n\n`

    msg += `💸 *PENGELUARAN / BELANJA OPERASIONAL*\n`
    if (selectedDateExpenses.length === 0) {
      msg += `• Tidak ada pengeluaran\n`
    } else {
      selectedDateExpenses.forEach((exp) => {
        msg += `• ${exp.keterangan} [${exp.metode_bayar}]: -Rp ${exp.jumlah.toLocaleString('id-ID')}\n`
      })
      msg += `_Total Pengeluaran Kas Laci: -Rp ${cashSelectedExpenses.toLocaleString('id-ID')}_\n`
    }
    msg += `\n`

    msg += `💵 *KAS FISIK LACI (WAJIB COCOK DENGAN UANG LACI)*\n`
    msg += `*Rp ${dateRecap.netCashInDrawer.toLocaleString('id-ID')}*\n`
    msg += `(Omset Tunai Rp ${dateRecap.cashTotal.toLocaleString('id-ID')} - Belanja Tunai Rp ${cashSelectedExpenses.toLocaleString('id-ID')})\n\n`

    if (dateRecap.topItems.length > 0) {
      msg += `🏆 *MENU TERLARIS:*\n`
      dateRecap.topItems.slice(0, 5).forEach((item, i) => {
        msg += `${i + 1}. ${item.name} (${item.qty} cup)\n`
      })
      msg += `\n`
    }

    if (dateRecap.cashierRows.length > 1) {
      msg += `👥 *PERFORMA KASIR:*\n`
      dateRecap.cashierRows.forEach((row) => {
        msg += `• ${row.cashier}: ${row.count} trx (Rp ${row.total.toLocaleString('id-ID')})\n`
      })
      msg += `\n`
    }

    msg += `_Laporan dibuat otomatis dari Sistem POS Méra Hause (FreeKasir)_`
    return msg
  }

  const handleShareWhatsApp = () => {
    const text = generateWhatsAppText()
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppText()
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      showToast('Teks rekap berhasil disalin! Siap dikirim ke WhatsApp Owner')
    } else {
      showToast('Berhasil membuat rekap!')
    }
  }

  const handleOpenPrintModal = () => {
    setClosingReceiptModal(recapPrintData)
  }

  const handlePrintClosingSlip = async () => {
    setClosingReceiptModal(recapPrintData)
    const res = await bluetoothPrinter.printRecap(recapPrintData)
    showToast(res.message)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#0f0f11',
        color: '#fff',
        fontFamily: 'var(--mera-font, system-ui, sans-serif)',
        overflow: 'hidden',
      }}
    >
      {/* ─── Top Bar / Header ─────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(20, 20, 24, 0.95)',
          backdropFilter: 'blur(16px)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #622128 0%, #401419 100%)',
              padding: '6px 12px',
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(98, 33, 40, 0.4)',
            }}
          >
            <Coffee size={18} color="#fff" />
            <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.04em' }}>
              MÉRA HAUSE
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.06)',
                padding: '4px 10px',
                borderRadius: '6px',
              }}
            >
              Kasir: <strong style={{ color: '#fff' }}>{cashierName}</strong>
            </span>

            {/* Attendance Quick Button */}
            {onOpenAttendance && (
              <button
                onClick={onOpenAttendance}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#E0B88A',
                  background: 'rgba(98, 33, 40, 0.25)',
                  border: '1px solid rgba(139, 26, 26, 0.45)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <Clock size={12} /> Absensi / Selesai Shift
              </button>
            )}
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            padding: '3px',
            gap: '3px',
          }}
        >
          {(
            [
              { key: 'kasir', label: 'Kasir POS', icon: ShoppingCart, badge: null },
              {
                key: 'open_bills',
                label: `Open Bill (${openBills.length})`,
                icon: FileText,
                badge: openBills.length > 0 ? openBills.length : null,
              },
              { key: 'history', label: 'Riwayat Struk', icon: Receipt, badge: null },
              {
                key: 'inventory',
                label: 'Stok Bahan',
                icon: Package,
                badge: lowStockCount > 0 ? lowStockCount : null,
              },
              {
                key: 'expenses',
                label: `Pengeluaran (${todayExpenses.length})`,
                icon: Wallet,
                badge: todayExpenses.length > 0 ? todayExpenses.length : null,
              },
              { key: 'recap', label: 'Rekap Harian', icon: TrendingUp, badge: null },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.key
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: active ? '#622128' : 'transparent',
                  color: active ? '#fff' : 'rgba(255, 255, 255, 0.55)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    style={{
                      background: '#ef4444',
                      color: '#fff',
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      marginLeft: '2px',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Printer & Session Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Bluetooth Printer Button */}
          <button
            onClick={() => bluetoothPrinter.connect()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: btState.isConnected
                ? '1px solid rgba(34, 197, 94, 0.4)'
                : '1px solid rgba(255, 255, 255, 0.15)',
              background: btState.isConnected
                ? 'rgba(34, 197, 94, 0.12)'
                : 'rgba(255, 255, 255, 0.05)',
              color: btState.isConnected ? '#4ade80' : 'rgba(255, 255, 255, 0.65)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Bluetooth size={14} />
            <span>
              {btState.isConnected
                ? btState.deviceName || 'Thermal BT'
                : 'Sambungkan Printer BT'}
            </span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <LogOut size={13} /> Keluar
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '60px',
            right: '24px',
            background: '#1e1e24',
            border: '1px solid rgba(139, 26, 26, 0.6)',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Sparkles size={16} color="#E0B88A" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── Main Sub-tab Content ─────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {activeTab === 'kasir' && (
          <>
            {/* Left: Product Catalog */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {/* Category Filter Pills & Search */}
              <div
                style={{
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  background: 'rgba(18, 18, 22, 0.6)',
                }}
              >
                {/* Search Input */}
                <div style={{ position: 'relative', width: '240px' }}>
                  <Search
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255,255,255,0.4)',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Cari menu Méra Hause..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 12px 8px 34px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Category Pills */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    overflowX: 'auto',
                    flex: 1,
                    scrollbarWidth: 'none',
                  }}
                >
                  <button
                    onClick={() => setSelectedCategoryId('all')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background:
                        selectedCategoryId === 'all'
                          ? '#622128'
                          : 'rgba(255, 255, 255, 0.06)',
                      color: selectedCategoryId === 'all' ? '#fff' : 'rgba(255, 255, 255, 0.65)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Semua Menu ({products.length})
                  </button>

                  {categories.map((cat) => {
                    const active = selectedCategoryId === cat.id
                    const count = products.filter((p) => p.category_id === cat.id).length
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          background: active ? '#622128' : 'rgba(255, 255, 255, 0.06)',
                          color: active ? '#fff' : 'rgba(255, 255, 255, 0.65)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                        <span
                          style={{
                            fontSize: '10px',
                            opacity: 0.7,
                            background: 'rgba(0,0,0,0.2)',
                            padding: '1px 5px',
                            borderRadius: '6px',
                          }}
                        >
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Products Grid */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '14px',
                  alignContent: 'start',
                }}
              >
                {filteredProducts.map((prod) => {
                  const inCartItem = cart.find((c) => c.product.id === prod.id)
                  const stockStatus = calculateProductStockStatus(prod, recipes, ingredients)
                  const isOutOfStock = stockStatus.status === 'OUT_OF_STOCK'
                  const isLowStock = stockStatus.status === 'LOW_STOCK'

                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleAddToCart(prod)}
                      style={{
                        background: inCartItem
                          ? 'rgba(98, 33, 40, 0.25)'
                          : isOutOfStock
                          ? 'rgba(255, 255, 255, 0.02)'
                          : 'rgba(255, 255, 255, 0.04)',
                        border: inCartItem
                          ? '1.5px solid rgba(139, 26, 26, 0.8)'
                          : isOutOfStock
                          ? '1px dashed rgba(239, 68, 68, 0.35)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                        opacity: isOutOfStock ? 0.55 : 1,
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        minHeight: '120px',
                      }}
                    >
                      {/* Stock Status Badge */}
                      {isOutOfStock ? (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: '#ef4444',
                            color: '#fff',
                            padding: '2px 7px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
                          }}
                        >
                          HABIS
                        </div>
                      ) : isLowStock ? (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(245, 158, 11, 0.2)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            color: '#fbbf24',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            fontSize: '9px',
                            fontWeight: 700,
                          }}
                        >
                          Sisa ~{stockStatus.estimatedPortions}
                        </div>
                      ) : null}

                      {/* Quantity in Cart Badge */}
                      {inCartItem && (
                        <div
                          style={{
                            position: 'absolute',
                            top: isOutOfStock || isLowStock ? '32px' : '8px',
                            right: '8px',
                            background: '#622128',
                            color: '#fff',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            boxShadow: '0 2px 8px rgba(98, 33, 40, 0.6)',
                          }}
                        >
                          {inCartItem.quantity}
                        </div>
                      )}

                      <div>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#fff',
                            marginBottom: '4px',
                            paddingRight: isOutOfStock || isLowStock || inCartItem ? '54px' : '0',
                          }}
                        >
                          {prod.name}
                        </div>
                        {prod.description && (
                          <div
                            style={{
                              fontSize: '10px',
                              color: 'rgba(255, 255, 255, 0.45)',
                              lineHeight: 1.3,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {prod.description}
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: '12px',
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#E0B88A' }}>
                          Rp {prod.price.toLocaleString('id-ID')}
                        </div>
                        {role === 'owner' && prod.cost_price && (
                          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>
                            HPP: {prod.cost_price.toLocaleString('id-ID')}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: Cart & Checkout Sidebar (FreeKasir Layout) */}
            <div
              style={{
                width: '380px',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'rgba(20, 20, 24, 0.7)',
                overflow: 'hidden',
              }}
            >
              {/* Order Settings (Dine In vs Takeaway, Table #, Customer) */}
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {/* Order Type Toggle */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    padding: '3px',
                    borderRadius: '8px',
                  }}
                >
                  <button
                    onClick={() => setOrderType('DINE_IN')}
                    style={{
                      padding: '7px',
                      borderRadius: '6px',
                      border: 'none',
                      background: orderType === 'DINE_IN' ? '#622128' : 'transparent',
                      color: orderType === 'DINE_IN' ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Dine In
                  </button>
                  <button
                    onClick={() => setOrderType('TAKEAWAY')}
                    style={{
                      padding: '7px',
                      borderRadius: '6px',
                      border: 'none',
                      background: orderType === 'TAKEAWAY' ? '#622128' : 'transparent',
                      color: orderType === 'TAKEAWAY' ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Takeaway
                  </button>
                </div>

                {/* Table Number & Customer Name Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px' }}>
                  {orderType === 'DINE_IN' ? (
                    <input
                      type="text"
                      placeholder="No Meja..."
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        color: 'rgba(255, 255, 255, 0.4)',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      Bawa Pulang
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="Nama Tamu (opsional)..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Cart Items List */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {cart.length === 0 ? (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255, 255, 255, 0.3)',
                      gap: '8px',
                      padding: '30px 0',
                    }}
                  >
                    <ShoppingCart size={36} strokeWidth={1.5} />
                    <span style={{ fontSize: '13px' }}>Keranjang masih kosong</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.2)' }}>
                      Pilih menu di sebelah kiri untuk menambah
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                              {item.product.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#E0B88A', fontWeight: 600 }}>
                              Rp {item.product.price.toLocaleString('id-ID')}
                            </div>
                          </div>

                          {/* Stepper Buttons */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => handleUpdateQuantity(item.product.id, -1)}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <Minus size={12} />
                            </button>
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                minWidth: '18px',
                                textAlign: 'center',
                              }}
                            >
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.product.id, 1)}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <Plus size={12} />
                            </button>
                            <button
                              onClick={() => handleRemoveFromCart(item.product.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(239, 68, 68, 0.7)',
                                cursor: 'pointer',
                                padding: '4px',
                                marginLeft: '4px',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Notes / Customization field */}
                        {editingNoteItemId === item.product.id ? (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                            <input
                              type="text"
                              placeholder="Catatan (e.g. less sugar)..."
                              value={itemNoteInput}
                              onChange={(e) => setItemNoteInput(e.target.value)}
                              style={{
                                flex: 1,
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#fff',
                                fontSize: '11px',
                                outline: 'none',
                              }}
                            />
                            <button
                              onClick={() => handleSaveItemNote(item.product.id)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: 'none',
                                background: '#622128',
                                color: '#fff',
                                fontSize: '10px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              OK
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingNoteItemId(item.product.id)
                              setItemNoteInput(item.notes || '')
                            }}
                            style={{
                              fontSize: '10px',
                              color: item.notes ? '#E0B88A' : 'rgba(255,255,255,0.3)',
                              cursor: 'pointer',
                              fontStyle: item.notes ? 'normal' : 'italic',
                            }}
                          >
                            {item.notes ? `* Catatan: ${item.notes}` : '+ Tambah catatan menu'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Financial Summary & Action Buttons */}
              <div
                style={{
                  padding: '14px 16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(18, 18, 22, 0.9)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {/* Subtotal */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.6)',
                  }}
                >
                  <span>Subtotal ({totalItemCount} item):</span>
                  <span>Rp {cartSubtotal.toLocaleString('id-ID')}</span>
                </div>

                {/* Discount */}
                {effectiveDiscount > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      color: '#ef4444',
                    }}
                  >
                    <span>Diskon:</span>
                    <span>-Rp {effectiveDiscount.toLocaleString('id-ID')}</span>
                  </div>
                )}

                {/* Grand Total */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
                    paddingTop: '8px',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Total Tagihan:</span>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#E0B88A' }}>
                    Rp {cartTotal.toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Action Buttons: Open Bill & Bayar */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '8px' }}>
                  <button
                    onClick={handleOpenBill}
                    disabled={cart.length === 0}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: cart.length === 0 ? 'rgba(255,255,255,0.3)' : '#fff',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Open Bill
                  </button>

                  <button
                    onClick={handleProceedCheckout}
                    disabled={cart.length === 0}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: cart.length === 0 ? 'rgba(255,255,255,0.1)' : '#622128',
                      color: cart.length === 0 ? 'rgba(255,255,255,0.3)' : '#fff',
                      fontSize: '14px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                      boxShadow:
                        cart.length === 0 ? 'none' : '0 4px 16px rgba(98, 33, 40, 0.4)',
                    }}
                  >
                    <CreditCard size={16} /> Bayar (POS)
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── Sub-Tab: Open Bills ─────────────────────────── */}
        {activeTab === 'open_bills' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                  Daftar Pesanan Belum Selesai (Open Bill)
                </h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
                  Pesanan yang disimpan sementara sebelum pembayaran
                </p>
              </div>

              {openBills.length === 0 ? (
                <div
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '13px',
                  }}
                >
                  Tidak ada open bill saat ini. Semua pesanan telah diselesaikan.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {openBills.map((ord) => (
                    <div
                      key={ord.id}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>
                            #{ord.order_number}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              background: 'rgba(98, 33, 40, 0.4)',
                              border: '1px solid rgba(139, 26, 26, 0.6)',
                              color: '#E0B88A',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontWeight: 700,
                            }}
                          >
                            {ord.order_type === 'DINE_IN'
                              ? `Meja ${ord.table_number || '-'}`
                              : 'Takeaway'}
                          </span>
                          {ord.customer_name && (
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                              • {ord.customer_name}
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            fontSize: '11px',
                            color: 'rgba(255,255,255,0.4)',
                            marginTop: '6px',
                          }}
                        >
                          {ord.items?.map((it) => `${it.quantity}x ${it.product_name}`).join(', ')}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#E0B88A' }}>
                            Rp {ord.total_amount.toLocaleString('id-ID')}
                          </div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                            {new Date(ord.created_at).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleResumeOpenBill(ord)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '8px',
                              border: 'none',
                              background: '#622128',
                              color: '#fff',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Lanjutkan Bayar
                          </button>
                          {role === 'owner' && (
                            <button
                              onClick={() => handleCancelOpenBill(ord.id)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              Batalkan
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Sub-Tab: History (Paid Receipts) ─────────────── */}
        {activeTab === 'history' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                  Riwayat Struk & Transaksi Méra Hause
                </h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
                  Daftar transaksi yang telah dibayar lunas
                </p>
              </div>

              {/* Security Lock Banner for Crew (Nona & Rara) */}
              {role !== 'owner' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.55)',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Lock size={14} color="#E0B88A" />
                  <span>
                    Riwayat pesanan terkunci permanen. Penghapusan struk dan pembatalan transaksi hanya dapat diakses oleh <strong>Owner</strong>.
                  </span>
                </div>
              )}

              {paidOrders.length === 0 ? (
                <div
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '13px',
                  }}
                >
                  Belum ada transaksi terselesaikan hari ini.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {paidOrders.map((ord) => (
                    <div
                      key={ord.id}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>
                            #{ord.order_number}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              background: 'rgba(34, 197, 94, 0.15)',
                              color: '#4ade80',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontWeight: 700,
                            }}
                          >
                            LUNAS ({ord.payment_method})
                          </span>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                            • {ord.order_type === 'DINE_IN' ? `Meja ${ord.table_number || '-'}` : 'Takeaway'}
                          </span>
                        </div>

                        <div
                          style={{
                            fontSize: '11px',
                            color: 'rgba(255,255,255,0.4)',
                            marginTop: '6px',
                          }}
                        >
                          {ord.items?.map((it) => `${it.quantity}x ${it.product_name}`).join(', ')}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#E0B88A' }}>
                            Rp {ord.total_amount.toLocaleString('id-ID')}
                          </div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                            {new Date(ord.created_at).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => setReprintOrder(ord)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <Printer size={13} /> Cetak Struk
                          </button>

                          {role === 'owner' && (
                            <button
                              onClick={() => handleVoidPaidOrder(ord.id, ord.order_number)}
                              title="Batalkan / Void Transaksi (Khusus Owner)"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: 'rgba(239, 68, 68, 0.08)',
                                color: '#ef4444',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={12} /> Void
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Sub-Tab: Stok & Resep Bahan Baku (BOM & Opname) ─ */}
        {activeTab === 'inventory' && (
          <CafeInventoryView
            ingredients={ingredients}
            recipes={recipes}
            mutations={mutations}
            onRestock={handleRestock}
            onOpname={handleOpname}
            cashierName={cashierName}
            role={role}
          />
        )}

        {/* ─── Sub-Tab: Pengeluaran Operasional Harian ──────── */}
        {activeTab === 'expenses' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '820px', margin: '0 auto' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                    Pengeluaran Harian Méra Hause
                  </h3>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
                    Catat pembelian bahan baku, es batu, cup, dan belanja harian cafe
                  </p>
                </div>
                <div style={{ fontSize: '12px', color: '#E0B88A', fontWeight: 600, background: 'rgba(98, 33, 40, 0.25)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(139, 26, 26, 0.4)' }}>
                  Hari ini: {new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                </div>
              </div>

              {/* Summary KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '22px' }}>
                <div style={{ background: 'rgba(98, 33, 40, 0.2)', border: '1px solid rgba(139, 26, 26, 0.4)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: '#E0B88A', fontWeight: 600 }}>TOTAL PENGELUARAN HARI INI</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
                    Rp {totalExpensesToday.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                    {todayExpenses.length} transaksi belanja
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>DARI KAS LACI (TUNAI)</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#4ade80', marginTop: '6px' }}>
                    Rp {cashExpensesToday.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                    Memotong uang tunai di laci
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>NON-TUNAI / QRIS</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#38bdf8', marginTop: '6px' }}>
                    Rp {qrisExpensesToday.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                    Transfer rekening / QRIS
                  </div>
                </div>
              </div>

              {/* Input Form Card */}
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Plus size={16} color="#E0B88A" />
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#fff' }}>Input Pengeluaran Baru</h4>
                </div>

                {/* Quick Presets */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: 600 }}>Pilihan Cepat Cafe:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[
                      { label: '🧊 Es Batu Kristal', name: 'Es Batu Kristal', cat: 'Cafe: Es Batu & Air' },
                      { label: '🥛 Susu UHT Diamond', name: 'Susu UHT Diamond', cat: 'Cafe: Bahan Baku' },
                      { label: '🥤 Cup 16oz + Sedotan', name: 'Cup 16oz + Sedotan + Lid', cat: 'Cafe: Kemasan & Cup' },
                      { label: '💧 Air Galon Aqua', name: 'Air Galon Aqua', cat: 'Cafe: Es Batu & Air' },
                      { label: '🔥 Gas Elpiji 3kg', name: 'Gas Elpiji 3kg', cat: 'Cafe: Operasional' },
                      { label: '🧻 Tissue & Plastik', name: 'Tissue & Plastik Takeaway', cat: 'Cafe: Operasional' },
                    ].map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => {
                          setExpenseKeterangan(p.name)
                          setExpenseKategori(p.cat)
                        }}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.04)',
                          color: 'rgba(255,255,255,0.7)',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleAddExpense} style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontWeight: 600 }}>
                        Keterangan Belanja / Pengeluaran *
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Beli Es Batu 2 Karung, Susu UHT, dsb..."
                        value={expenseKeterangan}
                        onChange={(e) => setExpenseKeterangan(e.target.value)}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontWeight: 600 }}>
                        Nominal (Rp) *
                      </label>
                      <input
                        type="text"
                        placeholder="0"
                        value={expenseJumlah ? Number(expenseJumlah.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                        onChange={(e) => setExpenseJumlah(e.target.value.replace(/\D/g, ''))}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#E0B88A',
                          fontSize: '14px',
                          fontWeight: 700,
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontWeight: 600 }}>
                        Kategori Pengeluaran
                      </label>
                      <select
                        value={expenseKategori}
                        onChange={(e) => setExpenseKategori(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: '#1c1c20',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#fff',
                          fontSize: '12px',
                          outline: 'none',
                        }}
                      >
                        <option value="Cafe: Bahan Baku">☕ Bahan Baku (Kopi, Susu, Sirup, Powder)</option>
                        <option value="Cafe: Es Batu & Air">🧊 Es Batu & Air Galon</option>
                        <option value="Cafe: Kemasan & Cup">📦 Kemasan (Cup, Sedotan, Plastik, Seal)</option>
                        <option value="Cafe: Operasional">🧹 Operasional (Gas, Sabun, Tissue, Lap)</option>
                        <option value="Cafe: Lain-lain">📝 Lain-lain</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontWeight: 600 }}>
                        Sumber Dana (Metode Bayar)
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setExpenseMetode('CASH')}
                          style={{
                            flex: 1,
                            padding: '9px 10px',
                            borderRadius: '8px',
                            border: expenseMetode === 'CASH' ? '1.5px solid rgba(139, 26, 26, 0.8)' : '1px solid rgba(255,255,255,0.1)',
                            background: expenseMetode === 'CASH' ? '#622128' : 'rgba(255,255,255,0.04)',
                            color: expenseMetode === 'CASH' ? '#fff' : 'rgba(255,255,255,0.6)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Tunai (Kas)
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpenseMetode('QRIS')}
                          style={{
                            flex: 1,
                            padding: '9px 10px',
                            borderRadius: '8px',
                            border: expenseMetode === 'QRIS' ? '1.5px solid rgba(139, 26, 26, 0.8)' : '1px solid rgba(255,255,255,0.1)',
                            background: expenseMetode === 'QRIS' ? '#622128' : 'rgba(255,255,255,0.04)',
                            color: expenseMetode === 'QRIS' ? '#fff' : 'rgba(255,255,255,0.6)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Non-Tunai
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={expenseSubmitting || !expenseKeterangan.trim() || !expenseJumlah}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#622128',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: expenseSubmitting || !expenseKeterangan.trim() || !expenseJumlah ? 'not-allowed' : 'pointer',
                        opacity: expenseSubmitting || !expenseKeterangan.trim() || !expenseJumlah ? 0.5 : 1,
                        boxShadow: '0 4px 14px rgba(98, 33, 40, 0.4)',
                        height: '42px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {expenseSubmitting ? 'Menyimpan...' : '+ Simpan Pengeluaran'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Expense History List */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#fff' }}>
                  Daftar Pengeluaran Hari Ini ({todayExpenses.length})
                </h4>

                {todayExpenses.length === 0 ? (
                  <div style={{ padding: '36px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                    Belum ada pengeluaran yang dicatat hari ini.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {todayExpenses.map((exp) => (
                      <div
                        key={exp.id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>
                              {exp.keterangan}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                background: 'rgba(98, 33, 40, 0.35)',
                                border: '1px solid rgba(139, 26, 26, 0.5)',
                                color: '#E0B88A',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 600,
                              }}
                            >
                              {exp.kategori.replace('Cafe: ', '')}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                background: exp.metode_bayar === 'CASH' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                                color: exp.metode_bayar === 'CASH' ? '#4ade80' : '#38bdf8',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                fontWeight: 700,
                              }}
                            >
                              {exp.metode_bayar === 'CASH' ? 'KAS LACI' : 'NON-TUNAI'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                            {new Date(exp.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • Dicatat oleh kru
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#E0B88A' }}>
                            -Rp {exp.jumlah.toLocaleString('id-ID')}
                          </div>

                          {role === 'owner' && (
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              title="Hapus Pengeluaran (Khusus Owner)"
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '11px',
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Sub-Tab: Recap Harian ────────────────────────── */}
        {/* ─── Sub-Tab: Recap Harian & Laporan Keuangan ─────── */}
        {activeTab === 'recap' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Header & Actions Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '14px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#fff' }}>
                    Laporan Keuangan & Rekap Closing
                  </h3>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
                    Ringkasan omset penjualan, rekonsiliasi kas laci kasir, dan performa menu
                  </p>
                </div>

                {/* Quick Actions (Print & Share WA) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleCopyWhatsApp}
                    title="Salin Format Rekap WhatsApp"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Copy size={14} /> Salin WA
                  </button>

                  <button
                    onClick={handleShareWhatsApp}
                    title="Kirim Laporan Closing ke WhatsApp"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#25D366',
                      color: '#000',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Send size={14} /> Kirim WA
                  </button>

                  <button
                    onClick={handleOpenPrintModal}
                    title="Cetak Struk Rekap Closing (Bluetooth / Thermal)"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#622128',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(98, 33, 40, 0.4)',
                    }}
                  >
                    <Printer size={14} /> Cetak Struk Closing
                  </button>
                </div>
              </div>

              {/* Date Filter Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} color="#E0B88A" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                    Periode:
                  </span>
                  <span style={{ fontSize: '13px', color: '#E0B88A', fontWeight: 700 }}>
                    {new Date(selectedRecapDate + 'T00:00:00').toLocaleDateString('id-ID', {
                      dateStyle: 'full',
                    })}
                  </span>
                  {selectedRecapDate === todayWibDate && (
                    <span
                      style={{
                        fontSize: '10px',
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#4ade80',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                      }}
                    >
                      HARI INI
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setSelectedRecapDate(todayWibDate)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: selectedRecapDate === todayWibDate ? '#622128' : 'rgba(255,255,255,0.06)',
                      color: selectedRecapDate === todayWibDate ? '#fff' : 'rgba(255,255,255,0.7)',
                    }}
                  >
                    Hari Ini
                  </button>

                  <button
                    onClick={() => setSelectedRecapDate(yesterdayWibDate)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: selectedRecapDate === yesterdayWibDate ? '#622128' : 'rgba(255,255,255,0.06)',
                      color: selectedRecapDate === yesterdayWibDate ? '#fff' : 'rgba(255,255,255,0.7)',
                    }}
                  >
                    Kemarin
                  </button>

                  <input
                    type="date"
                    value={selectedRecapDate}
                    onChange={(e) => {
                      if (e.target.value) setSelectedRecapDate(e.target.value)
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '5px 10px',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    background: 'rgba(98, 33, 40, 0.25)',
                    border: '1px solid rgba(139, 26, 26, 0.45)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#E0B88A', fontWeight: 600 }}>
                    TOTAL OMSET PENJUALAN
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
                    Rp {dateRecap.omset.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                    {dateRecap.orderCount} transaksi sukses
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: totalSelectedExpenses > 0 ? '#C89696' : 'rgba(255,255,255,0.5)',
                      fontWeight: 600,
                    }}
                  >
                    TOTAL PENGELUARAN
                  </div>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 800,
                      color: totalSelectedExpenses > 0 ? '#C89696' : '#fff',
                      marginTop: '6px',
                    }}
                  >
                    -Rp {totalSelectedExpenses.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                    {selectedDateExpenses.length} belanja operasional
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>
                    KAS LACI BERSIH (TUNAI FISIK)
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#4ade80', marginTop: '6px' }}>
                    Rp {dateRecap.netCashInDrawer.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                    Tunai Masuk ({dateRecap.cashTotal.toLocaleString('id-ID')}) − Belanja ({cashSelectedExpenses.toLocaleString('id-ID')})
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                    TOTAL CUP TERJUAL
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
                    {dateRecap.totalCups} <span style={{ fontSize: '14px', fontWeight: 500 }}>cup</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                    {dateRecap.orderCount} pesanan selesai
                  </div>
                </div>
              </div>

              {/* Cash Register Reconciliation Highlight */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
                  💵 Rekonsiliasi Kas Laci (Serah Terima Shift)
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    background: 'rgba(0,0,0,0.25)',
                    padding: '12px',
                    borderRadius: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Omset Tunai Masuk (+)</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginTop: '3px' }}>
                      Rp {dateRecap.cashTotal.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Pengeluaran Kas Laci (−)</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#C89696', marginTop: '3px' }}>
                      -Rp {cashSelectedExpenses.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700 }}>Uang Fisik Wajib di Laci (=)</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#4ade80', marginTop: '3px' }}>
                      Rp {dateRecap.netCashInDrawer.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Breakdown Payment Methods */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>OMSET TUNAI (CASH MASUK)</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                    Rp {dateRecap.cashTotal.toLocaleString('id-ID')}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>OMSET NON-TUNAI (QRIS / TRANSFER)</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8', marginTop: '4px' }}>
                    Rp {(dateRecap.qrisTotal + dateRecap.transferTotal).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* 2-Column: Menu Terlaris & Performa Kasir */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '14px' }}>
                {/* Top Selling Products */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🏆 Menu Terlaris</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
                      {dateRecap.topItems.length} jenis item
                    </span>
                  </div>

                  {dateRecap.topItems.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                      Belum ada penjualan menu pada tanggal ini.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {dateRecap.topItems.slice(0, 8).map((item, idx) => (
                        <div
                          key={item.name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.02)',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: idx === 0 ? '#E0B88A' : idx === 1 ? '#C89696' : 'rgba(255,255,255,0.1)',
                                color: idx <= 1 ? '#000' : '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 800,
                              }}
                            >
                              {idx + 1}
                            </span>
                            <span style={{ fontWeight: 600, color: '#fff' }}>{item.name}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                              {item.qty} cup
                            </span>
                            <span style={{ color: '#E0B88A', fontWeight: 700 }}>
                              Rp {item.revenue.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cashier / Shift Breakdown */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>
                    👥 Performa Kasir / Shift
                  </div>

                  {dateRecap.cashierRows.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                      Belum ada data kasir.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {dateRecap.cashierRows.map((row) => (
                        <div
                          key={row.cashier}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.02)',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, color: '#fff' }}>{row.cashier}</span>
                            <span style={{ color: '#E0B88A', fontWeight: 700 }}>
                              Rp {row.total.toLocaleString('id-ID')}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                            {row.count} transaksi diselesaikan
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Expense List for Selected Date */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🛒 Rincian Pengeluaran ({selectedDateExpenses.length} transaksi)</span>
                  <span style={{ fontSize: '12px', color: '#E0B88A', fontWeight: 700 }}>
                    Total: -Rp {totalSelectedExpenses.toLocaleString('id-ID')}
                  </span>
                </div>

                {selectedDateExpenses.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                    Tidak ada catatan pengeluaran pada tanggal ini.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {selectedDateExpenses.map((exp) => (
                      <div
                        key={exp.id}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.02)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: '#fff' }}>{exp.keterangan}</span>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: exp.metode_bayar === 'CASH' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                              color: exp.metode_bayar === 'CASH' ? '#4ade80' : '#38bdf8',
                              fontWeight: 700,
                            }}
                          >
                            {exp.metode_bayar === 'CASH' ? 'KAS LACI' : 'NON-TUNAI'}
                          </span>
                        </div>
                        <span style={{ color: '#E0B88A', fontWeight: 700 }}>
                          -Rp {exp.jumlah.toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Owner Profit Insight */}
              {role === 'owner' && (
                <div
                  style={{
                    background: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80' }}>
                      Estimasi Gross Margin / Laba Kotor (Owner Insight)
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                      Total HPP Bahan Terpakai: Rp {dateRecap.totalHpp.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#4ade80' }}>
                    Rp {dateRecap.grossProfit.toLocaleString('id-ID')}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Modals ───────────────────────────────────────── */}
      {/* Checkout Modal with Cash Calculator & Auto-Bluetooth Printing */}
      {checkoutOrder && (
        <CafeCheckoutModal
          order={checkoutOrder}
          onClose={() => setCheckoutOrder(null)}
          onComplete={(completed) => {
            handleCompletePayment(completed)
          }}
        />
      )}

      {/* Closing Receipt Modal */}
      {closingReceiptModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#161618',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                Struk Closing Kasir
              </h3>
              <button
                onClick={() => setClosingReceiptModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontSize: '18px',
                }}
              >
                ✕
              </button>
            </div>

            <CafeClosingReceipt recap={closingReceiptModal} />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setClosingReceiptModal(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '12px',
                }}
              >
                Tutup
              </button>
              <button
                onClick={handlePrintClosingSlip}
                style={{
                  flex: 1.5,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#622128',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(98, 33, 40, 0.4)',
                }}
              >
                <Printer size={15} /> Cetak Struk Closing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reprint Receipt Modal */}
      {reprintOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#161618',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Cetak Ulang Struk</h3>
              <button
                onClick={() => setReprintOrder(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <CafeReceipt order={reprintOrder} />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setReprintOrder(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '12px',
                }}
              >
                Tutup
              </button>
              <button
                onClick={async () => {
                  await bluetoothPrinter.printReceipt(reprintOrder)
                  showToast('Perintah cetak struk dikirim!')
                  setReprintOrder(null)
                }}
                style={{
                  flex: 1.5,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#622128',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Printer size={15} /> Cetak Struk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
