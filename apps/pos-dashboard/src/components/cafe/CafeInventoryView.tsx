import React, { useState, useMemo } from 'react'
import {
  Layers3,
  Search,
  Plus,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  ClipboardList,
  Coffee,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
  Info,
  SlidersHorizontal,
} from 'lucide-react'
import type { CafeIngredient, CafeRecipeItem, CafeStockMutation } from './types'
import { DEFAULT_CAFE_RECIPES_DATA } from './defaultInventory'

interface CafeInventoryViewProps {
  ingredients: CafeIngredient[]
  recipes: CafeRecipeItem[]
  mutations: CafeStockMutation[]
  onRestock: (
    ingredientId: string,
    addQty: number,
    cost: number,
    autoRecordExpense: boolean,
    notes: string
  ) => Promise<void>
  onOpname: (
    ingredientId: string,
    physicalStock: number,
    reason: string
  ) => Promise<void>
  cashierName?: string
  role?: 'owner' | 'crew' | null
}

type InventorySubTab = 'stock' | 'opname' | 'recipes' | 'mutations'

export const CafeInventoryView: React.FC<CafeInventoryViewProps> = ({
  ingredients,
  recipes,
  mutations,
  onRestock,
  onOpname,
  cashierName = 'Kru Kasir',
  role = 'crew',
}) => {
  const [activeTab, setActiveTab] = useState<InventorySubTab>('stock')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')

  // Modals
  const [restockTarget, setRestockTarget] = useState<CafeIngredient | null>(null)
  const [restockQty, setRestockQty] = useState('')
  const [restockCost, setRestockCost] = useState('')
  const [autoExpense, setAutoExpense] = useState(true)
  const [restockNotes, setRestockNotes] = useState('')

  const [opnameTarget, setOpnameTarget] = useState<CafeIngredient | null>(null)
  const [opnamePhysical, setOpnamePhysical] = useState('')
  const [opnameReason, setOpnameReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>()
    ingredients.forEach((i) => set.add(i.category))
    return ['ALL', ...Array.from(set)]
  }, [ingredients])

  // Filtered Ingredients
  const filteredIngredients = useMemo(() => {
    return ingredients.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          item.name.toLowerCase().includes(q) ||
          (item.code && item.code.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [ingredients, selectedCategory, searchQuery])

  // KPI Metrics
  const kpi = useMemo(() => {
    let safe = 0
    let low = 0
    let out = 0

    ingredients.forEach((item) => {
      if (item.current_stock <= 0) {
        out++
      } else if (item.current_stock <= item.minimum_stock) {
        low++
      } else {
        safe++
      }
    })

    return { total: ingredients.length, safe, low, out }
  }, [ingredients])

  // Restock handler
  const handleConfirmRestock = async () => {
    if (!restockTarget) return
    const qty = Number(restockQty)
    if (isNaN(qty) || qty <= 0) {
      alert('Masukkan jumlah penambahan stok yang valid!')
      return
    }
    const cost = Number(restockCost) || 0

    setIsSubmitting(true)
    try {
      await onRestock(
        restockTarget.id,
        qty,
        cost,
        autoExpense,
        restockNotes.trim() || `Restock ${restockTarget.name} (+${qty} ${restockTarget.unit})`
      )
      setRestockTarget(null)
      setRestockQty('')
      setRestockCost('')
      setRestockNotes('')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Opname handler
  const handleConfirmOpname = async () => {
    if (!opnameTarget) return
    const physical = Number(opnamePhysical)
    if (isNaN(physical) || physical < 0) {
      alert('Masukkan jumlah fisik aktual yang valid!')
      return
    }
    if (!opnameReason.trim()) {
      alert('Pilih atau tuliskan keterangan alasan selisih opname!')
      return
    }

    setIsSubmitting(true)
    try {
      await onOpname(opnameTarget.id, physical, opnameReason.trim())
      setOpnameTarget(null)
      setOpnamePhysical('')
      setOpnameReason('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: '#0f0f11' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header Navigation */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={22} color="#E0B88A" />
              <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#fff' }}>
                Stok Bahan Baku & Stok Opname
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
              Terintegrasi otomatis dengan penjualan menu di kasir. Terbuka untuk kru & owner.
            </p>
          </div>

          {/* Sub Tab Switcher */}
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
                { key: 'stock', label: 'Daftar Bahan', icon: Layers3 },
                { key: 'opname', label: 'Cek Fisik (Opname)', icon: ClipboardList },
                { key: 'recipes', label: 'Resep Menu (BOM)', icon: Coffee },
                { key: 'mutations', label: 'Riwayat Mutasi', icon: Clock },
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
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>TOTAL BAHAN BAKU</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
              {kpi.total} <span style={{ fontSize: '13px', fontWeight: 500 }}>item</span>
            </div>
          </div>

          <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>STOK AMAN</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#4ade80', marginTop: '4px' }}>
              {kpi.safe} <span style={{ fontSize: '13px', fontWeight: 500 }}>bahan</span>
            </div>
          </div>

          <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '11px', color: '#facc15', fontWeight: 600 }}>STOK MENIPIS (WARNING)</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#facc15', marginTop: '4px' }}>
              {kpi.low} <span style={{ fontSize: '13px', fontWeight: 500 }}>bahan</span>
            </div>
          </div>

          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '11px', color: '#f87171', fontWeight: 600 }}>STOK HABIS (KRITIS)</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#f87171', marginTop: '4px' }}>
              {kpi.out} <span style={{ fontSize: '13px', fontWeight: 500 }}>menu terhenti</span>
            </div>
          </div>
        </div>

        {/* ─── Sub-Tab: DAFTAR BAHAN ───────────────────────── */}
        {activeTab === 'stock' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Search & Filter */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type="text"
                  placeholder="Cari bahan baku (biji kopi, susu, cup, sirup)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#fff',
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Category Pills */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: selectedCategory === cat ? 700 : 500,
                      cursor: 'pointer',
                      background: selectedCategory === cat ? '#622128' : 'rgba(255,255,255,0.05)',
                      color: selectedCategory === cat ? '#fff' : 'rgba(255,255,255,0.6)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cat === 'ALL' ? 'Semua Kategori' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Ingredients Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {filteredIngredients.map((item) => {
                const isOut = item.current_stock <= 0
                const isLow = !isOut && item.current_stock <= item.minimum_stock
                const progressPct = Math.min(100, Math.round((Math.max(0, item.current_stock) / (item.minimum_stock * 3)) * 100))

                return (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: isOut
                        ? '1px solid rgba(239, 68, 68, 0.4)'
                        : isLow
                        ? '1px solid rgba(234, 179, 8, 0.4)'
                        : '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '10px', color: '#E0B88A', fontWeight: 600, textTransform: 'uppercase' }}>
                            {item.category}
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                            {item.name}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isOut
                              ? 'rgba(239, 68, 68, 0.15)'
                              : isLow
                              ? 'rgba(234, 179, 8, 0.15)'
                              : 'rgba(34, 197, 94, 0.15)',
                            color: isOut ? '#f87171' : isLow ? '#facc15' : '#4ade80',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isOut ? <XCircle size={10} /> : isLow ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                          {isOut ? 'HABIS' : isLow ? 'MENIPIS' : 'AMAN'}
                        </span>
                      </div>

                      {/* Stock Quantity */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '12px' }}>
                        <span
                          style={{
                            fontSize: '24px',
                            fontWeight: 800,
                            color: isOut ? '#f87171' : isLow ? '#facc15' : '#fff',
                          }}
                        >
                          {item.current_stock.toLocaleString('id-ID')}
                        </span>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                          {item.unit}
                        </span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                          Min: {item.minimum_stock} {item.unit}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${progressPct}%`,
                            height: '100%',
                            background: isOut ? '#ef4444' : isLow ? '#eab308' : '#22c55e',
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                    </div>

                    {/* Quick Action Buttons for Crew & Owner */}
                    <div style={{ display: 'flex', gap: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <button
                        onClick={() => {
                          setRestockTarget(item)
                          setRestockQty('')
                          setRestockCost('')
                          setRestockNotes('')
                        }}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'rgba(224, 184, 138, 0.15)',
                          color: '#E0B88A',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        <Plus size={12} /> + Restock
                      </button>

                      <button
                        onClick={() => {
                          setOpnameTarget(item)
                          setOpnamePhysical(String(item.current_stock))
                          setOpnameReason('')
                        }}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.03)',
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        <ClipboardList size={12} /> Cek Fisik
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── Sub-Tab: STOK OPNAME (CEK FISIK KHUSUS KRU) ────── */}
        {activeTab === 'opname' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                background: 'rgba(224, 184, 138, 0.08)',
                border: '1px solid rgba(224, 184, 138, 0.25)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              <Info size={20} color="#E0B88A" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                  Panduan Stok Opname Kru ({cashierName})
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '4px', lineHeight: '1.5' }}>
                  Lakukan penghitungan fisik bahan baku saat pergantian shift atau closing malam.
                  Pilih bahan di bawah ini, masukkan jumlah fisik sebenarnya di bar/kulkas, dan sistem akan otomatis menghitung selisih serta mencatatnya di kartu stok.
                </div>
              </div>
            </div>

            {/* Opname Checklist Table */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Daftar Bahan Siap Diopname</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{ingredients.length} bahan terdaftar</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {ingredients.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{item.name}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                        {item.category} • Satuan: {item.unit}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Stok di Sistem</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#E0B88A' }}>
                          {item.current_stock.toLocaleString('id-ID')} {item.unit}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setOpnameTarget(item)
                          setOpnamePhysical(String(item.current_stock))
                          setOpnameReason('Closing Shift Cek Fisik')
                        }}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#622128',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Input Fisik
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Sub-Tab: RESEP MENU (BILL OF MATERIALS) ───────── */}
        {activeTab === 'recipes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
              Komposisi takaran bahan baku yang otomatis dipotong setiap 1 cup/porsi menu terjual di kasir.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {DEFAULT_CAFE_RECIPES_DATA.map((recipe) => (
                <div
                  key={recipe.productCodeOrName}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '12px',
                    padding: '14px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginBottom: '8px' }}>
                    ☕ {recipe.productCodeOrName}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {recipe.items.map((it, idx) => {
                      const ing = ingredients.find((i) => i.id === it.ingredientId || i.code === it.ingredientId)
                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                          <span>• {ing ? ing.name : it.ingredientId}</span>
                          <span style={{ fontWeight: 600, color: '#E0B88A' }}>
                            {it.quantity} {ing?.unit || ''}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Sub-Tab: RIWAYAT MUTASI STOK ─────────────────── */}
        {activeTab === 'mutations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
              Kartu Log Mutasi Stok ({mutations.length} catatan)
            </div>

            {mutations.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                Belum ada catatan mutasi stok. Stok akan otomatis berkurang saat ada transaksi menu terjual di kasir.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {mutations.map((m) => {
                  const isPositive = m.quantity > 0
                  return (
                    <div
                      key={m.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: m.type === 'SALE' ? 'rgba(239,68,68,0.15)' : m.type === 'RESTOCK' ? 'rgba(34,197,94,0.15)' : 'rgba(56,189,248,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: m.type === 'SALE' ? '#f87171' : m.type === 'RESTOCK' ? '#4ade80' : '#38bdf8',
                          }}
                        >
                          {isPositive ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                              {m.ingredient_name || m.ingredient_id}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(255,255,255,0.06)',
                                color: 'rgba(255,255,255,0.6)',
                              }}
                            >
                              {m.type}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                            {new Date(m.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} • {m.notes || 'Penjualan POS'} {m.created_by ? `oleh ${m.created_by}` : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 800,
                            color: isPositive ? '#4ade80' : '#f87171',
                          }}
                        >
                          {isPositive ? `+${m.quantity}` : `${m.quantity}`}
                        </div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                          Sisa: {m.final_stock}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── MODAL: RESTOCK BAHAN ──────────────────────────── */}
        {restockTarget && (
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
                maxWidth: '420px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                  Restock Bahan: {restockTarget.name}
                </h3>
                <button
                  onClick={() => setRestockTarget(null)}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '16px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                Stok saat ini: <strong style={{ color: '#E0B88A' }}>{restockTarget.current_stock} {restockTarget.unit}</strong>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>
                    Jumlah Tambah ({restockTarget.unit}) *
                  </label>
                  <input
                    type="number"
                    placeholder={`Contoh: 1000 (${restockTarget.unit})`}
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>
                    Total Biaya Belanja (Rp)
                  </label>
                  <input
                    type="number"
                    placeholder="Contoh: 50000"
                    value={restockCost}
                    onChange={(e) => setRestockCost(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    checked={autoExpense}
                    onChange={(e) => setAutoExpense(e.target.checked)}
                  />
                  <span>Otomatis catat sebagai Pengeluaran Kasir (Expenses)</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  onClick={() => setRestockTarget(null)}
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
                  Batal
                </button>
                <button
                  disabled={isSubmitting || !restockQty}
                  onClick={handleConfirmRestock}
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
                  }}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Restock'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL: STOCK OPNAME (CEK FISIK) ───────────────── */}
        {opnameTarget && (() => {
          const sys = opnameTarget.current_stock
          const phys = Number(opnamePhysical) || 0
          const diff = phys - sys

          return (
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
                  maxWidth: '440px',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                    Stok Opname: {opnameTarget.name}
                  </h3>
                  <button
                    onClick={() => setOpnameTarget(null)}
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '16px' }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Stok di Sistem</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#E0B88A', marginTop: '2px' }}>
                      {sys.toLocaleString('id-ID')} {opnameTarget.unit}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Selisih Fisik</div>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: 800,
                        color: diff === 0 ? '#4ade80' : diff < 0 ? '#f87171' : '#38bdf8',
                        marginTop: '2px',
                      }}
                    >
                      {diff === 0 ? 'Cocok (0)' : `${diff > 0 ? '+' : ''}${diff.toLocaleString('id-ID')} ${opnameTarget.unit}`}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>
                      Hasil Hitung Fisik Sebenarnya ({opnameTarget.unit}) *
                    </label>
                    <input
                      type="number"
                      value={opnamePhysical}
                      onChange={(e) => setOpnamePhysical(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 700,
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>
                      Alasan / Keterangan Selisih *
                    </label>
                    {/* Presets */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {['Closing Shift Cek Fisik', 'Tumpah / Spillage', 'Basi / Expired', 'Salah Takaran / Human Error', 'Koreksi Hitung'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setOpnameReason(preset)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '10px',
                            background: opnameReason === preset ? '#622128' : 'rgba(255,255,255,0.06)',
                            color: opnameReason === preset ? '#fff' : 'rgba(255,255,255,0.7)',
                            cursor: 'pointer',
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder="Tulis alasan jika ada (e.g. tumpah 100ml saat steaming)..."
                      value={opnameReason}
                      onChange={(e) => setOpnameReason(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    onClick={() => setOpnameTarget(null)}
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
                    Batal
                  </button>
                  <button
                    disabled={isSubmitting || !opnamePhysical || !opnameReason.trim()}
                    onClick={handleConfirmOpname}
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
                    }}
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Stok Opname'}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
