import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { Banknote, BarChart3, Calendar, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Clock3, Copy, CreditCard, Delete, Download, ExternalLink, Layers3, LogOut, MessageCircle, Monitor, Plus, Receipt, Send, TrendingUp, Users, X } from 'lucide-react'
import html2canvas from 'html2canvas'
import { createPOSClient } from '@mera/supabase'
const supabase = createPOSClient()
import type { Attendance, Crew, Expense, Product, Registration, RegistrationStatus, Transaction, TransactionStatus, PaymentMethod, BookingAddons } from '@mera/supabase'
import { hitungHargaBertingkat, calcBookingLineItems } from '@mera/supabase'
import AttendanceBoard from './components/AttendanceBoard'

type ViewKey = 'schedule' | 'booking' | 'finance' | 'attendance' | 'monthly'
type RoleKey = 'crew' | 'owner'
type StudioBucket = 'BASIC' | 'CLOSEUP' | 'QUEUE'

const ownerNavItems: Array<{ key: ViewKey; label: string; icon: React.ReactNode }> = [
  { key: 'schedule', label: 'Schedule', icon: <Calendar size={18} /> },
  { key: 'booking', label: 'Booking & POS', icon: <ClipboardList size={18} /> },
  { key: 'finance', label: 'Today Recap', icon: <Banknote size={18} /> },
  { key: 'monthly', label: 'Monthly Recap', icon: <BarChart3 size={18} /> },
]

const crewNavItems: Array<{ key: ViewKey; label: string; icon: React.ReactNode }> = [
  { key: 'schedule', label: 'Schedule', icon: <Calendar size={18} /> },
  { key: 'booking', label: 'Booking & POS', icon: <ClipboardList size={18} /> },
  { key: 'finance', label: 'Today Recap', icon: <Banknote size={18} /> },
  { key: 'attendance', label: 'Attendance', icon: <Clock3 size={18} /> },
]

const OWNER_PIN_LENGTH = 4

// SEC-02: Utility hashing untuk PIN (Client-side)
async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function todayKey() {
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 10)
}

function wibDayToISOStart(dateStr: string): string {
  try { return new Date(`${dateStr}T00:00:00+07:00`).toISOString() }
  catch { return `${dateStr}T00:00:00Z` }
}

function wibDayToISOEnd(dateStr: string): string {
  try { return new Date(`${dateStr}T23:59:59+07:00`).toISOString() }
  catch { return `${dateStr}T23:59:59Z` }
}

function weekRange(): [string, string] {
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  const dayOfWeek = wib.getUTCDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(wib)
  monday.setUTCDate(wib.getUTCDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return [monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)]
}

function weekDays(): Array<{ date: string; label: string; isToday: boolean }> {
  const [start] = weekRange()
  const mon = new Date(start + 'T00:00:00Z')
  const today = todayKey()
  const days: Array<{ date: string; label: string; isToday: boolean }> = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon)
    d.setUTCDate(mon.getUTCDate() + i)
    const iso = d.toISOString().slice(0, 10)
    days.push({
      date: iso,
      label: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', timeZone: 'Asia/Jakarta' }),
      isToday: iso === today,
    })
  }
  return days
}

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00',
]

function fmtRp(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

// Parse machine-readable split note: "[Split: METHOD1:AMOUNT1 + METHOD2:AMOUNT2]"
function parseSplitNote(reason: string | null): { baseMethod: string; baseAmount: number; addonMethod: string; addonAmount: number } | null {
  if (!reason) return null
  const m = reason.match(/\[Split: (\w+):(\d+) \+ (\w+):(\d+)\]/)
  if (!m) return null
  return { baseMethod: m[1], baseAmount: Number(m[2]), addonMethod: m[3], addonAmount: Number(m[4]) }
}

// Parse machine-readable cash note: "[Cash:100000 | Change:30000]"
function parsePaymentCashNote(reason: string | null): { cashReceived?: number; changeAmt?: number } | null {
  if (!reason) return null
  const mRec = reason.match(/Cash:(\d+)/)
  const mChg = reason.match(/Change:(\d+)/)
  if (!mRec && !mChg) return null
  return {
    cashReceived: mRec ? Number(mRec[1]) : undefined,
    changeAmt: mChg ? Number(mChg[1]) : undefined,
  }
}

// Compute cash vs QRIS/transfer totals correctly, handling split ONLINE_QRIS+CASH payments
function calcMethodTotals(txList: Transaction[]) {
  let cash = 0, qris = 0
  for (const t of txList) {
    const split = parseSplitNote(t.discount_reason)
    const net = t.total_amount - (t.discount_amount ?? 0)
    if (split) {
      // Split payment: each method gets its actual portion
      const methods: [string, number][] = [[split.baseMethod, split.baseAmount], [split.addonMethod, split.addonAmount]]
      for (const [method, amount] of methods) {
        if (method === 'CASH') cash += amount
        else if (['QRIS', 'ONLINE_QRIS', 'TRANSFER'].includes(method)) qris += amount
      }
    } else {
      if (t.payment_method === 'CASH') cash += net
      else if (['QRIS', 'ONLINE_QRIS', 'TRANSFER'].includes(t.payment_method ?? '')) qris += net
    }
  }
  return { cash, qris }
}

function toStudioBucket(reg: Registration): StudioBucket {
  const addons = reg.addons
  const room = `${addons?.room ?? ''}`.toLowerCase()
  if (room.includes('basic')) return 'BASIC'
  if (room.includes('close up') || room.includes('pas')) return 'CLOSEUP'
  return 'QUEUE'
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section style={{ borderRadius: 20, background: 'rgba(255,255,255,0.04)', backdropFilter: 'saturate(120%) blur(20px)', WebkitBackdropFilter: 'saturate(120%) blur(20px)', border: '1px solid rgba(139,26,26,0.18)', ...style }}>
      {children}
    </section>
  )
}

function Pill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card>
      <div style={{ padding: '16px 18px' }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginBottom: 4, letterSpacing: '0.02em' }}>{label}</p>
        <p style={{ fontSize: 24, fontWeight: 700, color: color ?? 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>{value}</p>
      </div>
    </Card>
  )
}

function SectionHeader({ title, icon, count }: { title: string; icon: React.ReactNode; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <span style={{ color: '#622128' }}>{icon}</span>
      <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</h3>
      {count !== undefined && (
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)', padding: '2px 10px', borderRadius: 20 }}>{count}</span>
      )}
    </div>
  )
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: `color-mix(in srgb, ${color} 12%, transparent)`, color, letterSpacing: '0.02em' }}>{label}</span>
  )
}

