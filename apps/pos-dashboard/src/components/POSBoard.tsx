import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@mera/supabase/client'
import { Clock, CheckCircle2, XCircle, ArrowLeft, Camera, Ticket, Search, User, CreditCard, Banknote, Smartphone, Receipt, Folder, Film, ArrowRight, X, UserX, AlertTriangle, Monitor, ClipboardList, PenTool, RefreshCw, Plus, Minus, ChevronLeft, ChevronRight, Circle, LogOut, LockIcon } from 'lucide-react'
import { type Registration, type RegistrationStatus, type Transaction, type Product, type PaymentMethod, hitungHargaBertingkat } from '@mera/supabase'
import AttendanceBoard from './AttendanceBoard'
import FinanceDashboard from './FinanceDashboard'
import POSGateway from './POSGateway'
import FinanceGateway from './FinanceGateway'
import html2canvas from 'html2canvas'

// ── Types ─────────────────────────────────────────────────────
// Per v2 schema: registrations (antrean Pulau 1) feeds Column 1
// transactions (POS Pulau 2) feeds Column 3

const REG_STATUS_ORDER: RegistrationStatus[] = ['PENDING', 'VERIFIED', 'PROCESSED', 'EXPIRED']

const REG_STATUS_CONFIG: Record<RegistrationStatus, { label: () => React.JSX.Element; bg: string; text: string; border: string }> = {
    PENDING: { label: () => <><Clock size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} /> Pending</>, bg: 'var(--mera-surface-raised)', text: 'var(--mera-text-secondary)', border: 'var(--mera-border)' },
    VERIFIED: { label: () => <><CheckCircle2 size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} /> Verified</>, bg: 'var(--mera-info-bg)', text: 'var(--mera-info)', border: 'var(--mera-info-border)' },
    PROCESSED: { label: () => <><Film size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} /> Processed</>, bg: 'var(--mera-success-bg)', text: 'var(--mera-success)', border: 'var(--mera-success-border)' },
    EXPIRED: { label: () => <><XCircle size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} /> Expired</>, bg: 'var(--mera-error-bg)', text: 'var(--mera-error)', border: 'var(--mera-error-border)' },
}

const BOOKING_TYPE_LABELS: Record<string, () => React.JSX.Element> = {
    OTS: () => <><User size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} /> OTS</>,
    ONLINE_KEEPSLOT: () => <><Clock size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} /> Keep Slot</>,
    ONLINE_QRIS: () => <><CreditCard size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} /> QRIS</>,
}
// Time slots — 12:00 s/d 21:00
export const WEEKDAY_SLOTS = [
    "12:00", "12:30", "13:00", "13:30", "14:00",
    "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30", "19:00",
    "19:30", "20:00", "20:30", "21:00"
]

export const WEEKEND_SLOTS = [
    "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30",
    "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30",
    "19:00", "19:30", "20:00", "20:30", "21:00"
]

const MINI_CALENDAR_WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

type StudioKey = 'BASIC' | 'MAJESTIC' | 'ELEVATOR'

const STUDIO_COLUMNS: Array<{ key: StudioKey; label: string; subtitle: string; dot: string }> = [
    { key: 'BASIC', label: 'Basic', subtitle: 'Basic + Pas Photo', dot: 'var(--mera-info)' },
    { key: 'MAJESTIC', label: 'Majestic', subtitle: 'Majestic Studio', dot: 'var(--mera-warning)' },
    { key: 'ELEVATOR', label: 'Elevator', subtitle: 'Elevator Studio', dot: 'var(--mera-success)' },
]

function startOfLocalDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDateKey(date: Date) {
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    return `${year}-${month}-${day}`
}

function buildMiniMonthDays(monthDate: Date) {
    const firstDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
    const mondayOffset = (firstDayOfMonth.getDay() + 6) % 7
    const gridStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1 - mondayOffset)

    return Array.from({ length: 42 }, (_, index) => {
        const day = new Date(gridStart)
        day.setDate(gridStart.getDate() + index)
        return day
    })
}

function normalizeStudioValue(value: unknown): StudioKey | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_')
    if (!normalized) return null
    if (normalized.includes('PAS') || normalized.includes('BASIC')) return 'BASIC'
    if (normalized.includes('MAJESTIC')) return 'MAJESTIC'
    if (normalized.includes('ELEVATOR')) return 'ELEVATOR'
    return null
}

function getStudioFromRegistration(reg: Registration): StudioKey | null {
    const addons = (reg.addons || {}) as Record<string, unknown>
    const candidates: unknown[] = [
        addons.room,
        addons.studio,
        addons.studio_type,
        addons.selected_studio,
        (reg as any).studio_type,
    ]

    for (const candidate of candidates) {
        const mapped = normalizeStudioValue(candidate)
        if (mapped) return mapped
    }

    return null
}

function studioLabel(studio: StudioKey | null): string {
    if (!studio) return 'Belum Pilih Studio'
    const match = STUDIO_COLUMNS.find(x => x.key === studio)
    return match ? match.subtitle : studio
}
// ── Helper: countdown in minutes for KEEPSLOT ───────────────────────
function keepSlotMinutesLeft(reg: Registration): number | null {
    const exp = reg.expires_at
    if (!exp) return null
    return Math.round((new Date(exp).getTime() - Date.now()) / 60000)
}

// ── Notification Sound & Push ────────────────────────────────────
const playLoudNotification = (reg?: Registration) => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()

        oscillator.type = 'square'
        // High pitched attention-grabbing sequence
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime) // A5
        oscillator.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.15) // C6
        oscillator.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.3) // E6

        // Make it loud
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6)

        oscillator.connect(gainNode)
        gainNode.connect(audioCtx.destination)

        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.6)
    } catch (err) {
        console.error("Audio playback prevented:", err)
    }

    if (reg && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Antrean Baru!', {
            body: `${reg.customer_name} mendaftar (${reg.booking_type})`,
            icon: '/logo-mera-white.png'
        })
    }
}

// ── Main Component ───────────────────────────────────────────
import type { UserRole } from '../types/userRole';

interface POSBoardProps {
    role: UserRole;
    onLogout?: () => void;
}

