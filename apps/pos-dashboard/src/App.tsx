import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { Banknote, BarChart3, Calendar, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Clock3, Copy, CreditCard, Delete, Download, ExternalLink, Layers3, LogOut, MessageCircle, Monitor, Plus, Receipt, Send, TrendingUp, Users, X } from 'lucide-react'
import html2canvas from 'html2canvas'
import { supabase } from '@mera/supabase/client'
import type { Attendance, Crew, Expense, Product, Registration, RegistrationStatus, Transaction, TransactionStatus, PaymentMethod, BookingAddons } from '@mera/supabase'
import { hitungHargaBertingkat, calcBookingLineItems } from '@mera/supabase'
import AttendanceBoard from './components/AttendanceBoard'

type ViewKey = 'schedule' | 'booking' | 'pos' | 'finance' | 'attendance' | 'monthly'
type RoleKey = 'crew' | 'owner'

type StudioBucket = 'BASIC' | 'MAJESTIC' | 'ELEVATOR' | 'QUEUE'

const ownerNavItems: Array<{ key: ViewKey; label: string; icon: React.ReactNode }> = [
  { key: 'schedule', label: 'Schedule', icon: <Calendar size={18} /> },
  { key: 'booking', label: 'Booking Dashboard', icon: <ClipboardList size={18} /> },
  { key: 'pos', label: 'POS', icon: <Receipt size={18} /> },
  { key: 'finance', label: 'Today Recap', icon: <Banknote size={18} /> },
  { key: 'monthly', label: 'Monthly Recap', icon: <BarChart3 size={18} /> },
]

const crewNavItems: Array<{ key: ViewKey; label: string; icon: React.ReactNode }> = [
  { key: 'schedule', label: 'Schedule', icon: <Calendar size={18} /> },
  { key: 'booking', label: 'Bookings', icon: <ClipboardList size={18} /> },
  { key: 'pos', label: 'Transactions', icon: <Receipt size={18} /> },
  { key: 'finance', label: 'Today Recap', icon: <Banknote size={18} /> },
  { key: 'attendance', label: 'Attendance', icon: <Clock3 size={18} /> },
]

const OWNER_PIN = '1609'

function todayKey() {
  // Use WIB (UTC+7) to match Indonesian local date
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 10)
}