export default function App() {
  const [view, setView] = useState<ViewKey>('schedule')
  const [role, setRole] = useState<RoleKey | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('mera_pos_role') as RoleKey | null
    return null
  })
  const [ownerPinInput, setOwnerPinInput] = useState('')
  const [ownerPinError, setOwnerPinError] = useState('')
  const [showOwnerPinPad, setShowOwnerPinPad] = useState(false)
  const [showCrewAttendanceOverlay, setShowCrewAttendanceOverlay] = useState(false)
  const [loading, setLoading] = useState(true)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [weekRegistrations, setWeekRegistrations] = useState<Registration[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [products, setProducts] = useState<Product[]>([])

  // ─── Operational state ──────────────────────────
  const [selectedBooking, setSelectedBooking] = useState<Registration | null>(null)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null)
  const [receiptReg, setReceiptReg] = useState<Registration | null>(null)
  const [txEditMethod, setTxEditMethod] = useState<PaymentMethod | null>(null)
  const [txEditDiscount, setTxEditDiscount] = useState('')
  const [txEditDiscountReason, setTxEditDiscountReason] = useState('')
  const [txEditAddons, setTxEditAddons] = useState<Record<string, number>>({})
  const [txEditSaveState, setTxEditSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const txEditSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const txAddonsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [paymentMethodPick, setPaymentMethodPick] = useState<PaymentMethod | null>(null)
  const [addonPaymentPick, setAddonPaymentPick] = useState<PaymentMethod | null>(null)
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('')
  const [showPayModal, setShowPayModal] = useState(false)
  const [payTx, setPayTx] = useState<Transaction | null>(null)
  const [dmCopied, setDmCopied] = useState(false)
  const [dmExpanded, setDmExpanded] = useState(false)
  const [sessionIdCopied, setSessionIdCopied] = useState(false)
  const [editableDmMessage, setEditableDmMessage] = useState('')
  const [editRegTarget, setEditRegTarget] = useState<Registration | null>(null)
  const [editDateInput, setEditDateInput] = useState('')
  const [editTimeInput, setEditTimeInput] = useState('')
  const [timeSaveState, setTimeSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [dateSaveState, setDateSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [addonsSaveState, setAddonsSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const addonsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Booking details edit state
  const [editPackageId, setEditPackageId] = useState<number | null>(null)
  // Use object: { [addonName]: number }
  const [editAddons, setEditAddons] = useState<Record<string, number>>({})
  const [editPax, setEditPax] = useState<number>(1)
  const [actionLoading, setActionLoading] = useState(false)
  const [discountInput, setDiscountInput] = useState('')
  const [discountReasonInput, setDiscountReasonInput] = useState('')
  const [sessionAddons, setSessionAddons] = useState<Record<number, number>>({})
  const receiptRef = useRef<HTMLDivElement>(null)
  const payslipRef = useRef<HTMLDivElement>(null)
  const [activeCrewId, setActiveCrewId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('mera_pos_crew_id')
    return null
  })
  const [expenseItem, setExpenseItem] = useState('')
  const [expensePrice, setExpensePrice] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('')
  const [expenseMetode, setExpenseMetode] = useState<'CASH' | 'QRIS'>('CASH')
  const [expenseLoading, setExpenseLoading] = useState(false)
  // ─── Booking detail drawer ───────────────────────
  const [detailReg, setDetailReg] = useState<Registration | null>(null)
  // ─── Booking mobile tab ──────────────────────────
  const [bookingTab, setBookingTab] = useState<'lobby' | 'studio' | 'active' | 'paid'>('lobby')

  // ─── Schedule calendar state ─────────────────────
  const [calViewMode, setCalViewMode] = useState<'month' | 'week'>('month')
  const [calMonthKey, setCalMonthKey] = useState(() => todayKey().slice(0, 7))
  const [calMonthRegs, setCalMonthRegs] = useState<Registration[]>([])
  const [calSelectedDate, setCalSelectedDate] = useState<string | null>(todayKey())
  const [calMonthLoading, setCalMonthLoading] = useState(false)

  // ─── Monthly recap state (Owner only) ────────────
  const [monthKey, setMonthKey] = useState(() => new Date().toISOString().slice(0, 7)) // 'YYYY-MM'
  // Recap mode: 'monthly' (26-25 cutoff) | 'weekly' | 'custom'
  const [recapMode, setRecapMode] = useState<'monthly' | 'weekly' | 'custom'>('monthly')
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week, -1 = last week, etc.
  const [customStart, setCustomStart] = useState(() => new Date().toISOString().slice(0, 10))
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10))
  const [monthTx, setMonthTx] = useState<Transaction[]>([])
  const [monthExp, setMonthExp] = useState<Expense[]>([])
  const [monthAtt, setMonthAtt] = useState<Attendance[]>([])
  const [crewList, setCrewList] = useState<Crew[]>([])
  const [monthLoading, setMonthLoading] = useState(false)
  const [monthLoaded, setMonthLoaded] = useState(false)
  const [monthExpItem, setMonthExpItem] = useState('')
  const [monthExpPrice, setMonthExpPrice] = useState('')
  const [monthExpCategory, setMonthExpCategory] = useState('')
  const [monthExpMetode, setMonthExpMetode] = useState<'CASH' | 'QRIS'>('CASH')
  const [monthExpDate, setMonthExpDate] = useState(() => todayKey())

  // Initial fetch of active crews so crewList is populated for role/login checks
  useEffect(() => {
    supabase.from('crew').select('*').eq('is_active', true).order('nama').then(({ data }) => {
      if (data) setCrewList(data as Crew[])
    })
  }, [])

  const isDashboardUnlocked = useMemo(() => {
    if (role === 'owner') return true;
    if (role !== 'crew') return false;
    if (!activeCrewId) return false;
    
    const activeCrew = crewList.find(c => c.id === activeCrewId);
    if (activeCrew && activeCrew.status_gaji === 'INTERN') return false;
    
    // Pro Crew (or active crew) must have an active attendance record today
    const hasActiveAttendance = attendance.some(a => a.crew_id === activeCrewId && a.status === 'ACTIVE');
    return hasActiveAttendance;
  }, [role, activeCrewId, crewList, attendance]);

  // Core loader — accepts explicit ISO date range
  const loadRecapRange = useCallback(async (start: string, end: string) => {
    setMonthLoading(true)
    const isoStart = wibDayToISOStart(start)
    const isoEnd = wibDayToISOEnd(end)
    const [{ data: txD }, { data: expD }, { data: attD }, { data: crewD }] = await Promise.all([
      supabase.from('transactions').select('*').gte('created_at', isoStart).lte('created_at', isoEnd).order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').gte('tanggal', start).lte('tanggal', end).order('tanggal', { ascending: false }),
      supabase.from('attendance').select('*').gte('clock_in', isoStart).lte('clock_in', isoEnd).order('clock_in', { ascending: false }),
      supabase.from('crew').select('*').eq('is_active', true).order('nama'),
    ])
    setMonthTx((txD ?? []) as Transaction[])
    setMonthExp((expD ?? []) as Expense[])
    setMonthAtt((attD ?? []) as Attendance[])
    setCrewList((crewD ?? []) as Crew[])
    setMonthLoading(false)
    setMonthLoaded(true)
  }, [])

  // Monthly wrapper: 26th prev → 25th current (billing cycle)
  const loadMonthData = useCallback(async (ym: string) => {
    const [year, month] = ym.split('-').map(Number)
    const startDate = new Date(year, month - 2, 26)
    const endDate   = new Date(year, month - 1, 25)
    await loadRecapRange(
      startDate.toISOString().slice(0, 10),
      endDate.toISOString().slice(0, 10),
    )
  }, [loadRecapRange])

  // Week helper: Monday–Sunday of (today + weekOffset*7)
  const getWeekRange = useCallback((offset: number): { start: string; end: string; label: string } => {
    const now = new Date(Date.now() + 7 * 3600 * 1000) // WIB
    const day = now.getUTCDay() // 0=Sun
    const diffToMon = (day === 0 ? -6 : 1 - day)
    const mon = new Date(now)
    mon.setUTCDate(now.getUTCDate() + diffToMon + offset * 7)
    const sun = new Date(mon)
    sun.setUTCDate(mon.getUTCDate() + 6)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const fmtLabel = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    return { start: fmt(mon), end: fmt(sun), label: `${fmtLabel(mon)} – ${fmtLabel(sun)}` }
  }, [])

  // ─── Fetch registrations for the schedule month calendar ─
  useEffect(() => {
    if (view !== 'schedule' || calViewMode !== 'month') return
    let cancelled = false
    setCalMonthLoading(true)
    const [yr, mo] = calMonthKey.split('-').map(Number)
    const daysInMonth = new Date(yr, mo, 0).getDate()
    const start = `${calMonthKey}-01`
    const end = `${calMonthKey}-${daysInMonth.toString().padStart(2, '0')}`
    supabase.from('registrations').select('*')
      .gte('preferred_date', start)
      .lte('preferred_date', end)
      .neq('status', 'EXPIRED')
      .order('preferred_time', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) {
          setCalMonthRegs((data ?? []) as Registration[])
          setCalMonthLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [calMonthKey, view, calViewMode])

  // ─── Booking status transitions ──────────────────
  const advanceBooking = async (reg: Registration, newStatus: RegistrationStatus) => {
    // Warn if verifying a booking that conflicts with an existing time slot
    if (newStatus === 'VERIFIED' && reg.preferred_date && reg.preferred_time) {
      const studio = toStudioBucket(reg)
      const conflict = registrations.find(r =>
        r.id !== reg.id &&
        r.preferred_date === reg.preferred_date &&
        r.preferred_time === reg.preferred_time &&
        toStudioBucket(r) === studio &&
        ['VERIFIED', 'PROCESSED'].includes(r.status)
      )
      if (conflict) {
        const proceed = window.confirm(
          `⚠️ Konflik Jadwal!\n\n${conflict.customer_name} sudah booking di ${reg.preferred_date} jam ${reg.preferred_time} (${studio}).\n\nTetap verify booking ${reg.customer_name}?`
        )
        if (!proceed) return
      }
    }
    setActionLoading(true)
    const update: Partial<Registration> = { status: newStatus }

    // When moving to PROCESSED, create a transaction
    if (newStatus === 'PROCESSED') {
      // Use existing session_id from online booking or generate new one
      let sessionId = reg.session_id
      if (!sessionId) {
        const day = new Date().getDate().toString().padStart(2, '0')
        const cleanName = reg.customer_name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 8)
        const code = Math.random().toString(36).slice(2, 6).toUpperCase()
        sessionId = `${day}-${cleanName}-${code}`
        update.session_id = sessionId
      }

      // Check if a transaction already exists for this registration
      const existingTx = transactions.find(t => t.registration_id === reg.id || t.session_id === sessionId)
      if (!existingTx) {
        // Always calculate price from current products and addons
        const lineItems = calcBookingLineItems(products, reg.addons as BookingAddons | null)
        const computedPrice = lineItems.reduce((sum, item) => sum + item.price, 0)
        const isOnlineQris = reg.booking_type === 'ONLINE_QRIS'

        const crewId = activeCrewId ?? null
        const { error: txErr } = await supabase.from('transactions').insert({
          session_id: sessionId,
          registration_id: reg.id,
          processed_by: crewId,
          selection_start_time: null,
          total_amount: computedPrice,
          discount_amount: 0,
          discount_reason: null,
          payment_method: isOnlineQris ? 'ONLINE_QRIS' : null,
          status: 'ACTIVE',
        } as never)

        if (txErr) {
          console.error('Failed to create transaction:', txErr)
          alert(`Gagal buat transaksi: ${txErr.message}`)
          setActionLoading(false)
          return
        }

        // Optimistic local transaction
        const newTx: Transaction = {
          id: crypto.randomUUID(),
          session_id: sessionId,
          registration_id: reg.id,
          processed_by: crewId,
          selection_start_time: null,
          total_amount: computedPrice,
          discount_amount: 0,
          discount_reason: null,
          payment_method: isOnlineQris ? 'ONLINE_QRIS' : null,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        }
        setTransactions(prev => [newTx, ...prev])
      }
    }

    const { error: regErr } = await supabase.from('registrations').update(update as never).eq('id', reg.id)
    if (regErr) {
      console.error('Failed to update registration:', regErr)
      alert(`Gagal update booking: ${regErr.message}`)
      setActionLoading(false)
      return
    }
    setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, ...update } : r))
    setActionLoading(false)
  }

  // ─── Calculate total from registration + products ─
  const calcLineItems = (reg: Registration | null): { label: string; price: number }[] => {
    if (!reg) return []
    return calcBookingLineItems(products, reg.addons as BookingAddons | null)
  }

  // ─── Open booking detail drawer ──────────────────
  const openDetail = (r: Registration) => {
    setDetailReg(r)
    setEditPackageId((r.addons as any)?.product_id ?? null)
    // Convert selected_addons array to object for UI
    const selectedArr = (r.addons as any)?.selected_addons ?? []
    const selectedObj: Record<string, number> = {}
    if (Array.isArray(selectedArr)) {
      selectedArr.forEach((name: string) => { selectedObj[name] = (selectedObj[name] || 0) + 1 })
    } else if (selectedArr && typeof selectedArr === 'object') {
      Object.entries(selectedArr).forEach(([k, v]) => {
        if (typeof v === 'number') selectedObj[k] = v
      })
    }
    setEditAddons(selectedObj)
    setEditPax((r.addons as any)?.pax ?? 1)
    setEditDateInput(r.preferred_date || '')
    setEditTimeInput(r.preferred_time || '')
    setTimeSaveState('idle')
    setDateSaveState('idle')
    setAddonsSaveState('idle')
  }

  // ─── Save all booking details from drawer ────────
  const handleSaveAllDetails = async () => {
    if (!detailReg) return
    // Check for time slot conflict before saving
    if (editDateInput && editTimeInput) {
      const newStudio = toStudioBucket(detailReg)
      const conflict = registrations.find(r =>
        r.id !== detailReg.id &&
        r.preferred_date === editDateInput &&
        r.preferred_time === editTimeInput &&
        toStudioBucket(r) === newStudio &&
        ['PENDING', 'VERIFIED', 'PROCESSED'].includes(r.status)
      )
      if (conflict) {
        const proceed = window.confirm(
          `⚠️ Konflik Jadwal!\n\n${conflict.customer_name} sudah booking di ${editDateInput} jam ${editTimeInput} (${newStudio}).\n\nTetap simpan?`
        )
        if (!proceed) return
      }
    }
    setActionLoading(true)
    // Convert editAddons (Record<string, number>) to string[] for selected_addons
    const selectedAddonsArr: string[] = [];
    Object.entries(editAddons).forEach(([name, qty]) => {
      for (let i = 0; i < qty; i++) selectedAddonsArr.push(name)
    })
    const newAddons: BookingAddons = {
      ...(detailReg.addons as BookingAddons | null),
      product_id: editPackageId,
      selected_addons: selectedAddonsArr,
      pax: editPax,
    }
    const updates: Record<string, unknown> = { addons: newAddons }
    if (editDateInput) updates.preferred_date = editDateInput
    if (editTimeInput) updates.preferred_time = editTimeInput

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('registrations') as any).update(updates).eq('id', detailReg.id)
    setActionLoading(false)
    if (error) {
      alert('Failed to save: ' + error.message)
    } else {
      setRegistrations(prev => prev.map(r => r.id === detailReg.id ? { ...r, ...updates, addons: newAddons } as Registration : r))
      setDetailReg(prev => prev ? { ...prev, ...updates, addons: newAddons } as Registration : null)
    }
  }

  // ─── Auto-save: addons JSON (package + pax + selected_addons) ─────────
  const triggerAddonsSave = useCallback((
    regId: string,
    pax: number,
    addons: Record<string, number>,
    packageId: number | null,
    baseAddons: BookingAddons | null,
  ) => {
    if (addonsSaveTimerRef.current) clearTimeout(addonsSaveTimerRef.current)
    setAddonsSaveState('saving')
    addonsSaveTimerRef.current = setTimeout(async () => {
      const selectedAddonsArr: string[] = []
      Object.entries(addons).forEach(([name, qty]) => {
        for (let i = 0; i < qty; i++) selectedAddonsArr.push(name)
      })
      const newAddons: BookingAddons = { ...baseAddons, product_id: packageId, selected_addons: selectedAddonsArr, pax }
      const { error } = await (supabase.from('registrations') as any)
        .update({ addons: newAddons })
        .eq('id', regId)
      if (error) {
        setAddonsSaveState('error')
        setTimeout(() => setAddonsSaveState('idle'), 3000)
      } else {
        setAddonsSaveState('saved')
        setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, addons: newAddons } as Registration : r))
        setDetailReg(prev => prev ? { ...prev, addons: newAddons } as Registration : null)
        setTimeout(() => setAddonsSaveState('idle'), 2000)
      }
    }, 400)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Delete booking (hard delete from Supabase) ────────────────────────
  const handleDeleteBooking = async () => {
    if (!detailReg) return
    const shouldDelete = window.confirm(
      `Hapus booking "${detailReg.customer_name}" (${detailReg.preferred_date ?? ''} ${detailReg.preferred_time ?? ''})\n\nData akan dihapus permanen dari database. Tindakan ini tidak bisa dibatalkan.`
    )
    if (!shouldDelete) return
    setActionLoading(true)

    // Delete linked transaction (ACTIVE or VOID) first to avoid FK constraint issues
    const linkedTx = transactions.find(t => t.registration_id === detailReg.id || t.session_id === detailReg.session_id)
    if (linkedTx && linkedTx.status !== 'PAID') {
      const { error: txErr } = await (supabase.from('transactions') as any).delete().eq('id', linkedTx.id)
      if (txErr) {
        alert('Gagal hapus transaksi terkait: ' + txErr.message)
        setActionLoading(false)
        return
      }
      setTransactions(prev => prev.filter(t => t.id !== linkedTx.id))
    }

    const { error: regErr } = await (supabase.from('registrations') as any).delete().eq('id', detailReg.id)
    if (regErr) {
      alert('Gagal hapus booking: ' + regErr.message)
      setActionLoading(false)
      return
    }

    setRegistrations(prev => prev.filter(r => r.id !== detailReg.id))
    setDetailReg(null)
    setActionLoading(false)
  }

  // ─── Transaction payment ─────────────────────────
  const markTxPaid = async (
    tx: Transaction,
    method: PaymentMethod,
    totalAmount: number,
    discountAmt: number,
    discountReason: string,
    splitInfo?: {
      baseAmount: number;
      baseMethod: PaymentMethod;
      addonAmount: number;
      addonMethod: PaymentMethod;
      cashReceived?: number;
      changeAmt?: number;
    },
    mergedAddons?: BookingAddons | null,
  ) => {
    setActionLoading(true)

    const reg = registrations.find(r => r.id === tx.registration_id || r.session_id === tx.session_id) ?? null

    // Use merged addons (booking + session add-ons) if provided, else fall back to reg.addons
    const effectiveAddons = mergedAddons ?? (reg?.addons as BookingAddons | null)
    const lineItems = calcBookingLineItems(products, effectiveAddons)
    const correctTotal = lineItems.reduce((sum, item) => sum + item.price, 0)

    // Build discount_reason: include split payment & cash notes if applicable
    let finalReason = discountReason || null
    const noteParts: string[] = []
    if (splitInfo && splitInfo.addonAmount > 0) {
      noteParts.push(`[Split: ${splitInfo.baseMethod}:${splitInfo.baseAmount} + ${splitInfo.addonMethod}:${splitInfo.addonAmount}]`)
    }
    if (splitInfo?.cashReceived) {
      noteParts.push(`[Cash:${splitInfo.cashReceived} | Change:${splitInfo.changeAmt ?? 0}]`)
    }
    if (noteParts.length > 0) {
      const extraNote = noteParts.join(' ')
      finalReason = finalReason ? `${finalReason} ${extraNote}` : extraNote
    }

    // If session add-ons were merged in, persist them to the registration first
    if (mergedAddons && tx.registration_id) {
      await supabase.from('registrations').update({ addons: mergedAddons } as never).eq('id', tx.registration_id)
      setRegistrations(prev => prev.map(r => r.id === tx.registration_id ? { ...r, addons: mergedAddons } as Registration : r))
    }

    const { error: payErr } = await supabase.from('transactions').update({
      status: 'PAID',
      payment_method: method,
      total_amount: correctTotal,
      discount_amount: discountAmt,
      discount_reason: finalReason,
    } as never).eq('id', tx.id)

    if (payErr) {
      console.error('Failed to mark transaction paid:', payErr)
      alert(`Gagal bayar: ${payErr.message}`)
      setActionLoading(false)
      return
    }

    // Mark linked registration as COMPLETED (session finished and paid)
    if (tx.registration_id) {
      await supabase.from('registrations').update({ status: 'COMPLETED' } as never).eq('id', tx.registration_id)
      setRegistrations(prev => prev.map(r => r.id === tx.registration_id ? { ...r, status: 'COMPLETED' as const } : r))
    }

    // Optimistic update — use correctTotal (gross pre-discount) to match DB
    const paidTx = { ...tx, status: 'PAID' as const, payment_method: method, total_amount: correctTotal, discount_amount: discountAmt, discount_reason: finalReason }
    setTransactions(prev => prev.map(t => t.id === tx.id ? paidTx : t))
    setShowPayModal(false)
    setPayTx(null)
    setPaymentMethodPick(null)
    setAddonPaymentPick(null)
    setDiscountInput('')
    setDiscountReasonInput('')
    setSessionAddons({})
    setActionLoading(false)

    // Receipt: use updated reg so merged add-ons appear in line items
    const receiptRegFinal = mergedAddons ? { ...reg, addons: mergedAddons } as Registration : reg
    setReceiptTx(paidTx)
    setReceiptReg(receiptRegFinal)
    setEditableDmMessage(buildDmMessage(paidTx, receiptRegFinal))
    setShowReceiptModal(true)
    setDmCopied(false)
    setSessionIdCopied(false)
  }

  // ─── Complete session → open receipt ─────────────
  const openReceipt = (tx: Transaction) => {
    const reg = registrations.find((r) => r.id === tx.registration_id || r.session_id === tx.session_id) ?? null
    setReceiptTx(tx)
    setReceiptReg(reg)
    setEditableDmMessage(buildDmMessage(tx, reg))
    setShowReceiptModal(true)
    setDmCopied(false)
    setSessionIdCopied(false)
    setTxEditMethod(tx.payment_method ?? null)
    setTxEditDiscount(tx.discount_amount > 0 ? String(tx.discount_amount) : '')
    setTxEditDiscountReason(tx.discount_reason ?? '')
    setTxEditSaveState('idle')
    // Init add-ons from the linked registration
    const selectedArr = (reg?.addons as BookingAddons | null)?.selected_addons ?? []
    const addonsObj: Record<string, number> = {}
    selectedArr.forEach((name: string) => { addonsObj[name] = (addonsObj[name] || 0) + 1 })
    setTxEditAddons(addonsObj)
  }

  // ─── Auto-save transaction fields ────────────────
  const saveTxEdit = (txId: string, updates: Partial<Transaction>, debounceMs = 0) => {
    if (txEditSaveTimerRef.current) clearTimeout(txEditSaveTimerRef.current)
    setTxEditSaveState('saving')
    const doSave = async () => {
      const { error } = await (supabase.from('transactions') as any).update(updates).eq('id', txId)
      if (error) {
        setTxEditSaveState('error')
        setTimeout(() => setTxEditSaveState('idle'), 3000)
      } else {
        setTxEditSaveState('saved')
        setReceiptTx(prev => prev ? { ...prev, ...updates } as Transaction : null)
        setTransactions(prev => prev.map(t => t.id === txId ? { ...t, ...updates } as Transaction : t))
        setTimeout(() => setTxEditSaveState('idle'), 2000)
      }
    }
    if (debounceMs > 0) {
      txEditSaveTimerRef.current = setTimeout(doSave, debounceMs)
    } else {
      doSave()
    }
  }

  // ─── Auto-save add-ons to linked registration (receipt modal) ───────────
  const saveTxRegAddons = (regId: string, addons: Record<string, number>, baseAddons: BookingAddons | null) => {
    if (txAddonsTimerRef.current) clearTimeout(txAddonsTimerRef.current)
    setTxEditSaveState('saving')
    txAddonsTimerRef.current = setTimeout(async () => {
      const selectedArr: string[] = []
      Object.entries(addons).forEach(([name, qty]) => {
        for (let i = 0; i < qty; i++) selectedArr.push(name)
      })
      const newAddons: BookingAddons = { ...baseAddons, selected_addons: selectedArr }
      const { error } = await (supabase.from('registrations') as any)
        .update({ addons: newAddons })
        .eq('id', regId)
      if (error) {
        setTxEditSaveState('error')
        setTimeout(() => setTxEditSaveState('idle'), 3000)
      } else {
        setTxEditSaveState('saved')
        setReceiptReg(prev => prev ? { ...prev, addons: newAddons } as Registration : null)
        setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, addons: newAddons } as Registration : r))
        setTimeout(() => setTxEditSaveState('idle'), 2000)
      }
    }, 400)
  }

  // ─── Build template DM message ───────────────────
  const buildDmMessage = (tx: Transaction, reg: Registration | null): string => {
    const name = reg?.customer_name ?? 'Customer'
    const sessionId = tx.session_id
    const photoLink = `https://drive.google.com/drive/folders/${sessionId}`

    return [
      `Halo Kak ${name}! 😊🙏`,
      ``,
      `Terima kasih sudah datang di Mera Selfstudio! 📸✨`,
      ``,
      `Berikut adalah link Google Drive untuk hasil soft-file foto Kakak:`,
      `🔗 ${photoLink}`,
      ``,
      `⚠️ Reminder untuk fotonya agar segera di-download karena dalam waktu 5 hari foto tersebut akan otomatis terhapus.`,
      ``,
      `Semoga suka sama hasilnya ya Kak! 💕`,
      `Jika ingin upload, jangan lupa tag kami! 🏷️`,
      `📷 @mera.selfstudio`,
      ``,
      `Apabila ada yang ditanyakan, feel free to let us know! 💬`,
      ``,
      `Once again, thank you for having us! Hope you like the experience of taking a self-photo with Mera Selfstudio 🤍`,
      `See you again! 👋`,
      ``,
      `Regards,`,
      `Mera Selfstudio 🌸`,
    ].join('\n')
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
  }

  const handleCrewLogin = () => {
    setRole('crew')
    localStorage.setItem('mera_pos_role', 'crew')
    setView('schedule')
    setShowCrewAttendanceOverlay(true)
  }

  const handleOwnerLoginSuccess = async () => {
    const hash = await sha256(ownerPinInput.trim())
    if (hash === import.meta.env.VITE_OWNER_PIN_HASH) {
      setRole('owner')
      localStorage.setItem('mera_pos_role', 'owner')
      setView('schedule')
      setOwnerPinError('')
      setShowOwnerPinPad(false)
      setOwnerPinInput('')
      return
    }
    setOwnerPinError('PIN owner salah')
    setOwnerPinInput('')
  }

  const handleOwnerDigit = (digit: string) => {
    if (ownerPinInput.length >= OWNER_PIN_LENGTH) return
    const next = `${ownerPinInput}${digit}`
    setOwnerPinInput(next)
    if (ownerPinError) setOwnerPinError('')
    if (next.length === OWNER_PIN_LENGTH) {
      window.setTimeout(async () => {
        const hash = await sha256(next)
        if (hash === import.meta.env.VITE_OWNER_PIN_HASH) {
          setRole('owner')
          setView('schedule')
          setOwnerPinError('')
          setShowOwnerPinPad(false)
          setOwnerPinInput('')
        } else {
          setOwnerPinError('PIN owner salah')
          setOwnerPinInput('')
        }
      }, 120)
    }
  }

  const handleSaveReschedule = async () => {
    if (!editRegTarget || !editDateInput || !editTimeInput) return
    setActionLoading(true)
    const { error } = await (supabase.from('registrations') as any)
      .update({ preferred_date: editDateInput, preferred_time: editTimeInput })
      .eq('id', editRegTarget.id)
    setActionLoading(false)
    if (error) {
      alert('Failed to edit schedule: ' + error.message)
    } else {
      setEditRegTarget(null)
      window.location.reload()
    }
  }

  // Save booking details (package, add-ons, pax)
  const handleSaveBookingDetails = async () => {
    if (!editRegTarget) return
    setActionLoading(true)
    const newAddons = {
      ...editRegTarget.addons,
      product_id: editPackageId,
      selected_addons: editAddons,
      pax: editPax,
    }
    const { error } = await (supabase.from('registrations') as any)
      .update({ addons: newAddons })
      .eq('id', editRegTarget.id)
    setActionLoading(false)
    if (error) {
      alert('Failed to edit booking details: ' + error.message)
    } else {
      setEditRegTarget(null)
      window.location.reload()
    }
  }

  const handleLogout = () => {
    setRole(null)
    localStorage.removeItem('mera_pos_role')
    setActiveCrewId(null)
    localStorage.removeItem('mera_pos_crew_id')
    setOwnerPinInput('')
    setOwnerPinError('')
    setShowOwnerPinPad(false)
    setShowCrewAttendanceOverlay(false)
    setView('schedule')
  }

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const day = todayKey()
      const [wkStart, wkEnd] = weekRange()
      const isoStart = wibDayToISOStart(day)
      const isoEnd = wibDayToISOEnd(day)

      const [{ data: regData }, { data: txData }, { data: attData }, { data: expData }, { data: weekRegData }, { data: prodData }, { data: crewData }] = await Promise.all([
        supabase.from('registrations').select('*').or(`preferred_date.eq.${day},created_at.gte.${isoStart}`).order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').gte('created_at', isoStart).lte('created_at', isoEnd).order('created_at', { ascending: false }),
        supabase.from('attendance').select('*').gte('clock_in', isoStart).lte('clock_in', isoEnd).order('clock_in', { ascending: false }),
        supabase.from('expenses').select('*').gte('tanggal', day).lte('tanggal', day).order('tanggal', { ascending: false }),
        supabase.from('registrations').select('*').gte('preferred_date', wkStart).lte('preferred_date', wkEnd).order('preferred_time', { ascending: true }),
        supabase.from('products').select('*').eq('is_active', true).order('kategori'),
        supabase.from('crew').select('*').eq('is_active', true).order('nama'),
      ])

      if (!mounted) return

      // Merge registrations: today's bookings + any linked to today's transactions
      const txList = (txData ?? []) as Transaction[]
      const regList = (regData ?? []) as Registration[]
      const regIds = new Set(regList.map(r => r.id))
      const missingRegIds = txList
        .map(t => t.registration_id)
        .filter((id): id is string => !!id && !regIds.has(id))

      if (missingRegIds.length > 0) {
        const { data: extraRegs } = await supabase.from('registrations').select('*').in('id', missingRegIds)
        if (extraRegs) regList.push(...(extraRegs as Registration[]))
      }

      setRegistrations(regList)
      setWeekRegistrations((weekRegData ?? []) as Registration[])
      setTransactions(txList)
      setAttendance((attData ?? []) as Attendance[])
      setExpenses((expData ?? []) as Expense[])
      setProducts((prodData ?? []) as Product[])
      setLoading(false)
    }

    load()
    const id = window.setInterval(load, 15000)

    const channel = supabase
      .channel('pos-reset-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => load())
      .subscribe()

    return () => {
      mounted = false
      window.clearInterval(id)
      void supabase.removeChannel(channel)
    }
  }, [])

  const statusCount = useMemo(() => {
    const base: Record<RegistrationStatus, number> = {
      PENDING: 0,
      VERIFIED: 0,
      PROCESSED: 0,
      EXPIRED: 0,
      COMPLETED: 0,
    }
    registrations.forEach((r) => {
      base[r.status] += 1
    })
    return base
  }, [registrations])

  const perStudio = useMemo(() => {
    return {
      BASIC: registrations.filter((r) => toStudioBucket(r) === 'BASIC'),
      CLOSEUP: registrations.filter((r) => toStudioBucket(r) === 'CLOSEUP'),
      QUEUE: registrations.filter((r) => toStudioBucket(r) === 'QUEUE'),
    }
  }, [registrations])

  // Count ONLINE_QRIS as PAID if payment is confirmed (status === 'PAID' or payment_method === 'ONLINE_QRIS')
  const txPaid = transactions.filter((t) => t.status === 'PAID' || t.payment_method === 'ONLINE_QRIS')
  const omzet = txPaid.reduce((sum, t) => sum + t.total_amount, 0)
  const expenseTotal = expenses.reduce((sum, e) => sum + e.jumlah, 0)
  const expenseCash = expenses.filter(e => (e.metode_bayar ?? 'CASH') === 'CASH').reduce((s, e) => s + e.jumlah, 0)
  const expenseQris = expenses.filter(e => e.metode_bayar === 'QRIS').reduce((s, e) => s + e.jumlah, 0)
  const navItems = role === 'owner' ? ownerNavItems : crewNavItems

  if (!role) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--mera-bg)',
          color: 'var(--mera-text-primary)',
          display: 'grid',
          placeItems: 'center',
          padding: 20,
        }}
      >
        <div style={{ width: 'min(420px, 100%)', display: 'grid', gap: 14 }}>
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <img src="/mera-logo-white.png" alt="Méra" style={{ height: 40, marginBottom: 10 }} />
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Operating System</p>
          </div>

          <Card>
            <div style={{ padding: 18, display: 'grid', gap: 10 }}>
              <button
                onClick={handleCrewLogin}
                style={{
                  border: 'none',
                  borderRadius: 14,
                  background: '#622128',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 16,
                  padding: '14px 16px',
                }}
              >
                Crew
              </button>
              <button
                onClick={() => {
                  setShowOwnerPinPad(true)
                  setOwnerPinError('')
                  setOwnerPinInput('')
                }}
                style={{
                  border: '1px solid rgba(139,26,26,0.4)',
                  borderRadius: 14,
                  background: 'rgba(139,26,26,0.12)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 16,
                  padding: '14px 16px',
                }}
              >
                Owner
              </button>
            </div>
          </Card>

          {showOwnerPinPad && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'linear-gradient(180deg, #1c1c1e 0%, #000000 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                fontFamily: 'var(--mera-font)',
              }}
            >
              {/* Time display — like iPhone lock screen */}
              <p style={{
                fontSize: 64,
                fontWeight: 200,
                letterSpacing: '-0.02em',
                color: '#fff',
                lineHeight: 1,
                marginBottom: 6,
              }}>
                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </p>
              <p style={{
                fontSize: 17,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.55)',
                marginBottom: 40,
              }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>

              {/* Enter PIN label */}
              <p style={{
                fontSize: 17,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.85)',
                letterSpacing: '0.01em',
                marginBottom: 20,
              }}>
                Enter PIN
              </p>

              {/* Dot indicators */}
              <div
                className={ownerPinError ? 'pin-shake' : undefined}
                style={{ display: 'flex', gap: 16, marginBottom: 32 }}
              >
                {Array.from({ length: OWNER_PIN_LENGTH }).map((_, i) => (
                  <span
                    key={i}
                    className={i < ownerPinInput.length ? 'pin-dot-filled' : undefined}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      border: '2px solid rgba(139,26,26,0.55)',
                      background: i < ownerPinInput.length ? '#622128' : 'transparent',
                      transition: 'background 0.1s ease',
                    }}
                  />
                ))}
              </div>

              {/* Error text */}
              {ownerPinError && (
                <p style={{ fontSize: 14, color: '#C89696', marginBottom: 12, marginTop: -16 }}>
                  {ownerPinError}
                </p>
              )}

              {/* Number pad */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, width: 270 }}>
                {[
                  { digit: '1', letters: '' },
                  { digit: '2', letters: '' },
                  { digit: '3', letters: '' },
                  { digit: '4', letters: '' },
                  { digit: '5', letters: '' },
                  { digit: '6', letters: '' },
                  { digit: '7', letters: '' },
                  { digit: '8', letters: '' },
                  { digit: '9', letters: '' },
                ].map(({ digit, letters }) => (
                  <button
                    key={digit}
                    onClick={() => handleOwnerDigit(digit)}
                    style={{
                      width: 78,
                      height: 78,
                      borderRadius: '50%',
                      border: 'none',
                      background: 'rgba(255,255,255,0.12)',
                      color: '#fff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      justifySelf: 'center',
                      gap: 0,
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                    onMouseDown={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.35)'
                    }}
                    onMouseUp={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'
                    }}
                  >
                    <span style={{ fontSize: 32, fontWeight: 300, lineHeight: 1.1 }}>{digit}</span>
                    {letters && (
                      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>
                        {letters}
                      </span>
                    )}
                  </button>
                ))}

                {/* Bottom row: Cancel — 0 — Delete */}
                <button
                  onClick={() => {
                    setShowOwnerPinPad(false)
                    setOwnerPinInput('')
                    setOwnerPinError('')
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.55)',
                    fontSize: 16,
                    fontWeight: 400,
                    justifySelf: 'center',
                    alignSelf: 'center',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleOwnerDigit('0')}
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(255,255,255,0.12)',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    justifySelf: 'center',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  onMouseDown={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.35)'
                  }}
                  onMouseUp={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'
                  }}
                >
                  <span style={{ fontSize: 32, fontWeight: 300, lineHeight: 1.1 }}>0</span>
                </button>
                {ownerPinInput.length > 0 ? (
                  <button
                    onClick={() => setOwnerPinInput((prev) => prev.slice(0, -1))}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,255,255,0.55)',
                      fontSize: 16,
                      fontWeight: 400,
                      justifySelf: 'center',
                      alignSelf: 'center',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Delete size={18} />
                  </button>
                ) : <div />}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="pos-app-shell"
      style={{
        height: '100vh',
        background: '#000',
        color: 'rgba(255,255,255,0.92)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--mera-font)',
      }}
    >
      {/* ─── iOS-style header bar ────────────────────── */}
      <header
        className="pos-header"
        style={{
          flexShrink: 0,
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(28,28,30,0.72)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: '0.5px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="pos-header-logo" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/mera-logo-white.png" alt="Méra" style={{ height: 24 }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>
            {role === 'owner' ? 'Owner' : 'Crew'}
          </span>
        </div>

        {/* Segmented nav */}
        <div className="pos-nav-segment" style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 12,
          padding: 3,
          gap: 2,
        }}>
          {navItems.map((item) => {
            const active = view === item.key
            return (
              <button
                key={item.key}
                className={`pos-nav-btn${active ? ' pos-nav-btn-active' : ''}`}
                onClick={() => setView(item.key)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: active ? 'rgba(139,26,26,0.35)' : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <span className="pos-nav-icon">{item.icon}</span>
                <span className="pos-nav-label">{item.label}</span>
              </button>
            )
          })}
        </div>

        <div className="pos-header-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="pos-header-date" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <button
            onClick={handleLogout}
            style={{
              border: 'none',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.55)',
              padding: '7px 14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </header>

      {/* ─── Main content ────────────────────────────── */}
      <main className="pos-main" style={{ flex: 1, overflow: 'auto', padding: '20px 24px', WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Loading...</p>
          </div>
        ) : (
          <>
            {/* ═══════════════════════════════════════════════ */}
            {/* 1. SCHEDULE — Month & Week Calendars             */}
            {/* ═══════════════════════════════════════════════ */}
            {view === 'schedule' && (() => {
              const today = todayKey()
              const statusColor = (s: string) => {
                const m: Record<string, string> = { PENDING: '#E0B88A', VERIFIED: '#9BB8D0', PROCESSED: '#A8C5A0', COMPLETED: '#7FC29B', EXPIRED: '#C89696' }
                return m[s] ?? 'rgba(255,255,255,0.3)'
              }

              // ── Month view helpers ────────────────────────
              const [calYr, calMo] = calMonthKey.split('-').map(Number)
              const daysInCal = new Date(calYr, calMo, 0).getDate()
              const firstDow = (new Date(calYr, calMo - 1, 1).getDay() + 6) % 7 // 0=Mon
              const cells: (string | null)[] = Array(firstDow).fill(null)
              for (let d = 1; d <= daysInCal; d++) cells.push(`${calMonthKey}-${d.toString().padStart(2, '0')}`)
              while (cells.length % 7 !== 0) cells.push(null)

              const prevCalMonth = (() => { const d = new Date(calYr, calMo - 2, 1); return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}` })()
              const nextCalMonth = (() => { const d = new Date(calYr, calMo, 1); return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}` })()
              const calMonthLabel = new Date(calYr, calMo - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

              const regsByDate = (date: string) => calMonthRegs.filter(r => r.preferred_date === date)
              const selectedRegs = calSelectedDate ? regsByDate(calSelectedDate) : []
              const totalThisMonth = calMonthRegs.length

              // ── Week view helpers ─────────────────────────
              const days = weekDays()
              const regsByDateSlotStudio = (date: string, slot: string, studios: StudioBucket[]) =>
                weekRegistrations.filter((r) => {
                  if (r.preferred_date !== date) return false
                  if (!studios.includes(toStudioBucket(r))) return false
                  return (r.preferred_time ?? '').slice(0, 2) === slot.slice(0, 2)
                })
              const basicWeek = weekRegistrations.filter((r) => toStudioBucket(r) === 'BASIC')
              const closeUpWeek = weekRegistrations.filter((r) => toStudioBucket(r) === 'CLOSEUP')

              const weekCalGrid = (title: string, studios: StudioBucket[], accent: string, count: number) => (
                <Card style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '16px 18px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
                        <h3 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h3>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', padding: '3px 12px', borderRadius: 20 }}>{count} this week</span>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto', padding: '0 0 16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(7, minmax(110px, 1fr))`, minWidth: 850 }}>
                      <div />
                      {days.map((d) => (
                        <div key={d.date} style={{ padding: '0 8px 10px', textAlign: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: d.isToday ? 700 : 500, color: d.isToday ? '#fff' : 'rgba(255,255,255,0.35)', ...(d.isToday ? { background: accent, padding: '3px 10px', borderRadius: 20 } : {}) }}>{d.label}</span>
                        </div>
                      ))}
                      {TIME_SLOTS.map((slot) => (
                        <React.Fragment key={slot}>
                          <div style={{ padding: '6px 8px 6px 12px', fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 500, borderTop: '0.5px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'start' }}>{slot}</div>
                          {days.map((d) => {
                            const regs = regsByDateSlotStudio(d.date, slot, studios)
                            return (
                              <div key={d.date} style={{ padding: '4px 4px', borderTop: '0.5px solid rgba(255,255,255,0.04)', minHeight: 32, background: d.isToday ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                                {regs.map((r) => (
                                  <div key={r.id} onClick={() => openDetail(r)} style={{ background: detailReg?.id === r.id ? `color-mix(in srgb, ${accent} 25%, transparent)` : `color-mix(in srgb, ${accent} 10%, transparent)`, border: `0.5px solid color-mix(in srgb, ${accent} 25%, transparent)`, borderRadius: 10, padding: '5px 8px', marginBottom: 3, cursor: 'pointer' }}>
                                    <p style={{ fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'rgba(255,255,255,0.85)' }}>{r.customer_name}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor(r.status), flexShrink: 0 }} />
                                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{r.preferred_time ?? r.status}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </Card>
              )

              const DOW_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

              return (
                <div style={{ display: 'grid', gap: 14 }}>
                  {/* Top bar: view toggle + navigation */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    {/* View toggle */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 3, gap: 2 }}>
                      {(['month', 'week'] as const).map(mode => (
                        <button key={mode} onClick={() => setCalViewMode(mode)} style={{ border: 'none', borderRadius: 9, padding: '7px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: calViewMode === mode ? '#622128' : 'transparent', color: calViewMode === mode ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s' }}>
                          {mode === 'month' ? 'Month' : 'Week'}
                        </button>
                      ))}
                    </div>

                    {/* Month navigation (only in month mode) */}
                    {calViewMode === 'month' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => { setCalMonthKey(prevCalMonth); setCalSelectedDate(null) }} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <ChevronLeft size={14} />
                        </button>
                        <span style={{ fontSize: 15, fontWeight: 700, minWidth: 160, textAlign: 'center', letterSpacing: '-0.01em' }}>{calMonthLabel}</span>
                        <button onClick={() => { setCalMonthKey(nextCalMonth); setCalSelectedDate(null) }} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <ChevronRight size={14} />
                        </button>
                        <button onClick={() => { setCalMonthKey(todayKey().slice(0, 7)); setCalSelectedDate(todayKey()) }} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', padding: '7px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Today</button>
                      </div>
                    )}

                    {/* Month summary pill */}
                    {calViewMode === 'month' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', padding: '6px 14px', borderRadius: 20, fontWeight: 600 }}>
                          {calMonthLoading ? '…' : `${totalThisMonth} booking`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── MONTH VIEW ── */}
                  {calViewMode === 'month' && (
                    <div style={{ display: 'grid', gap: 12 }}>
                      <Card style={{ overflow: 'hidden' }}>
                        {/* Day-of-week header */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                          {DOW_LABELS.map(d => (
                            <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{d}</div>
                          ))}
                        </div>

                        {/* Calendar cells */}
                        {calMonthLoading ? (
                          <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>Memuat kalender…</div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                            {cells.map((date, i) => {
                              if (!date) return <div key={`empty-${i}`} style={{ minHeight: 90, borderBottom: '0.5px solid rgba(255,255,255,0.04)', borderRight: '0.5px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.08)' }} />
                              const dayRegs = regsByDate(date)
                              const isToday = date === today
                              const isSelected = date === calSelectedDate
                              const dayNum = Number(date.slice(8))
                              const maxShow = 3
                              const overflow = dayRegs.length - maxShow

                              return (
                                <div
                                  key={date}
                                  onClick={() => setCalSelectedDate(isSelected ? null : date)}
                                  style={{
                                    minHeight: 90,
                                    padding: '7px 6px 6px',
                                    borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                                    borderRight: '0.5px solid rgba(255,255,255,0.04)',
                                    background: isSelected ? 'rgba(98,33,40,0.18)' : isToday ? 'rgba(255,255,255,0.03)' : 'transparent',
                                    cursor: 'pointer',
                                    transition: 'background 0.1s',
                                    position: 'relative',
                                  }}
                                >
                                  {/* Day number */}
                                  <div style={{ marginBottom: 5 }}>
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: isToday ? 800 : 500,
                                      background: isToday ? '#622128' : 'transparent',
                                      color: isToday ? '#fff' : isSelected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
                                    }}>{dayNum}</span>
                                  </div>

                                  {/* Booking chips */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {dayRegs.slice(0, maxShow).map(r => {
                                      const sc = statusColor(r.status)
                                      return (
                                        <div
                                          key={r.id}
                                          onClick={e => { e.stopPropagation(); setCalSelectedDate(date); openDetail(r) }}
                                          style={{
                                            background: `color-mix(in srgb, ${sc} 14%, transparent)`,
                                            borderLeft: `2.5px solid ${sc}`,
                                            borderRadius: '0 5px 5px 0',
                                            padding: '2px 5px',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          <p style={{ fontSize: 9, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'rgba(255,255,255,0.8)', lineHeight: 1.3 }}>{r.preferred_time ? `${r.preferred_time} ` : ''}{r.customer_name}</p>
                                        </div>
                                      )
                                    })}
                                    {overflow > 0 && (
                                      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 600, padding: '1px 5px' }}>+{overflow} lagi</p>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </Card>

                      {/* Day detail panel */}
                      {calSelectedDate && (
                        <Card>
                          <div style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700 }}>
                                  {new Date(calSelectedDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </h3>
                                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', padding: '2px 10px', borderRadius: 20 }}>{selectedRegs.length} booking</span>
                              </div>
                              <button onClick={() => setCalSelectedDate(null)} style={{ border: 'none', background: 'rgba(255,255,255,0.06)', borderRadius: 20, width: 26, height: 26, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={12} /></button>
                            </div>

                            {selectedRegs.length === 0 ? (
                              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', padding: '12px 0' }}>Tidak ada booking di tanggal ini.</p>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                                {selectedRegs.map(r => {
                                  const sc = statusColor(r.status)
                                  const studioLabel = (r.addons as BookingAddons | null)?.room ?? toStudioBucket(r)
                                  return (
                                    <div
                                      key={r.id}
                                      onClick={() => openDetail(r)}
                                      style={{
                                        background: `color-mix(in srgb, ${sc} 8%, rgba(255,255,255,0.03))`,
                                        border: `1px solid color-mix(in srgb, ${sc} 20%, transparent)`,
                                        borderRadius: 12,
                                        padding: '10px 12px',
                                        cursor: 'pointer',
                                        transition: 'background 0.12s',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <p style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.customer_name}</p>
                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: sc, flexShrink: 0, marginLeft: 6 }} />
                                      </div>
                                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {r.preferred_time && <span>{r.preferred_time}</span>}
                                        <span>·</span>
                                        <span>{studioLabel}</span>
                                        {(r.addons as BookingAddons | null)?.pax && <><span>·</span><span>{(r.addons as BookingAddons | null)?.pax} pax</span></>}
                                      </div>
                                      {r.instagram_handle && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>@{r.instagram_handle.replace('@', '')}</p>}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </Card>
                      )}

                      {/* Status legend */}
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        {[['PENDING', '#E0B88A', 'Pending'], ['VERIFIED', '#9BB8D0', 'Verified'], ['PROCESSED', '#A8C5A0', 'In Studio'], ['COMPLETED', '#7FC29B', 'Completed']].map(([, color, label]) => (
                          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── WEEK VIEW ── */}
                  {calViewMode === 'week' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {weekCalGrid('Studio Basic', ['BASIC', 'QUEUE'], '#622128', basicWeek.length)}
                      {weekCalGrid('Close Up Room', ['CLOSEUP'], '#2E4B72', closeUpWeek.length)}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* 2. BOOKING & POS (merged)                               */}
            {/* ═══════════════════════════════════════════════════════ */}
            {view === 'booking' && (() => {
              const pending = registrations.filter(r => r.status === 'PENDING')
              const verified = registrations.filter(r => r.status === 'VERIFIED')
              const processed = registrations.filter(r => r.status === 'PROCESSED')
              const activeTx = transactions.filter(t => t.status === 'ACTIVE')
              const paidTx = transactions.filter(t => t.status === 'PAID')
              const { cash: cashTotal, qris: qrisTotal } = calcMethodTotals(paidTx)

              const statusMap: Record<RegistrationStatus, { color: string; label: string }> = {
                PENDING: { color: '#E0B88A', label: 'Pending' },
                VERIFIED: { color: '#9BB8D0', label: 'Verified' },
                PROCESSED: { color: '#A8C5A0', label: 'In Studio' },
                COMPLETED: { color: '#7FC29B', label: 'Completed' },
                EXPIRED: { color: '#C89696', label: 'Expired' },
              }

              const txStatusColor = (s: string) => ({ ACTIVE: '#E0B88A', PAID: '#A8C5A0', REFUNDED: '#C89696', VOID: 'rgba(255,255,255,0.25)' } as Record<string, string>)[s] ?? 'rgba(255,255,255,0.3)'

              const qBtn = (label: string, icon: React.ReactNode, color: string, onClick: (e: React.MouseEvent) => void) => (
                <button onClick={e => { e.stopPropagation(); onClick(e) }} disabled={actionLoading} style={{ border: 'none', borderRadius: 9, background: `color-mix(in srgb, ${color} 18%, transparent)`, color, fontSize: 11, fontWeight: 600, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', opacity: actionLoading ? 0.5 : 1 }}>
                  {icon}{label}
                </button>
              )

              // Clickable booking card
              const bookingCard = (r: Registration) => {
                const linkedTx = transactions.find(t => t.registration_id === r.id || t.session_id === r.session_id)
                const isPaid = linkedTx?.status === 'PAID'
                const isSelected = detailReg?.id === r.id
                return (
                  <div
                    key={r.id}
                    onClick={() => openDetail(r)}
                    style={{ padding: '13px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', cursor: 'pointer', background: isSelected ? 'rgba(98,33,40,0.18)' : 'transparent', transition: 'background 0.15s ease' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.customer_name}</p>
                          <StatusPill label={statusMap[r.status].label} color={statusMap[r.status].color} />
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span>{r.preferred_time ?? '—'}</span>
                          <span>·</span>
                          <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{(r.addons as BookingAddons | null)?.room ?? toStudioBucket(r)}</span>
                          {r.instagram_handle && <><span>·</span><span>@{r.instagram_handle.replace('@', '')}</span></>}
                          {r.session_id && <><span>·</span><span style={{ fontWeight: 600, letterSpacing: '0.02em' }}>{r.session_id}</span></>}
                          <span>·</span>
                          <span style={{
                            fontWeight: 700, letterSpacing: '0.03em',
                            color: r.booking_type === 'ONLINE_QRIS' ? '#9BB8D0' : '#E0B88A',
                          }}>
                            {r.booking_type === 'ONLINE_QRIS' ? '💳 QRIS' : '📌 Keep Slot'}
                          </span>
                        </div>
                        {/* Removed selected_addons tag display as requested */}
                      </div>
                      {linkedTx && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: isPaid ? '#7FC29B' : 'rgba(255,255,255,0.45)', flexShrink: 0 }}>
                          {fmtRp(linkedTx.total_amount)}
                        </span>
                      )}
                    </div>
                    {r.status === 'PROCESSED' && !isPaid && products.filter(p => p.is_addon && p.is_active).length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                        {products.filter(p => p.is_addon && p.is_active).map(addon => {
                          const qty = sessionAddons[addon.id] ?? 0
                          return (
                            <div key={addon.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 0, border: `1px solid ${qty > 0 ? '#A8C5A0' : 'rgba(255,255,255,0.1)'}`, borderRadius: 9, background: qty > 0 ? 'rgba(168,197,160,0.1)' : 'rgba(255,255,255,0.03)', overflow: 'hidden' }}>
                              <button
                                onClick={e => { e.stopPropagation(); setSessionAddons(prev => { const next = { ...prev }; if ((next[addon.id] ?? 0) <= 1) delete next[addon.id]; else next[addon.id] = (next[addon.id] ?? 0) - 1; return next }) }}
                                disabled={qty === 0}
                                style={{ width: 24, height: 24, border: 'none', background: 'transparent', color: qty > 0 ? '#A8C5A0' : 'rgba(255,255,255,0.15)', fontSize: 16, fontWeight: 700, cursor: qty > 0 ? 'pointer' : 'default', display: 'grid', placeItems: 'center', padding: 0 }}
                              >−</button>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: '0 4px', color: qty > 0 ? '#A8C5A0' : 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{addon.nama}{qty > 0 ? ` ×${qty}` : ''}</span>
                              <button
                                onClick={e => { e.stopPropagation(); setSessionAddons(prev => ({ ...prev, [addon.id]: (prev[addon.id] ?? 0) + 1 })) }}
                                style={{ width: 24, height: 24, border: 'none', background: 'transparent', color: '#A8C5A0', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0 }}
                              >+</button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {r.status === 'PENDING' && qBtn('Verify', <Check size={11}/>, '#9BB8D0', () => advanceBooking(r, 'VERIFIED'))}
                      {r.status === 'VERIFIED' && qBtn('Process →', <ChevronRight size={11}/>, '#A8C5A0', () => advanceBooking(r, 'PROCESSED'))}
                      {r.status === 'PROCESSED' && !isPaid && linkedTx && qBtn('Pay', <CreditCard size={11}/>, '#A8C5A0', () => { setPayTx(linkedTx); setShowPayModal(true); setPaymentMethodPick(r.booking_type === 'ONLINE_QRIS' ? 'ONLINE_QRIS' : null); setDiscountInput(''); setDiscountReasonInput('') })}
                      {r.status === 'PROCESSED' && isPaid && linkedTx && qBtn('Receipt', <Send size={11}/>, '#7FC29B', () => openReceipt(linkedTx))}
                      {r.status === 'COMPLETED' && linkedTx && qBtn('Receipt', <Send size={11}/>, '#7FC29B', () => openReceipt(linkedTx))}
                    </div>
                  </div>
                )
              }

              // Clickable transaction card
              const txCard = (t: Transaction) => {
                const linkedReg = registrations.find(r => r.id === t.registration_id || r.session_id === t.session_id) ?? null
                // Include in-session add-ons in live price estimate for ACTIVE transactions
                const txSessionArr: string[] = []
                if (t.status === 'ACTIVE') {
                  Object.entries(sessionAddons).forEach(([idStr, qty]) => {
                    const prod = products.find(p => p.id === Number(idStr) && p.is_addon)
                    if (prod) for (let i = 0; i < qty; i++) txSessionArr.push(prod.nama)
                  })
                }
                const mergedRegForCalc = linkedReg && txSessionArr.length > 0
                  ? { ...linkedReg, addons: { ...(linkedReg.addons as BookingAddons | null), selected_addons: [...((linkedReg.addons as BookingAddons | null)?.selected_addons ?? []), ...txSessionArr] } } as Registration
                  : linkedReg
                const items = calcLineItems(mergedRegForCalc)
                const estimatedTotal = t.status === 'ACTIVE' ? items.reduce((s, i) => s + i.price, 0) : t.total_amount
                return (
                  <div
                    key={t.id}
                    onClick={() => linkedReg && openDetail(linkedReg)}
                    style={{ padding: '13px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', cursor: linkedReg ? 'pointer' : 'default', background: linkedReg && detailReg?.id === linkedReg.id ? 'rgba(98,33,40,0.18)' : 'transparent', transition: 'background 0.15s ease' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        {linkedReg && <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{linkedReg.customer_name}</p>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', color: 'rgba(255,255,255,0.4)' }}>{t.session_id}</span>
                          <StatusPill label={t.status} color={txStatusColor(t.status)} />
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {t.payment_method ? (
                            <span style={{ color: '#A8C5A0', fontWeight: 600 }}>{t.payment_method}</span>
                          ) : (
                            <>
                              <span style={{ color: 'rgba(255,255,255,0.2)' }}>Unpaid</span>
                              {linkedReg?.booking_type && (
                                <span style={{
                                  fontWeight: 700,
                                  color: linkedReg.booking_type === 'ONLINE_QRIS' ? '#9BB8D0' : '#E0B88A',
                                }}>
                                  · {linkedReg.booking_type === 'ONLINE_QRIS' ? '💳 QRIS' : '📌 Keep Slot'}
                                </span>
                              )}
                            </>
                          )}
                          <span>·</span>
                          <span>{fmtTime(t.created_at)}</span>
                          {t.discount_amount > 0 && <><span>·</span><span style={{ color: '#C89696' }}>−{fmtRp(t.discount_amount)}</span></>}
                        </div>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{fmtRp(estimatedTotal)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {t.status === 'ACTIVE' && qBtn('Pay', <CreditCard size={11}/>, '#A8C5A0', () => { setPayTx(t); setShowPayModal(true); const lr = registrations.find(r => r.id === t.registration_id); setPaymentMethodPick(lr?.booking_type === 'ONLINE_QRIS' ? 'ONLINE_QRIS' : null); setDiscountInput(''); setDiscountReasonInput('') })}
                      {t.status === 'PAID' && qBtn('Receipt + DM', <Send size={11}/>, '#7FC29B', () => openReceipt(t))}
                    </div>
                  </div>
                )
              }

              const bookingCol = (title: string, icon: React.ReactNode, items: Registration[], empty: string) => (
                <Card style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{ padding: '14px 16px 0' }}><SectionHeader title={title} icon={icon} count={items.length} /></div>
                  <div style={{ overflow: 'auto', flex: 1 }}>
                    {items.length === 0 ? <p style={{ padding: '20px 16px', fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>{empty}</p> : items.map(bookingCard)}
                  </div>
                </Card>
              )

              const txCol = (title: string, icon: React.ReactNode, items: Transaction[], empty: string) => (
                <Card style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{ padding: '14px 16px 0' }}><SectionHeader title={title} icon={icon} count={items.length} /></div>
                  <div style={{ overflow: 'auto', flex: 1 }}>
                    {items.length === 0 ? <p style={{ padding: '20px 16px', fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>{empty}</p> : items.map(txCard)}
                  </div>
                </Card>
              )

              const tabDefs: Array<{ key: typeof bookingTab; label: string; count: number; color: string }> = [
                { key: 'lobby',  label: 'Lobby',     count: pending.length + verified.length, color: '#E0B88A' },
                { key: 'studio', label: 'In Studio',  count: processed.length,                color: '#A8C5A0' },
                { key: 'active', label: 'Active TXs', count: activeTx.length,                 color: '#E0B88A' },
                { key: 'paid',   label: 'Paid',       count: paidTx.length,                   color: '#7FC29B' },
              ]

              return (
                <div style={{ display: 'grid', gap: 12 }}>
                  {sessionIdCopied && (
                    <div style={{ position: 'fixed', top: 70, right: 24, background: 'rgba(139,26,26,0.85)', color: '#fff', padding: '8px 16px', borderRadius: 12, fontSize: 12, fontWeight: 600, zIndex: 100, backdropFilter: 'blur(8px)' }}>
                      Session ID copied!
                    </div>
                  )}

                  {/* Summary pills — 6-col desktop, 3-col mobile */}
                  <div className="gc-kpi-grid gc-booking-pills" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
                    <Pill label="Pending"       value={pending.length}      color="#E0B88A" />
                    <Pill label="Verified"      value={verified.length}     color="#9BB8D0" />
                    <Pill label="In Studio"     value={processed.length}    color="#A8C5A0" />
                    <Pill label="Active TXs"    value={activeTx.length}     color="#E0B88A" />
                    <Pill label="Cash"          value={fmtRp(cashTotal)} />
                    <Pill label="QRIS/Transfer" value={fmtRp(qrisTotal)} />
                  </div>

                  {/* ── Mobile tab strip (hidden on desktop) ── */}
                  <div className="gc-booking-tab-strip" style={{ display: 'none', gap: 6 }}>
                    {tabDefs.map(tab => {
                      const active = bookingTab === tab.key
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setBookingTab(tab.key)}
                          style={{
                            flex: 1, border: 'none', borderRadius: 12, padding: '10px 6px',
                            background: active ? `color-mix(in srgb, ${tab.color} 20%, rgba(30,30,32,0.9))` : 'rgba(255,255,255,0.05)',
                            color: active ? tab.color : 'rgba(255,255,255,0.4)',
                            fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                            outline: active ? `1px solid color-mix(in srgb, ${tab.color} 35%, transparent)` : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ fontSize: 16, fontWeight: 800 }}>{tab.count}</span>
                          <span>{tab.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* ── Mobile single-panel view (hidden on desktop) ── */}
                  <div className="gc-booking-mobile-panel" style={{ display: 'none' }}>
                    {bookingTab === 'lobby'  && bookingCol('Lobby',     <Layers3 size={15}/>,  [...pending, ...verified], 'No bookings in lobby')}
                    {bookingTab === 'studio' && bookingCol('In Studio', <Monitor size={15}/>,   processed,                'No active sessions')}
                    {bookingTab === 'active' && txCol('Active TXs',     <CreditCard size={15}/>, activeTx,                'No active transactions')}
                    {bookingTab === 'paid'   && txCol('Paid Today',     <Receipt size={15}/>,   paidTx,                  'No paid transactions')}
                  </div>

                  {/* ── Desktop 4-panel layout (hidden on mobile) ── */}
                  <div className="gc-booking-desktop-layout" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 12, minHeight: 'calc(100vh - 230px)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {bookingCol('Lobby',     <Layers3 size={15}/>, [...pending, ...verified], 'No bookings in lobby')}
                      {bookingCol('In Studio', <Monitor size={15}/>, processed,                 'No active sessions')}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {txCol('Active',     <CreditCard size={15}/>, activeTx, 'No active transactions')}
                      {txCol('Paid Today', <Receipt size={15}/>,   paidTx,   'No paid transactions')}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ═══════════════════════════════════════════════ */}
            {/* 4. TODAY FINANCE RECAP                           */}
            {/* ═══════════════════════════════════════════════ */}
            {view === 'finance' && (() => {
              const { cash: cashTotal, qris: qrisTotal } = calcMethodTotals(txPaid)
              const discountTotal = transactions.filter((t) => t.status === 'PAID').reduce((s, t) => s + t.discount_amount, 0)
              const netRevenue = omzet - discountTotal
              const profit = netRevenue - expenseTotal

              const finRow = (label: string, value: string, color?: string) => (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: color ?? 'rgba(255,255,255,0.85)' }}>{value}</span>
                </div>
              )

              return (
                <div style={{ display: 'grid', gap: 16 }}>
                  {/* KPI row */}
                  <div className="gc-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10 }}>
                    <Pill label="Gross Omzet" value={fmtRp(omzet)} />
                    <Pill label="Discounts" value={`−${fmtRp(discountTotal)}`} color={discountTotal > 0 ? '#C89696' : undefined} />
                    <Pill label="Net Revenue" value={fmtRp(netRevenue)} color="#A8C5A0" />
                    <Pill label="Kas Tunai Laci" value={fmtRp(cashTotal - expenseCash)} color="#A8C5A0" />
                    <Pill label="QRIS / TF In" value={fmtRp(qrisTotal)} color="#9BB8D0" />
                    <Pill label="Expenses" value={fmtRp(expenseTotal)} color="#E0B88A" />
                    <Pill label="Exp Cash" value={fmtRp(expenseCash)} color="#E0B88A" />
                    <Pill label="Profit" value={fmtRp(profit)} color={profit >= 0 ? '#A8C5A0' : '#C89696'} />
                  </div>

                  <div className="gc-finance-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {/* Payment breakdown */}
                    <Card>
                      <div style={{ padding: '16px 18px' }}>
                        <SectionHeader title="Payment & Cash Register" icon={<Banknote size={16} />} />
                        <div>
                          {finRow('Cash In (Pemasukan Tunai)', fmtRp(cashTotal))}
                          {finRow('Exp Cash Out (Pengeluaran Tunai)', `−${fmtRp(expenseCash)}`, expenseCash > 0 ? '#E0B88A' : undefined)}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(168,197,160,0.12)', border: '1px solid rgba(168,197,160,0.25)', borderRadius: 10, margin: '8px 0' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#A8C5A0' }}>💵 Sisa Kas Tunai di Laci</span>
                            <span style={{ fontSize: 16, fontWeight: 800, color: '#A8C5A0' }}>{fmtRp(cashTotal - expenseCash)}</span>
                          </div>
                          {finRow('QRIS / Transfer In', fmtRp(qrisTotal), '#9BB8D0')}
                          {finRow('Exp QRIS Out', `−${fmtRp(expenseQris)}`, expenseQris > 0 ? '#9BB8D0' : undefined)}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0 4px', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Total Gross Paid</span>
                            <span style={{ fontSize: 16, fontWeight: 700 }}>{fmtRp(omzet)}</span>
                          </div>
                        </div>
                        <div style={{ marginTop: 14, display: 'grid', gap: 4 }}>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{txPaid.length} paid · {transactions.filter((t) => t.status === 'ACTIVE').length} active</p>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{attendance.filter((a) => a.status === 'ACTIVE').length} crew active · {attendance.filter((a) => a.status === 'COMPLETED').length} done</p>
                        </div>
                      </div>
                    </Card>

                    {/* Tx list */}
                    <Card style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      <div style={{ padding: '16px 18px 0' }}>
                        <SectionHeader title="Transactions" icon={<Receipt size={16} />} count={txPaid.length} />
                      </div>
                      <div style={{ overflow: 'auto', flex: 1, maxHeight: 420 }}>
                        {txPaid.length === 0 && <p style={{ padding: '24px 18px', fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>None yet</p>}
                        {txPaid.map((t) => {
                          const txReg = registrations.find(r => r.id === t.registration_id || r.session_id === t.session_id) ?? null
                          const txItems = calcLineItems(txReg)
                          return (
                            <div key={t.id} style={{ padding: '10px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <p style={{ fontSize: 13, fontWeight: 600 }}>{t.session_id}</p>
                                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{fmtTime(t.created_at)} · {t.payment_method}</p>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtRp(t.total_amount)}</span>
                              </div>
                              {txItems.length > 0 && (
                                <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {txItems.map((item, i) => (
                                    <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'rgba(168,197,160,0.08)', color: 'rgba(168,197,160,0.65)', fontWeight: 500 }}>
                                      {item.label}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </Card>

                    {/* Expenses */}
                    <Card style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      <div style={{ padding: '16px 18px 0' }}>
                        <SectionHeader title="Expenses" icon={<Banknote size={16} />} count={expenses.length} />
                      </div>

                      {/* Expense input form */}
                      <div style={{ padding: '0 18px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                          <input
                            type="text"
                            placeholder="Item"
                            value={expenseItem}
                            onChange={e => setExpenseItem(e.target.value)}
                            style={{ flex: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#fff', padding: '8px 10px', fontSize: 12, outline: 'none' }}
                          />
                          <input
                            type="number"
                            placeholder="Price"
                            value={expensePrice}
                            onChange={e => setExpensePrice(e.target.value)}
                            style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#fff', padding: '8px 10px', fontSize: 12, outline: 'none' }}
                          />
                        </div>
                        <div className="gc-expense-form-row" style={{ display: 'flex', gap: 6 }}>
                          <select
                            value={expenseCategory}
                            onChange={e => setExpenseCategory(e.target.value)}
                            style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: expenseCategory ? '#fff' : 'rgba(255,255,255,0.35)', padding: '8px 6px', fontSize: 12, outline: 'none', appearance: 'none' }}
                          >
                            <option value="" disabled>Category</option>
                            <option value="Operasional">Operasional</option>
                            <option value="Perlengkapan">Perlengkapan</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            {(['CASH', 'QRIS'] as const).map(m => (
                              <button key={m} onClick={() => setExpenseMetode(m)}
                                style={{ border: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                  background: expenseMetode === m ? (m === 'CASH' ? 'rgba(168,197,160,0.2)' : 'rgba(155,184,208,0.2)') : 'rgba(255,255,255,0.05)',
                                  color: expenseMetode === m ? (m === 'CASH' ? '#A8C5A0' : '#9BB8D0') : 'rgba(255,255,255,0.3)',
                                }}>
                                {m}
                              </button>
                            ))}
                          </div>
                          <button
                            disabled={!expenseItem.trim() || !expensePrice || !expenseCategory || expenseLoading}
                            onClick={async () => {
                              setExpenseLoading(true)
                              const payload = {
                                tanggal: todayKey(),
                                keterangan: expenseItem.trim(),
                                kategori: expenseCategory,
                                metode_bayar: expenseMetode,
                                jumlah: parseInt(expensePrice, 10) || 0,
                              }
                              const { data, error } = await supabase.from('expenses').insert(payload as never).select('*').single()
                              if (error) {
                                alert(`Gagal tambah expense: ${error.message}`)
                              } else if (data) {
                                setExpenses(prev => [data as Expense, ...prev])
                                setExpenseItem('')
                                setExpensePrice('')
                                setExpenseCategory('')
                                setExpenseMetode('CASH')
                              }
                              setExpenseLoading(false)
                            }}
                            style={{
                              border: 'none', borderRadius: 10,
                              background: expenseItem.trim() && expensePrice && expenseCategory ? '#622128' : 'rgba(255,255,255,0.06)',
                              color: expenseItem.trim() && expensePrice && expenseCategory ? '#fff' : 'rgba(255,255,255,0.2)',
                              padding: '8px 12px', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 4,
                              fontSize: 12, fontWeight: 600, flexShrink: 0,
                            }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      <div style={{ overflow: 'auto', flex: 1, maxHeight: 420 }}>
                        {expenses.length === 0 && <p style={{ padding: '24px 18px', fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No expenses today</p>}
                        {expenses.map((e) => (
                          <div key={e.id} style={{ padding: '10px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600 }}>{e.keterangan}</p>
                              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                                {e.kategori}
                                <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: e.metode_bayar === 'QRIS' ? 'rgba(155,184,208,0.15)' : 'rgba(168,197,160,0.15)', color: e.metode_bayar === 'QRIS' ? '#9BB8D0' : '#A8C5A0' }}>{e.metode_bayar ?? 'CASH'}</span>
                              </p>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#E0B88A' }}>{fmtRp(e.jumlah)}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                </div>
              )
            })()}

            {/* ═══════════════════════════════════════════════ */}
            {/* 5. ATTENDANCE                                   */}
            {/* ═══════════════════════════════════════════════ */}
            {view === 'attendance' && (
              <AttendanceBoard onLogout={handleLogout} />
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* 6. MONTHLY RECAP (Owner only)                   */}
            {/* ═══════════════════════════════════════════════ */}
            {view === 'monthly' && (() => {
              // Load data on first render of this view
              if (!monthLoading && !monthLoaded) {
                loadMonthData(monthKey)
              }

              const monthPaid = monthTx.filter(t => t.status === 'PAID')
              const mGross = monthPaid.reduce((s, t) => s + t.total_amount, 0)
              const mDiscount = monthPaid.reduce((s, t) => s + t.discount_amount, 0)
              const mExpTotal = monthExp.reduce((s, e) => s + e.jumlah, 0)
              const mNet = mGross - mDiscount
              const mProfit = mNet - mExpTotal
              const { cash: mCash, qris: mQris } = calcMethodTotals(monthPaid)

              // ── Daily breakdown ──
              const dailyMap = new Map<string, { revenue: number; tx: number; expense: number }>()
              for (const t of monthPaid) {
                const d = t.created_at.slice(0, 10)
                const cur = dailyMap.get(d) ?? { revenue: 0, tx: 0, expense: 0 }
                cur.revenue += t.total_amount
                cur.tx += 1
                dailyMap.set(d, cur)
              }
              for (const e of monthExp) {
                const d = e.tanggal.slice(0, 10)
                const cur = dailyMap.get(d) ?? { revenue: 0, tx: 0, expense: 0 }
                cur.expense += e.jumlah
                dailyMap.set(d, cur)
              }
              const dailyRows = [...dailyMap.entries()].sort((a, b) => b[0].localeCompare(a[0]))
              const maxDailyRev = Math.max(...dailyRows.map(([, v]) => v.revenue), 1)

              // ── Payroll calculation ──
              const payrollRows = crewList.map(c => {
                const crewAtt = monthAtt.filter(a => a.crew_id === c.id)
                const shifts = crewAtt.length
                const totalBase = crewAtt.reduce((s, a) => s + a.base_rate, 0)
                const totalPenalty = crewAtt.reduce((s, a) => s + a.penalty_amount, 0)
                const totalBonus = crewAtt.reduce((s, a) => s + a.bonus_amount, 0)
                const totalLate = crewAtt.reduce((s, a) => s + a.late_minutes, 0)
                const net = c.status_gaji === 'INTERN' ? 0 : totalBase - totalPenalty + totalBonus
                return { crew: c, shifts, totalBase, totalPenalty, totalBonus, totalLate, net }
              }).filter(r => r.shifts > 0).sort((a, b) => b.net - a.net)

              const totalPayroll = payrollRows.reduce((s, r) => s + r.net, 0)

              // ── Expense breakdown by category ──
              const expByCat = new Map<string, number>()
              for (const e of monthExp) {
                expByCat.set(e.kategori, (expByCat.get(e.kategori) ?? 0) + e.jumlah)
              }
              const mExpCash = monthExp.filter(e => (e.metode_bayar ?? 'CASH') === 'CASH').reduce((s, e) => s + e.jumlah, 0)
              const mExpQris = monthExp.filter(e => e.metode_bayar === 'QRIS').reduce((s, e) => s + e.jumlah, 0)

              // ── Recap navigation helpers ──
              const recapWeek = getWeekRange(weekOffset)

              const recapDateRange: { start: string; end: string } = (() => {
                if (recapMode === 'weekly') return { start: recapWeek.start, end: recapWeek.end }
                if (recapMode === 'custom') return { start: customStart, end: customEnd }
                // monthly: 26th prev → 25th current
                const [y, m] = monthKey.split('-').map(Number)
                return {
                  start: new Date(y, m - 2, 26).toISOString().slice(0, 10),
                  end:   new Date(y, m - 1, 25).toISOString().slice(0, 10),
                }
              })()

              const monthLabel = (() => {
                if (recapMode === 'weekly') return recapWeek.label
                if (recapMode === 'custom') {
                  const fmt = (s: string) => new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                  return `${fmt(customStart)} – ${fmt(customEnd)}`
                }
                const [y, m] = monthKey.split('-').map(Number)
                const fmt = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                return `${fmt(new Date(y, m - 2, 26))} – ${fmt(new Date(y, m - 1, 25))}`
              })()

              const changeMonth = (delta: number) => {
                if (recapMode === 'weekly') {
                  const next = weekOffset + delta
                  setWeekOffset(next)
                  const wr = getWeekRange(next)
                  setMonthTx([]); setMonthExp([]); setMonthAtt([]); setCrewList([])
                  setMonthLoaded(false)
                  loadRecapRange(wr.start, wr.end)
                  return
                }
                const [y, m] = monthKey.split('-').map(Number)
                const d = new Date(y, m - 1 + delta, 1)
                const key = d.toISOString().slice(0, 7)
                setMonthKey(key)
                setMonthTx([]); setMonthExp([]); setMonthAtt([]); setCrewList([])
                setMonthLoaded(false)
                loadMonthData(key)
              }

              const loadCustomRange = () => {
                if (!customStart || !customEnd || customStart > customEnd) return
                setMonthTx([]); setMonthExp([]); setMonthAtt([]); setCrewList([])
                setMonthLoaded(false)
                loadRecapRange(customStart, customEnd)
              }

              if (monthLoading) {
                return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading {monthLabel}…</div>
              }

              return (
                <div style={{ display: 'grid', gap: 16 }}>
                  {/* ── Recap mode picker + navigation ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Mode toggle */}
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      {(['monthly', 'weekly', 'custom'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => {
                            setRecapMode(mode)
                            setMonthTx([]); setMonthExp([]); setMonthAtt([]); setCrewList([])
                            setMonthLoaded(false)
                            if (mode === 'monthly') loadMonthData(monthKey)
                            else if (mode === 'weekly') {
                              setWeekOffset(0)
                              const wr = getWeekRange(0)
                              loadRecapRange(wr.start, wr.end)
                            }
                            // custom: user picks range then clicks Load
                          }}
                          style={{
                            border: 'none', borderRadius: 8, padding: '6px 14px',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            background: recapMode === mode ? 'rgba(98,33,40,0.7)' : 'rgba(255,255,255,0.06)',
                            color: recapMode === mode ? '#fff' : 'rgba(255,255,255,0.45)',
                          }}
                        >
                          {mode === 'monthly' ? 'Bulanan' : mode === 'weekly' ? 'Mingguan' : 'Manual'}
                        </button>
                      ))}
                    </div>

                    {/* Custom date-range picker */}
                    {recapMode === 'custom' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="date"
                          value={customStart}
                          onChange={e => setCustomStart(e.target.value)}
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', padding: '6px 10px', fontSize: 13 }}
                        />
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>s/d</span>
                        <input
                          type="date"
                          value={customEnd}
                          onChange={e => setCustomEnd(e.target.value)}
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', padding: '6px 10px', fontSize: 13 }}
                        />
                        <button
                          onClick={loadCustomRange}
                          disabled={!customStart || !customEnd || customStart > customEnd}
                          style={{ background: '#622128', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Load
                        </button>
                      </div>
                    )}

                    {/* Period navigation (monthly or weekly) */}
                    {recapMode !== 'custom' && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                        <button onClick={() => changeMonth(-1)} style={{ border: 'none', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 12px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <ChevronLeft size={16} />
                        </button>
                        <h2 style={{ fontSize: 16, fontWeight: 700, minWidth: 200, textAlign: 'center' }}>{monthLabel}</h2>
                        <button onClick={() => changeMonth(1)} style={{ border: 'none', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 12px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}

                    {/* Label for custom after load */}
                    {recapMode === 'custom' && monthLoaded && (
                      <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{monthLabel}</div>
                    )}
                  </div>

                  {/* KPI row */}
                  <div className="gc-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10 }}>
                    <Pill label="Gross" value={fmtRp(mGross)} />
                    <Pill label="Discounts" value={`−${fmtRp(mDiscount)}`} color={mDiscount > 0 ? '#C89696' : undefined} />
                    <Pill label="Net Revenue" value={fmtRp(mNet)} color="#A8C5A0" />
                    <Pill label="Expenses" value={fmtRp(mExpTotal)} color="#E0B88A" />
                    <Pill label="Exp Cash" value={fmtRp(mExpCash)} color="#E0B88A" />
                    <Pill label="Exp QRIS" value={fmtRp(mExpQris)} color="#9BB8D0" />
                    <Pill label="Payroll" value={fmtRp(totalPayroll)} color="#9BB8D0" />
                    <Pill label="Profit" value={fmtRp(mProfit - totalPayroll)} color={mProfit - totalPayroll >= 0 ? '#A8C5A0' : '#C89696'} />
                  </div>

                  <div className="gc-monthly-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* ── Daily Revenue Chart ── */}
                    <Card>
                      <div style={{ padding: '16px 18px' }}>
                        <SectionHeader title="Daily Revenue" icon={<TrendingUp size={16} />} count={monthPaid.length} />
                        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>💵 Cash {fmtRp(mCash)}</span>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>·</span>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>📱 QRIS/TF {fmtRp(mQris)}</span>
                        </div>
                        <div style={{ maxHeight: 350, overflow: 'auto' }}>
                          {dailyRows.map(([day, v]) => (
                            <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', width: 48, flexShrink: 0 }}>
                                {new Date(day + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', weekday: 'short' })}
                              </span>
                              <div style={{ flex: 1, height: 18, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                                <div style={{ height: '100%', width: `${(v.revenue / maxDailyRev) * 100}%`, background: 'linear-gradient(90deg, rgba(139,26,26,0.4), rgba(139,26,26,0.7))', borderRadius: 4, transition: 'width 0.3s' }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 600, width: 75, textAlign: 'right', flexShrink: 0 }}>{fmtRp(v.revenue)}</span>
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', width: 30, textAlign: 'right', flexShrink: 0 }}>{v.tx}tx</span>
                            </div>
                          ))}
                          {dailyRows.length === 0 && <p style={{ padding: 16, fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No transactions this month</p>}
                        </div>
                      </div>
                    </Card>

                    {/* ── Expenses ── */}
                    <Card style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      <div style={{ padding: '16px 18px 0' }}>
                        <SectionHeader title="Expenses" icon={<Banknote size={16} />} count={monthExp.length} />
                      </div>

                      {/* Category breakdown */}
                      <div style={{ padding: '0 18px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[...expByCat.entries()].sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                          <span key={cat} style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: 'rgba(224,184,138,0.1)', color: '#E0B88A' }}>
                            {cat} {fmtRp(amt)}
                          </span>
                        ))}
                      </div>

                      {/* Expense input */}
                      <div style={{ padding: '0 18px 10px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                          <input type="date" value={monthExpDate} onChange={e => setMonthExpDate(e.target.value)}
                            style={{ flex: '0 0 120px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#fff', padding: '7px 8px', fontSize: 11, outline: 'none' }} />
                          <input type="text" placeholder="Item" value={monthExpItem} onChange={e => setMonthExpItem(e.target.value)}
                            style={{ flex: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#fff', padding: '7px 10px', fontSize: 11, outline: 'none' }} />
                        </div>
                        <div className="gc-expense-form-row" style={{ display: 'flex', gap: 6 }}>
                          <input type="number" placeholder="Price" value={monthExpPrice} onChange={e => setMonthExpPrice(e.target.value)}
                            style={{ flex: 1, minWidth: 80, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#fff', padding: '7px 10px', fontSize: 11, outline: 'none' }} />
                          <select value={monthExpCategory} onChange={e => setMonthExpCategory(e.target.value)}
                            style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: monthExpCategory ? '#fff' : 'rgba(255,255,255,0.35)', padding: '7px 6px', fontSize: 11, outline: 'none', appearance: 'none' }}>
                            <option value="" disabled>Category</option>
                            <option value="Operasional">Operasional</option>
                            <option value="Perlengkapan">Perlengkapan</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                            {(['CASH', 'QRIS'] as const).map(m => (
                              <button key={m} onClick={() => setMonthExpMetode(m)}
                                style={{ border: 'none', borderRadius: 7, padding: '7px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                                  background: monthExpMetode === m ? (m === 'CASH' ? 'rgba(168,197,160,0.2)' : 'rgba(155,184,208,0.2)') : 'rgba(255,255,255,0.05)',
                                  color: monthExpMetode === m ? (m === 'CASH' ? '#A8C5A0' : '#9BB8D0') : 'rgba(255,255,255,0.3)',
                                }}>
                                {m}
                              </button>
                            ))}
                          </div>
                          <button
                            disabled={!monthExpItem.trim() || !monthExpPrice || !monthExpCategory || expenseLoading}
                            onClick={async () => {
                              setExpenseLoading(true)
                              const { data, error } = await supabase.from('expenses').insert({
                                tanggal: monthExpDate || todayKey(),
                                keterangan: monthExpItem.trim(),
                                kategori: monthExpCategory,
                                metode_bayar: monthExpMetode,
                                jumlah: parseInt(monthExpPrice, 10) || 0,
                              } as never).select('*').single()
                              if (error) { alert(`Gagal: ${error.message}`) }
                              else if (data) {
                                setMonthExp(prev => [data as Expense, ...prev])
                                // Also add to today's expenses if same day
                                if ((data as Expense).tanggal === todayKey()) setExpenses(prev => [data as Expense, ...prev])
                                setMonthExpItem(''); setMonthExpPrice(''); setMonthExpCategory(''); setMonthExpMetode('CASH')
                              }
                              setExpenseLoading(false)
                            }}
                            style={{
                              border: 'none', borderRadius: 10,
                              background: monthExpItem.trim() && monthExpPrice && monthExpCategory ? '#622128' : 'rgba(255,255,255,0.06)',
                              color: monthExpItem.trim() && monthExpPrice && monthExpCategory ? '#fff' : 'rgba(255,255,255,0.2)',
                              padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                              fontSize: 11, fontWeight: 600, flexShrink: 0,
                            }}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Expense list */}
                      <div style={{ overflow: 'auto', flex: 1, maxHeight: 280 }}>
                        {monthExp.length === 0 && <p style={{ padding: '24px 18px', fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No expenses this month</p>}
                        {monthExp.map(e => (
                          <div key={e.id} style={{ padding: '8px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 600 }}>{e.keterangan}</p>
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                                {e.tanggal} · {e.kategori}
                                <span style={{ marginLeft: 5, padding: '1px 5px', borderRadius: 3, fontSize: 9, fontWeight: 700, background: e.metode_bayar === 'QRIS' ? 'rgba(155,184,208,0.15)' : 'rgba(168,197,160,0.15)', color: e.metode_bayar === 'QRIS' ? '#9BB8D0' : '#A8C5A0' }}>{e.metode_bayar ?? 'CASH'}</span>
                              </p>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#E0B88A' }}>{fmtRp(e.jumlah)}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  {/* ── Crew Payroll ── */}
                  <Card>
                    <div style={{ padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <SectionHeader title="Crew Payroll" icon={<Users size={16} />} count={payrollRows.length} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#9BB8D0' }}>Total: {fmtRp(totalPayroll)}</span>
                      </div>

                      {/* Table header */}
                      <div className="gc-payroll-table-header" style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 1fr 1fr 1fr 1fr 1.2fr 0.4fr', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {['Crew', 'Shifts', 'Base', 'Late', 'Penalty', 'Bonus', 'Net Pay', ''].map(h => (
                          <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                        ))}
                      </div>

                      {/* Rows */}
                      {payrollRows.map(r => {
                        const mLabel = new Date(monthKey + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                        const handleDownload = async () => {
                          const el = payslipRef.current
                          if (!el) return
                          el.innerHTML = `
                            <div style="width:400px;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;color:#1C1C1E;">
                              <div style="text-align:center;margin-bottom:20px;">
                                <img src="/mera-logo-black.png" style="height:32px;margin-bottom:8px;" />
                                <h2 style="margin:0;font-size:16px;font-weight:700;">Slip Gaji</h2>
                                <p style="margin:4px 0 0;font-size:12px;color:#888;">${mLabel}</p>
                              </div>
                              <div style="border-top:2px solid #622128;padding-top:16px;">
                                <p style="margin:0 0 12px;font-size:14px;font-weight:700;">${r.crew.nama}${r.crew.status_gaji === 'INTERN' ? ' <span style="font-size:10px;color:#9BB8D0;background:rgba(155,184,208,0.15);padding:2px 8px;border-radius:10px;margin-left:8px;">INTERN</span>' : ''}</p>
                                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                                  <tr style="border-bottom:1px solid #eee;">
                                    <td style="padding:8px 0;color:#666;">Total Shift</td>
                                    <td style="padding:8px 0;text-align:right;font-weight:600;">${r.shifts} shift</td>
                                  </tr>
                                  <tr style="border-bottom:1px solid #eee;">
                                    <td style="padding:8px 0;color:#666;">Gaji Pokok</td>
                                    <td style="padding:8px 0;text-align:right;font-weight:600;">${fmtRp(r.totalBase)}</td>
                                  </tr>
                                  <tr style="border-bottom:1px solid #eee;">
                                    <td style="padding:8px 0;color:#666;">Keterlambatan</td>
                                    <td style="padding:8px 0;text-align:right;color:${r.totalLate > 0 ? '#B8860B' : '#aaa'};">${r.totalLate} menit</td>
                                  </tr>
                                  <tr style="border-bottom:1px solid #eee;">
                                    <td style="padding:8px 0;color:#666;">Potongan</td>
                                    <td style="padding:8px 0;text-align:right;color:${r.totalPenalty > 0 ? '#C00' : '#aaa'};">${r.totalPenalty > 0 ? '−' + fmtRp(r.totalPenalty) : '—'}</td>
                                  </tr>
                                  <tr style="border-bottom:1px solid #eee;">
                                    <td style="padding:8px 0;color:#666;">Bonus</td>
                                    <td style="padding:8px 0;text-align:right;color:${r.totalBonus > 0 ? '#2E7D32' : '#aaa'};">${r.totalBonus > 0 ? '+' + fmtRp(r.totalBonus) : '—'}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding:12px 0;font-weight:700;font-size:14px;">Total Diterima</td>
                                    <td style="padding:12px 0;text-align:right;font-weight:700;font-size:16px;color:#622128;">${fmtRp(r.net)}</td>
                                  </tr>
                                </table>
                              </div>
                              <div style="margin-top:20px;padding-top:12px;border-top:1px solid #eee;text-align:center;">
                                <p style="margin:0;font-size:10px;color:#aaa;">Dicetak oleh Méra OS · ${new Date().toLocaleDateString('id-ID')}</p>
                              </div>
                            </div>
                          `
                          const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 3, useCORS: true, logging: false })
                          const link = document.createElement('a')
                          link.download = `slip-gaji-${r.crew.nama.replace(/\s+/g, '-').toLowerCase()}-${monthKey}.png`
                          link.href = canvas.toDataURL('image/png')
                          link.click()
                          el.innerHTML = ''
                        }

                        return (
                          <div key={r.crew.id}>
                            {/* Desktop: table row */}
                            <div className="gc-payroll-row-desktop" style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 1fr 1fr 1fr 1fr 1.2fr 0.4fr', gap: 8, padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{r.crew.nama}</span>
                                {r.crew.status_gaji === 'INTERN' && (
                                  <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 10, background: 'rgba(155,184,208,0.15)', color: '#9BB8D0' }}>INTERN</span>
                                )}
                              </div>
                              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{r.shifts}</span>
                              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{fmtRp(r.totalBase)}</span>
                              <span style={{ fontSize: 12, color: r.totalLate > 0 ? '#E0B88A' : 'rgba(255,255,255,0.3)' }}>{r.totalLate}m</span>
                              <span style={{ fontSize: 12, color: r.totalPenalty > 0 ? '#C89696' : 'rgba(255,255,255,0.3)' }}>{r.totalPenalty > 0 ? `−${fmtRp(r.totalPenalty)}` : '—'}</span>
                              <span style={{ fontSize: 12, color: r.totalBonus > 0 ? '#A8C5A0' : 'rgba(255,255,255,0.3)' }}>{r.totalBonus > 0 ? `+${fmtRp(r.totalBonus)}` : '—'}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: r.crew.status_gaji === 'INTERN' ? 'rgba(255,255,255,0.25)' : '#fff' }}>{fmtRp(r.net)}</span>
                              <button onClick={handleDownload} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.3)' }} title="Download Slip Gaji">
                                <Download size={14} />
                              </button>
                            </div>

                            {/* Mobile: card layout */}
                            <div className="gc-payroll-card-mobile" style={{ padding: '12px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div>
                                  <span style={{ fontSize: 14, fontWeight: 700 }}>{r.crew.nama}</span>
                                  {r.crew.status_gaji === 'INTERN' && (
                                    <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 10, background: 'rgba(155,184,208,0.15)', color: '#9BB8D0' }}>INTERN</span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 15, fontWeight: 700, color: r.crew.status_gaji === 'INTERN' ? 'rgba(255,255,255,0.25)' : '#fff' }}>{fmtRp(r.net)}</span>
                                  <button onClick={handleDownload} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, cursor: 'pointer', padding: '6px 8px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center' }} title="Download Slip Gaji">
                                    <Download size={13} />
                                  </button>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: 6 }}>{r.shifts} shift</span>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: 6 }}>Base {fmtRp(r.totalBase)}</span>
                                {r.totalLate > 0 && <span style={{ fontSize: 11, color: '#E0B88A', background: 'rgba(224,184,138,0.08)', padding: '3px 8px', borderRadius: 6 }}>{r.totalLate}m late</span>}
                                {r.totalPenalty > 0 && <span style={{ fontSize: 11, color: '#C89696', background: 'rgba(200,150,150,0.08)', padding: '3px 8px', borderRadius: 6 }}>−{fmtRp(r.totalPenalty)}</span>}
                                {r.totalBonus > 0 && <span style={{ fontSize: 11, color: '#A8C5A0', background: 'rgba(168,197,160,0.08)', padding: '3px 8px', borderRadius: 6 }}>+{fmtRp(r.totalBonus)}</span>}
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {payrollRows.length === 0 && <p style={{ padding: '16px 0', fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No attendance records this month</p>}

                      {/* Payroll formula legend */}
                      <div style={{ marginTop: 12, padding: '10px 0', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', lineHeight: 1.8 }}>
                          Net Pay = Base Rate − Penalty + Bonus &nbsp;|&nbsp; Penalty = ⌊late_min / 10⌋ × Rp 5.000 &nbsp;|&nbsp; INTERN: Rp 0 (no penalty, no bonus)
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )
            })()}
          </>
        )}
      </main>

      {/* Hidden payslip render target */}
      <div ref={payslipRef} style={{ position: 'fixed', left: -9999, top: -9999 }} />

      {/* ═══════════════════════════════════════════════════ */}
      {/* PAYMENT METHOD PICKER MODAL                         */}
      {/* ═══════════════════════════════════════════════════ */}
      {showPayModal && payTx && (() => {
        const payReg = registrations.find(r => r.id === payTx.registration_id) ?? null
        // Build merged addons: booking add-ons + any add-ons added during session
        const sessionAddonsArr: string[] = [];
        Object.entries(sessionAddons).forEach(([idStr, qty]) => {
          const prod = products.find(p => p.id === Number(idStr) && p.is_addon)
          if (prod) {
            for (let i = 0; i < qty; i++) sessionAddonsArr.push(prod.nama)
          }
        })
        const bookingSelected = (payReg?.addons as BookingAddons | null)?.selected_addons ?? []
        const mergedAddons: BookingAddons = {
          ...(payReg?.addons as BookingAddons | null),
          selected_addons: [...bookingSelected, ...sessionAddonsArr],
        }
        const allItems = calcBookingLineItems(products, mergedAddons)
        const subtotal = allItems.reduce((s, i) => s + i.price, 0)
        const discountAmt = Math.max(0, Math.min(subtotal, parseInt(discountInput || '0', 10) || 0))
        const grandTotal = subtotal - discountAmt
        // For split: base paid via ONLINE_QRIS, remaining paid via addonPaymentPick
        const isOnlineQris = payReg?.booking_type === 'ONLINE_QRIS'
        const baseLineItems = calcBookingLineItems(products, payReg?.addons as BookingAddons | null)
        const baseTotal = baseLineItems.reduce((s, i) => s + i.price, 0)
        const addonTotal = subtotal - baseTotal
        const hasSplit = isOnlineQris && addonTotal > 0
        const remainingToPay = hasSplit ? Math.max(0, grandTotal - baseTotal) : grandTotal
        const canPay = hasSplit
          ? (addonPaymentPick !== null || remainingToPay === 0)
          : paymentMethodPick !== null

        return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16 }}>
          <div style={{ width: 'min(420px, 100%)', maxHeight: '90vh', overflow: 'auto', borderRadius: 24, background: '#1C1C1E', border: '1px solid rgba(139,26,26,0.2)', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '20px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>Payment</h3>
              <button onClick={() => { setShowPayModal(false); setPayTx(null); setSessionAddons({}); setAddonPaymentPick(null) }} style={{ border: 'none', background: 'rgba(255,255,255,0.06)', borderRadius: 20, width: 30, height: 30, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>

            {/* Customer info */}
            {payReg && (
              <div style={{ padding: '12px 22px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{payReg.customer_name}</span>
                  {payReg.instagram_handle && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>@{payReg.instagram_handle.replace('@', '')}</span>}
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  {payTx.session_id} · <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{(payReg.addons as BookingAddons | null)?.room ?? toStudioBucket(payReg)}</span>
                  {(payReg.addons as BookingAddons | null)?.pax ? <span> · {(payReg.addons as BookingAddons | null)?.pax} pax</span> : null}
                </p>
                <div style={{ marginTop: 6 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
                    padding: '3px 10px', borderRadius: 20,
                    background: payReg.booking_type === 'ONLINE_QRIS' ? 'rgba(155,184,208,0.15)' : 'rgba(224,184,138,0.15)',
                    color: payReg.booking_type === 'ONLINE_QRIS' ? '#9BB8D0' : '#E0B88A',
                    border: `1px solid ${payReg.booking_type === 'ONLINE_QRIS' ? 'rgba(155,184,208,0.3)' : 'rgba(224,184,138,0.3)'}`,
                  }}>
                    {payReg.booking_type === 'ONLINE_QRIS' ? '💳 Booking via Online QRIS' : '📌 Booking via Keep Slot'}
                  </span>
                </div>
              </div>
            )}

            {/* Product breakdown */}
            <div style={{ padding: '16px 22px 0' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Products</p>
              {allItems.length === 0 ? (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', padding: '8px 0' }}>No products linked — price will be manual</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {allItems.map((item, i) => (
                    <div key={`item-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: item.label.toLowerCase().includes('cetak') || item.label.toLowerCase().includes('print') ? '#E0B88A' : 'rgba(255,255,255,0.7)' }}>{item.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtRp(item.price)}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Subtotal */}
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Subtotal</span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{fmtRp(subtotal)}</span>
              </div>
              {/* Pre-paid line for split */}
              {hasSplit && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: '#A8C5A0' }}>✅ Pre-paid via Online QRIS</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#A8C5A0' }}>−{fmtRp(baseTotal)}</span>
                </div>
              )}
            </div>

            {/* Session Add-Ons */}

            {/* Discount */}
            <div style={{ padding: '12px 22px 0' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Discount</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  placeholder="0"
                  value={discountInput}
                  onChange={e => setDiscountInput(e.target.value)}
                  style={{ flex: '0 0 110px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#fff', padding: '8px 10px', fontSize: 13, outline: 'none' }}
                />
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  value={discountReasonInput}
                  onChange={e => setDiscountReasonInput(e.target.value)}
                  style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#fff', padding: '8px 10px', fontSize: 13, outline: 'none' }}
                />
              </div>
              {discountAmt > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 13, color: '#C89696' }}>Discount</span>
                  <span style={{ fontSize: 13, color: '#C89696', fontWeight: 600 }}>−{fmtRp(discountAmt)}</span>
                </div>
              )}
            </div>

            {/* Payment method — split vs normal */}
            {hasSplit ? (
              <div style={{ padding: '12px 22px 0' }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Add-on payment method</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {(['CASH', 'QRIS', 'TRANSFER'] as PaymentMethod[]).map((m) => {
                    const labels: Record<string, string> = { CASH: '💵 Cash', QRIS: '📱 QRIS', TRANSFER: '🏦 Transfer' }
                    const selected = addonPaymentPick === m
                    return (
                      <button
                        key={m}
                        onClick={() => {
                          setAddonPaymentPick(m)
                          if (m !== 'CASH') setCashReceivedInput('')
                        }}
                        style={{
                          border: `1.5px solid ${selected ? '#E0B88A' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: 14,
                          background: selected ? 'rgba(224,184,138,0.12)' : 'rgba(255,255,255,0.04)',
                          color: '#fff',
                          padding: '14px 12px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {labels[m]}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ padding: '12px 22px 0' }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Payment method</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(['CASH', 'QRIS', 'TRANSFER', 'ONLINE_QRIS'] as PaymentMethod[]).map((m) => {
                    const labels: Record<PaymentMethod, string> = { CASH: '💵 Cash', QRIS: '📱 QRIS', TRANSFER: '🏦 Transfer', ONLINE_QRIS: '🌐 Online QRIS' }
                    const selected = paymentMethodPick === m
                    return (
                      <button
                        key={m}
                        onClick={() => {
                          setPaymentMethodPick(m)
                          if (m !== 'CASH') setCashReceivedInput('')
                        }}
                        style={{
                          border: `1.5px solid ${selected ? '#622128' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: 14,
                          background: selected ? 'rgba(139,26,26,0.15)' : 'rgba(255,255,255,0.04)',
                          color: '#fff',
                          padding: '14px 12px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {labels[m]}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Cash Received & Change Calculation */}
            {((hasSplit && addonPaymentPick === 'CASH') || (!hasSplit && paymentMethodPick === 'CASH')) && (
              <div style={{ padding: '12px 22px 0' }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Uang Diterima & Kembalian</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    type="number"
                    placeholder="Nominal Cash Diterima (Rp)"
                    value={cashReceivedInput}
                    onChange={e => setCashReceivedInput(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(224,184,138,0.3)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 14, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[remainingToPay, 50000, 100000, 150000, 200000].filter((val, idx, self) => val > 0 && self.indexOf(val) === idx).map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCashReceivedInput(String(val))}
                        style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, background: cashReceivedInput === String(val) ? '#E0B88A' : 'rgba(255,255,255,0.06)', color: cashReceivedInput === String(val) ? '#000' : '#fff', cursor: 'pointer' }}
                      >
                        {val === remainingToPay ? 'Pas' : fmtRp(val)}
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const received = parseInt(cashReceivedInput, 10) || 0
                    if (received >= remainingToPay && remainingToPay > 0) {
                      const change = received - remainingToPay
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(168,197,160,0.15)', border: '1px solid rgba(168,197,160,0.3)', borderRadius: 10, padding: '8px 12px', marginTop: 2 }}>
                          <span style={{ fontSize: 13, color: '#A8C5A0', fontWeight: 600 }}>💵 Kembalian:</span>
                          <span style={{ fontSize: 16, color: '#A8C5A0', fontWeight: 800 }}>{fmtRp(change)}</span>
                        </div>
                      )
                    } else if (received > 0 && received < remainingToPay) {
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(200,150,150,0.15)', border: '1px solid rgba(200,150,150,0.3)', borderRadius: 10, padding: '8px 12px', marginTop: 2 }}>
                          <span style={{ fontSize: 12, color: '#C89696', fontWeight: 600 }}>⚠️ Kurang:</span>
                          <span style={{ fontSize: 13, color: '#C89696', fontWeight: 800 }}>{fmtRp(remainingToPay - received)}</span>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              </div>
            )}

            {/* Grand total */}
            <div style={{ padding: '14px 22px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '0.5px solid rgba(255,255,255,0.06)', marginTop: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Total</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#A8C5A0' }}>{fmtRp(grandTotal)}</span>
            </div>

            {/* Remaining to pay (split) */}
            {hasSplit && (
              <div style={{ padding: '0 22px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#E0B88A' }}>Remaining to pay</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#E0B88A' }}>{fmtRp(remainingToPay)}</span>
              </div>
            )}

            <div style={{ padding: '0 22px 22px' }}>
              <button
                onClick={() => {
                  const recVal = parseInt(cashReceivedInput, 10) || 0
                  const changeVal = Math.max(0, recVal - remainingToPay)
                  if (hasSplit) {
                    markTxPaid(payTx, 'ONLINE_QRIS', grandTotal, discountAmt, discountReasonInput, {
                      baseAmount: baseTotal,
                      baseMethod: 'ONLINE_QRIS',
                      addonAmount: remainingToPay,
                      addonMethod: addonPaymentPick ?? 'CASH',
                      cashReceived: recVal > 0 ? recVal : undefined,
                      changeAmt: recVal > 0 ? changeVal : undefined,
                    }, mergedAddons)
                  } else if (paymentMethodPick) {
                    markTxPaid(payTx, paymentMethodPick, grandTotal, discountAmt, discountReasonInput, {
                      baseAmount: grandTotal,
                      baseMethod: paymentMethodPick,
                      addonAmount: 0,
                      addonMethod: paymentMethodPick,
                      cashReceived: recVal > 0 ? recVal : undefined,
                      changeAmt: recVal > 0 ? changeVal : undefined,
                    }, mergedAddons)
                  }
                }}
                disabled={!canPay || actionLoading}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: 14,
                  background: canPay ? '#622128' : 'rgba(255,255,255,0.06)',
                  color: canPay ? '#fff' : 'rgba(255,255,255,0.2)',
                  padding: '14px',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: canPay ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                }}
              >
                {actionLoading ? 'Processing...' : hasSplit
                  ? (remainingToPay > 0 ? `Pay Add-ons ${fmtRp(remainingToPay)}` : `Confirm ${fmtRp(grandTotal)}`)
                  : `Pay ${fmtRp(grandTotal)}`
                }
              </button>
            </div>
          </div>
        </div>
        )
      })()}

      {/* ═══════════════════════════════════════════════════ */}
      {/* RECEIPT + INSTAGRAM DM MODAL                        */}
      {/* ═══════════════════════════════════════════════════ */}
      {showReceiptModal && receiptTx && (() => {
        const reg = receiptReg
        const tx = receiptTx
        const igHandle = reg?.instagram_handle?.replace('@', '') ?? ''
        const igDmUrl = igHandle ? `https://ig.me/m/${igHandle}` : ''
        const receiptLineItems = calcLineItems(reg)
        const receiptSubtotal = receiptLineItems.reduce((s, i) => s + i.price, 0)
        const splitParsed = parseSplitNote(tx.discount_reason)
        const cashNote = parsePaymentCashNote(tx.discount_reason)
        const splitNote = splitParsed
          ? `${splitParsed.baseMethod} ${fmtRp(splitParsed.baseAmount)} + ${splitParsed.addonMethod} ${fmtRp(splitParsed.addonAmount)}`
          : null

        const downloadReceiptPng = async () => {
          if (!receiptRef.current) return
          const canvas = await html2canvas(receiptRef.current, {
            backgroundColor: '#ffffff',
            scale: 3,
            useCORS: true,
            logging: false,
          })
          const link = document.createElement('a')
          link.download = `receipt-${tx.session_id}.png`
          link.href = canvas.toDataURL('image/png')
          link.click()
        }

        const handleCopyAndOpen = async () => {
          await copyToClipboard(editableDmMessage)
          setDmCopied(true)
          setTimeout(() => setDmCopied(false), 3000)
          if (igDmUrl) {
            setTimeout(() => window.open(igDmUrl, '_blank'), 300)
          }
        }

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16 }}>
            <div style={{ width: 'min(420px, 100%)', maxHeight: '90vh', overflow: 'auto', borderRadius: 24, background: '#1C1C1E', border: '1px solid rgba(139,26,26,0.2)', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>

              {/* Compact header */}
              <div style={{ padding: '20px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(168,197,160,0.15)', display: 'grid', placeItems: 'center' }}>
                    <CheckCircle2 size={18} style={{ color: '#A8C5A0' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 700 }}>Payment Complete</h3>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{tx.session_id}</p>
                  </div>
                </div>
                <button onClick={() => setShowReceiptModal(false)} style={{ border: 'none', background: 'rgba(255,255,255,0.06)', borderRadius: 20, width: 30, height: 30, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              </div>

              {/* Compact summary strip */}
              <div style={{ padding: '14px 22px 0' }}>
                <div style={{ background: 'rgba(168,197,160,0.08)', border: '1px solid rgba(168,197,160,0.15)', borderRadius: 14, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{reg?.customer_name ?? '—'}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
                      {igHandle ? `@${igHandle}` : 'No IG'} · {reg ? toStudioBucket(reg) : '—'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#A8C5A0', margin: 0 }}>{fmtRp(tx.total_amount - tx.discount_amount)}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 2 }}>
                      {tx.discount_amount > 0 && <span style={{ fontSize: 10, color: '#C89696' }}>−{fmtRp(tx.discount_amount)} disc.</span>}
                      <StatusPill label={tx.payment_method ?? 'PAID'} color="#A8C5A0" />
                    </div>
                  </div>
                </div>
                {splitNote && (
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 6, textAlign: 'center' }}>Split: {splitNote}</p>
                )}
              </div>

              {/* Line items breakdown */}
              {receiptLineItems.length > 0 && (
                <div style={{ padding: '10px 22px 0' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Rincian Item</p>
                  <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '10px 14px', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                    {receiptLineItems.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < receiptLineItems.length - 1 ? 5 : 0 }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{item.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{fmtRp(item.price)}</span>
                      </div>
                    ))}
                    {receiptLineItems.length > 1 && (
                      <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Subtotal</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{fmtRp(receiptSubtotal)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Edit Transaksi ── */}
              <div style={{ padding: '12px 22px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Edit Transaksi</p>
                  {txEditSaveState === 'saving' && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>Menyimpan…</span>}
                  {txEditSaveState === 'saved'  && <span style={{ fontSize: 10, color: '#A8C5A0', letterSpacing: '0.04em' }}>✓ Tersimpan</span>}
                  {txEditSaveState === 'error'  && <span style={{ fontSize: 10, color: '#C89696', letterSpacing: '0.04em' }}>✕ Gagal simpan</span>}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: '14px 16px', border: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Payment method */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Metode Bayar</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(['CASH', 'TRANSFER', 'QRIS', 'ONLINE_QRIS'] as PaymentMethod[]).map(m => {
                        const labels: Record<PaymentMethod, string> = { CASH: '💵 Cash', TRANSFER: '🏦 Transfer', QRIS: '📱 QRIS', ONLINE_QRIS: '🌐 Online QRIS' }
                        const active = txEditMethod === m
                        return (
                          <button key={m}
                            onClick={() => {
                              setTxEditMethod(m)
                              saveTxEdit(tx.id, { payment_method: m })
                            }}
                            style={{
                              border: `1px solid ${active ? 'rgba(168,197,160,0.5)' : 'rgba(255,255,255,0.1)'}`,
                              borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              background: active ? 'rgba(168,197,160,0.15)' : 'rgba(255,255,255,0.04)',
                              color: active ? '#A8C5A0' : 'rgba(255,255,255,0.4)',
                              transition: 'all 0.15s',
                            }}
                          >{labels[m]}</button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Discount */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Diskon (Rp)</p>
                    <input
                      type="number"
                      placeholder="0"
                      value={txEditDiscount}
                      onChange={e => {
                        const val = e.target.value
                        setTxEditDiscount(val)
                        const amt = parseInt(val, 10) || 0
                        if (amt === 0) {
                          saveTxEdit(tx.id, { discount_amount: 0, discount_reason: null }, 400)
                        } else if (txEditDiscountReason.trim()) {
                          saveTxEdit(tx.id, { discount_amount: amt, discount_reason: txEditDiscountReason.trim() }, 400)
                        }
                      }}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Discount reason — wajib jika diskon > 0 (Rule 8) */}
                  {(parseInt(txEditDiscount, 10) || 0) > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                        Alasan Diskon <span style={{ color: '#C89696' }}>*wajib</span>
                      </p>
                      <input
                        type="text"
                        placeholder="Misal: Pelanggan setia / promo"
                        value={txEditDiscountReason}
                        onChange={e => {
                          const reason = e.target.value
                          setTxEditDiscountReason(reason)
                          const amt = parseInt(txEditDiscount, 10) || 0
                          if (reason.trim() && amt > 0) {
                            saveTxEdit(tx.id, { discount_amount: amt, discount_reason: reason.trim() }, 400)
                          }
                        }}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: `1px solid ${txEditDiscountReason.trim() ? 'rgba(255,255,255,0.1)' : 'rgba(200,150,150,0.4)'}`, background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                      />
                      {!txEditDiscountReason.trim() && (
                        <p style={{ fontSize: 10, color: '#C89696', marginTop: 4 }}>Isi alasan diskon untuk menyimpan</p>
                      )}
                    </div>
                  )}

                  {/* Add-ons — edit selected_addons di registrasi terkait */}
                  {products.filter(p => p.is_addon && p.is_active).length > 0 && reg && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Add-ons</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {products.filter(p => p.is_addon && p.is_active).map(addon => {
                          const qty = txEditAddons[addon.nama] || 0
                          return (
                            <div key={addon.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '6px 12px', border: `1px solid ${qty > 0 ? '#A8C5A0' : 'rgba(255,255,255,0.1)'}` }}>
                              <span style={{ flex: 1, fontSize: 13, color: qty > 0 ? '#A8C5A0' : 'rgba(255,255,255,0.5)', fontWeight: qty > 0 ? 600 : 400 }}>{addon.nama}</span>
                              <button
                                disabled={qty <= 0}
                                onClick={() => {
                                  const next = { ...txEditAddons, [addon.nama]: Math.max(0, qty - 1) }
                                  setTxEditAddons(next)
                                  saveTxRegAddons(reg.id, next, reg.addons as BookingAddons | null)
                                }}
                                style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: qty > 0 ? 'pointer' : 'not-allowed', opacity: qty > 0 ? 1 : 0.3 }}
                              >−</button>
                              <span style={{ minWidth: 22, textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>{qty}</span>
                              <button
                                disabled={qty >= 10}
                                onClick={() => {
                                  const next = { ...txEditAddons, [addon.nama]: qty + 1 }
                                  setTxEditAddons(next)
                                  saveTxRegAddons(reg.id, next, reg.addons as BookingAddons | null)
                                }}
                                style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: qty < 10 ? 'pointer' : 'not-allowed', opacity: qty < 10 ? 1 : 0.3 }}
                              >+</button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Primary action: 1-tap DM flow ── */}
              <div style={{ padding: '16px 22px 0' }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Quick Actions</p>

                {/* Big combo button: Copy DM + Open IG */}
                {igHandle ? (
                  <button
                    onClick={handleCopyAndOpen}
                    style={{
                      width: '100%', border: 'none', borderRadius: 14,
                      background: '#622128', color: '#fff', padding: '16px 14px',
                      fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {dmCopied
                      ? <><CheckCircle2 size={16} /> Copied! Opening @{igHandle}...</>
                      : <><Send size={16} /> Copy DM & Open @{igHandle}</>
                    }
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      await copyToClipboard(editableDmMessage)
                      setDmCopied(true)
                      setTimeout(() => setDmCopied(false), 3000)
                    }}
                    style={{
                      width: '100%', border: 'none', borderRadius: 14,
                      background: '#622128', color: '#fff', padding: '16px 14px',
                      fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {dmCopied ? <><CheckCircle2 size={16} /> DM Copied!</> : <><Copy size={16} /> Copy DM Message</>}
                  </button>
                )}

                {/* Secondary row: Receipt PNG + Photo Link */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <button
                    onClick={downloadReceiptPng}
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)',
                      padding: '12px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <Download size={14} /> Receipt PNG
                  </button>
                  <button
                    onClick={async () => {
                      await copyToClipboard(`https://drive.google.com/drive/folders/${tx.session_id}`)
                      setSessionIdCopied(true)
                      setTimeout(() => setSessionIdCopied(false), 2000)
                    }}
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)',
                      padding: '12px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <Copy size={14} /> {sessionIdCopied ? 'Copied!' : 'Photo Link'}
                  </button>
                </div>
              </div>

              {/* ── Always-visible DM editor ── */}
              <div style={{ padding: '16px 22px 20px' }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <MessageCircle size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                  Edit DM Template
                </span>
                <textarea
                  value={editableDmMessage}
                  onChange={e => setEditableDmMessage(e.target.value)}
                  style={{
                    width: '100%', minHeight: 180,
                    background: 'rgba(255,255,255,0.03)',
                    border: '0.5px solid rgba(255,255,255,0.06)',
                    borderRadius: 12, padding: '12px 14px',
                    fontFamily: 'var(--mera-font)', fontSize: 12, lineHeight: 1.6,
                    color: 'rgba(255,255,255,0.6)', resize: 'vertical', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={() => setEditableDmMessage(buildDmMessage(tx, reg))}
                  style={{ border: 'none', background: 'rgba(255,255,255,0.06)', borderRadius: 8, color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600, padding: '4px 10px', cursor: 'pointer', marginTop: 6 }}
                >
                  Reset to default
                </button>
              </div>

              {/* Hidden thermal receipt for PNG export */}
              <div style={{ position: 'absolute', left: -9999, top: 0, zIndex: -1 }}>
                <div
                  ref={receiptRef}
                  style={{
                    width: 320, padding: '24px 20px',
                    background: '#ffffff',
                    fontFamily: "'Courier New', Courier, monospace",
                    color: '#1a1a1a',
                  }}
                >
                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <img src="/mera-logo-black.png" alt="Méra" style={{ height: 36 }} crossOrigin="anonymous" />
                  </div>
                  <div style={{ textAlign: 'center', marginBottom: 4 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, margin: 0 }}>MÉRA SELFSTUDIO</p>
                  </div>
                  <p style={{ textAlign: 'center', fontSize: 10, color: '#999', margin: '8px 0', letterSpacing: 2 }}>━━━━━━━━━━━━━━━━━━━━</p>
                  <div style={{ fontSize: 10, lineHeight: 1.8, marginBottom: 4 }}>
                    <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}><span>Session</span><span style={{ fontWeight: 700 }}>{tx.session_id}</span></p>
                    <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}><span>Date</span><span>{reg?.preferred_date ?? todayKey()}</span></p>
                    <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}><span>Time</span><span>{reg?.preferred_time ?? '—'}</span></p>
                    <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}><span>Studio</span><span>{reg ? toStudioBucket(reg) : '—'}</span></p>
                    <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}><span>Customer</span><span style={{ fontWeight: 700 }}>{reg?.customer_name ?? '—'}</span></p>
                    {igHandle && <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}><span>Instagram</span><span>@{igHandle}</span></p>}
                  </div>
                  <p style={{ textAlign: 'center', fontSize: 10, color: '#999', margin: '8px 0', letterSpacing: 2 }}>━━━━━━━━━━━━━━━━━━━━</p>
                  <div style={{ fontSize: 10, lineHeight: 2, marginBottom: 4 }}>
                    {receiptLineItems.map((item, i) => (
                      <p key={i} style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{item.label}</span>
                        <span>{fmtRp(item.price)}</span>
                      </p>
                    ))}
                  </div>
                  <p style={{ textAlign: 'center', fontSize: 10, color: '#999', margin: '6px 0', letterSpacing: 2 }}>- - - - - - - - - - - - - - - -</p>
                  <div style={{ fontSize: 10, lineHeight: 2 }}>
                    {receiptLineItems.length > 1 && (
                      <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{fmtRp(receiptSubtotal)}</span></p>
                    )}
                    {tx.discount_amount > 0 && (
                      <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between', color: '#c0392b' }}><span>Discount</span><span>−{fmtRp(tx.discount_amount)}</span></p>
                    )}
                  </div>
                  <p style={{ textAlign: 'center', fontSize: 10, color: '#999', margin: '6px 0', letterSpacing: 2 }}>━━━━━━━━━━━━━━━━━━━━</p>
                  <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}><span>TOTAL</span><span>{fmtRp(tx.total_amount - tx.discount_amount)}</span></p>
                  <p style={{ textAlign: 'center', fontSize: 10, color: '#999', margin: '6px 0', letterSpacing: 2 }}>━━━━━━━━━━━━━━━━━━━━</p>

                  <div style={{ fontSize: 10, lineHeight: 1.8, marginBottom: 4 }}>
                    <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Booking Type</span>
                      <span style={{ fontWeight: 700 }}>{reg?.booking_type === 'ONLINE_QRIS' ? 'Online QRIS' : 'Keep Slot (Bayar Studio)'}</span>
                    </p>
                    {reg?.booking_type === 'ONLINE_QRIS' && (
                      <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Online Pre-paid</span>
                        <span>{fmtRp(splitParsed ? splitParsed.baseAmount : (tx.total_amount - tx.discount_amount))}</span>
                      </p>
                    )}
                    <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Studio Settlement</span>
                      <span style={{ fontWeight: 700 }}>
                        {splitParsed ? `${splitParsed.addonMethod} (${fmtRp(splitParsed.addonAmount)})` : `${tx.payment_method ?? 'CASH'}`}
                      </span>
                    </p>
                    {cashNote?.cashReceived !== undefined && (
                      <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Cash Received</span>
                        <span>{fmtRp(cashNote.cashReceived)}</span>
                      </p>
                    )}
                    {cashNote?.changeAmt !== undefined && cashNote.changeAmt > 0 && (
                      <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>Change</span>
                        <span>{fmtRp(cashNote.changeAmt)}</span>
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, margin: '0 0 4px' }}>Terima kasih! 🙏</p>
                    <p style={{ fontSize: 9, color: '#888', margin: 0 }}>Follow us @meraselfstudio</p>
                    <p style={{ fontSize: 8, color: '#bbb', margin: '8px 0 0' }}>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} · {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {role === 'crew' && (!isDashboardUnlocked || showCrewAttendanceOverlay) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', zIndex: 999, display: 'grid', placeItems: 'center', padding: 16 }}>
          <div style={{ width: 'min(920px, 100%)', maxHeight: '90vh', overflow: 'auto', border: '1px solid var(--mera-border)', borderRadius: 20, background: 'var(--mera-surface)', boxShadow: 'var(--mera-shadow-xl)' }}>
            <div style={{ padding: 14, borderBottom: '1px solid var(--mera-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--mera-text-secondary)' }}>{isDashboardUnlocked ? 'Attendance Board' : 'Clock in to access dashboard'}</p>
              <button
                onClick={isDashboardUnlocked ? () => setShowCrewAttendanceOverlay(false) : handleLogout}
                style={{ border: '1px solid var(--mera-border-strong)', borderRadius: 10, background: 'var(--mera-surface-raised)', color: 'var(--mera-text-secondary)', fontWeight: 600, fontSize: 12, padding: '8px 14px' }}
              >
                {isDashboardUnlocked ? 'Close' : 'Back'}
              </button>
            </div>

            <div style={{ padding: 14 }}>
              <AttendanceBoard onLogout={handleLogout} onClockIn={(crewId) => { 
                  setActiveCrewId(crewId); 
                  localStorage.setItem('mera_pos_crew_id', crewId);
                  setAttendance(prev => {
                    if (prev.some(a => a.crew_id === crewId && a.status === 'ACTIVE')) return prev;
                    return [...prev, { crew_id: crewId, status: 'ACTIVE' } as any];
                  });
                  setShowCrewAttendanceOverlay(false) 
              }} />
            </div>
          </div>
        </div>
      )}

      {/* ─── Booking Detail Drawer ──────────────────────────── */}
      {detailReg && (() => {
        const reg = detailReg
        const linkedTx = transactions.find(t => t.registration_id === reg.id || t.session_id === reg.session_id) ?? null
        const isPaid = linkedTx?.status === 'PAID'
        const isEditable = !['COMPLETED', 'EXPIRED'].includes(reg.status)

        // Collect in-session add-ons for price preview
        const drawerSessionArr: string[] = []
        Object.entries(sessionAddons).forEach(([idStr, qty]) => {
          const prod = products.find(p => p.id === Number(idStr) && p.is_addon)
          if (prod) for (let i = 0; i < qty; i++) drawerSessionArr.push(prod.nama)
        })
        const previewAddons: BookingAddons = {
          ...(reg.addons as BookingAddons | null),
          product_id: editPackageId,
          // Convert editAddons to string[] for preview, merged with session add-ons
          selected_addons: (() => {
            const arr: string[] = [];
            Object.entries(editAddons).forEach(([name, qty]) => {
              for (let i = 0; i < qty; i++) arr.push(name)
            })
            return [...arr, ...drawerSessionArr]
          })(),
          pax: editPax,
        }
        const previewItems = calcBookingLineItems(products, previewAddons)
        const previewTotal = previewItems.reduce((s, i) => s + i.price, 0)

        const statusMap: Record<string, { color: string; label: string }> = {
          PENDING: { color: '#E0B88A', label: 'Pending' },
          VERIFIED: { color: '#9BB8D0', label: 'Verified' },
          PROCESSED: { color: '#A8C5A0', label: 'In Studio' },
          COMPLETED: { color: '#7FC29B', label: 'Completed' },
          EXPIRED: { color: '#C89696', label: 'Expired' },
        }

        const WEEKDAY_SLOTS = ['12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00']
        const WEEKEND_SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00']
        const slotDate = editDateInput ? new Date(editDateInput + 'T00:00:00') : new Date()
        const slotDay = slotDate.getDay()
        const timeSlots = (slotDay === 0 || slotDay === 5 || slotDay === 6) ? WEEKEND_SLOTS : WEEKDAY_SLOTS

        const inputSt: React.CSSProperties = { width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
        const labelSt: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 7 }
        const fieldSt: React.CSSProperties = { marginBottom: 16 }

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'stretch' }}>
            {/* Backdrop */}
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }} onClick={() => setDetailReg(null)} />
            {/* Drawer panel */}
            <div style={{ width: 420, background: '#1C1C1E', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '-16px 0 48px rgba(0,0,0,0.4)' }}>
              {/* Header */}
              <div style={{ padding: '18px 22px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.01em' }}>{reg.customer_name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {reg.instagram_handle && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>@{reg.instagram_handle.replace('@', '')}</span>}
                      <StatusPill label={statusMap[reg.status]?.label ?? reg.status} color={statusMap[reg.status]?.color ?? '#aaa'} />
                      {reg.booking_type === 'ONLINE_QRIS' && <StatusPill label="💳 QRIS" color="#9BB8D0" />}
                      {reg.booking_type === 'ONLINE_KEEPSLOT' && <StatusPill label="📌 Keep Slot" color="#E0B88A" />}
                    </div>
                  </div>
                  <button onClick={() => setDetailReg(null)} style={{ border: 'none', background: 'rgba(255,255,255,0.06)', borderRadius: 20, width: 30, height: 30, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', flexShrink: 0 }}>
                    <X size={14} />
                  </button>
                </div>
                {reg.session_id && (
                  <button
                    onClick={() => { void copyToClipboard(reg.session_id!); setSessionIdCopied(true); setTimeout(() => setSessionIdCopied(false), 2000) }}
                    style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.06)', padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', letterSpacing: '0.03em' }}
                  >
                    <Copy size={10} />{sessionIdCopied ? 'Copied!' : reg.session_id}
                  </button>
                )}
              </div>

                              {/* Booking details summary */}
                <div style={{ marginBottom: 18, marginTop: 8, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 12, color: '#A8C5A0', fontWeight: 700, marginBottom: 4 }}>Booking Details</div>
                  <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.7 }}>
                    <div>Package: <b>{products.find(p => p.id === editPackageId)?.nama || '-'}</b></div>
                    <div>Studio: <b>{previewAddons.room || '-'}</b></div>
                    <div>Payment Type: <b style={{ color: reg.booking_type === 'ONLINE_QRIS' ? '#9BB8D0' : '#E0B88A' }}>{reg.booking_type === 'ONLINE_QRIS' ? '💳 Online QRIS' : '📌 Keep Slot'}</b></div>
                    {/* Background is not a property of BookingAddons; show dash or add logic if needed */}
                    <div>Background: <b>-</b></div>
                    <div>Pax: <b>{editPax}</b></div>
                    <div>Add-ons: <b>{Object.entries(editAddons).filter(([_, v]) => v > 0).map(([k, v]) => `${k} (${v})`).join(', ') || '-'}</b></div>
                    {/* Debug: show selected_addons array for pricing logic */}
                    <div style={{ color: '#000000', fontSize: 11, marginTop: 4 }}>
                      <span>selected_addons: [
                        {(() => {
                          const arr: string[] = [];
                          Object.entries(editAddons).forEach(([name, qty]) => {
                            for (let i = 0; i < qty; i++) arr.push(name)
                          })
                          return arr.map(a => `'${a}'`).join(', ')
                        })()}
                      ]
                    </span>
                    </div>
                  </div>
                </div>

              {/* Scrollable edit fields */}
              <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px' }}>
                <div style={fieldSt}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                    <label style={{ ...labelSt, marginBottom: 0 }}>Date</label>
                    {dateSaveState === 'saving' && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>Menyimpan…</span>}
                    {dateSaveState === 'saved'  && <span style={{ fontSize: 10, color: '#A8C5A0', letterSpacing: '0.04em' }}>✓ Tersimpan</span>}
                    {dateSaveState === 'error'  && <span style={{ fontSize: 10, color: '#C89696', letterSpacing: '0.04em' }}>✕ Gagal simpan</span>}
                  </div>
                  <input
                    type="date"
                    value={editDateInput}
                    disabled={!isEditable || dateSaveState === 'saving'}
                    style={{ ...inputSt, opacity: isEditable ? 1 : 0.5 }}
                    onChange={async (e) => {
                      const newDate = e.target.value
                      setEditDateInput(newDate)
                      if (!newDate || !detailReg || !isEditable) return

                      // Conflict check with current time slot
                      if (editTimeInput) {
                        const studioKey = toStudioBucket(detailReg)
                        const conflict = registrations.find(r =>
                          r.id !== detailReg.id &&
                          r.preferred_date === newDate &&
                          r.preferred_time === editTimeInput &&
                          toStudioBucket(r) === studioKey &&
                          ['PENDING', 'VERIFIED', 'PROCESSED'].includes(r.status)
                        )
                        if (conflict) {
                          const proceed = window.confirm(
                            `⚠️ Konflik Jadwal!\n\n${conflict.customer_name} sudah booking tanggal ${newDate} jam ${editTimeInput} di studio yang sama.\n\nTetap simpan?`
                          )
                          if (!proceed) {
                            setEditDateInput(detailReg.preferred_date || '')
                            return
                          }
                        }
                      }

                      setDateSaveState('saving')
                      const { error } = await (supabase.from('registrations') as any)
                        .update({ preferred_date: newDate })
                        .eq('id', detailReg.id)
                      if (error) {
                        setDateSaveState('error')
                        setEditDateInput(detailReg.preferred_date || '')
                        setTimeout(() => setDateSaveState('idle'), 3000)
                      } else {
                        setDateSaveState('saved')
                        setRegistrations(prev => prev.map(r => r.id === detailReg.id ? { ...r, preferred_date: newDate } : r))
                        setDetailReg(prev => prev ? { ...prev, preferred_date: newDate } : null)
                        setTimeout(() => setDateSaveState('idle'), 2000)
                      }
                    }}
                  />
                </div>

                <div style={fieldSt}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                    <label style={{ ...labelSt, marginBottom: 0 }}>Time</label>
                    {timeSaveState === 'saving' && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>Menyimpan…</span>}
                    {timeSaveState === 'saved'  && <span style={{ fontSize: 10, color: '#A8C5A0', letterSpacing: '0.04em' }}>✓ Tersimpan</span>}
                    {timeSaveState === 'error'  && <span style={{ fontSize: 10, color: '#C89696', letterSpacing: '0.04em' }}>✕ Gagal simpan</span>}
                  </div>
                  <select
                    value={editTimeInput}
                    disabled={!isEditable || timeSaveState === 'saving'}
                    style={{ ...inputSt, opacity: isEditable ? 1 : 0.5 }}
                    onChange={async (e) => {
                      const newTime = e.target.value
                      setEditTimeInput(newTime)
                      if (!newTime || !detailReg || !isEditable) return

                      // Conflict check
                      const studioKey = toStudioBucket(detailReg)
                      const conflict = registrations.find(r =>
                        r.id !== detailReg.id &&
                        r.preferred_date === editDateInput &&
                        r.preferred_time === newTime &&
                        toStudioBucket(r) === studioKey &&
                        ['PENDING', 'VERIFIED', 'PROCESSED'].includes(r.status)
                      )
                      if (conflict) {
                        const proceed = window.confirm(
                          `⚠️ Konflik Jadwal!\n\n${conflict.customer_name} sudah booking jam ${newTime} di studio yang sama.\n\nTetap simpan?`
                        )
                        if (!proceed) {
                          setEditTimeInput(detailReg.preferred_time || '')
                          return
                        }
                      }

                      setTimeSaveState('saving')
                      const { error } = await (supabase.from('registrations') as any)
                        .update({ preferred_time: newTime })
                        .eq('id', detailReg.id)

                      if (error) {
                        setTimeSaveState('error')
                        setEditTimeInput(detailReg.preferred_time || '')
                        setTimeout(() => setTimeSaveState('idle'), 3000)
                      } else {
                        setTimeSaveState('saved')
                        setRegistrations(prev => prev.map(r =>
                          r.id === detailReg.id ? { ...r, preferred_time: newTime } : r
                        ))
                        setDetailReg(prev => prev ? { ...prev, preferred_time: newTime } : null)
                        setTimeout(() => setTimeSaveState('idle'), 2000)
                      }
                    }}
                  >
                    <option value="">Select time</option>
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div style={fieldSt}>
                  <label style={labelSt}>Package</label>
                  <select
                    value={editPackageId ?? ''}
                    disabled={!isEditable}
                    style={{ ...inputSt, opacity: isEditable ? 1 : 0.5 }}
                    onChange={e => {
                      const newId = Number(e.target.value) || null
                      setEditPackageId(newId)
                      if (detailReg && isEditable) {
                        triggerAddonsSave(detailReg.id, editPax, editAddons, newId, detailReg.addons as BookingAddons | null)
                      }
                    }}
                  >
                    <option value="">Select package</option>
                    {products.filter(p => !p.is_addon && p.is_active).map(p => (
                      <option key={p.id} value={p.id}>{p.nama} ({p.kategori}) — {fmtRp(p.harga_dasar)}</option>
                    ))}
                  </select>
                </div>

                <div style={fieldSt}>
                  <label style={labelSt}>Pax (persons)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      disabled={!isEditable || editPax <= 1}
                      style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 20, fontWeight: 700, cursor: isEditable && editPax > 1 ? 'pointer' : 'not-allowed', opacity: isEditable && editPax > 1 ? 1 : 0.4, transition: 'opacity 0.15s' }}
                      onClick={() => {
                        if (!isEditable || editPax <= 1) return
                        const n = editPax - 1
                        setEditPax(n)
                        if (detailReg) triggerAddonsSave(detailReg.id, n, editAddons, editPackageId, detailReg.addons as BookingAddons | null)
                      }}
                    >−</button>
                    <span style={{ minWidth: 32, textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>{editPax}</span>
                    <button
                      type="button"
                      disabled={!isEditable || editPax >= 20}
                      style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 20, fontWeight: 700, cursor: isEditable && editPax < 20 ? 'pointer' : 'not-allowed', opacity: isEditable && editPax < 20 ? 1 : 0.4, transition: 'opacity 0.15s' }}
                      onClick={() => {
                        if (!isEditable || editPax >= 20) return
                        const n = editPax + 1
                        setEditPax(n)
                        if (detailReg) triggerAddonsSave(detailReg.id, n, editAddons, editPackageId, detailReg.addons as BookingAddons | null)
                      }}
                    >+</button>
                  </div>
                </div>

                {products.filter(p => p.is_addon && p.is_active).length > 0 && (
                  <div style={fieldSt}>
                    <label style={labelSt}>Add-ons</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {products.filter(p => p.is_addon && p.is_active).map(addon => {
                        const qty = (editAddons as any)[addon.nama] || 0
                        return (
                          <div key={addon.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '6px 12px', border: `1px solid ${qty > 0 ? '#A8C5A0' : 'rgba(255,255,255,0.1)'}` }}>
                            <span style={{ flex: 1, color: qty > 0 ? '#A8C5A0' : 'rgba(255,255,255,0.55)', fontWeight: qty > 0 ? 600 : 400 }}>{addon.nama}</span>
                            <button type="button" disabled={!isEditable || qty <= 0}
                              style={{ width: 28, height: 28, borderRadius: 14, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: isEditable && qty > 0 ? 'pointer' : 'not-allowed', opacity: isEditable && qty > 0 ? 1 : 0.4 }}
                              onClick={() => {
                                if (!isEditable || qty <= 0) return
                                const next = { ...editAddons, [addon.nama]: Math.max(0, qty - 1) }
                                setEditAddons(next)
                                if (detailReg) triggerAddonsSave(detailReg.id, editPax, next, editPackageId, detailReg.addons as BookingAddons | null)
                              }}>−</button>
                            <span style={{ minWidth: 24, textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>{qty}</span>
                            <button type="button" disabled={!isEditable || qty >= 10}
                              style={{ width: 28, height: 28, borderRadius: 14, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: isEditable && qty < 10 ? 'pointer' : 'not-allowed', opacity: isEditable && qty < 10 ? 1 : 0.4 }}
                              onClick={() => {
                                if (!isEditable || qty >= 10) return
                                const next = { ...editAddons, [addon.nama]: qty + 1 }
                                setEditAddons(next)
                                if (detailReg) triggerAddonsSave(detailReg.id, editPax, next, editPackageId, detailReg.addons as BookingAddons | null)
                              }}>+</button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}


                {/* Price preview */}
                {previewItems.length > 0 && (
                  <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '0.5px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Price Preview</p>
                      {addonsSaveState === 'saving' && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>Menyimpan…</span>}
                      {addonsSaveState === 'saved'  && <span style={{ fontSize: 10, color: '#A8C5A0', letterSpacing: '0.04em' }}>✓ Tersimpan</span>}
                      {addonsSaveState === 'error'  && <span style={{ fontSize: 10, color: '#C89696', letterSpacing: '0.04em' }}>✕ Gagal simpan</span>}
                    </div>
                    {previewItems.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{fmtRp(item.price)}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>Total</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#A8C5A0' }}>{fmtRp(previewTotal)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div style={{ padding: '14px 22px', borderTop: '0.5px solid rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {reg.status === 'PENDING' && (
                    <button onClick={() => { advanceBooking(reg, 'VERIFIED'); setDetailReg(prev => prev ? { ...prev, status: 'VERIFIED' } : null) }} disabled={actionLoading} style={{ flex: 1, padding: '9px 12px', border: 'none', borderRadius: 10, background: 'rgba(155,184,208,0.18)', color: '#9BB8D0', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <Check size={13} /> Verify
                    </button>
                  )}
                  {reg.status === 'VERIFIED' && (
                    <button onClick={() => { advanceBooking(reg, 'PROCESSED'); setDetailReg(prev => prev ? { ...prev, status: 'PROCESSED' } : null) }} disabled={actionLoading} style={{ flex: 1, padding: '9px 12px', border: 'none', borderRadius: 10, background: 'rgba(168,197,160,0.18)', color: '#A8C5A0', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <ChevronRight size={13} /> Process → Studio
                    </button>
                  )}
                  {reg.status === 'PROCESSED' && !isPaid && linkedTx && (
                    <button onClick={() => { setPayTx(linkedTx); setShowPayModal(true); setPaymentMethodPick(reg.booking_type === 'ONLINE_QRIS' ? 'ONLINE_QRIS' : null); setDiscountInput(''); setDiscountReasonInput(''); setDetailReg(null) }} style={{ flex: 1, padding: '9px 12px', border: 'none', borderRadius: 10, background: 'rgba(168,197,160,0.18)', color: '#A8C5A0', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <CreditCard size={13} /> Pay Now
                    </button>
                  )}
                  {(reg.status === 'PROCESSED' && isPaid || reg.status === 'COMPLETED') && linkedTx && (
                    <button onClick={() => { openReceipt(linkedTx); setDetailReg(null) }} style={{ flex: 1, padding: '9px 12px', border: 'none', borderRadius: 10, background: 'rgba(127,194,155,0.18)', color: '#7FC29B', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <Send size={13} /> Receipt + DM
                    </button>
                  )}
                </div>
                {/* Delete booking – available for any non-completed booking */}
                {!isPaid && reg.status !== 'COMPLETED' && (
                  <button
                    onClick={handleDeleteBooking}
                    disabled={actionLoading}
                    style={{ width: '100%', padding: '9px', border: '1px solid rgba(200,150,150,0.2)', borderRadius: 10, background: 'rgba(200,150,150,0.05)', color: '#C89696', fontWeight: 600, fontSize: 12, cursor: actionLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: actionLoading ? 0.5 : 1 }}
                  >
                    <X size={12} /> Hapus Booking
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {editRegTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', zIndex: 999, display: 'grid', placeItems: 'center', padding: 16 }}>
          <div style={{ width: 'min(400px, 100%)', background: 'var(--mera-surface)', borderRadius: 20, boxShadow: 'var(--mera-shadow-xl)', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--mera-border)' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Reschedule Booking</h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--mera-text-tertiary)' }}>{editRegTarget.customer_name} — {toStudioBucket(editRegTarget)}</p>
            </div>
            <div style={{ padding: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--mera-text-secondary)' }}>New Date (YYYY-MM-DD)</label>
              <input
                type="date"
                value={editDateInput}
                onChange={e => setEditDateInput(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', background: 'var(--mera-surface-raised)', border: '1px solid var(--mera-border)', borderRadius: 10, color: 'var(--mera-text-primary)', marginBottom: 16 }}
              />

              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--mera-text-secondary)' }}>New Time (e.g. 15:30)</label>
              <select
                value={editTimeInput}
                onChange={e => setEditTimeInput(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', background: 'var(--mera-surface-raised)', border: '1px solid var(--mera-border)', borderRadius: 10, color: 'var(--mera-text-primary)' }}
              >
                <option value="">Select Time</option>
                {/* Use real slot logic: weekday/weekend, filter out booked slots for shared studios */}
                {(() => {
                  const d = new Date(editDateInput)
                  const day = d.getDay()
                  // These should match customer portal logic
                  const WEEKDAY_SLOTS = [
                    "12:00", "12:30", "13:00", "13:30", "14:00",
                    "14:30", "15:00", "15:30", "16:00", "16:30",
                    "17:00", "17:30", "18:00", "18:30", "19:00",
                    "19:30", "20:00", "20:30", "21:00"
                  ];
                  const WEEKEND_SLOTS = [
                    "09:00", "09:30", "10:00", "10:30",
                    "11:00", "11:30", "12:00", "12:30",
                    "13:00", "13:30", "14:00", "14:30",
                    "15:00", "15:30", "16:00", "16:30",
                    "17:00", "17:30", "18:00", "18:30",
                    "19:00", "19:30", "20:00", "20:30", "21:00"
                  ];
                  const baseSlots = (day === 0 || day === 5 || day === 6) ? WEEKEND_SLOTS : WEEKDAY_SLOTS;
                  // Find all bookings for this date for Close Up Room or Pas Photo
                  const booked = registrations
                    .filter(r => r.preferred_date === editDateInput && (r.addons?.room === 'Close Up Room' || r.addons?.room === 'Pas Photo') && ['PENDING','VERIFIED','PROCESSED'].includes(r.status))
                    .map(r => r.preferred_time);
                  // If today, filter out past slots
                  const todayStr = new Date().toISOString().slice(0,10);
                  let slots = baseSlots;
                  if (editDateInput === todayStr) {
                    const now = new Date();
                    const cur = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    slots = baseSlots.filter(s => s > cur);
                  }
                  return slots.filter(s => !booked.includes(s)).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ));
                })()}
              </select>
            </div>
            
            <div style={{ padding: 16, borderTop: '1px solid var(--mera-border)', display: 'flex', gap: 10 }}>
              <button
                onClick={() => setEditRegTarget(null)}
                style={{ flex: 1, padding: 12, border: '1px solid var(--mera-border-strong)', borderRadius: 10, background: 'transparent', color: 'var(--mera-text-primary)', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReschedule}
                disabled={actionLoading}
                style={{ flex: 1, padding: 12, border: 'none', borderRadius: 10, background: 'var(--mera-accent)', color: '#000', fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer' }}
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