export default function POSBoard({ role, onLogout }: POSBoardProps) {
    const [activeTab, setActiveTab] = useState<'pos' | 'attendance' | 'finance'>(role === 'owner' ? 'finance' : 'pos')
    const [posUnlocked, setPosUnlocked] = useState(false)
    const [financeUnlocked, setFinanceUnlocked] = useState(false)
    const [registrations, setRegistrations] = useState<Registration[]>([])
    const [selectedReg, setSelectedReg] = useState<Registration | null>(null)
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
    const [filterStatus, setFilterStatus] = useState<RegistrationStatus | 'ALL'>('ALL')
    const [loading, setLoading] = useState(true)
    const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'error'>('connecting')
    const [newIds, setNewIds] = useState<Set<string>>(new Set())
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

    // Tick every 30s so KEEPSLOT countdown badges refresh
    const [, setNow] = useState<number>(Date.now())
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30000)
        return () => clearInterval(timer)
    }, [])

    // ── Load + auto-expire KEEPSLOT regs past expires_at ──────────
    const loadAndAutoExpire = useCallback(async () => {
        const { data } = await supabase
            .from('registrations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(150)
        const all = (data ?? []) as Registration[]
        const toExpire = all.filter(r =>
            r.booking_type === 'ONLINE_KEEPSLOT' &&
            r.status === 'PENDING' &&
            r.expires_at != null &&
            new Date(r.expires_at) < new Date()
        )
        for (const r of toExpire) {
            await (supabase.from('registrations') as any).update({ status: 'EXPIRED' }).eq('id', r.id)
        }
        if (toExpire.length > 0) {
            const { data: fresh } = await supabase.from('registrations').select('*').order('created_at', { ascending: false }).limit(150)
            setRegistrations((fresh ?? []) as Registration[])
        } else {
            setRegistrations(all)
        }
        setLoading(false)
    }, [])

    // ── Supabase Realtime — No Polling ──────────────────────────────────────
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }

        loadAndAutoExpire()

        const channel = supabase
            .channel('pos-registrations-v2')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const r = payload.new as Registration
                    setRegistrations(prev => [r, ...prev])
                    setNewIds(prev => new Set([...prev, r.id]))
                    setTimeout(() => setNewIds(prev => { const s = new Set(prev); s.delete(r.id); return s }), 1500)
                    if (r.status === 'PENDING') playLoudNotification(r)
                } else if (payload.eventType === 'UPDATE') {
                    const r = payload.new as Registration
                    setRegistrations(prev => prev.map(x => x.id === r.id ? r : x))
                    setSelectedReg(prev => prev?.id === r.id ? r : prev)
                } else if (payload.eventType === 'DELETE') {
                    const old = payload.old as { id: string }
                    setRegistrations(prev => prev.filter(x => x.id !== old.id))
                    setSelectedReg(prev => prev?.id === old.id ? null : prev)
                }
            })
            .subscribe(status => {
                if (status === 'SUBSCRIBED') setRealtimeStatus('connected')
                else if (status === 'CLOSED') setRealtimeStatus('error')
                else setRealtimeStatus('connecting')
            })

        channelRef.current = channel
        return () => { supabase.removeChannel(channel) }
    }, [loadAndAutoExpire])

    // ── Status updater ────────────────────────────────────────────
    const updateStatus = async (id: string, status: RegistrationStatus) => {
        // Optimistic UI Update for instant feedback
        setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
        setSelectedReg(prev => prev?.id === id ? { ...prev, status } : prev)

        if (status === 'PROCESSED') {
            setSelectedReg(null)
        }

        const { error } = await (supabase.from('registrations') as any).update({ status }).eq('id', id)
        if (error) {
            console.error('Update status error:', error)
            alert('Gagal update status: ' + error.message)
            handleRefresh() // Revert state from server
        }
    }

    const handleRefresh = () => {
        setLoading(true)
        loadAndAutoExpire()
    }

    // ── Filtered & sorted ─────────────────────────────────────────
    const filtered = registrations.filter(r => filterStatus === 'ALL' || r.status === filterStatus)
    const sorted = [...filtered].sort((a, b) =>
        REG_STATUS_ORDER.indexOf(a.status) - REG_STATUS_ORDER.indexOf(b.status)
    )

    // Helper to render an individual booking card
    const renderBookingCard = (reg: Registration) => {
        const sc = REG_STATUS_CONFIG[reg.status]
        const isActive = selectedReg?.id === reg.id
        const isNew = newIds.has(reg.id)
        const mappedStudio = getStudioFromRegistration(reg)
        const minsLeft = reg.booking_type === 'ONLINE_KEEPSLOT' ? keepSlotMinutesLeft(reg) : null
        const expiredSlot = minsLeft !== null && minsLeft <= 0
        const urgentSlot = minsLeft !== null && minsLeft > 0 && minsLeft <= 60

        return (
            <button
                key={reg.id}
                onClick={() => { setSelectedReg(isActive ? null : reg); setSelectedTx(null) }}
                className={`gc-booking-card${isNew ? ' realtime-new' : ''}`}
                style={{
                    width: '100%', textAlign: 'left', padding: '12px 12px 10px',
                    background: isActive ? 'var(--mera-surface-raised)' : 'rgba(255,255,255,0.02)',
                    border: '1px solid', borderColor: isActive ? sc.border : expiredSlot ? 'var(--mera-error-border)' : 'var(--mera-border)',
                    borderLeft: `4px solid ${expiredSlot ? 'var(--mera-error)' : sc.text}`,
                    borderRadius: 'var(--mera-radius-md)', cursor: 'pointer',
                    transition: 'all 0.15s', position: 'relative',
                    boxShadow: isActive ? 'var(--mera-shadow-md)' : 'none'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                        <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--mera-text-primary)' }}>{reg.customer_name}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: 'var(--mera-text-tertiary)' }}>{BOOKING_TYPE_LABELS[reg.booking_type]?.() ?? reg.booking_type}</span>
                            <span style={{ fontSize: 11, color: 'var(--mera-text-tertiary)' }}>• {studioLabel(mappedStudio)}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--mera-radius-full)', background: sc.bg, color: sc.text }}>
                            {sc.label()}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--mera-text-secondary)', fontWeight: 600 }}>
                            {new Date(reg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>

                {reg.session_id && (
                    <div style={{ display: 'inline-block', padding: '4px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, marginTop: 8, border: '1px solid var(--mera-border)' }}>
                        <p style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--mera-info)', fontWeight: 700, letterSpacing: '0.05em' }}>
                            <><Ticket size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} /> {reg.session_id}</>
                        </p>
                    </div>
                )}

                {/* KEEPSLOT countdown badge */}
                {minsLeft !== null && reg.status === 'PENDING' && (
                    <div style={{
                        marginTop: 8, padding: '4px 8px', borderRadius: 6, display: 'inline-block',
                        background: expiredSlot ? 'var(--mera-error-bg)' : urgentSlot ? 'var(--mera-warning-bg)' : 'var(--mera-surface-raised)',
                        color: expiredSlot ? 'var(--mera-error)' : urgentSlot ? 'var(--mera-warning)' : 'var(--mera-text-secondary)',
                        fontSize: 10, fontWeight: 700,
                    }}>
                        {expiredSlot ? '⏰ Slot Expired' : `⏳ ${minsLeft} to Expired`}
                    </div>
                )}

                {/* Quick Actions Array */}
                {reg.status === 'PENDING' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); updateStatus(reg.id, 'VERIFIED') }}
                        style={{
                            display: 'block', width: '100%', marginTop: 12, padding: '8px',
                            borderRadius: 'var(--mera-radius-md)', border: '1px solid var(--mera-info-border)', background: 'var(--mera-info-bg)',
                            color: 'var(--mera-info)', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                    >
                        <CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 4 }} /> Verifikasi Cepat
                    </button>
                )}
                {reg.status === 'VERIFIED' && (
                    <button
                        onClick={async (e) => {
                            e.stopPropagation()
                            const sid = reg.session_id
                                ?? `${new Date().getDate().toString().padStart(2, '0')}-${reg.customer_name.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6)}-WALK`
                            const computedPrice = (reg.addons as any)?.computed_price ?? 0
                            const { data, error } = await (supabase.from('transactions') as any).insert({
                                session_id: sid,
                                registration_id: reg.id,
                                status: 'ACTIVE',
                                total_amount: computedPrice,
                            }).select().single()

                            if (!error && data) {
                                await updateStatus(reg.id, 'PROCESSED')
                                setSelectedReg(null)
                                setSelectedTx(data)
                            } else {
                                alert(error?.message || 'Gagal membuat sesi transaksi')
                            }
                        }}
                        style={{
                            display: 'block', width: '100%', marginTop: 12, padding: '8px',
                            borderRadius: 'var(--mera-radius-md)', border: '1px solid var(--mera-border-strong)', background: 'var(--mera-text-primary)',
                            color: 'var(--mera-bg)', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                    >
                        🎬 Buka Sesi Cepat
                    </button>
                )}
            </button>
        )
    }

    // ── Stats ─────────────────────────────────────────────────────
    const stats: Record<RegistrationStatus, number> = { PENDING: 0, VERIFIED: 0, PROCESSED: 0, EXPIRED: 0 }
    registrations.forEach(r => { stats[r.status] = (stats[r.status] ?? 0) + 1 })

    // ── Sidebar State ─────────────────────────────────────────────
    const [displayedMonth, setDisplayedMonth] = useState(() => {
        const now = new Date()
        return new Date(now.getFullYear(), now.getMonth(), 1)
    })
    const [selectedDate, setSelectedDate] = useState(() => startOfLocalDay(new Date()))

    const liveNow = new Date()
    const today = startOfLocalDay(liveNow)
    const todayKey = formatDateKey(today)
    const selectedDateKey = formatDateKey(selectedDate)
    const selectedIsToday = selectedDateKey === todayKey
    const displayedMonthLabel = displayedMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    const selectedDateLabel = selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const selectedDateShort = selectedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    const monthDays = buildMiniMonthDays(displayedMonth)
    const selectedSlots = (selectedDate.getDay() === 0 || selectedDate.getDay() === 6) ? WEEKEND_SLOTS : WEEKDAY_SLOTS
    const currentSlotLabel = selectedIsToday
        ? `${String(liveNow.getHours()).padStart(2, '0')}:${liveNow.getMinutes() < 30 ? '00' : '30'}`
        : null

    const bookingsByDate = registrations.reduce<Record<string, number>>((acc, reg) => {
        if (reg.preferred_date) {
            acc[reg.preferred_date] = (acc[reg.preferred_date] ?? 0) + 1
        }
        return acc
    }, {})

    const selectedDateRegistrations = sorted.filter(reg => reg.preferred_date === selectedDateKey)
    const selectedDateScheduled = selectedDateRegistrations.filter(reg => reg.preferred_time && selectedSlots.includes(reg.preferred_time))
    const selectedDateScheduledWithStudio = selectedDateScheduled.filter(reg => getStudioFromRegistration(reg) !== null)
    const studioTotals = STUDIO_COLUMNS.reduce((acc, studio) => {
        acc[studio.key] = selectedDateRegistrations.filter(reg => getStudioFromRegistration(reg) === studio.key).length
        return acc
    }, { BASIC: 0, MAJESTIC: 0, ELEVATOR: 0 } as Record<StudioKey, number>)
    const unassignedStudioCount = selectedDateRegistrations.filter(reg => getStudioFromRegistration(reg) === null).length

    const floatingQueue = sorted.filter(reg => {
        const hasSelectedDate = reg.preferred_date === selectedDateKey
        const hasSlot = Boolean(reg.preferred_time && selectedSlots.includes(reg.preferred_time))
        const hasStudio = Boolean(getStudioFromRegistration(reg))
        return (!hasSlot || !hasStudio) && (!reg.preferred_date || hasSelectedDate)
    })
    const selectedDayStats: Record<RegistrationStatus, number> = { PENDING: 0, VERIFIED: 0, PROCESSED: 0, EXPIRED: 0 }
    selectedDateRegistrations.forEach(reg => {
        selectedDayStats[reg.status] = (selectedDayStats[reg.status] ?? 0) + 1
    })
    const occupiedSlots = selectedSlots.filter(slot => selectedDateScheduledWithStudio.some(reg => reg.preferred_time === slot)).length
    const hasInspector = Boolean(selectedReg || selectedTx)
    const queuePreview = floatingQueue.slice(0, 6)
    const sessionAttention = selectedDateRegistrations
        .filter(reg => reg.status === 'PENDING' || reg.status === 'VERIFIED')
        .slice(0, 5)
    const liveQueueCount = stats.PENDING + stats.VERIFIED

    const handleSelectDate = (date: Date) => {
        const nextDate = startOfLocalDay(date)
        setSelectedDate(nextDate)
        setDisplayedMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1))
        setSelectedReg(null)
        setSelectedTx(null)
    }

    return (
        <div className="gc-shell gc-simple-app" style={{ background: 'var(--mera-bg)' }}>
            <aside className="gc-left-rail gc-simple-rail" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                padding: 0,
                borderRight: '1px solid var(--mera-border)',
                background: 'rgba(10,10,12,0.94)'
            }}>
                <div style={{
                    padding: '18px 18px 16px',
                    borderBottom: '1px solid var(--mera-border)',
                    display: 'grid',
                    gap: 12
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'grid', gap: 6 }}>
                            <img src="/logo-mera-white.png" style={{ height: 24, objectFit: 'contain' }} alt="Mera" />
                            <span style={{ fontSize: 11, color: 'var(--mera-text-tertiary)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                Ops Dashboard
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleRefresh}
                                disabled={loading}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 999,
                                    border: '1px solid var(--mera-border)',
                                    background: 'var(--mera-surface-raised)',
                                    color: 'var(--mera-text-primary)',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    opacity: loading ? 0.7 : 1
                                }}
                            >
                                <RefreshCw size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
                                {loading ? 'Syncing' : 'Sync'}
                            </button>
                        </div>
                    </div>
                    <div style={{
                        border: '1px solid var(--mera-border)',
                        borderRadius: 18,
                        padding: '14px 14px 12px',
                        background: 'rgba(255,255,255,0.03)',
                        display: 'grid',
                        gap: 10
                    }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                            <div>
                                <p style={{ fontSize: 11, color: 'var(--mera-text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Selected Day</p>
                                <h2 style={{ fontSize: 20, color: 'var(--mera-text-primary)', fontWeight: 800, marginTop: 4 }}>{selectedDateShort}</h2>
                            </div>
                            <button
                                onClick={() => handleSelectDate(today)}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: 999,
                                    border: '1px solid var(--mera-border)',
                                    background: selectedIsToday ? 'var(--mera-surface-raised)' : 'transparent',
                                    color: 'var(--mera-text-primary)',
                                    fontSize: 11,
                                    fontWeight: 700
                                }}
                            >
                                Today
                            </button>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--mera-text-secondary)', lineHeight: 1.5 }}>{selectedDateLabel}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                            <div style={{ border: '1px solid var(--mera-border)', borderRadius: 14, padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}>
                                <p style={{ fontSize: 10, color: 'var(--mera-text-tertiary)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Bookings</p>
                                <strong style={{ display: 'block', marginTop: 4, fontSize: 18, color: 'var(--mera-text-primary)' }}>{selectedDateRegistrations.length}</strong>
                            </div>
                            <div style={{ border: '1px solid var(--mera-border)', borderRadius: 14, padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}>
                                <p style={{ fontSize: 10, color: 'var(--mera-text-tertiary)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Live Queue</p>
                                <strong style={{ display: 'block', marginTop: 4, fontSize: 18, color: 'var(--mera-text-primary)' }}>{liveQueueCount}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {!(activeTab === 'pos' && !posUnlocked) && (
                    <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0, overflowY: 'auto' }}>
                        <section style={{
                            border: '1px solid var(--mera-border)',
                            borderRadius: 20,
                            background: 'rgba(255,255,255,0.03)',
                            padding: '16px',
                            display: 'grid',
                            gap: 14
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <div>
                                    <p style={{ fontSize: 11, color: 'var(--mera-text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Monthly</p>
                                    <p style={{ fontSize: 17, color: 'var(--mera-text-primary)', fontWeight: 700, marginTop: 4 }}>{displayedMonthLabel}</p>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                        onClick={() => setDisplayedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                                        style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--mera-border)', background: 'transparent', color: 'var(--mera-text-secondary)' }}
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    <button
                                        onClick={() => setDisplayedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                                        style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--mera-border)', background: 'transparent', color: 'var(--mera-text-secondary)' }}
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                                {MINI_CALENDAR_WEEKDAYS.map(day => (
                                    <span key={day} style={{ fontSize: 10, color: 'var(--mera-text-tertiary)', textAlign: 'center', fontWeight: 700 }}>{day}</span>
                                ))}
                                {monthDays.map(day => {
                                    const dayKey = formatDateKey(day)
                                    const isCurrentMonth = day.getMonth() === displayedMonth.getMonth()
                                    const isSelected = dayKey === selectedDateKey
                                    const isToday = dayKey === todayKey
                                    const bookingCount = bookingsByDate[dayKey] ?? 0

                                    return (
                                        <button
                                            key={dayKey}
                                            onClick={() => handleSelectDate(day)}
                                            style={{
                                                minHeight: 38,
                                                borderRadius: 12,
                                                border: `1px solid ${isSelected ? 'var(--mera-border-strong)' : 'transparent'}`,
                                                background: isSelected ? 'var(--mera-surface-raised)' : isToday ? 'rgba(255,255,255,0.05)' : 'transparent',
                                                color: isCurrentMonth ? 'var(--mera-text-primary)' : 'var(--mera-text-tertiary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                position: 'relative',
                                                fontSize: 12,
                                                fontWeight: isSelected || isToday ? 700 : 500
                                            }}
                                        >
                                            {day.getDate()}
                                            {bookingCount > 0 && (
                                                <span style={{
                                                    position: 'absolute',
                                                    bottom: 4,
                                                    width: 5,
                                                    height: 5,
                                                    borderRadius: '50%',
                                                    background: isSelected ? 'var(--mera-text-primary)' : 'var(--mera-info)'
                                                }} />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </section>

                        <section style={{
                            border: '1px solid var(--mera-border)',
                            borderRadius: 20,
                            background: 'rgba(255,255,255,0.03)',
                            padding: '16px',
                            display: 'grid',
                            gap: 10
                        }}>
                            <div style={{ display: 'grid', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 11, color: 'var(--mera-text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Studio Load</span>
                                    <span style={{ fontSize: 11, color: 'var(--mera-text-secondary)', fontWeight: 700 }}>{occupiedSlots}/{selectedSlots.length} slots</span>
                                </div>
                                {STUDIO_COLUMNS.map(studio => (
                                    <div key={studio.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--mera-text-secondary)', fontWeight: 600 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: studio.dot }} />
                                            {studio.label}
                                        </span>
                                        <strong style={{ color: 'var(--mera-text-primary)', fontSize: 13 }}>{studioTotals[studio.key]}</strong>
                                    </div>
                                ))}
                            </div>
                            <div style={{ borderTop: '1px solid var(--mera-border)', paddingTop: 10, display: 'grid', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--mera-text-secondary)' }}>
                                    <span>Pending + Verified</span>
                                    <strong style={{ color: 'var(--mera-warning)' }}>{selectedDayStats.PENDING + selectedDayStats.VERIFIED}</strong>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--mera-text-secondary)' }}>
                                    <span>Need Slot</span>
                                    <strong style={{ color: 'var(--mera-text-primary)' }}>{floatingQueue.length}</strong>
                                </div>
                            </div>
                        </section>

                        <div style={{ display: 'grid', gap: 8 }}>
                                                        {([['pos', <Receipt size={18} />, 'Booking'], ['attendance', <ClipboardList size={18} />, 'Attendance']] as const)
                                                            .concat(role === 'owner' ? [[ 'finance', <Banknote size={18} />, 'Finance' ] as const] : [])
                                                            .map(([key, icon, label]) => (
                                                                <button
                                                                    key={key}
                                                                    onClick={() => setActiveTab(key)}
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'space-between',
                                                                        gap: 12,
                                                                        padding: '12px 14px',
                                                                        fontSize: 14,
                                                                        fontWeight: activeTab === key ? 700 : 500,
                                                                        border: `1px solid ${activeTab === key ? 'var(--mera-border-strong)' : 'var(--mera-border)'}`,
                                                                        borderRadius: 'var(--mera-radius-md)',
                                                                        background: activeTab === key ? 'var(--mera-surface-raised)' : 'transparent',
                                                                        color: activeTab === key ? 'var(--mera-text-primary)' : 'var(--mera-text-secondary)',
                                                                        boxShadow: activeTab === key ? 'var(--mera-shadow-sm)' : 'none'
                                                                    }}
                                                                >
                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                                                                        {icon}
                                                                        {label}
                                                                    </span>
                                                                    {activeTab === key && <Circle size={10} fill="currentColor" />}
                                                                </button>
                                                            ))}
                        </div>
                    </div>
                )}

                <div style={{ padding: '16px 18px', borderTop: '1px solid var(--mera-border)', display: 'grid', gap: 12 }}>
                    {role === 'owner' && !(activeTab === 'pos' && !posUnlocked) && (
                        <button
                            onClick={() => setActiveTab('finance')}
                            style={{
                                fontSize: 12,
                                padding: '10px 12px',
                                border: '1px solid var(--mera-border)',
                                borderRadius: 'var(--mera-radius-md)',
                                background: activeTab === 'finance' ? 'var(--mera-surface-raised)' : 'rgba(255,255,255,0.03)',
                                color: 'var(--mera-text-primary)',
                                textAlign: 'center',
                                fontWeight: 700
                            }}
                            title="Owner finance dashboard"
                        >
                            Owner Finance Dashboard
                        </button>
                    )}

                    {!(activeTab === 'pos' && !posUnlocked) && (
                        <a href="/backoffice" style={{
                            fontSize: 12,
                            padding: '10px 12px',
                            border: '1px solid var(--mera-border)',
                            borderRadius: 'var(--mera-radius-md)',
                            background: 'rgba(255,255,255,0.03)',
                            color: 'var(--mera-text-secondary)',
                            textAlign: 'center'
                        }}>
                            Open Backoffice Island
                        </a>
                    )}

                    {!(activeTab === 'pos' && !posUnlocked) && (
                        <a href="/kiosk" target="_blank" rel="noopener" style={{
                            fontSize: 12,
                            padding: '10px 12px',
                            border: '1px solid var(--mera-border)',
                            borderRadius: 'var(--mera-radius-md)',
                            background: 'rgba(255,255,255,0.03)',
                            color: 'var(--mera-text-secondary)',
                            textAlign: 'center'
                        }}>
                            Open Kiosk View
                        </a>
                    )}

                    {(posUnlocked || financeUnlocked) && (
                        <button
                            onClick={() => {
                                setPosUnlocked(false)
                                setFinanceUnlocked(false)
                                setActiveTab('pos')
                            }}
                            style={{
                                fontSize: 12,
                                padding: '10px 12px',
                                border: '1px solid var(--mera-error-border)',
                                borderRadius: 'var(--mera-radius-md)',
                                background: 'var(--mera-error-bg)',
                                color: 'var(--mera-error)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6
                            }}
                            title="Keluar / Kunci POS"
                        >
                            <LockIcon size={14} />
                            Lock System
                        </button>
                    )}

                    {onLogout && (
                        <button
                            onClick={onLogout}
                            style={{
                                fontSize: 12,
                                padding: '10px 12px',
                                border: '1px solid var(--mera-error-border)',
                                borderRadius: 'var(--mera-radius-md)',
                                background: 'var(--mera-error-bg)',
                                color: 'var(--mera-error)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                width: '100%'
                            }}
                            title="Logout"
                        >
                            <LockIcon size={14} />
                            Logout
                        </button>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--mera-text-secondary)' }}>
                        <div style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            flexShrink: 0,
                            background: realtimeStatus === 'connected' ? 'var(--mera-success)' : realtimeStatus === 'error' ? 'var(--mera-error)' : 'var(--mera-warning)',
                            boxShadow: realtimeStatus === 'connected' ? '0 0 0 3px rgba(52,199,89,0.2)' : 'none'
                        }} />
                        <span>
                            {realtimeStatus === 'connected' ? 'Server connected' : realtimeStatus === 'connecting' ? 'Connecting...' : 'Server offline'}
                        </span>
                    </div>
                </div>
            </aside>

            <div className="gc-simple-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                {activeTab === 'attendance' && (
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <AttendanceBoard />
                    </div>
                )}
                {activeTab === 'finance' && !financeUnlocked && (
                    <FinanceGateway onUnlocked={() => setFinanceUnlocked(true)} />
                )}
                {activeTab === 'finance' && financeUnlocked && (
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <FinanceDashboard />
                    </div>
                )}
                {activeTab === 'pos' && !posUnlocked && (
                    <POSGateway
                        onUnlocked={() => setPosUnlocked(true)}
                        onGoToAttendance={() => setActiveTab('attendance')}
                    />
                )}

                {activeTab === 'pos' && posUnlocked && (
                    <div className="gc-pos-layout">
                        <section className="gc-panel-card" style={{
                            display: 'grid',
                            gridTemplateRows: 'auto auto minmax(0,1fr)',
                            overflow: 'hidden'
                        }}>
                            <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid var(--mera-border)', display: 'grid', gap: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                                    <div>
                                        <p style={{ fontSize: 11, color: 'var(--mera-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>Per Studio Schedule</p>
                                        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--mera-text-primary)', marginBottom: 6 }}>{selectedDateLabel}</h2>
                                        <p style={{ fontSize: 13, color: 'var(--mera-text-secondary)' }}>
                                            {selectedIsToday ? 'Fokus operasional hari ini, dibagi per studio.' : 'Pilih hari dari mini month untuk memindahkan fokus jadwal.'}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                        {REG_STATUS_ORDER.map(status => (
                                            <div key={status} style={{
                                                padding: '8px 12px',
                                                borderRadius: 999,
                                                border: '1px solid var(--mera-border)',
                                                background: 'rgba(255,255,255,0.03)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8
                                            }}>
                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: REG_STATUS_CONFIG[status].text }} />
                                                <span style={{ fontSize: 11, color: 'var(--mera-text-secondary)', fontWeight: 700 }}>{status}</span>
                                                <strong style={{ fontSize: 12, color: 'var(--mera-text-primary)' }}>{selectedDayStats[status] ?? 0}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {(['ALL', ...REG_STATUS_ORDER] as const).map(status => (
                                        <button
                                            key={status}
                                            onClick={() => setFilterStatus(status)}
                                            style={{
                                                padding: '7px 12px',
                                                borderRadius: 999,
                                                border: `1px solid ${filterStatus === status ? 'var(--mera-border-strong)' : 'var(--mera-border)'}`,
                                                background: filterStatus === status ? 'var(--mera-surface-raised)' : 'transparent',
                                                color: filterStatus === status ? 'var(--mera-text-primary)' : 'var(--mera-text-secondary)',
                                                fontSize: 11,
                                                fontWeight: 700
                                            }}
                                        >
                                            {status === 'ALL' ? 'Semua Status' : status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--mera-border)', display: 'grid', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--mera-text-primary)' }}>Need Slot / Walk-in</p>
                                        <p style={{ fontSize: 11, color: 'var(--mera-text-secondary)', marginTop: 4 }}>
                                            Booking tanpa slot pasti atau studio assignment tetap tampil di sini untuk ditangani cepat.
                                        </p>
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--mera-text-secondary)', padding: '4px 10px', borderRadius: 999, background: 'var(--mera-surface-raised)' }}>
                                        {floatingQueue.length}
                                    </span>
                                </div>
                                {queuePreview.length === 0 ? (
                                    <div style={{ border: '1px dashed var(--mera-border)', borderRadius: 14, padding: '14px 16px', color: 'var(--mera-text-tertiary)', fontSize: 12 }}>
                                        Semua booking di tanggal ini sudah punya slot dan studio yang jelas.
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                                        {queuePreview.map(reg => renderBookingCard(reg))}
                                    </div>
                                )}
                            </div>

                            <div style={{ minHeight: 0, overflow: 'auto', padding: '16px 20px 20px' }}>
                                <div style={{ minWidth: 820, display: 'grid', gap: 12 }}>
                                    <div className="gc-schedule-grid" style={{ position: 'sticky', top: 0, zIndex: 2, background: 'rgba(21,21,23,0.96)', paddingBottom: 8 }}>
                                        <div style={{ fontSize: 11, color: 'var(--mera-text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', paddingTop: 10 }}>Time</div>
                                        {STUDIO_COLUMNS.map(studio => (
                                            <div key={studio.key} style={{
                                                border: '1px solid var(--mera-border)',
                                                borderRadius: 14,
                                                padding: '10px 12px',
                                                background: 'rgba(255,255,255,0.03)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: studio.dot }} />
                                                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--mera-text-primary)' }}>{studio.subtitle}</p>
                                                </div>
                                                <p style={{ fontSize: 11, color: 'var(--mera-text-secondary)', marginTop: 6 }}>{studioTotals[studio.key]} booking</p>
                                            </div>
                                        ))}
                                    </div>

                                    {selectedSlots.map(time => {
                                        const bookingsByStudio: Record<StudioKey, Registration[]> = {
                                            BASIC: [],
                                            MAJESTIC: [],
                                            ELEVATOR: [],
                                        }

                                        selectedDateScheduledWithStudio
                                            .filter(reg => reg.preferred_time === time)
                                            .forEach(reg => {
                                                const studio = getStudioFromRegistration(reg)
                                                if (studio) bookingsByStudio[studio].push(reg)
                                            })

                                        const isCurrentSlot = currentSlotLabel === time

                                        return (
                                            <div key={time} className="gc-schedule-grid gc-slot-row" style={{ borderTopColor: isCurrentSlot ? 'var(--mera-info-border)' : 'var(--mera-border)' }}>
                                                <div className="gc-time-label" style={{ paddingTop: 10 }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: isCurrentSlot ? 'var(--mera-info)' : 'var(--mera-text-tertiary)' }}>{time}</span>
                                                </div>
                                                {STUDIO_COLUMNS.map(studio => {
                                                    const studioBookings = bookingsByStudio[studio.key]
                                                    return (
                                                        <div key={`${time}-${studio.key}`} style={{ display: 'grid', gap: 8, paddingBottom: 4 }}>
                                                            {studioBookings.length > 0 ? studioBookings.map(reg => renderBookingCard(reg)) : (
                                                                <div className="gc-empty-slot" style={{
                                                                    padding: '16px 14px',
                                                                    border: '1px dashed var(--mera-border)',
                                                                    borderRadius: 14,
                                                                    color: 'var(--mera-text-tertiary)',
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                    background: isCurrentSlot ? 'rgba(106,154,176,0.08)' : 'rgba(255,255,255,0.02)'
                                                                }}>
                                                                    {isCurrentSlot ? 'Slot berjalan' : 'Tersedia'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )
                                    })}

                                    {unassignedStudioCount > 0 && (
                                        <div style={{
                                            padding: '10px 12px',
                                            borderRadius: 12,
                                            border: '1px solid var(--mera-warning-border)',
                                            background: 'var(--mera-warning-bg)',
                                            color: 'var(--mera-warning)',
                                            fontSize: 12,
                                            fontWeight: 700
                                        }}>
                                            {unassignedStudioCount} booking belum punya studio assignment dan tetap masuk ke panel Need Slot.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <aside className="gc-session-pane">
                            <section className="gc-panel-card" style={{ display: 'grid', gridTemplateRows: 'auto minmax(0,1fr)', overflow: 'hidden' }}>
                                <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--mera-border)' }}>
                                    <p style={{ fontSize: 11, color: 'var(--mera-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>
                                        {hasInspector ? 'Active Selection' : 'Session Handling'}
                                    </p>
                                    <h3 style={{ fontSize: 20, color: 'var(--mera-text-primary)', fontWeight: 800, marginBottom: 6 }}>POS Transactions</h3>
                                    <p style={{ fontSize: 12, color: 'var(--mera-text-secondary)' }}>Pilih sesi aktif untuk lanjut ke pembayaran, add-on, atau follow up pelanggan.</p>
                                </div>
                                <div style={{ padding: '14px 16px 16px', minHeight: 0 }}>
                                    <TransactionBoard
                                        selectedTxId={selectedTx?.id ?? null}
                                        onSelectTx={(tx) => { setSelectedTx(tx); setSelectedReg(null) }}
                                    />
                                </div>
                            </section>

                            <section className="gc-panel-card" style={{ overflow: 'hidden', minHeight: 0 }}>
                                {selectedReg && !selectedTx ? (
                                    <RegistrationDetailPanel
                                        reg={selectedReg}
                                        onStatusChange={updateStatus}
                                        onClose={() => setSelectedReg(null)}
                                        onSessionOpened={(tx) => {
                                            setSelectedReg(null)
                                            setSelectedTx(tx)
                                        }}
                                    />
                                ) : selectedTx ? (
                                    <TransactionDetailPanel
                                        tx={selectedTx}
                                        registrations={registrations}
                                        onClose={() => setSelectedTx(null)}
                                    />
                                ) : (
                                    <div style={{ padding: '18px', display: 'grid', gridTemplateRows: 'auto auto minmax(0,1fr)', gap: 16, height: '100%', minHeight: 0 }}>
                                        <div>
                                            <p style={{ fontSize: 11, color: 'var(--mera-text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Session Panel</p>
                                            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--mera-text-primary)', marginBottom: 6 }}>Select a booking or session</h3>
                                            <p style={{ fontSize: 13, color: 'var(--mera-text-secondary)', lineHeight: 1.5 }}>
                                                Klik card di schedule atau transaksi di atas untuk membuka detail operasional, pembayaran, dan follow up.
                                            </p>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                                            <div style={{ border: '1px solid var(--mera-border)', borderRadius: 14, padding: '12px', background: 'rgba(255,255,255,0.03)' }}>
                                                <p style={{ fontSize: 10, color: 'var(--mera-text-tertiary)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Day Total</p>
                                                <strong style={{ display: 'block', marginTop: 4, fontSize: 18 }}>{selectedDateRegistrations.length}</strong>
                                            </div>
                                            <div style={{ border: '1px solid var(--mera-border)', borderRadius: 14, padding: '12px', background: 'rgba(255,255,255,0.03)' }}>
                                                <p style={{ fontSize: 10, color: 'var(--mera-text-tertiary)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Filled Slots</p>
                                                <strong style={{ display: 'block', marginTop: 4, fontSize: 18 }}>{occupiedSlots}</strong>
                                            </div>
                                            <div style={{ border: '1px solid var(--mera-border)', borderRadius: 14, padding: '12px', background: 'rgba(255,255,255,0.03)' }}>
                                                <p style={{ fontSize: 10, color: 'var(--mera-text-tertiary)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Attention</p>
                                                <strong style={{ display: 'block', marginTop: 4, fontSize: 18 }}>{sessionAttention.length}</strong>
                                            </div>
                                        </div>

                                        <div style={{ minHeight: 0, overflow: 'auto', display: 'grid', gap: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--mera-text-primary)' }}>Need Attention</p>
                                                <span style={{ fontSize: 11, color: 'var(--mera-text-secondary)', fontWeight: 700 }}>{sessionAttention.length} booking</span>
                                            </div>
                                            {sessionAttention.length === 0 ? (
                                                <div style={{ border: '1px dashed var(--mera-border)', borderRadius: 14, padding: '16px', color: 'var(--mera-text-tertiary)', fontSize: 12 }}>
                                                    Tidak ada booking prioritas untuk view ini.
                                                </div>
                                            ) : (
                                                <div style={{ display: 'grid', gap: 8 }}>
                                                    {sessionAttention.map(reg => renderBookingCard(reg))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </section>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Transaction Board (Center Column) ────────────────────────
function TransactionBoard({ selectedTxId, onSelectTx }: { selectedTxId: string | null; onSelectTx: (tx: Transaction) => void }) {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)
            .then(({ data }) => {
                setTransactions((data ?? []) as Transaction[])
                setLoading(false)
            })

        // Also subscribe to transactions Realtime
        const ch = supabase
            .channel('pos-transactions-v2')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setTransactions(prev => [payload.new as Transaction, ...prev])
                } else if (payload.eventType === 'UPDATE') {
                    const u = payload.new as Transaction
                    setTransactions(prev => prev.map(t => t.id === u.id ? u : t))
                }
            })
            .subscribe()

        return () => { supabase.removeChannel(ch) }
    }, [])

    const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
        ACTIVE: { bg: 'var(--mera-warning-bg)', text: 'var(--mera-warning)' },
        PAID: { bg: 'var(--mera-success-bg)', text: 'var(--mera-success)' },
        REFUNDED: { bg: 'var(--mera-error-bg)', text: 'var(--mera-error)' },
        VOID: { bg: 'var(--mera-surface-raised)', text: 'var(--mera-text-secondary)' },
    }
    const featuredTransactions = transactions.filter(tx => tx.status === 'ACTIVE')
    const visibleTransactions = (featuredTransactions.length > 0 ? featuredTransactions : transactions).slice(0, 12)

    if (loading) return <p style={{ textAlign: 'center', color: 'var(--mera-text-tertiary)', padding: 40 }}>Loading...</p>

    if (transactions.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: 48 }}>
                <p style={{ fontSize: 36, marginBottom: 12 }}><Receipt size={36} color="var(--mera-text-tertiary)" /></p>
                <p style={{ color: 'var(--mera-text-tertiary)', fontSize: 14 }}>No transactions today</p>
                <p style={{ color: 'var(--mera-text-tertiary)', fontSize: 12, marginTop: 4 }}>Transactions via Realtime</p>
            </div>
        )
    }

    return (
        <div style={{ display: 'grid', gridTemplateRows: 'auto minmax(0,1fr)', gap: 12, height: '100%', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12, color: 'var(--mera-text-secondary)' }}>
                <span>{featuredTransactions.length} sesi aktif</span>
                <span>{transactions.length} transaksi terbaru</span>
            </div>
            <div style={{ display: 'grid', gap: 10, overflowY: 'auto', minHeight: 0, paddingRight: 2 }}>
                {visibleTransactions.map(tx => {
                    const sc = STATUS_COLOR[tx.status] ?? STATUS_COLOR.ACTIVE
                    const isActiveOption = selectedTxId === tx.id
                    return (
                        <button key={tx.id} onClick={() => onSelectTx(tx)} style={{
                            width: '100%',
                            background: isActiveOption ? 'var(--mera-surface-raised)' : 'rgba(255,255,255,0.02)',
                            border: `1.5px solid ${isActiveOption ? 'var(--mera-border-strong)' : 'var(--mera-border)'}`,
                            borderRadius: '18px',
                            padding: '14px 15px',
                            boxShadow: isActiveOption ? 'var(--mera-shadow-md)' : 'var(--mera-shadow-sm)',
                            textAlign: 'left',
                            transition: 'all 0.15s'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                                <div>
                                    <span style={{ display: 'block', fontFamily: 'monospace', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em', color: 'var(--mera-text-primary)' }}>
                                        {tx.session_id}
                                    </span>
                                    <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: 'var(--mera-text-tertiary)' }}>
                                        {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--mera-radius-full)', background: sc.bg, color: sc.text }}>
                                    {tx.status}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                                <strong style={{ fontSize: 20, color: 'var(--mera-text-primary)' }}>Rp {tx.total_amount.toLocaleString('id-ID')}</strong>
                                <span style={{ fontSize: 11, color: 'var(--mera-text-secondary)', fontWeight: 700 }}>{tx.payment_method ?? 'Belum bayar'}</span>
                            </div>
                            {tx.discount_amount > 0 && (
                                <p style={{ fontSize: 11, color: 'var(--mera-error)', marginTop: 8 }}>
                                    Disc: −Rp {tx.discount_amount.toLocaleString('id-ID')}
                                    {tx.discount_reason && <span style={{ color: 'var(--mera-text-tertiary)' }}> ({tx.discount_reason})</span>}
                                </p>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ── Registration Detail Panel (Right Column) ──────────────────
function RegistrationDetailPanel({
    reg, onStatusChange, onClose, onSessionOpened
}: {
    reg: Registration
    onStatusChange: (id: string, s: RegistrationStatus) => void
    onClose: () => void
    onSessionOpened: (tx: Transaction) => void
}) {
    const [saving, setSaving] = useState(false)
    const [opening, setOpening] = useState(false)
    const [openError, setOpenError] = useState<string | null>(null)
    const [opened, setOpened] = useState(false)
    const sc = REG_STATUS_CONFIG[reg.status]

    const handleStatus = async (s: RegistrationStatus) => {
        setSaving(true)
        await onStatusChange(reg.id, s)
        setSaving(false)
    }

    // ── Create a Transaction Session from this Registration ──────
    const handleBukaSesi = async () => {
        setOpening(true)
        setOpenError(null)

        const sid = (reg as any).session_id
            ?? `${new Date().getDate().toString().padStart(2, '0')}-${reg.customer_name.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6)}-WALK`

        const computedPrice = (reg.addons as any)?.computed_price ?? 0

        const { data, error } = await (supabase.from('transactions') as any).insert({
            session_id: sid,
            registration_id: reg.id,
            status: 'ACTIVE',
            total_amount: computedPrice,
        }).select().single()

        setOpening(false)
        if (error) {
            if (error.code === '23505') {
                setOpenError(`Sesi "${sid}" sudah dibuka sebelumnya.`)
            } else {
                setOpenError(error.message)
            }
        } else {
            setOpened(true)
            // Auto-update status to PROCESSED
            await onStatusChange(reg.id, 'PROCESSED')

            // Handoff to main view instantly
            if (data) onSessionOpened(data)
        }
    }

    return (
        <div>
            {/* Panel header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', borderBottom: '1px solid var(--mera-border)',
                position: 'sticky', top: 0, background: 'var(--mera-surface)', zIndex: 5,
            }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Detail Pelanggan</span>
                <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'var(--mera-surface-raised)', color: 'var(--mera-text-primary)', cursor: 'pointer', fontSize: 18 }}><X size={18} /></button>
            </div>

            <div style={{ padding: '18px' }}>
                {/* Customer info */}
                <div style={{ background: 'var(--mera-surface-raised)', borderRadius: 'var(--mera-radius-md)', padding: '14px', marginBottom: 16 }}>
                    <p style={{ fontWeight: 800, fontSize: 17, marginBottom: 2 }}>{reg.customer_name}</p>
                    <p style={{ fontSize: 14, color: 'var(--mera-info)', fontWeight: 500 }}>@{reg.instagram_handle?.replace('@', '')}</p>
                    {(reg as any).session_id && (
                        <p style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--mera-accent)', fontWeight: 700, marginTop: 6, letterSpacing: '0.05em' }}>
                            <><Ticket size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} /> {(reg as any).session_id}</>
                        </p>
                    )}
                </div>

                <dl style={{ marginBottom: 16 }}>
                    <InfoRow label="Tipe Booking" value={BOOKING_TYPE_LABELS[reg.booking_type]?.() ?? reg.booking_type} />
                    <InfoRow label="Status" value={sc.label()} />
                    {reg.addons?.room && <InfoRow label="Studio" value={reg.addons.room} />}
                    {reg.addons?.variant && <InfoRow label="Backdrop" value={reg.addons.variant} />}
                    {reg.addons?.selected_addons?.includes('EDITED_COLORED') && (
                        <InfoRow label="Add On" value="(Edited + Colored)" />
                    )}
                    {reg.preferred_date && (
                        <InfoRow label="Tgl Booking" value={new Date(reg.preferred_date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} />
                    )}
                    {reg.preferred_time && <InfoRow label="Jam" value={reg.preferred_time} />}
                    {reg.session_id && <InfoRow label="Session ID" value={reg.session_id} />}
                    <InfoRow label="Daftar" value={new Date(reg.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} />
                </dl>

                {/* KEEPSLOT expiry warning */}
                {reg.booking_type === 'ONLINE_KEEPSLOT' && reg.expires_at && reg.status === 'PENDING' && (() => {
                    const minsLeft = keepSlotMinutesLeft(reg)
                    const expired = minsLeft !== null && minsLeft <= 0
                    return (
                        <div style={{
                            padding: '10px 14px', borderRadius: 'var(--mera-radius-md)', marginBottom: 16,
                            background: expired ? 'var(--mera-error-bg)' : 'var(--mera-warning-bg)',
                            border: `1px solid ${expired ? 'var(--mera-error-border)' : 'var(--mera-warning-border)'}`,
                        }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: expired ? 'var(--mera-error)' : 'var(--mera-warning)' }}>
                                {expired
                                    ? 'Keep Slot sudah expired — update status ke EXPIRED'
                                    : `⏳ Keep Slot: ${minsLeft} menit tersisa`
                                }
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--mera-text-tertiary)', marginTop: 3 }}>
                                Berlaku hingga: {new Date(reg.expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    )
                })()}

                {/* ── BUKA SESI BUTTON ─────────────────── */}
                {!opened ? (
                    <div style={{ marginBottom: 20 }}>
                        <button
                            id="buka-sesi-btn"
                            onClick={handleBukaSesi}
                            disabled={opening || reg.status !== 'VERIFIED'}
                            style={{
                                width: '100%', padding: '12px', fontWeight: 600, fontSize: 14,
                                background: (opening || reg.status !== 'VERIFIED') ? 'var(--mera-surface-raised)' : 'var(--mera-text-primary)',
                                color: (opening || reg.status !== 'VERIFIED') ? 'var(--mera-text-tertiary)' : 'var(--mera-surface)',
                                border: 'none', borderRadius: 'var(--mera-radius-md)',
                                cursor: (opening || reg.status !== 'VERIFIED') ? 'not-allowed' : 'pointer',
                                marginBottom: 6,
                            }}>
                            {opening ? 'Membuka sesi...' : '🎬 Buka Sesi Transaksi'}
                        </button>
                        {openError && (
                            <p style={{ fontSize: 12, color: 'var(--mera-error)', padding: '6px 8px', background: 'var(--mera-error-bg)', borderRadius: 'var(--mera-radius-sm)' }}>
                                ⚠️ {openError}
                            </p>
                        )}
                        <p style={{ fontSize: 11, color: 'var(--mera-text-tertiary)', marginTop: 4 }}>
                            Buat sesi transaksi baru dan update status ke PROCESSED.
                        </p>
                    </div>
                ) : (
                    <div style={{ padding: '12px', background: 'var(--mera-success-bg)', borderRadius: 'var(--mera-radius-md)', marginBottom: 20, textAlign: 'center' }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--mera-success)' }}><CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 4 }} /> Sesi berhasil dibuka!</p>
                        <p style={{ fontSize: 12, color: 'var(--mera-text-secondary)', marginTop: 2 }}>Lihat di kolom tengah → Sesi Transaksi</p>
                    </div>
                )}

                {/* Status actions */}
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mera-text-tertiary)', marginBottom: 8 }}>
                    Ubah Status Manual
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {REG_STATUS_ORDER.map(s => {
                        const sc2 = REG_STATUS_CONFIG[s]
                        const isCurrent = reg.status === s
                        return (
                            <button key={s} disabled={isCurrent || saving} onClick={() => handleStatus(s)}
                                style={{
                                    padding: '9px 12px', textAlign: 'left', fontSize: 13, fontWeight: isCurrent ? 700 : 500,
                                    border: `1.5px solid ${isCurrent ? sc2.border : 'var(--mera-border)'}`,
                                    borderRadius: 'var(--mera-radius-md)', cursor: isCurrent ? 'default' : 'pointer',
                                    background: isCurrent ? sc2.bg : 'var(--mera-surface)', color: isCurrent ? sc2.text : 'var(--mera-text-secondary)',
                                    opacity: saving && !isCurrent ? 0.5 : 1,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}>
                                {sc2.label()}
                                {isCurrent && <span style={{ fontSize: 11 }}><Circle size={8} fill="currentColor" style={{ display: 'inline', marginRight: 4 }} /> aktif</span>}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ── Transaction Detail Panel ───────────────────────────────────
function TransactionDetailPanel({
    tx, registrations, onClose,
}: {
    tx: Transaction
    registrations: Registration[]
    onClose: () => void
}) {
    const reg = tx.registration_id ? registrations.find(r => r.id === tx.registration_id) : null
    const [saving, setSaving] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(tx.payment_method)
    const [discountAmount, setDiscountAmount] = useState(tx.discount_amount)
    const [discountReason, setDiscountReason] = useState(tx.discount_reason || '')

    const [addonsList, setAddonsList] = useState<Product[]>([])

    // Track selected addons using the DB payload if available
    const [addedQtys, setAddedQtys] = useState<Record<number, number>>(() => {
        return (reg as any)?.addons?.pos_addons || {}
    })

    useEffect(() => {
        const remoteAddons = (reg as any)?.addons?.pos_addons || {}
        setAddedQtys(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(remoteAddons)) return remoteAddons
            return prev
        })
    }, [JSON.stringify((reg as any)?.addons?.pos_addons)])

    const [showReceipt, setShowReceipt] = useState(false)
    const [messageTemplate, setMessageTemplate] = useState('')
    const [activeCrewName, setActiveCrewName] = useState('Mera Selfstudio')

    // Status copy
    const [copied, setCopied] = useState(false)



    useEffect(() => {
        supabase.from('products').select('*').eq('is_addon', true).eq('is_active', true).order('nama').then(({ data }) => {
            setAddonsList((data ?? []) as Product[])
        })

        // Fetch active crew
        supabase.from('attendance')
            .select(`crew_id, crew(nama)`)
            .eq('status', 'ACTIVE')
            .limit(1)
            .then(({ data }) => {
                if (data && data.length > 0 && (data[0] as any).crew?.nama) {
                    setActiveCrewName((data[0] as any).crew.nama)
                }
            })
    }, [])

    // Update form when tx changes
    useEffect(() => {
        setPaymentMethod(tx.payment_method)
        setDiscountAmount(tx.discount_amount)
        setDiscountReason(tx.discount_reason || '')

        const customerName = reg?.customer_name ? reg.customer_name.split(' ')[0] : 'Kak'
        setMessageTemplate(`Halo ${customerName}! 👋\nMakasih banyak ya udah seru-seruan bareng di Mera Selfstudio hari ini! ✨\n\nOh ya, untuk struk pembayarannya udah kita lampirkan di pesan ini, Kak.\n\nNah, buat hasil soft-file fotonya juga udah bisa langsung dicek dan di-download lewat link Google Drive ini ya:\n📁 https://drive.google.com/drive/folders/1rsdfiONubTTxmD87F_wQloPM-rEqvLPq?usp=drive_link\n\n⚠️ Penting nih Kak: Jangan lupa buat langsung di-download yaa, soalnya file di link tersebut bakal otomatis terhapus dalam 5 hari ke depan. 🙏\n\nSemoga suka sama hasil jepretannya! Kalau mau di-post ke story atau feed, boleh banget dong tag IG kita di @mera.selfstudio 📸\n\nKalau misal ada kendala pas buka link atau ada yang mau ditanyain, langsung chat kita aja ya Kak, feel free!\n\nSekali lagi makasih udah mampir, ditunggu kedatangannya lagi di Mera! 🥰\n\nRegards,\nCrew ${activeCrewName}`)
    }, [tx, reg, activeCrewName])

    const handleAddAddon = async (addon: Product, change: 1 | -1) => {
        const currentQty = addedQtys[addon.id] || 0
        if (change === -1 && currentQty === 0) return

        setSaving(true)

        const newQty = Math.max(0, currentQty + change)
        const newQtys = { ...addedQtys, [addon.id]: newQty }
        if (newQty === 0) delete newQtys[addon.id]

        setAddedQtys(newQtys)

        const addonsTotal = Object.entries(newQtys).reduce((sum, [id, qty]) => {
            const a = addonsList.find(x => x.id === Number(id))
            return sum + (a ? hitungHargaBertingkat(a, qty) : 0)
        }, 0)

        const baseAmount = (reg as any)?.addons?.computed_price || 0
        const newTotal = baseAmount + addonsTotal

        const dbPromises: Promise<any>[] = [
            (supabase.from('transactions') as any).update({ total_amount: newTotal }).eq('id', tx.id)
        ]

        if (reg) {
            const newAddonsObj = { ...(reg.addons || {}), pos_addons: newQtys }
            dbPromises.push(
                (supabase.from('registrations') as any).update({ addons: newAddonsObj }).eq('id', reg.id)
            )
        }

        await Promise.all(dbPromises)

        setSaving(false)
    }

    // ── Local Optimistic Calculations ──
    const baseAmount = (reg as any)?.addons?.computed_price || 0
    const currentAddonsTotal = Object.entries(addedQtys).reduce((sum, [id, qty]) => {
        const a = addonsList.find(x => x.id === Number(id))
        return sum + (a ? hitungHargaBertingkat(a, qty) : 0)
    }, 0)
    // ALWAYS display this calculated total to ensure UI updates instantly
    const displayTotal = baseAmount + currentAddonsTotal


    const handlePayment = async () => {
        if (!paymentMethod) return alert('Pilih metode pembayaran terlebih dahulu.')
        if (discountAmount > 0 && !discountReason.trim()) return alert('Alasan diskon harus diisi!')

        setSaving(true)
        const { error } = await (supabase.from('transactions') as any).update({
            status: 'PAID',
            payment_method: paymentMethod,
            discount_amount: discountAmount || 0,
            discount_reason: discountReason.trim() || null
        }).eq('id', tx.id)

        if (error) {
            alert('Gagal memproses pembayaran: ' + error.message)
        }
        setSaving(false)
    }

    const handleSendIg = () => {
        if (!reg?.instagram_handle || reg.instagram_handle === '-') {
            alert('Instagram tidak valid!')
            return
        }

        const cleanHandle = reg.instagram_handle.replace('@', '').trim()

        // Copy to clipboard
        navigator.clipboard.writeText(messageTemplate).then(() => {
            alert('Template pesan otomatis di-copy ke clipboard! Jangan lupa sisipkan Screenshot/JPG Struk di DM Instagram ya.')
            window.open(`https://ig.me/m/${cleanHandle}`, '_blank')
        }).catch(() => {
            alert('Gagal meng-copy teks secara otomatis. Link IG tetap dibuka.')
            window.open(`https://ig.me/m/${cleanHandle}`, '_blank')
        })
    }

    const handleDownloadReceipt = async () => {
        const receiptEl = document.getElementById('receipt-print-content')
        if (!receiptEl) return

        try {
            const canvas = await html2canvas(receiptEl, { scale: 2, backgroundColor: '#ffffff' })
            const image = canvas.toDataURL("image/jpeg", 0.9)

            const link = document.createElement('a')
            link.href = image
            link.download = `Struk_Mera_${tx.session_id}.jpg`
            link.click()
        } catch (err) {
            console.error(err)
            alert('Gagal menyimpan struk')
        }
    }

    const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
        ACTIVE: { bg: 'var(--mera-warning-bg)', text: 'var(--mera-warning)' },
        PAID: { bg: 'var(--mera-success-bg)', text: 'var(--mera-success)' },
        REFUNDED: { bg: 'var(--mera-error-bg)', text: 'var(--mera-error)' },
        VOID: { bg: 'var(--mera-surface-raised)', text: 'var(--mera-text-secondary)' },
    }
    const sc = STATUS_COLOR[tx.status] ?? STATUS_COLOR.ACTIVE

    return (
        <div>
            {/* Panel header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', borderBottom: '1px solid var(--mera-border)',
                position: 'sticky', top: 0, background: 'var(--mera-surface)', zIndex: 5,
            }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Detail Transaksi</span>
                <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'var(--mera-surface-raised)', color: 'var(--mera-text-primary)', cursor: 'pointer', fontSize: 18 }}><X size={18} /></button>
            </div>

            <div style={{ padding: '18px' }}>
                {/* Transaction Header */}
                <div style={{ background: 'var(--mera-surface-raised)', borderRadius: 'var(--mera-radius-md)', padding: '14px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <p style={{ fontFamily: 'monospace', fontSize: 16, color: 'var(--mera-accent)', fontWeight: 800, letterSpacing: '0.05em' }}>
                                <><Ticket size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} /> {tx.session_id}</>
                            </p>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(tx.session_id)
                                    setCopied(true)
                                    setTimeout(() => setCopied(false), 2000)
                                }}
                                style={{
                                    background: copied ? 'var(--mera-success-bg)' : 'var(--mera-surface)',
                                    border: `1px solid ${copied ? 'var(--mera-success-border)' : 'var(--mera-border)'}`,
                                    borderRadius: 'var(--mera-radius-sm)',
                                    padding: '2px 6px', fontSize: 10,
                                    color: copied ? 'var(--mera-success)' : 'var(--mera-text-secondary)', cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                title="Copy untuk Capture One"
                            >
                                {copied ? <><CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} /> Tercopy</> : <><ClipboardList size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} /> Copy</>}
                            </button>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--mera-radius-full)', background: sc.bg, color: sc.text }}>
                            {tx.status}
                        </span>
                    </div>
                    {reg && (
                        <>
                            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{reg.customer_name}</p>
                            <p style={{ fontSize: 13, color: 'var(--mera-info)' }}>@{reg.instagram_handle?.replace('@', '')}</p>
                        </>
                    )}
                </div>



                {/* Additionals when ACTIVE */}
                {tx.status === 'ACTIVE' && (
                    <div style={{ marginBottom: 24, padding: '12px', border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-md)' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--mera-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tambah Add-On</p>

                        {addonsList.length === 0 ? (
                            <p style={{ fontSize: 12, color: 'var(--mera-text-tertiary)' }}>Memuat produk add-on...</p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                                {addonsList.map(addon => {
                                    const qty = addedQtys[addon.id] || 0
                                    const nextPrice = (hitungHargaBertingkat(addon, qty + 1) - hitungHargaBertingkat(addon, qty)) || 0

                                    return (
                                        <div key={addon.id} style={{
                                            width: '100%', padding: '12px 14px',
                                            border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-md)',
                                            background: 'var(--mera-surface)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            boxShadow: 'var(--mera-shadow-sm)'
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--mera-text-primary)' }}>{addon.nama}</span>
                                                <span style={{ color: 'var(--mera-success)', fontSize: 12, fontWeight: 600 }}>+ Rp {nextPrice.toLocaleString('id-ID')}</span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <button
                                                    onClick={() => handleAddAddon(addon, -1)}
                                                    disabled={saving || qty === 0}
                                                    style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--mera-border)', background: 'var(--mera-bg)', cursor: qty > 0 ? 'pointer' : 'not-allowed', color: qty > 0 ? 'var(--mera-error)' : 'var(--mera-text-tertiary)', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >−</button>
                                                <span style={{ fontSize: 15, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{qty}</span>
                                                <button
                                                    onClick={() => handleAddAddon(addon, 1)}
                                                    disabled={saving}
                                                    style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--mera-border)', background: 'var(--mera-bg)', cursor: 'pointer', color: 'var(--mera-success)', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >+</button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                        <p style={{ marginTop: 8, fontSize: 10, color: 'var(--mera-text-tertiary)' }}>Tambahan ini akan langsung ditotal ke Tagihan Sesi.</p>
                    </div>
                )}

                <dl style={{ marginBottom: 16 }}>
                    {/* Payment Summary */}
                    <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px dashed var(--mera-border)' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--mera-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Summary</p>

                        {/* Base Package */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, color: 'var(--mera-text-primary)' }}>
                                {reg ? (reg.booking_type === 'OTS' ? 'On The Spot Package' : 'Online Booking Package') : 'Studio Package'}
                            </span>
                            <span style={{ fontSize: 13, color: 'var(--mera-text-primary)' }}>
                                Rp {((reg as any)?.addons?.computed_price || 0).toLocaleString('id-ID')}
                            </span>
                        </div>

                        {/* Add-ons List */}
                        {Object.entries(addedQtys).filter(([_, qty]) => qty > 0).map(([id, qty]) => {
                            const addon = addonsList.find(a => a.id === Number(id))
                            if (!addon) return null
                            return (
                                <div key={id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 12, color: 'var(--mera-text-secondary)' }}>
                                        {qty}x {addon.nama}
                                    </span>
                                    <span style={{ fontSize: 12, color: 'var(--mera-text-secondary)' }}>
                                        Rp {hitungHargaBertingkat(addon, qty).toLocaleString('id-ID')}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--mera-border)' }}>
                        <dt style={{ fontSize: 13, color: 'var(--mera-text-primary)', fontWeight: 700 }}>Total Tagihan</dt>
                        <dd style={{ fontSize: 15, fontWeight: 800, textAlign: 'right', color: 'var(--mera-success)' }}>Rp {displayTotal.toLocaleString('id-ID')}</dd>
                    </div>
                    <InfoRow label="Waktu Dibuat" value={new Date(tx.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} />
                </dl>

                {/* Checkout when ACTIVE */}
                {tx.status === 'ACTIVE' && (
                    <div style={{ marginBottom: 20 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Metode Pembayaran</p>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                            {['QRIS', 'CASH'].map(m => (
                                <button key={m} onClick={() => setPaymentMethod(m as PaymentMethod)} style={{
                                    flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 600,
                                    border: `1.5px solid ${paymentMethod === m ? 'var(--mera-accent)' : 'var(--mera-border)'}`,
                                    borderRadius: 'var(--mera-radius-md)', textAlign: 'center', cursor: 'pointer',
                                    background: paymentMethod === m ? 'var(--mera-accent-light)' : 'var(--mera-surface)',
                                    color: paymentMethod === m ? 'var(--mera-text-primary)' : 'var(--mera-text-secondary)'
                                }}>
                                    {m === 'QRIS' ? <><Smartphone size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} /> QRIS</> : <><Banknote size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} /> Tunai</>}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handlePayment}
                            disabled={!paymentMethod || saving}
                            style={{
                                width: '100%', padding: '14px', fontWeight: 600, fontSize: 14,
                                background: (!paymentMethod || saving) ? 'var(--mera-surface-raised)' : 'var(--mera-accent)',
                                color: (!paymentMethod || saving) ? 'var(--mera-text-tertiary)' : '#ffffff',
                                border: 'none', borderRadius: 'var(--mera-radius-md)',
                                cursor: (!paymentMethod || saving) ? 'not-allowed' : 'pointer',
                            }}>
                            {saving ? 'Memproses...' : 'Selesaikan Pembayaran'}
                        </button>
                    </div>
                )}

                {/* Follow up when PAID */}
                {tx.status === 'PAID' && (
                    <div style={{ marginTop: 20 }}>
                        <div style={{ padding: '12px', background: 'var(--mera-success-bg)', border: '1px solid var(--mera-success-border)', borderRadius: 'var(--mera-radius-md)', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--mera-success)', marginBottom: 2 }}>Transaksi Lunas!</p>
                                <p style={{ fontSize: 11, color: 'var(--mera-text-secondary)' }}>Metode: {tx.payment_method}</p>
                            </div>
                            <button onClick={() => setShowReceipt(true)} style={{
                                padding: '6px 12px', fontSize: 11, fontWeight: 700, background: 'var(--mera-surface)',
                                border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-sm)', cursor: 'pointer', color: 'var(--mera-text-primary)'
                            }}>
                                <><Receipt size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} /> Preview Struk</>
                            </button>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>DM Instagram</p>
                            <textarea
                                value={messageTemplate}
                                onChange={(e) => setMessageTemplate(e.target.value)}
                                style={{
                                    width: '100%', height: 120, padding: 10, fontSize: 11, fontFamily: 'monospace',
                                    background: 'var(--mera-surface-raised)', border: '1px solid var(--mera-border)',
                                    borderRadius: 'var(--mera-radius-md)', color: 'var(--mera-text-primary)',
                                    resize: 'vertical'
                                }}
                            />
                            <p style={{ fontSize: 10, color: 'var(--mera-text-tertiary)', marginTop: 4 }}>
                                *Link gdrive bisa diedit langsung di box ini sebelum dicopy.
                            </p>
                        </div>

                        {reg && reg.instagram_handle !== '-' ? (
                            <button
                                onClick={handleSendIg}
                                style={{
                                    width: '100%', padding: '12px', fontWeight: 700, fontSize: 13,
                                    background: '#E1306C', color: '#fff',
                                    border: 'none', borderRadius: 'var(--mera-radius-md)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    boxShadow: '0 4px 12px rgba(225, 48, 108, 0.3)'
                                }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                                </svg>
                                Copy Pesan & Buka IG {reg.instagram_handle}
                            </button>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: 12, color: 'var(--mera-text-tertiary)', marginBottom: 8 }}>
                                    Customer tidak menyertakan username Instagram yang valid.
                                </p>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(messageTemplate)
                                        alert('Teks berhasil di-copy ke clipboard!')
                                    }}
                                    style={{
                                        width: '100%', padding: '12px', fontWeight: 700, fontSize: 13,
                                        background: 'var(--mera-surface-raised)', color: 'var(--mera-text-primary)',
                                        border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-md)', cursor: 'pointer'
                                    }}>
                                    <><ClipboardList size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} /> Copy</> Pesan Saja
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal Preview Struk */}
            {showReceipt && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', color: '#000', padding: '30px 24px', width: 320, borderRadius: 12, position: 'relative', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                        <button onClick={() => setShowReceipt(false)} style={{ position: 'absolute', top: 12, right: 12, border: 'none', background: '#f1f1f1', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 16, color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>

                        <div id="receipt-print-content" style={{ textAlign: 'center', fontFamily: 'monospace', padding: 8, background: '#fff' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                                <img src="/logo-mera-black.png" alt="MERA" height="28" style={{ objectFit: 'contain' }} />
                            </div>
                            <p style={{ margin: '0 0 16px', fontSize: 11, color: '#444' }}>Self Studio Bandung<br />@mera.selfstudio</p>

                            <div style={{ borderBottom: '1.5px dashed #ccc', marginBottom: 12 }}></div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                                <span style={{ color: '#666' }}>Sesi:</span><span style={{ fontWeight: 'bold' }}>{tx.session_id}</span>
                            </div>
                            {reg && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                                    <span style={{ color: '#666' }}>Pelanggan:</span><span style={{ fontWeight: 'bold' }}>{reg.customer_name}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 12 }}>
                                <span style={{ color: '#666' }}>Waktu:</span><span>{new Date(tx.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>

                            <div style={{ borderBottom: '1.5px dashed #ccc', marginBottom: 12 }}></div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 8, fontWeight: 'bold' }}>
                                <span>Deskripsi</span><span>Total</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                                <span>Layanan & Add-on</span><span>Rp {tx.total_amount.toLocaleString('id-ID')}</span>
                            </div>
                            {tx.discount_amount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6, color: 'red' }}>
                                    <span>Diskon</span><span>-Rp {tx.discount_amount.toLocaleString('id-ID')}</span>
                                </div>
                            )}

                            <div style={{ borderBottom: '1.5px dashed #ccc', margin: '12px 0' }}></div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, marginBottom: 12 }}>
                                <span>TOTAL LUNAS</span><span>Rp {(tx.total_amount - tx.discount_amount).toLocaleString('id-ID')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                                <span style={{ color: '#666' }}>Metode Bayar</span><span style={{ fontWeight: 'bold' }}>{tx.payment_method}</span>
                            </div>

                            <div style={{ borderBottom: '1.5px dashed #ccc', margin: '12px 0' }}></div>
                            <p style={{ fontSize: 10, marginTop: 16, color: '#666', lineHeight: 1.4 }}>
                                Terima kasih atas kunjungannya! <br />
                                Ditunggu kedatangannya kembali.
                            </p>
                        </div>

                        <p style={{ fontSize: 10, color: '#888', textAlign: 'center', marginTop: 20, marginBottom: 12 }}>
                            <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} /> Simpan struk ini sebagai JPG untuk dikirim ke IG customer.
                        </p>

                        <button onClick={handleDownloadReceipt} style={{ width: '100%', padding: '12px', background: '#000', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'background 0.2s' }}>
                            <><Folder size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} /> Simpan Struk (JPG)</>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Micro-component ───────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--mera-border)' }}>
            <dt style={{ fontSize: 12, color: 'var(--mera-text-secondary)', fontWeight: 500 }}>{label}</dt>
            <dd style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{value}</dd>
        </div>
    )
}