function weekRange(): [string, string] {
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  const dayOfWeek = wib.getUTCDay() // 0=Sun
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

const STUDIOS: StudioBucket[] = ['BASIC', 'MAJESTIC', 'ELEVATOR', 'QUEUE']

function fmtRp(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function toStudioBucket(reg: Registration): StudioBucket {
  const addons = reg.addons
  const room = `${addons?.room ?? ''}`.toLowerCase()
  if (room.includes('basic') || room.includes('pas')) return 'BASIC'
  if (room.includes('majestic')) return 'MAJESTIC'
  if (room.includes('elevator')) return 'ELEVATOR'
  return 'QUEUE'
}

function isTodayRegistration(reg: Registration) {
  return reg.preferred_date === todayKey()
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section
      style={{
        borderRadius: 20,
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'saturate(120%) blur(20px)',
        WebkitBackdropFilter: 'saturate(120%) blur(20px)',
        border: '1px solid rgba(139,26,26,0.18)',
        ...style,
      }}
    >
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
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
      background: `color-mix(in srgb, ${color} 12%, transparent)`,
      color,
      letterSpacing: '0.02em',
    }}>{label}</span>
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
  const [paymentMethodPick, setPaymentMethodPick] = useState<PaymentMethod | null>(null)
  const [addonPaymentPick, setAddonPaymentPick] = useState<PaymentMethod | null>(null)
  const [showPayModal, setShowPayModal] = useState(false)
  const [payTx, setPayTx] = useState<Transaction | null>(null)
  const [dmCopied, setDmCopied] = useState(false)
  const [dmExpanded, setDmExpanded] = useState(false)
  const [sessionIdCopied, setSessionIdCopied] = useState(false)
  const [editableDmMessage, setEditableDmMessage] = useState('')
  const [editRegTarget, setEditRegTarget] = useState<Registration | null>(null)
  const [editDateInput, setEditDateInput] = useState('')
  const [editTimeInput, setEditTimeInput] = useState('')
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
  const [expenseLoading, setExpenseLoading] = useState(false)

  // ─── Monthly recap state (Owner only) ────────────
  const [monthKey, setMonthKey] = useState(() => new Date().toISOString().slice(0, 7)) // 'YYYY-MM'
  const [monthTx, setMonthTx] = useState<Transaction[]>([])
  const [monthExp, setMonthExp] = useState<Expense[]>([])
  const [monthAtt, setMonthAtt] = useState<Attendance[]>([])
  const [crewList, setCrewList] = useState<Crew[]>([])
  const [monthLoading, setMonthLoading] = useState(false)
  const [monthLoaded, setMonthLoaded] = useState(false)
  const [monthExpItem, setMonthExpItem] = useState('')
  const [monthExpPrice, setMonthExpPrice] = useState('')
  const [monthExpCategory, setMonthExpCategory] = useState('')
  const [monthExpDate, setMonthExpDate] = useState(() => todayKey())

  const loadMonthData = useCallback(async (ym: string) => {
    setMonthLoading(true)
    const [year, month] = ym.split('-').map(Number)
    const start = `${ym}-01`
    const endDate = new Date(year, month, 0) // last day of month
    const end = endDate.toISOString().slice(0, 10)

    const [{ data: txD }, { data: expD }, { data: attD }, { data: crewD }] = await Promise.all([
      supabase.from('transactions').select('*').gte('created_at', `${start}T00:00:00`).lte('created_at', `${end}T23:59:59`).order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').gte('tanggal', start).lte('tanggal', end).order('tanggal', { ascending: false }),
      supabase.from('attendance').select('*').gte('clock_in', `${start}T00:00:00`).lte('clock_in', `${end}T23:59:59`).order('clock_in', { ascending: false }),
      supabase.from('crew').select('*').eq('is_active', true).order('nama'),
    ])
    setMonthTx((txD ?? []) as Transaction[])
    setMonthExp((expD ?? []) as Expense[])
    setMonthAtt((attD ?? []) as Attendance[])
    setCrewList((crewD ?? []) as Crew[])
    setMonthLoading(false)
    setMonthLoaded(true)
  }, [])

  // ─── Booking status transitions ──────────────────
  const advanceBooking = async (reg: Registration, newStatus: RegistrationStatus) => {
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
        // Pre-calculate price from addons
        const addons = reg.addons as { room?: string; pax?: number; computed_price?: number } | null
        const computedPrice = addons?.computed_price ?? 0
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
  // Delegates to the shared calcBookingLineItems helper so the POS breakdown
  // is always computed with the same logic as the customer portal.
  const calcLineItems = (reg: Registration | null): { label: string; price: number }[] => {
    if (!reg) return []
    return calcBookingLineItems(products, reg.addons as BookingAddons | null)
  }

  // ─── Transaction payment ─────────────────────────
  const markTxPaid = async (tx: Transaction, method: PaymentMethod, totalAmount: number, discountAmt: number, discountReason: string, splitInfo?: { baseAmount: number; baseMethod: PaymentMethod; addonAmount: number; addonMethod: PaymentMethod }) => {
    setActionLoading(true)
    // Build discount_reason: include split payment note if applicable
    let finalReason = discountReason || null
    if (splitInfo && splitInfo.addonAmount > 0) {
      const splitNote = `[Split: ${splitInfo.baseMethod} ${fmtRp(splitInfo.baseAmount)} + ${splitInfo.addonMethod} ${fmtRp(splitInfo.addonAmount)}]`
      finalReason = finalReason ? `${finalReason} ${splitNote}` : splitNote
    }
    const { error: payErr } = await supabase.from('transactions').update({
      status: 'PAID',
      payment_method: method,
      total_amount: totalAmount,
      discount_amount: discountAmt,
      discount_reason: finalReason,
    } as never).eq('id', tx.id)

    if (payErr) {
      console.error('Failed to mark transaction paid:', payErr)
      alert(`Gagal bayar: ${payErr.message}`)
      setActionLoading(false)
      return
    }

    // Mark linked registration as EXPIRED (session completed)
    if (tx.registration_id) {
      await supabase.from('registrations').update({ status: 'EXPIRED' } as never).eq('id', tx.registration_id)
      setRegistrations(prev => prev.map(r => r.id === tx.registration_id ? { ...r, status: 'EXPIRED' as const } : r))
    }

    // Optimistic update
    const paidTx = { ...tx, status: 'PAID' as const, payment_method: method, total_amount: totalAmount, discount_amount: discountAmt, discount_reason: finalReason }
    setTransactions(prev => prev.map(t => t.id === tx.id ? paidTx : t))
    setShowPayModal(false)
    setPayTx(null)
    setPaymentMethodPick(null)
    setAddonPaymentPick(null)
    setDiscountInput('')
    setDiscountReasonInput('')
    setSessionAddons({})
    setActionLoading(false)

    // Auto-open receipt after payment
    const reg = registrations.find(r => r.id === tx.registration_id || r.session_id === tx.session_id) ?? null
    setReceiptTx(paidTx)
    setReceiptReg(reg)
    setEditableDmMessage(buildDmMessage(paidTx, reg))
    setShowReceiptModal(true)
    setDmCopied(false)
    setSessionIdCopied(false)
  }

  // ─── Complete session → open receipt ─────────────
  const openReceipt = (tx: Transaction) => {
    const reg = registrations.find((r) => r.session_id === tx.session_id) ?? null
    setReceiptTx(tx)
    setReceiptReg(reg)
    setEditableDmMessage(buildDmMessage(tx, reg))
    setShowReceiptModal(true)
    setDmCopied(false)
    setSessionIdCopied(false)
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

  const handleOwnerLoginSuccess = () => {
    if (ownerPinInput.trim() === OWNER_PIN) {
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
    if (ownerPinInput.length >= OWNER_PIN.length) return
    const next = `${ownerPinInput}${digit}`
    setOwnerPinInput(next)
    if (ownerPinError) setOwnerPinError('')
    if (next.length === OWNER_PIN.length) {
      window.setTimeout(() => {
        if (next === OWNER_PIN) {
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

      const [{ data: regData }, { data: txData }, { data: attData }, { data: expData }, { data: weekRegData }, { data: prodData }] = await Promise.all([
        supabase.from('registrations').select('*').or(`preferred_date.eq.${day},created_at.gte.${day}T00:00:00`).order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').gte('created_at', `${day}T00:00:00`).lte('created_at', `${day}T23:59:59`).order('created_at', { ascending: false }),
        supabase.from('attendance').select('*').gte('clock_in', `${day}T00:00:00`).lte('clock_in', `${day}T23:59:59`).order('clock_in', { ascending: false }),
        supabase.from('expenses').select('*').gte('tanggal', day).lte('tanggal', day).order('tanggal', { ascending: false }),
        supabase.from('registrations').select('*').gte('preferred_date', wkStart).lte('preferred_date', wkEnd).order('preferred_time', { ascending: true }),
        supabase.from('products').select('*').eq('is_active', true).order('kategori'),
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
    }
    registrations.forEach((r) => {
      base[r.status] += 1
    })
    return base
  }, [registrations])

  const perStudio = useMemo(() => {
    return {
      BASIC: registrations.filter((r) => toStudioBucket(r) === 'BASIC'),
      MAJESTIC: registrations.filter((r) => toStudioBucket(r) === 'MAJESTIC'),
      ELEVATOR: registrations.filter((r) => toStudioBucket(r) === 'ELEVATOR'),
      QUEUE: registrations.filter((r) => toStudioBucket(r) === 'QUEUE'),
    }
  }, [registrations])

  const txPaid = transactions.filter((t) => t.status === 'PAID')
  const omzet = txPaid.reduce((sum, t) => sum + t.total_amount, 0)
  const expenseTotal = expenses.reduce((sum, e) => sum + e.jumlah, 0)
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
                {Array.from({ length: OWNER_PIN.length }).map((_, i) => (
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/mera-logo-white.png" alt="Méra" style={{ height: 24 }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>
            {role === 'owner' ? 'Owner' : 'Crew'}
          </span>
        </div>

        {/* Segmented nav */}
        <div style={{
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
                {item.icon}
                {item.label}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
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
      <main style={{ flex: 1, overflow: 'auto', padding: '20px 24px', WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Loading...</p>
          </div>
        ) : (
          <>
            {/* ═══════════════════════════════════════════════ */}
            {/* 1. SCHEDULE — Two Studio Calendars              */}
            {/* ═══════════════════════════════════════════════ */}
            {view === 'schedule' && (() => {
              const days = weekDays()
              const regsByDateSlotStudio = (date: string, slot: string, studios: StudioBucket[]) =>
                weekRegistrations.filter((r) => {
                  if (r.preferred_date !== date) return false
                  if (!studios.includes(toStudioBucket(r))) return false
                  const t = r.preferred_time ?? ''
                  // Match bookings to hour slot (e.g. 12:00 and 12:30 both match slot 12:00)
                  return t.slice(0, 2) === slot.slice(0, 2)
                })
              const todayRegs = registrations.filter((r) => r.status !== 'EXPIRED')
              const basicWeek = weekRegistrations.filter((r) => toStudioBucket(r) === 'BASIC')
              const thematicWeek = weekRegistrations.filter((r) => ['MAJESTIC', 'ELEVATOR'].includes(toStudioBucket(r)))

              const statusColor = (s: string) => {
                const m: Record<string, string> = { PENDING: '#E0B88A', VERIFIED: '#9BB8D0', PROCESSED: '#A8C5A0', EXPIRED: '#C89696' }
                return m[s] ?? 'rgba(255,255,255,0.3)'
              }

              const calendarGrid = (title: string, studios: StudioBucket[], accent: string, count: number) => (
                <Card style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '16px 18px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
                        <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</h3>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', padding: '3px 12px', borderRadius: 20 }}>{count} this week</span>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto', padding: '0 0 16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(7, minmax(110px, 1fr))`, minWidth: 850 }}>
                      {/* Day headers */}
                      <div style={{ padding: '0 8px 10px', fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 500 }} />
                      {days.map((d) => (
                        <div key={d.date} style={{
                          padding: '0 8px 10px',
                          textAlign: 'center',
                        }}>
                          <span style={{
                            fontSize: 11,
                            fontWeight: d.isToday ? 700 : 500,
                            color: d.isToday ? '#fff' : 'rgba(255,255,255,0.35)',
                            ...(d.isToday ? { background: accent, padding: '3px 10px', borderRadius: 20 } : {}),
                          }}>
                            {d.label}
                          </span>
                        </div>
                      ))}

                      {/* Time rows */}
                      {TIME_SLOTS.map((slot) => (
                        <React.Fragment key={slot}>
                          <div style={{ padding: '6px 8px 6px 12px', fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 500, borderTop: '0.5px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'start' }}>
                            {slot}
                          </div>
                          {days.map((d) => {
                            const regs = regsByDateSlotStudio(d.date, slot, studios)
                            return (
                              <div key={d.date} style={{
                                padding: '4px 4px',
                                borderTop: '0.5px solid rgba(255,255,255,0.04)',
                                minHeight: 32,
                                background: d.isToday ? 'rgba(255,255,255,0.015)' : 'transparent',
                              }}>
                                {regs.map((r) => (
                                  <div key={r.id} style={{
                                    background: `color-mix(in srgb, ${accent} 10%, transparent)`,
                                    border: `0.5px solid color-mix(in srgb, ${accent} 25%, transparent)`,
                                    borderRadius: 10,
                                    padding: '5px 8px',
                                    marginBottom: 3,
                                  }}>
                                    <p style={{ fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'rgba(255,255,255,0.85)' }}>{r.customer_name}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor(r.status), flexShrink: 0 }} />
                                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{r.status}</span>
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

              return (
                <div style={{ display: 'grid', gap: 16 }}>
                  {/* Summary pills */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    <Pill label="Today" value={`${todayRegs.length} bookings`} />
                    <Pill label="Pending" value={statusCount.PENDING} color="#E0B88A" />
                    <Pill label="In Studio" value={statusCount.PROCESSED} color="#A8C5A0" />
                    <Pill label="This Week" value={weekRegistrations.filter((r) => r.status !== 'EXPIRED').length} />
                  </div>

                  {/* Two calendars side by side */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {calendarGrid('Studio Basic', ['BASIC', 'QUEUE'], '#622128', basicWeek.length)}
                    {calendarGrid('Studio Thematic', ['MAJESTIC', 'ELEVATOR'], '#E0B88A', thematicWeek.length)}
                  </div>
                </div>
              )
            })()}

            {/* ═══════════════════════════════════════════════ */}
            {/* 2. BOOKING HANDLING                             */}
            {/* ═══════════════════════════════════════════════ */}
            {view === 'booking' && (() => {
              const pending = registrations.filter((r) => r.status === 'PENDING')
              const verified = registrations.filter((r) => r.status === 'VERIFIED')
              const processed = registrations.filter((r) => r.status === 'PROCESSED')
              const expired = registrations.filter((r) => r.status === 'EXPIRED')

              const statusMap: Record<RegistrationStatus, { color: string }> = {
                PENDING: { color: '#E0B88A' },
                VERIFIED: { color: '#9BB8D0' },
                PROCESSED: { color: '#A8C5A0' },
                EXPIRED: { color: '#C89696' },
              }

              const actionBtn = (label: string, icon: React.ReactNode, color: string, onClick: () => void) => (
                <button
                  onClick={(e) => { e.stopPropagation(); onClick() }}
                  disabled={actionLoading}
                  style={{
                    border: 'none',
                    borderRadius: 10,
                    background: `color-mix(in srgb, ${color} 18%, transparent)`,
                    color,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '5px 10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    opacity: actionLoading ? 0.5 : 1,
                  }}
                >
                  {icon}
                  {label}
                </button>
              )

              const bookingRow = (r: Registration) => (
                <div key={r.id} style={{
                  padding: '14px 16px',
                  borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.customer_name}</p>
                        <StatusPill label={r.status} color={statusMap[r.status].color} />
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span>{r.preferred_time ?? '—'}</span>
                        <span>·</span>
                        <span>{r.booking_type === 'ONLINE_QRIS' ? 'QRIS' : 'Keep Slot'}</span>
                        <span>·</span>
                        <span>{toStudioBucket(r)}</span>
                        {r.instagram_handle && <><span>·</span><span>@{r.instagram_handle.replace('@', '')}</span></>}
                      </div>
                    </div>
                    {r.session_id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          void copyToClipboard(r.session_id!)
                          setSessionIdCopied(true)
                          setTimeout(() => setSessionIdCopied(false), 2000)
                        }}
                        style={{
                          fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
                          background: 'rgba(255,255,255,0.06)', padding: '4px 12px',
                          borderRadius: 20, flexShrink: 0, letterSpacing: '0.03em',
                          border: 'none', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <Copy size={10} />
                        {r.session_id}
                      </button>
                    )}
                  </div>

                  {/* Action buttons row */}
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {r.status === 'PENDING' && actionBtn('Verify', <Check size={12} />, '#9BB8D0', () => advanceBooking(r, 'VERIFIED'))}
                    {['PENDING', 'VERIFIED'].includes(r.status) && actionBtn('Edit Schedule', <Calendar size={12} />, '#E0B88A', () => {
                      setEditRegTarget(r)
                      setEditDateInput(r.preferred_date || '')
                      setEditTimeInput(r.preferred_time || '')
                    })}
                    {r.status === 'VERIFIED' && actionBtn('Process → Studio', <ChevronRight size={12} />, '#A8C5A0', () => advanceBooking(r, 'PROCESSED'))}
                    {r.status === 'PROCESSED' && (() => {
                      const linkedTx = transactions.find(t => (t.registration_id === r.id || t.session_id === r.session_id))
                      const isPaid = linkedTx?.status === 'PAID'
                      return (
                        <>
                          {!isPaid && actionBtn('Finish → Pay', <CheckCircle2 size={12} />, '#A8C5A0', () => {
                            if (linkedTx && linkedTx.status === 'ACTIVE') {
                              setPayTx(linkedTx)
                              setShowPayModal(true)
                              setPaymentMethodPick(r.booking_type === 'ONLINE_QRIS' ? 'ONLINE_QRIS' : null)
                              setDiscountInput('')
                              setDiscountReasonInput('')
                            } else {
                              setView('pos')
                            }
                          })}
                          {isPaid && linkedTx && actionBtn('Receipt + DM', <Send size={12} />, '#A8C5A0', () => openReceipt(linkedTx))}
                          {r.session_id && actionBtn('Copy ID', <Copy size={12} />, 'rgba(255,255,255,0.5)', () => {
                            void copyToClipboard(r.session_id!)
                            setSessionIdCopied(true)
                            setTimeout(() => setSessionIdCopied(false), 2000)
                          })}
                        </>
                      )
                    })()}
                  </div>
                </div>
              )

              const columnCard = (title: string, icon: React.ReactNode, items: Registration[], emptyMsg: string) => (
                <Card style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{ padding: '16px 18px 0' }}>
                    <SectionHeader title={title} icon={icon} count={items.length} />
                  </div>
                  <div style={{ overflow: 'auto', flex: 1 }}>
                    {items.length === 0 ? (
                      <p style={{ padding: '24px 18px', fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>{emptyMsg}</p>
                    ) : items.map(bookingRow)}
                  </div>
                </Card>
              )

              return (
                <div style={{ display: 'grid', gap: 16 }}>
                  {sessionIdCopied && (
                    <div style={{ position: 'fixed', top: 70, right: 24, background: 'rgba(139,26,26,0.85)', color: '#fff', padding: '8px 16px', borderRadius: 12, fontSize: 12, fontWeight: 600, zIndex: 100, backdropFilter: 'blur(8px)' }}>
                      Session ID copied!
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    <Pill label="Pending" value={pending.length} color="#E0B88A" />
                    <Pill label="Verified" value={verified.length} color="#9BB8D0" />
                    <Pill label="In Studio" value={processed.length} color="#A8C5A0" />
                    <Pill label="Expired" value={expired.length} color="#C89696" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, minHeight: 'calc(100vh - 240px)' }}>
                    {columnCard('Lobby', <Layers3 size={16} />, [...pending, ...verified], 'No bookings in lobby')}
                    {columnCard('In-Studio', <Monitor size={16} />, processed, 'No active sessions')}
                    {columnCard('Completed / Expired', <Users size={16} />, expired, 'None')}
                  </div>
                </div>
              )
            })()}

            {/* ═══════════════════════════════════════════════ */}
            {/* 3. TRANSACTIONS                                 */}
            {/* ═══════════════════════════════════════════════ */}
            {view === 'pos' && (() => {
              const activeTx = transactions.filter((t) => t.status === 'ACTIVE')
              const paidTx = transactions.filter((t) => t.status === 'PAID')
              const otherTx = transactions.filter((t) => t.status === 'REFUNDED' || t.status === 'VOID')
              const cashTotal = paidTx.filter((t) => t.payment_method === 'CASH').reduce((s, t) => s + t.total_amount, 0)
              const qrisTotal = paidTx.filter((t) => ['QRIS', 'ONLINE_QRIS', 'TRANSFER'].includes(t.payment_method ?? '')).reduce((s, t) => s + t.total_amount, 0)

              const txStatusColor = (s: string) => {
                const m: Record<string, string> = { ACTIVE: '#E0B88A', PAID: '#A8C5A0', REFUNDED: '#C89696', VOID: 'rgba(255,255,255,0.25)' }
                return m[s] ?? 'rgba(255,255,255,0.3)'
              }

              const txRow = (t: Transaction) => {
                const linkedReg = registrations.find(r => r.id === t.registration_id) ?? null
                const items = calcLineItems(linkedReg)
                const estimatedTotal = t.status === 'ACTIVE' && t.total_amount === 0 ? items.reduce((s, i) => s + i.price, 0) : t.total_amount
                return (
                <div key={t.id} style={{
                  padding: '14px 16px',
                  borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {linkedReg && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{linkedReg.customer_name}</span>
                          {linkedReg.instagram_handle && (
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>@{linkedReg.instagram_handle.replace('@', '')}</span>
                          )}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.02em', color: 'rgba(255,255,255,0.5)' }}>{t.session_id}</p>
                        <StatusPill label={t.status} color={txStatusColor(t.status)} />
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {linkedReg && <span style={{ color: '#9BB8D0' }}>{toStudioBucket(linkedReg)}</span>}
                        {linkedReg && <span>·</span>}
                        {items.length > 0 && <span>{items.map(i => i.label).join(', ')}</span>}
                        {items.length > 0 && <span>·</span>}
                        <span>{t.payment_method ?? 'Unpaid'}</span>
                        <span>·</span>
                        <span>{fmtTime(t.created_at)}</span>
                        {t.discount_amount > 0 && <><span>·</span><span style={{ color: '#C89696' }}>−{fmtRp(t.discount_amount)}</span></>}
                      </div>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 700, flexShrink: 0 }}>{fmtRp(estimatedTotal)}</span>
                  </div>

                  {/* Action row */}
                  <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                    {t.status === 'ACTIVE' && (
                      <button
                        onClick={() => {
                          setPayTx(t)
                          setShowPayModal(true)
                          const lr = registrations.find(r => r.id === t.registration_id)
                          setPaymentMethodPick(lr?.booking_type === 'ONLINE_QRIS' ? 'ONLINE_QRIS' : null)
                          setDiscountInput('')
                          setDiscountReasonInput('')
                        }}
                        style={{
                          border: 'none', borderRadius: 10,
                          background: 'color-mix(in srgb, #A8C5A0 18%, transparent)',
                          color: '#A8C5A0', fontSize: 11, fontWeight: 600,
                          padding: '5px 10px', display: 'inline-flex',
                          alignItems: 'center', gap: 4, cursor: 'pointer',
                        }}
                      >
                        <CreditCard size={12} />
                        Mark Paid
                      </button>
                    )}
                    {t.status === 'PAID' && (
                      <>
                        <button
                          onClick={() => openReceipt(t)}
                          style={{
                            border: 'none', borderRadius: 10,
                            background: 'color-mix(in srgb, #622128 22%, transparent)',
                            color: '#D4A0A0', fontSize: 11, fontWeight: 600,
                            padding: '5px 10px', display: 'inline-flex',
                            alignItems: 'center', gap: 4, cursor: 'pointer',
                          }}
                        >
                          <Send size={12} />
                          Receipt + DM
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              const txColumn = (title: string, icon: React.ReactNode, items: Transaction[], emptyMsg: string) => (
                <Card style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{ padding: '16px 18px 0' }}>
                    <SectionHeader title={title} icon={icon} count={items.length} />
                  </div>
                  <div style={{ overflow: 'auto', flex: 1 }}>
                    {items.length === 0 ? (
                      <p style={{ padding: '24px 18px', fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>{emptyMsg}</p>
                    ) : items.map(txRow)}
                  </div>
                </Card>
              )

              return (
                <div style={{ display: 'grid', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    <Pill label="Active" value={activeTx.length} color="#E0B88A" />
                    <Pill label="Paid" value={paidTx.length} color="#A8C5A0" />
                    <Pill label="Cash" value={fmtRp(cashTotal)} />
                    <Pill label="QRIS / Transfer" value={fmtRp(qrisTotal)} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, minHeight: 'calc(100vh - 240px)' }}>
                    {txColumn('Active', <CreditCard size={16} />, activeTx, 'No active transactions')}
                    {txColumn('Completed', <Receipt size={16} />, paidTx, 'No completed transactions')}
                    {txColumn('Refunded / Void', <X size={16} />, otherTx, 'None')}
                  </div>
                </div>
              )
            })()}

            {/* ═══════════════════════════════════════════════ */}
            {/* 4. TODAY FINANCE RECAP                           */}
            {/* ═══════════════════════════════════════════════ */}
            {view === 'finance' && (() => {
              const cashTotal = txPaid.filter((t) => t.payment_method === 'CASH').reduce((s, t) => s + t.total_amount, 0)
              const qrisTotal = txPaid.filter((t) => ['QRIS', 'ONLINE_QRIS', 'TRANSFER'].includes(t.payment_method ?? '')).reduce((s, t) => s + t.total_amount, 0)
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                    <Pill label="Gross Omzet" value={fmtRp(omzet)} />
                    <Pill label="Discounts" value={`−${fmtRp(discountTotal)}`} color={discountTotal > 0 ? '#C89696' : undefined} />
                    <Pill label="Net Revenue" value={fmtRp(netRevenue)} color="#A8C5A0" />
                    <Pill label="Expenses" value={fmtRp(expenseTotal)} color="#E0B88A" />
                    <Pill label="Profit" value={fmtRp(profit)} color={profit >= 0 ? '#A8C5A0' : '#C89696'} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {/* Payment breakdown */}
                    <Card>
                      <div style={{ padding: '16px 18px' }}>
                        <SectionHeader title="Payment" icon={<Banknote size={16} />} />
                        <div>
                          {finRow('Cash', fmtRp(cashTotal))}
                          {finRow('QRIS / Transfer', fmtRp(qrisTotal))}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0 4px' }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Total Paid</span>
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
                        {txPaid.map((t) => (
                          <div key={t.id} style={{ padding: '10px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600 }}>{t.session_id}</p>
                              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{fmtTime(t.created_at)} · {t.payment_method}</p>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtRp(t.total_amount)}</span>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Expenses */}
                    <Card style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      <div style={{ padding: '16px 18px 0' }}>
                        <SectionHeader title="Expenses" icon={<Banknote size={16} />} count={expenses.length} />
                      </div>

                      {/* Expense input form */}
                      <div style={{ padding: '0 18px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
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
                          <button
                            disabled={!expenseItem.trim() || !expensePrice || !expenseCategory || expenseLoading}
                            onClick={async () => {
                              setExpenseLoading(true)
                              const payload = {
                                tanggal: todayKey(),
                                keterangan: expenseItem.trim(),
                                kategori: expenseCategory,
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
                              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{e.kategori}</p>
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
              const mCash = monthPaid.filter(t => t.payment_method === 'CASH').reduce((s, t) => s + t.total_amount, 0)
              const mQris = monthPaid.filter(t => ['QRIS', 'ONLINE_QRIS', 'TRANSFER'].includes(t.payment_method ?? '')).reduce((s, t) => s + t.total_amount, 0)

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

              // ── Month nav ──
              const changeMonth = (delta: number) => {
                const [y, m] = monthKey.split('-').map(Number)
                const d = new Date(y, m - 1 + delta, 1)
                const key = d.toISOString().slice(0, 7)
                setMonthKey(key)
                setMonthTx([]); setMonthExp([]); setMonthAtt([]); setCrewList([])
                setMonthLoaded(false)
                loadMonthData(key)
              }

              const monthLabel = (() => {
                const [y, m] = monthKey.split('-').map(Number)
                return new Date(y, m - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
              })()

              if (monthLoading) {
                return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading {monthLabel}…</div>
              }

              return (
                <div style={{ display: 'grid', gap: 16 }}>
                  {/* Month navigation */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <button onClick={() => changeMonth(-1)} style={{ border: 'none', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 12px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <ChevronLeft size={16} />
                    </button>
                    <h2 style={{ fontSize: 18, fontWeight: 700, minWidth: 180, textAlign: 'center' }}>{monthLabel}</h2>
                    <button onClick={() => changeMonth(1)} style={{ border: 'none', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 12px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* KPI row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
                    <Pill label="Gross" value={fmtRp(mGross)} />
                    <Pill label="Discounts" value={`−${fmtRp(mDiscount)}`} color={mDiscount > 0 ? '#C89696' : undefined} />
                    <Pill label="Net Revenue" value={fmtRp(mNet)} color="#A8C5A0" />
                    <Pill label="Expenses" value={fmtRp(mExpTotal)} color="#E0B88A" />
                    <Pill label="Payroll" value={fmtRp(totalPayroll)} color="#9BB8D0" />
                    <Pill label="Profit" value={fmtRp(mProfit - totalPayroll)} color={mProfit - totalPayroll >= 0 ? '#A8C5A0' : '#C89696'} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input type="number" placeholder="Price" value={monthExpPrice} onChange={e => setMonthExpPrice(e.target.value)}
                            style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#fff', padding: '7px 10px', fontSize: 11, outline: 'none' }} />
                          <select value={monthExpCategory} onChange={e => setMonthExpCategory(e.target.value)}
                            style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: monthExpCategory ? '#fff' : 'rgba(255,255,255,0.35)', padding: '7px 6px', fontSize: 11, outline: 'none', appearance: 'none' }}>
                            <option value="" disabled>Category</option>
                            <option value="Operasional">Operasional</option>
                            <option value="Perlengkapan">Perlengkapan</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                          <button
                            disabled={!monthExpItem.trim() || !monthExpPrice || !monthExpCategory || expenseLoading}
                            onClick={async () => {
                              setExpenseLoading(true)
                              const { data, error } = await supabase.from('expenses').insert({
                                tanggal: monthExpDate || todayKey(),
                                keterangan: monthExpItem.trim(),
                                kategori: monthExpCategory,
                                jumlah: parseInt(monthExpPrice, 10) || 0,
                              } as never).select('*').single()
                              if (error) { alert(`Gagal: ${error.message}`) }
                              else if (data) {
                                setMonthExp(prev => [data as Expense, ...prev])
                                // Also add to today's expenses if same day
                                if ((data as Expense).tanggal === todayKey()) setExpenses(prev => [data as Expense, ...prev])
                                setMonthExpItem(''); setMonthExpPrice(''); setMonthExpCategory('')
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
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{e.tanggal} · {e.kategori}</p>
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
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 1fr 1fr 1fr 1fr 1.2fr 0.4fr', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {['Crew', 'Shifts', 'Base', 'Late', 'Penalty', 'Bonus', 'Net Pay', ''].map(h => (
                          <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                        ))}
                      </div>

                      {/* Rows */}
                      {payrollRows.map(r => (
                        <div key={r.crew.id} style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 1fr 1fr 1fr 1fr 1.2fr 0.4fr', gap: 8, padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
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
                          <button
                            onClick={async () => {
                              // Render payslip content into hidden div, then capture
                              const el = payslipRef.current
                              if (!el) return
                              const monthLabel = new Date(monthKey + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                              el.innerHTML = `
                                <div style="width:400px;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;color:#1C1C1E;">
                                  <div style="text-align:center;margin-bottom:20px;">
                                    <img src="/mera-logo-black.png" style="height:32px;margin-bottom:8px;" />
                                    <h2 style="margin:0;font-size:16px;font-weight:700;">Slip Gaji</h2>
                                    <p style="margin:4px 0 0;font-size:12px;color:#888;">${monthLabel}</p>
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
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.3)' }}
                            title="Download Slip Gaji"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      ))}

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
        const lineItems = calcLineItems(payReg)
        const addonProducts = products.filter(p => p.is_addon && p.is_active)
        const addonItems = Object.entries(sessionAddons)
          .filter(([, qty]) => qty > 0)
          .map(([idStr, qty]) => {
            const p = addonProducts.find(a => a.id === Number(idStr))
            if (!p) return null
            const price = p.tipe_harga === 'bertingkat' ? hitungHargaBertingkat(p, qty) : p.harga_dasar * qty
            return { label: `${p.nama}${qty > 1 ? ` ×${qty}` : ''}`, price }
          }).filter(Boolean) as { label: string; price: number }[]

        const isOnlineQris = payReg?.booking_type === 'ONLINE_QRIS'
        const baseTotal = lineItems.reduce((s, i) => s + i.price, 0)
        const addonTotal = addonItems.reduce((s, i) => s + i.price, 0)
        const allItems = [...lineItems, ...addonItems]
        const subtotal = allItems.reduce((s, i) => s + i.price, 0)
        const discountAmt = Math.max(0, Math.min(subtotal, parseInt(discountInput || '0', 10) || 0))
        const grandTotal = subtotal - discountAmt
        const hasSplit = isOnlineQris && addonTotal > 0
        // For split: base paid via ONLINE_QRIS, remaining paid via addonPaymentPick
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
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{payTx.session_id} · {toStudioBucket(payReg)}</p>
              </div>
            )}

            {/* Product breakdown */}
            <div style={{ padding: '16px 22px 0' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Products</p>
              {allItems.length === 0 ? (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', padding: '8px 0' }}>No products linked — price will be manual</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Base line items */}
                  {lineItems.map((item, i) => (
                    <div key={`base-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{item.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtRp(item.price)}</span>
                        {isOnlineQris && <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: 'rgba(168,197,160,0.15)', color: '#A8C5A0' }}>PAID</span>}
                      </div>
                    </div>
                  ))}
                  {/* Addon line items */}
                  {addonItems.map((item, i) => (
                    <div key={`addon-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#E0B88A' }}>{item.label}</span>
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
            {addonProducts.length > 0 && (
              <div style={{ padding: '12px 22px 0' }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Session Add-Ons</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {addonProducts.map(addon => {
                    const qty = sessionAddons[addon.id] ?? 0
                    const isTiered = addon.tipe_harga === 'bertingkat'
                    const totalPrice = isTiered ? hitungHargaBertingkat(addon, qty) : addon.harga_dasar * qty
                    const nextUnitPrice = isTiered
                      ? hitungHargaBertingkat(addon, qty + 1) - (qty > 0 ? hitungHargaBertingkat(addon, qty) : 0)
                      : addon.harga_dasar
                    return (
                      <div key={addon.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        border: `1.5px solid ${qty > 0 ? '#A8C5A0' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 12,
                        background: qty > 0 ? 'rgba(168,197,160,0.08)' : 'rgba(255,255,255,0.04)',
                        padding: '8px 12px',
                        transition: 'all 0.15s ease',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: qty > 0 ? '#A8C5A0' : 'rgba(255,255,255,0.6)' }}>{addon.nama}</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                            {isTiered
                              ? `next: ${fmtRp(nextUnitPrice)}${qty > 0 ? ` · total: ${fmtRp(totalPrice)}` : ''}`
                              : `${fmtRp(addon.harga_dasar)} / pcs${qty > 0 ? ` · total: ${fmtRp(totalPrice)}` : ''}`
                            }
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                          <button
                            onClick={() => setSessionAddons(prev => {
                              const next = { ...prev }
                              if ((next[addon.id] ?? 0) <= 1) delete next[addon.id]
                              else next[addon.id] = (next[addon.id] ?? 0) - 1
                              return next
                            })}
                            disabled={qty === 0}
                            style={{
                              width: 32, height: 32, border: 'none', borderRadius: 10,
                              background: qty > 0 ? 'rgba(255,255,255,0.08)' : 'transparent',
                              color: qty > 0 ? '#fff' : 'rgba(255,255,255,0.15)',
                              fontSize: 18, fontWeight: 700, cursor: qty > 0 ? 'pointer' : 'default',
                              display: 'grid', placeItems: 'center', transition: 'all 0.15s ease',
                            }}
                          >−</button>
                          <span style={{ width: 28, textAlign: 'center', fontSize: 14, fontWeight: 700, color: qty > 0 ? '#A8C5A0' : 'rgba(255,255,255,0.2)' }}>{qty}</span>
                          <button
                            onClick={() => setSessionAddons(prev => ({ ...prev, [addon.id]: (prev[addon.id] ?? 0) + 1 }))}
                            style={{
                              width: 32, height: 32, border: 'none', borderRadius: 10,
                              background: 'rgba(168,197,160,0.15)',
                              color: '#A8C5A0', fontSize: 18, fontWeight: 700, cursor: 'pointer',
                              display: 'grid', placeItems: 'center', transition: 'all 0.15s ease',
                            }}
                          >+</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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

            {/* Grand total */}
            <div style={{ padding: '12px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

            {/* Payment method — split vs normal */}
            {hasSplit ? (
              <div style={{ padding: '0 22px 12px' }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Add-on payment method</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {(['CASH', 'QRIS', 'TRANSFER'] as PaymentMethod[]).map((m) => {
                    const labels: Record<string, string> = { CASH: '💵 Cash', QRIS: '📱 QRIS', TRANSFER: '🏦 Transfer' }
                    const selected = addonPaymentPick === m
                    return (
                      <button
                        key={m}
                        onClick={() => setAddonPaymentPick(m)}
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
              <div style={{ padding: '0 22px 12px' }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Payment method</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(['CASH', 'QRIS', 'TRANSFER', 'ONLINE_QRIS'] as PaymentMethod[]).map((m) => {
                    const labels: Record<PaymentMethod, string> = { CASH: '💵 Cash', QRIS: '📱 QRIS', TRANSFER: '🏦 Transfer', ONLINE_QRIS: '🌐 Online QRIS' }
                    const selected = paymentMethodPick === m
                    return (
                      <button
                        key={m}
                        onClick={() => setPaymentMethodPick(m)}
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

            <div style={{ padding: '0 22px 22px' }}>
              <button
                onClick={() => {
                  if (hasSplit) {
                    markTxPaid(payTx, 'ONLINE_QRIS', grandTotal, discountAmt, discountReasonInput, {
                      baseAmount: baseTotal,
                      baseMethod: 'ONLINE_QRIS',
                      addonAmount: remainingToPay,
                      addonMethod: addonPaymentPick ?? 'CASH',
                    })
                  } else if (paymentMethodPick) {
                    markTxPaid(payTx, paymentMethodPick, grandTotal, discountAmt, discountReasonInput)
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
        const splitNote = tx.discount_reason?.match(/\[Split: (.+?)\]/)?.[1] ?? null

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
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#A8C5A0', margin: 0 }}>{fmtRp(tx.total_amount)}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 2 }}>
                      {tx.discount_amount > 0 && <span style={{ fontSize: 10, color: '#C89696' }}>−{fmtRp(tx.discount_amount)}</span>}
                      <StatusPill label={tx.payment_method ?? 'PAID'} color="#A8C5A0" />
                    </div>
                  </div>
                </div>
                {splitNote && (
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 6, textAlign: 'center' }}>Split: {splitNote}</p>
                )}
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

              {/* ── Collapsible DM editor ── */}
              <div style={{ padding: '16px 22px 20px' }}>
                <button
                  onClick={() => setDmExpanded(!dmExpanded)}
                  style={{
                    width: '100%', border: 'none', background: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 0 8px', color: 'rgba(255,255,255,0.35)',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    <MessageCircle size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                    Edit DM Template
                  </span>
                  <ChevronRight size={14} style={{ transform: dmExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }} />
                </button>
                {dmExpanded && (
                  <>
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
                  </>
                )}
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
                  <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}><span>TOTAL</span><span>{fmtRp(tx.total_amount)}</span></p>
                  <p style={{ textAlign: 'center', fontSize: 10, color: '#999', margin: '6px 0', letterSpacing: 2 }}>━━━━━━━━━━━━━━━━━━━━</p>
                  <p style={{ margin: '4px 0', fontSize: 10, textAlign: 'center' }}>Payment: <strong>{tx.payment_method ?? 'PAID'}</strong> ✓</p>
                  {splitNote && <p style={{ margin: '2px 0', fontSize: 8, textAlign: 'center', color: '#888' }}>({splitNote})</p>}
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

      {role === 'crew' && showCrewAttendanceOverlay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', zIndex: 999, display: 'grid', placeItems: 'center', padding: 16 }}>
          <div style={{ width: 'min(920px, 100%)', maxHeight: '90vh', overflow: 'auto', border: '1px solid var(--mera-border)', borderRadius: 20, background: 'var(--mera-surface)', boxShadow: 'var(--mera-shadow-xl)' }}>
            <div style={{ padding: 14, borderBottom: '1px solid var(--mera-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--mera-text-secondary)' }}>Clock in to access dashboard</p>
              <button
                onClick={handleLogout}
                style={{ border: '1px solid var(--mera-border-strong)', borderRadius: 10, background: 'var(--mera-surface-raised)', color: 'var(--mera-text-secondary)', fontWeight: 600, fontSize: 12, padding: '8px 14px' }}
              >
                Back
              </button>
            </div>

            <div style={{ padding: 14 }}>
              <AttendanceBoard onLogout={handleLogout} onClockIn={(crewId) => { 
                  setActiveCrewId(crewId); 
                  localStorage.setItem('mera_pos_crew_id', crewId);
                  setShowCrewAttendanceOverlay(false) 
              }} />
            </div>
          </div>
        </div>
      )}

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
                  const baseSlots = (day === 0 || day === 6) ? WEEKEND_SLOTS : WEEKDAY_SLOTS;
                  // Find all bookings for this date for Basic Studio or Pas Photo
                  const booked = registrations
                    .filter(r => r.preferred_date === editDateInput && (r.addons?.room === 'Basic Studio' || r.addons?.room === 'Pas Photo') && ['PENDING','VERIFIED','PROCESSED'].includes(r.status))
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

