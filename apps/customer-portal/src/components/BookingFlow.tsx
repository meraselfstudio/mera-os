'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@mera/supabase/client'
import type { Product, BookingType, Studio } from '@mera/supabase'
import { calcBookingLineItems } from '@mera/supabase'
import QRCode from 'react-qr-code'

// ── Constants & Design Tokens ────────────────────────────────────

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
const SERIF = "Georgia, 'Times New Roman', serif"
const BG = 'hsl(33, 24%, 93%)'
const BG_NAV = 'hsla(33, 24%, 93%, 0.88)'
const TEXT = '#2e1b1f'
const TEXT_SEC = '#4a3438'
const MAROON = '#622128'
const INSTAGRAM_DM_TARGET = 'mera.selfstudio'

export const VARIANTS = {
    'Basic Studio': [
        { code: 'LG', label: 'Light Grey', hex: '#aaaaaa' },
        { code: 'MR', label: 'Maroon', hex: '#6f0505' },
        { code: 'DG', label: 'Dark Grey', hex: '#494747' },
        { code: 'SP', label: 'Soft Pink', hex: '#E3C0C5' },
        { code: 'CC', label: 'Choco', hex: '#815333' },
        { code: 'GR', label: 'Olive Green', hex: '#7C8052' },
    ]
}

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

const BOOKING_TYPE_LABELS: Record<BookingType, { label: string; desc: string; icon: string }> = {
    ONLINE_KEEPSLOT: { icon: '📌', label: 'Keep Slot - 6 Jam (Bayar di Studio)', desc: 'Slot terkunci selama 6 jam. Pembayaran (Cash/QRIS) dilakukan di studio saat sesi. Lewat 6 jam, booking otomatis terhapus.' },
    ONLINE_QRIS: { icon: '💳', label: 'Bayar Sekarang via QRIS', desc: 'Bayar sekarang via QRIS. Slot langsung terkonfirmasi 100% tanpa batas waktu 6 jam.' },
}

const ADDON_EDITED_COLORED = 'EDITED_COLORED'
const MONTH_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const DAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

const STUDIO_CARD_IMAGES: Record<string, string> = {
    'Basic Studio': '/1.basic-studio-card.png',
    'Close Up Room': '/2.close-up-room-card.png',
    'Pas Photo': '/3.pas-photo-card.png',
}

// ── Types ───────────────────────────────────────────────────────
type Step = 'studio' | 'packages' | 'datetime' | 'form' | 'confirm'

interface BookingState {
    selectedRoom: string | null
    selectedPackage: Product | null
    selectedVariant: string | null
    selectedAddons: string[]
    preferredDate: string
    preferredTime: string
    customerName: string
    instagramHandle: string
    bookingType: BookingType
    sessionId: string | null
    registrationId: string | null
    pax: number
}

const INITIAL: BookingState = {
    selectedRoom: 'Basic Studio',
    selectedPackage: null,
    selectedVariant: null,
    selectedAddons: [],
    preferredDate: '',
    preferredTime: '',
    customerName: '',
    instagramHandle: '',
    bookingType: 'ONLINE_KEEPSLOT',
    sessionId: null,
    registrationId: null,
    pax: 1,
}

// ── Helpers ─────────────────────────────────────────────────────
function generateSessionId(name: string, room: string | null, variant: string | null, attempt = 0): string {
    const dd = new Date().getDate().toString().padStart(2, '0')
    const clean = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'GUEST'
    let code = 'XXX'
    if (room === 'Basic Studio') {
        code = variant ? variant.toUpperCase() : 'BS'
    } else if (room === 'Close Up Room') {
        code = 'CU'
    } else if (room === 'Pas Photo') {
        code = 'PS'
    } else {
        code = Math.random().toString(36).slice(2, 6).toUpperCase()
    }
    if (attempt > 0) {
        const suffix = Math.random().toString(36).slice(2, 4).toUpperCase()
        code = `${code}${suffix}`.slice(0, 6)
    }
    return `${dd}-${clean}-${code}`
}

const todayISO = () => new Date().toISOString().split('T')[0]
const formatIDR = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

function isSessionIdConflict(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const e = error as { code?: string; message?: string }
    return e.code === '23505' && (e.message ?? '').includes('registrations_session_id_key')
}

// ── Dynamic QRIS Generator ─────────────────────────────────────
function crc16(data: string) {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) > 0) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
        }
        crc &= 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function generateDynamicQRIS(amount: number) {
    const REAL_STATIC = "00020101021126690021ID.CO.BANKMANDIRI.WWW01189360000801777298280211717772982880303UMI51440014ID.CO.QRIS.WWW0215ID10253901525400303UMI5204274153033605802ID5915Mera Selfstudio6015Mojokerto (Kab)61056136362070703A0163042FA3";
    let base = REAL_STATIC.slice(0, -8);
    base = base.replace("010211", "010212");

    const amountStr = amount.toString();
    const amountLen = amountStr.length.toString().padStart(2, '0');
    const amountField = `54${amountLen}${amountStr}`;

    const idx = base.indexOf("5802ID");
    if (idx !== -1) {
        base = base.slice(0, idx) + amountField + base.slice(idx);
    } else {
        base += amountField;
    }

    base += "6304";
    return base + crc16(base);
}

// ── Main Component ──────────────────────────────────────────────
export default function BookingFlow() {
    const searchParams = useSearchParams()
    const [step, setStep] = useState<Step>('studio')
    const [state, setState] = useState<BookingState>(INITIAL)
    const [allProducts, setAllProducts] = useState<Product[]>([])
    const [addonProducts, setAddonProducts] = useState<Product[]>([])
    const [studios, setStudios] = useState<Studio[]>([])
    const [loading, setLoading] = useState(false)
    const [calendarDate, setCalendarDate] = useState<Date>(() => new Date())

    // Reschedule Modal State
    const [ticketLinkCopied, setTicketLinkCopied] = useState(false)
    const [showReschedule, setShowReschedule] = useState(false)
    const [rescDate, setRescDate] = useState('')
    const [rescTime, setRescTime] = useState('')
    const [rescCalDate, setRescCalDate] = useState<Date>(() => new Date())
    const [rescLoading, setRescLoading] = useState(false)

    // Fetch Products & Studios
    useEffect(() => {
        supabase.from('products').select('*').eq('is_active', true).order('id')
            .then(({ data }) => {
                const all = (data ?? []) as Product[]
                setAllProducts(all.filter(p => !p.is_addon))
                setAddonProducts(all.filter(p => p.is_addon))
            })
        supabase.from('studios').select('*').eq('is_active', true).order('sort_order')
            .then(({ data }) => {
                if (data) setStudios(data as Studio[])
            })
    }, [])

    // URL Pre-select Logic
    useEffect(() => {
        const pkgParam = searchParams.get('package')
        const roomParam = searchParams.get('room')

        if (roomParam && !pkgParam) {
            setState(p => ({ ...p, selectedRoom: roomParam }))
            setStep('studio')
            return
        }
        if (pkgParam) {
            supabase.from('products').select('*').eq('id', Number(pkgParam)).single()
                .then(({ data }) => {
                    if (data) {
                        const product = data as Product
                        let detectedRoom = roomParam || 'Basic Studio'
                        if (!roomParam) {
                            if (product.kategori.toLowerCase().includes('close up')) detectedRoom = 'Close Up Room'
                            else if (product.kategori.toLowerCase().includes('pas photo')) detectedRoom = 'Pas Photo'
                        }
                        setState(p => ({ ...p, selectedRoom: detectedRoom, selectedPackage: product }))
                        setStep('datetime')
                    }
                })
        }
    }, [searchParams])

    const filteredPackages = useMemo(() => {
        if (!state.selectedRoom) return []
        return allProducts.filter(p => {
            const cat = p.kategori.toLowerCase()
            const activeStudio = studios.find(s => s.id === state.selectedRoom)
            if (activeStudio && activeStudio.allowed_categories) {
                return activeStudio.allowed_categories.some(allowed => cat.includes(allowed.toLowerCase()))
            }
            return false
        })
    }, [state.selectedRoom, allProducts, studios])

    // Booked Slots Query
    const [bookedSlots, setBookedSlots] = useState<string[]>([])
    useEffect(() => {
        if (!state.preferredDate) {
            setBookedSlots([])
            return
        }
        supabase.from('registrations')
            .select('preferred_time, addons')
            .eq('preferred_date', state.preferredDate)
            .in('status', ['PENDING', 'VERIFIED', 'PROCESSED'])
            .then(({ data }) => {
                if (!data) { setBookedSlots([]); return }
                const selected = state.selectedRoom
                const activeStudio = studios.find(s => s.id === selected)
                let blockRooms: string[] = [selected || '']
                if (activeStudio && activeStudio.shared_slots_group) {
                    blockRooms = studios
                        .filter(s => s.shared_slots_group === activeStudio.shared_slots_group)
                        .map(s => s.id)
                } else if (!activeStudio) {
                    if (selected === 'Close Up Room' || selected === 'Pas Photo') blockRooms = ['Close Up Room', 'Pas Photo']
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const blocked = (data as any[]).filter(row => {
                    const room = row.addons?.room
                    return blockRooms.includes(room)
                }).map((row: { preferred_time: string }) => row.preferred_time)
                setBookedSlots(blocked)
            })
    }, [state.preferredDate, state.selectedRoom, studios])

    const availableSlots = useMemo(() => {
        if (!state.preferredDate) return []
        const d = new Date(state.preferredDate)
        const day = d.getDay()
        const baseSlots = (day === 0 || day === 5 || day === 6) ? WEEKEND_SLOTS : WEEKDAY_SLOTS
        const todayStr = todayISO()
        let slots = baseSlots
        if (state.preferredDate === todayStr) {
            const now = new Date()
            const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
            slots = baseSlots.filter(slot => slot > currentTimeStr)
        }
        return slots.filter(slot => !bookedSlots.includes(slot))
    }, [state.preferredDate, bookedSlots])

    // Reschedule Available Slots
    const rescAvailableSlots = useMemo(() => {
        if (!rescDate) return []
        const d = new Date(rescDate)
        const day = d.getDay()
        const baseSlots = (day === 0 || day === 5 || day === 6) ? WEEKEND_SLOTS : WEEKDAY_SLOTS
        const todayStr = todayISO()
        if (rescDate === todayStr) {
            const now = new Date()
            const cur = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
            return baseSlots.filter(s => s > cur)
        }
        return baseSlots
    }, [rescDate])

    const handleReschedule = async () => {
        if (!state.registrationId || !rescDate || !rescTime) return
        setRescLoading(true)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('registrations') as any)
            .update({ preferred_date: rescDate, preferred_time: rescTime })
            .eq('id', state.registrationId)
        setRescLoading(false)
        if (!error) {
            setState(p => ({ ...p, preferredDate: rescDate, preferredTime: rescTime }))
            setShowReschedule(false)
        } else {
            alert('Gagal reschedule: ' + error.message)
        }
    }

    // Price Calculation
    const bookingLineItems = state.selectedPackage
        ? calcBookingLineItems([...allProducts, ...addonProducts], {
            room: state.selectedRoom,
            selected_addons: state.selectedAddons,
            pax: state.pax,
            product_id: state.selectedPackage.id,
        })
        : []
    const displayPrice = bookingLineItems.reduce((sum, item) => sum + item.price, 0)

    const addonProductData = addonProducts.find(
        p =>
            p.nama.toLowerCase().replace(/[\s_]+/g, '') === 'editedcolored' ||
            p.nama.toLowerCase().includes('edit'),
    )
    const addonDisplayPrice = addonProductData?.harga_dasar ?? 20_000

    const needsVariant = state.selectedRoom === 'Basic Studio'
    const isPackageStepComplete = state.selectedPackage &&
        (needsVariant ? state.selectedVariant !== null : true)

    const isBwPackage = (name: string) => name.toLowerCase().includes('self photo') || name.toLowerCase().includes('party photo')
    const isPasPhoto = state.selectedRoom === 'Pas Photo' || (state.selectedPackage && state.selectedPackage.nama.toLowerCase().includes('pas photo'))
    const showAddonSelector = state.selectedPackage ? (!isPasPhoto && (state.selectedPackage.default_bw || isBwPackage(state.selectedPackage.nama))) : false

    // Ticket State Persistence
    useEffect(() => {
        const saved = localStorage.getItem('mera_ticket_state_v2')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                if (parsed && typeof parsed.customerName === 'string') {
                    setState(parsed)
                    setStep('confirm')
                }
            } catch (e) {
                console.error('Failed to parse saved ticket', e)
            }
        }
    }, [])

    const handleSubmit = async () => {
        setLoading(true)

        if (state.preferredDate && state.preferredTime) {
            const { data: slotCheck } = await supabase
                .from('registrations')
                .select('id, addons')
                .eq('preferred_date', state.preferredDate)
                .eq('preferred_time', state.preferredTime)
                .in('status', ['PENDING', 'VERIFIED', 'PROCESSED'])

            if (slotCheck && slotCheck.length > 0) {
                const selected = state.selectedRoom
                let blockRooms: string[] = []
                if (selected === 'Close Up Room' || selected === 'Pas Photo') {
                    blockRooms = ['Close Up Room', 'Pas Photo']
                } else {
                    blockRooms = [selected || '']
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const conflict = (slotCheck as any[]).some(row =>
                    blockRooms.includes(row.addons?.room)
                )
                if (conflict) {
                    setLoading(false)
                    alert('Maaf, slot waktu ini baru saja dipesan pelanggan lain. Silakan pilih waktu lain.')
                    setStep('datetime')
                    return
                }
            }
        }

        const now = new Date()
        const expiresAt = state.bookingType === 'ONLINE_KEEPSLOT'
            ? new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString()
            : null

        let sid = ''
        let data: { id: string } | null = null
        let error: { message?: string } | null = null

        for (let attempt = 0; attempt < 6; attempt++) {
            sid = generateSessionId(state.customerName, state.selectedRoom, state.selectedVariant, attempt)
            const payload = {
                customer_name: state.customerName.trim(),
                instagram_handle: state.instagramHandle.startsWith('@') ? state.instagramHandle.trim() : `@${state.instagramHandle.trim()}`,
                booking_type: state.bookingType,
                preferred_date: state.preferredDate || null,
                preferred_time: state.preferredTime || null,
                session_id: sid,
                expires_at: expiresAt,
                addons: {
                    room: state.selectedRoom,
                    variant: state.selectedVariant,
                    selected_addons: state.selectedAddons,
                    pax: state.pax,
                    product_id: state.selectedPackage?.id ?? null,
                    computed_price: displayPrice,
                }
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result: any = await (supabase.from('registrations') as any).insert(payload).select('id').single()

            if (!result.error && result.data) {
                data = result.data as { id: string }
                error = null
                break
            }

            if (isSessionIdConflict(result.error)) {
                error = { message: 'Session ID bentrok, mencoba ulang...' }
                continue
            }

            error = result.error
            break
        }

        setLoading(false)
        if (!error && data) {
            const newState = { ...state, registrationId: data.id, sessionId: sid }
            setState(newState)
            localStorage.setItem('mera_ticket_state_v2', JSON.stringify(newState))
            setStep('confirm')
        } else {
            alert(`Gagal booking: ${error?.message || 'Terjadi kendala saat membuat transaksi.'}`)
        }
    }

    const formValid = state.customerName.trim() !== '' && state.instagramHandle.trim() !== ''

    // Step index helper for progress indicator
    const stepOrder: Step[] = ['studio', 'packages', 'datetime', 'form', 'confirm']
    const currentStepIdx = stepOrder.indexOf(step)

    return (
        <main style={{ minHeight: '100dvh', background: BG, color: TEXT, fontFamily: FONT, display: 'flex', flexDirection: 'column' }}>
            {/* ── Sticky Top Nav ───────────────────────────────────── */}
            <nav style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: BG_NAV, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(98,33,40,0.08)',
                padding: '12px 20px',
                display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
            }}>
                {/* Back Button */}
                {step === 'studio' ? (
                    <Link href="/" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 999,
                        border: '1px solid rgba(98,33,40,0.15)', background: 'rgba(255,255,255,0.7)',
                        fontSize: 12, fontWeight: 700, color: MAROON, textDecoration: 'none',
                        justifySelf: 'start',
                    }}>
                        ← Home
                    </Link>
                ) : step !== 'confirm' ? (
                    <button onClick={() => {
                        if (step === 'packages') setStep('studio')
                        else if (step === 'datetime') setStep('packages')
                        else if (step === 'form') setStep('datetime')
                    }} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 999,
                        border: '1px solid rgba(98,33,40,0.15)', background: 'rgba(255,255,255,0.7)',
                        fontSize: 12, fontWeight: 700, color: MAROON, cursor: 'pointer',
                        justifySelf: 'start',
                    }}>
                        ←
                    </button>
                ) : <span />}

                {/* Logo */}
                <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Image src="/mera-logo-maroon.png" alt="Méra" width={90} height={32} style={{ height: 26, width: 'auto' }} priority />
                </Link>

                {/* Right Link */}
                <div style={{ justifySelf: 'end', display: 'flex', gap: 16, alignItems: 'center' }}>
                    <Link href="/pricelist" style={{ fontSize: 12, color: TEXT_SEC, textDecoration: 'none', fontWeight: 600, opacity: 0.7 }}>Pricelist</Link>
                </div>
            </nav>

            {/* ── Progress Step Bar (Steps 1-4) ────────────────────── */}
            {step !== 'confirm' && (
                <div style={{ maxWidth: 640, width: '100%', margin: '20px auto 0', padding: '0 20px', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                        {/* Connecting Line */}
                        <div style={{ position: 'absolute', top: 12, left: 24, right: 24, height: 2, background: 'rgba(98,33,40,0.12)', zIndex: 1 }} />
                        <div style={{
                            position: 'absolute', top: 12, left: 24,
                            width: `${(currentStepIdx / 3) * 100}%`, maxWidth: 'calc(100% - 48px)',
                            height: 2, background: MAROON, zIndex: 2, transition: 'width 0.3s ease'
                        }} />

                        {['Studio', 'Paket', 'Jadwal', 'Data Diri'].map((label, idx) => {
                            const isDone = currentStepIdx > idx
                            const isCurrent = currentStepIdx === idx
                            return (
                                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3, gap: 6 }}>
                                    <div style={{
                                        width: 26, height: 26, borderRadius: '50%',
                                        background: isCurrent ? MAROON : isDone ? MAROON : '#fff',
                                        color: isCurrent || isDone ? '#fff' : TEXT_SEC,
                                        border: `2px solid ${isCurrent || isDone ? MAROON : 'rgba(98,33,40,0.2)'}`,
                                        fontSize: 11, fontWeight: 800,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: isCurrent ? '0 4px 12px rgba(98,33,40,0.25)' : 'none',
                                    }}>
                                        {isDone ? '✓' : idx + 1}
                                    </div>
                                    <span style={{ fontSize: 10, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? MAROON : TEXT_SEC, opacity: isCurrent ? 1 : 0.5 }}>
                                        {label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── Content Container ─────────────────────────────────── */}
            <div style={{ flex: 1, maxWidth: 640, width: '100%', margin: '0 auto', padding: '24px 20px 48px', boxSizing: 'border-box' }}>

                {/* ── STEP 1: STUDIO SELECTION ────────────────────────── */}
                {step === 'studio' && (
                    <section>
                        <div style={{ textAlign: 'center', marginBottom: 28 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: MAROON, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Step 1/4</p>
                            <h1 style={{ margin: 0, fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 700, fontFamily: SERIF, fontStyle: 'italic', color: TEXT }}>
                                Pilih Studio
                            </h1>
                        </div>

                        <div style={{ display: 'grid', gap: 16 }}>
                            {studios.map(st => {
                                const isSelected = state.selectedRoom === st.id
                                const cardImg = STUDIO_CARD_IMAGES[st.id] || st.image_url
                                return (
                                    <div key={st.id}
                                        onClick={() => setState(p => ({ ...p, selectedRoom: st.id }))}
                                        style={{
                                            position: 'relative',
                                            borderRadius: 20, overflow: 'hidden', cursor: 'pointer',
                                            border: isSelected ? `3px solid ${MAROON}` : '1px solid rgba(98,33,40,0.12)',
                                            transition: 'all 0.25s ease',
                                            boxShadow: isSelected ? '0 10px 28px rgba(98,33,40,0.2)' : '0 2px 12px rgba(0,0,0,0.04)'
                                        }}>
                                        {cardImg && (
                                            <div style={{ position: 'relative', width: '100%', aspectRatio: '1.87 / 1', overflow: 'hidden', background: 'rgba(98,33,40,0.04)' }}>
                                                <Image
                                                    src={cardImg}
                                                    alt={st.name}
                                                    fill
                                                    style={{ objectFit: 'cover' }}
                                                    sizes="(max-width: 640px) 100vw, 640px"
                                                />
                                                {isSelected && (
                                                    <div style={{
                                                        position: 'absolute', top: 12, right: 12,
                                                        background: MAROON, color: '#fff',
                                                        fontSize: 11, fontWeight: 800,
                                                        padding: '5px 14px', borderRadius: 999,
                                                        boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                                                        letterSpacing: '0.05em'
                                                    }}>
                                                        ✓
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <button onClick={() => setStep('packages')}
                            disabled={!state.selectedRoom}
                            style={{
                                width: '100%', marginTop: 28, background: MAROON, color: '#fff',
                                fontWeight: 800, fontSize: 15, padding: '14px 24px', borderRadius: 999,
                                border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(98,33,40,0.25)',
                                opacity: state.selectedRoom ? 1 : 0.5
                            }}>
                            Lanjut →
                        </button>
                    </section>
                )}

                {/* ── STEP 2: PACKAGE & VARIANT SELECTION ────────────── */}
                {step === 'packages' && (
                    <section>
                        <div style={{ textAlign: 'center', marginBottom: 28 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: MAROON, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Step 2/4</p>
                            <h1 style={{ margin: 0, fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 700, fontFamily: SERIF, fontStyle: 'italic', color: TEXT }}>
                                Pilih Paket
                            </h1>
                            <p style={{ margin: '6px 0 0', fontSize: 14, color: TEXT_SEC, opacity: 0.6 }}>
                                Studio: <strong style={{ color: MAROON }}>{state.selectedRoom}</strong>
                            </p>
                        </div>

                        {/* Package List */}
                        <div style={{ display: 'grid', gap: 14, marginBottom: 28 }}>
                            {filteredPackages.map(pkg => {
                                const isSelected = state.selectedPackage?.id === pkg.id
                                const isHighlight = pkg.nama === 'Self Photo Session'
                                return (
                                    <div key={pkg.id}
                                        onClick={() => setState(p => ({
                                            ...p,
                                            selectedPackage: pkg,
                                            pax: Math.max(pkg.max_orang || 1, 1)
                                        }))}
                                        style={{
                                            background: isSelected ? 'linear-gradient(135deg, rgba(98,33,40,0.08) 0%, rgba(98,33,40,0.03) 100%)' : 'rgba(255,255,255,0.7)',
                                            border: isSelected ? `2px solid ${MAROON}` : '1px solid rgba(98,33,40,0.1)',
                                            borderRadius: 20, padding: 20, cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            boxShadow: isSelected ? '0 8px 24px rgba(98,33,40,0.12)' : '0 2px 12px rgba(0,0,0,0.03)'
                                        }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <span style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>{pkg.nama}</span>
                                                </div>
                                                <p style={{ margin: 0, fontSize: 12, color: TEXT_SEC, opacity: 0.65, lineHeight: 1.4 }}>
                                                    {pkg.deskripsi || pkg.kategori}
                                                </p>
                                            </div>
                                            <span style={{ fontSize: 16, fontWeight: 800, color: MAROON, whiteSpace: 'nowrap' }}>
                                                {formatIDR(pkg.harga_dasar)}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Pax (Jumlah Orang) Selector */}
                        {state.selectedPackage && (
                            <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(98,33,40,0.1)', borderRadius: 20, padding: 20, marginBottom: 28 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TEXT }}>
                                            Jumlah Orang ({state.pax} Pax)
                                        </h3>
                                        <p style={{ margin: '4px 0 0', fontSize: 12, color: TEXT_SEC, opacity: 0.6 }}>
                                            {state.selectedPackage.nama.includes('Party')
                                                ? 'Termasuk 8 orang (Tambahan orang +Rp 25.000/orang)'
                                                : state.selectedPackage.nama.includes('Pas Photo')
                                                ? `Termasuk ${state.selectedPackage.max_orang} orang`
                                                : 'Termasuk 2 orang (Tambahan orang +Rp 25.000/orang)'}
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid rgba(98,33,40,0.15)', borderRadius: 999, padding: '4px 8px' }}>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setState(p => ({ ...p, pax: Math.max(1, p.pax - 1) }))
                                            }}
                                            disabled={state.pax <= 1}
                                            style={{
                                                width: 32, height: 32, borderRadius: 16, border: 'none',
                                                background: state.pax > 1 ? MAROON : 'rgba(0,0,0,0.05)',
                                                color: state.pax > 1 ? '#fff' : 'rgba(0,0,0,0.3)',
                                                fontSize: 18, fontWeight: 700, cursor: state.pax > 1 ? 'pointer' : 'not-allowed',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                            −
                                        </button>
                                        <span style={{ fontSize: 16, fontWeight: 800, color: MAROON, minWidth: 24, textAlign: 'center' }}>
                                            {state.pax}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setState(p => ({ ...p, pax: Math.min(20, p.pax + 1) }))
                                            }}
                                            disabled={state.pax >= 20}
                                            style={{
                                                width: 32, height: 32, borderRadius: 16, border: 'none',
                                                background: state.pax < 20 ? MAROON : 'rgba(0,0,0,0.05)',
                                                color: state.pax < 20 ? '#fff' : 'rgba(0,0,0,0.3)',
                                                fontSize: 18, fontWeight: 700, cursor: state.pax < 20 ? 'pointer' : 'not-allowed',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Variant Color Selector for Basic Studio */}
                        {needsVariant && (
                            <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(98,33,40,0.1)', borderRadius: 20, padding: 20, marginBottom: 28 }}>
                                <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: TEXT }}>
                                    Pilih Warna Background <span style={{ color: MAROON }}>*</span>
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                                    {VARIANTS['Basic Studio'].map(v => {
                                        const isSel = state.selectedVariant === v.code
                                        return (
                                            <button key={v.code}
                                                onClick={() => setState(p => ({ ...p, selectedVariant: v.code }))}
                                                style={{
                                                    background: isSel ? MAROON : 'rgba(255,255,255,0.9)',
                                                    color: isSel ? '#fff' : TEXT,
                                                    border: isSel ? `2px solid ${MAROON}` : '1px solid rgba(98,33,40,0.15)',
                                                    borderRadius: 12, padding: '10px 8px',
                                                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                                                    fontSize: 12, fontWeight: 700
                                                }}>
                                                <span style={{ width: 16, height: 16, borderRadius: '50%', background: v.hex, border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Optional Add-on Selector */}
                        {showAddonSelector && (
                            <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(98,33,40,0.1)', borderRadius: 20, padding: 20, marginBottom: 28 }}>
                                <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: TEXT }}>+ Add-Ons (Opsional)</h3>
                                <p style={{ margin: '0 0 16px', fontSize: 12, color: TEXT_SEC, opacity: 0.6 }}>
                                    Paket ini menghasilkan softfile Hitam-Putih. Tambahkan Add-Ons dibawah untuk mendapat cetak dan softfile Ter-Edit dan Berwarna.
                                </p>

                                <div onClick={() => {
                                    const has = state.selectedAddons.includes(ADDON_EDITED_COLORED)
                                    setState(p => ({
                                        ...p,
                                        selectedAddons: has ? p.selectedAddons.filter(a => a !== ADDON_EDITED_COLORED) : [...p.selectedAddons, ADDON_EDITED_COLORED]
                                    }))
                                }} style={{
                                    background: state.selectedAddons.includes(ADDON_EDITED_COLORED) ? 'linear-gradient(135deg, rgba(98,33,40,0.08) 0%, rgba(98,33,40,0.03) 100%)' : '#fff',
                                    border: state.selectedAddons.includes(ADDON_EDITED_COLORED) ? `2px solid ${MAROON}` : '1px solid rgba(98,33,40,0.15)',
                                    borderRadius: 14, padding: 14, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TEXT }}>Edited + Colored</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 11, color: TEXT_SEC, opacity: 0.6 }}>Dapatkan cetak dan softfile Ter-Edit dan Berwarna (+{formatIDR(addonDisplayPrice)})</p>
                                    </div>
                                    <input type="checkbox" checked={state.selectedAddons.includes(ADDON_EDITED_COLORED)} readOnly style={{ accentColor: MAROON, width: 18, height: 18 }} />
                                </div>
                            </div>
                        )}

                        <button onClick={() => setStep('datetime')}
                            disabled={!isPackageStepComplete}
                            style={{
                                width: '100%', background: MAROON, color: '#fff',
                                fontWeight: 800, fontSize: 15, padding: '14px 24px', borderRadius: 999,
                                border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(98,33,40,0.25)',
                                opacity: isPackageStepComplete ? 1 : 0.5
                            }}>
                            Lanjut →
                        </button>
                    </section>
                )}

                {/* ── STEP 3: DATE & TIME PICKER (Mobile-First Single Screen) ── */}
                {step === 'datetime' && (
                    <section style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: MAROON, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 2px' }}>Step 3/4</p>
                            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: SERIF, fontStyle: 'italic', color: TEXT }}>
                                Pilih Tanggal & Jam
                            </h1>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: TEXT_SEC, opacity: 0.6 }}>
                                Paket: <strong style={{ color: MAROON }}>{state.selectedPackage?.nama}</strong>
                            </p>
                        </div>

                        {/* Date Picker Scrollable Pills */}
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: TEXT_SEC, marginBottom: 6, opacity: 0.7, letterSpacing: '0.05em' }}>
                                Pilih Tanggal Sesi Foto
                            </label>
                            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: 4, margin: '0 -20px', paddingInline: 20 }}>
                                <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
                                    {Array.from({ length: 14 }).map((_, i) => {
                                        const d = new Date()
                                        d.setDate(d.getDate() + i)
                                        const iso = d.toISOString().split('T')[0]
                                        const isSel = state.preferredDate === iso
                                        const dayName = DAY_SHORT[d.getDay()]
                                        const dateNum = d.getDate()
                                        const monthName = MONTH_ID[d.getMonth()].slice(0, 3)

                                        return (
                                            <button key={iso}
                                                onClick={() => setState(p => ({ ...p, preferredDate: iso, preferredTime: '' }))}
                                                style={{
                                                    background: isSel ? MAROON : 'rgba(255,255,255,0.85)',
                                                    color: isSel ? '#fff' : TEXT,
                                                    border: isSel ? `2px solid ${MAROON}` : '1px solid rgba(98,33,40,0.12)',
                                                    borderRadius: 12, padding: '8px 12px',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                                                    cursor: 'pointer', minWidth: 54, flexShrink: 0
                                                }}>
                                                <span style={{ fontSize: 9, fontWeight: 700, opacity: isSel ? 0.8 : 0.5, textTransform: 'uppercase' }}>{dayName}</span>
                                                <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.1 }}>{dateNum}</span>
                                                <span style={{ fontSize: 9, fontWeight: 600, opacity: isSel ? 0.8 : 0.5 }}>{monthName}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Slot Grid */}
                        {state.preferredDate && (
                            <div style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(98,33,40,0.1)', borderRadius: 16, padding: 12, marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <label style={{ fontSize: 10, fontWeight: 700, color: TEXT_SEC, opacity: 0.7, letterSpacing: '0.05em' }}>
                                        Pilih Slot Waktu Sesi Foto
                                    </label>
                                    <span style={{ fontSize: 10, color: MAROON, fontWeight: 700 }}>
                                        {availableSlots.length} slot tersisa
                                    </span>
                                </div>

                                {availableSlots.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: TEXT_SEC, opacity: 0.6, fontSize: 12, padding: '12px 0', margin: 0 }}>
                                        Semua slot untuk tanggal ini sudah penuh. Silakan pilih tanggal lain.
                                    </p>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                                        {availableSlots.map(time => {
                                            const isSel = state.preferredTime === time
                                            return (
                                                <button key={time}
                                                    onClick={() => setState(p => ({ ...p, preferredTime: time }))}
                                                    style={{
                                                        background: isSel ? MAROON : '#fff',
                                                        color: isSel ? '#fff' : TEXT,
                                                        border: isSel ? `2px solid ${MAROON}` : '1px solid rgba(98,33,40,0.15)',
                                                        borderRadius: 10, padding: '7px 2px',
                                                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                                        textAlign: 'center'
                                                    }}>
                                                    {time}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        <button onClick={() => setStep('form')}
                            disabled={!state.preferredDate || !state.preferredTime}
                            style={{
                                width: '100%', background: MAROON, color: '#fff',
                                fontWeight: 800, fontSize: 14, padding: '12px 20px', borderRadius: 999,
                                border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(98,33,40,0.22)',
                                opacity: state.preferredDate && state.preferredTime ? 1 : 0.5
                            }}>
                            Lanjut →
                        </button>
                    </section>
                )}

                {/* ── STEP 4: FORM & CHECKOUT ─────────────────────────── */}
                {step === 'form' && (
                    <section>
                        <div style={{ textAlign: 'center', marginBottom: 28 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: MAROON, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Step 4/4</p>
                            <h1 style={{ margin: 0, fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 700, fontFamily: SERIF, fontStyle: 'italic', color: TEXT }}>
                                Data Diri
                            </h1>
                            <p style={{ margin: '6px 0 0', fontSize: 14, color: TEXT_SEC, opacity: 0.6 }}>
                                Masukkan nama kamu dan instagram untuk pengiriman soft file dan komunikasi lainnya.
                            </p>
                        </div>

                        {/* Customer Form */}
                        <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(98,33,40,0.1)', borderRadius: 20, padding: 20, marginBottom: 24 }}>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: TEXT_SEC, marginBottom: 6 }}>Nama*</label>
                                <input type="text"
                                    placeholder="..."
                                    value={state.customerName}
                                    onChange={e => setState(p => ({ ...p, customerName: e.target.value }))}
                                    style={{
                                        width: '100%', padding: '12px 14px', background: '#fff',
                                        border: '1px solid rgba(98,33,40,0.2)', borderRadius: 12, color: TEXT,
                                        fontSize: 14, outline: 'none', boxSizing: 'border-box'
                                    }} />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: TEXT_SEC, marginBottom: 6 }}>Instagram*</label>

                                <input type="text"
                                    placeholder="@..."
                                    value={state.instagramHandle}
                                    onChange={e => setState(p => ({ ...p, instagramHandle: e.target.value }))}
                                    style={{
                                        width: '100%', padding: '12px 14px', background: '#fff',
                                        border: '1px solid rgba(98,33,40,0.2)', borderRadius: 12, color: TEXT,
                                        fontSize: 14, outline: 'none', boxSizing: 'border-box'
                                    }} />
                                <p style={{ margin: '6px 0 0', fontSize: 12, color: TEXT_SEC, opacity: 0.6 }}>
                                    Pastikan nama akun instagram @username sudah benar dan aktif.
                                </p>
                            </div>
                        </div>

                        {/* Payment Type Selection */}
                        <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(98,33,40,0.1)', borderRadius: 20, padding: 20, marginBottom: 24 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: TEXT_SEC, marginBottom: 12 }}>METODE PEMBAYARAN</label>

                            <div style={{ display: 'grid', gap: 10 }}>
                                {(['ONLINE_KEEPSLOT', 'ONLINE_QRIS'] as BookingType[]).map(type => {
                                    const isSel = state.bookingType === type
                                    const meta = BOOKING_TYPE_LABELS[type]
                                    return (
                                        <div key={type}
                                            onClick={() => setState(p => ({ ...p, bookingType: type }))}
                                            style={{
                                                background: isSel ? 'linear-gradient(135deg, rgba(98,33,40,0.08) 0%, rgba(98,33,40,0.03) 100%)' : '#fff',
                                                border: isSel ? `2px solid ${MAROON}` : '1px solid rgba(98,33,40,0.15)',
                                                borderRadius: 14, padding: 14, cursor: 'pointer',
                                                display: 'flex', gap: 12, alignItems: 'center'
                                            }}>
                                            <span style={{ fontSize: 24 }}>{meta.icon}</span>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TEXT }}>{meta.label}</p>
                                                <p style={{ margin: '2px 0 0', fontSize: 11, color: TEXT_SEC, opacity: 0.65 }}>{meta.desc}</p>
                                            </div>
                                            <input type="radio" checked={isSel} readOnly style={{ accentColor: MAROON, width: 18, height: 18 }} />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Order Summary */}
                        <div style={{ background: 'linear-gradient(135deg, rgba(98,33,40,0.08) 0%, rgba(98,33,40,0.03) 100%)', border: '1px solid rgba(98,33,40,0.15)', borderRadius: 20, padding: 20, marginBottom: 28 }}>
                            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: TEXT }}>Ringkasan Pesanan</h3>

                            <div style={{ display: 'grid', gap: 8, fontSize: 13, color: TEXT_SEC }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Studio</span>
                                    <strong style={{ color: TEXT }}>{state.selectedRoom}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Paket Sesi</span>
                                    <strong style={{ color: TEXT }}>{state.selectedPackage?.nama}</strong>
                                </div>
                                {state.selectedVariant && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Background</span>
                                        <strong style={{ color: TEXT }}>{VARIANTS['Basic Studio'].find(v => v.code === state.selectedVariant)?.label}</strong>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Jadwal Sesi</span>
                                    <strong style={{ color: TEXT }}>{state.preferredDate} ({state.preferredTime})</strong>
                                </div>

                                <div style={{ borderTop: '1px solid rgba(98,33,40,0.15)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>Total Biaya</span>
                                    <span style={{ fontWeight: 800, fontSize: 18, color: MAROON }}>{formatIDR(displayPrice)}</span>
                                </div>
                            </div>
                        </div>

                        <button onClick={handleSubmit}
                            disabled={!formValid || loading}
                            style={{
                                width: '100%', background: MAROON, color: '#fff',
                                fontWeight: 800, fontSize: 15, padding: '14px 24px', borderRadius: 999,
                                border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(98,33,40,0.25)',
                                opacity: formValid && !loading ? 1 : 0.5
                            }}>
                            {loading ? 'Membuat Pesanan...' : 'Konfirmasi Booking sekarang 📸'}
                        </button>
                    </section>
                )}

                {/* ── STEP 5: TICKET CONFIRMATION ────────────────────── */}
                {step === 'confirm' && (
                    <section style={{ textAlign: 'center' }}>
                        <div style={{ marginBottom: 24 }}>
                            <span style={{ fontSize: 40 }}>🎉</span>
                            <h1 style={{ margin: '8px 0 4px', fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 700, fontFamily: SERIF, fontStyle: 'italic', color: TEXT }}>
                                Booking Berhasil!
                            </h1>
                            <p style={{ margin: 0, fontSize: 14, color: TEXT_SEC, opacity: 0.65 }}>
                                Simpan tiket ini & tunjukkan kepada kasir saat sesi.
                            </p>
                        </div>

                        {/* Ticket Card */}
                        <div style={{ background: '#fff', border: '1px solid rgba(98,33,40,0.15)', borderRadius: 24, padding: 24, boxShadow: '0 12px 36px rgba(98,33,40,0.12)', textAlign: 'left', marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ background: MAROON, color: '#fff', padding: '14px 20px', margin: '-24px -24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: 10, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>SESSION CODE</p>
                                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '0.05em' }}>{state.sessionId || 'PENDING'}</p>
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 999 }}>
                                    {state.bookingType === 'ONLINE_QRIS' ? 'QRIS' : 'KEEP SLOT'}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gap: 12, fontSize: 13, color: TEXT_SEC, marginBottom: 20 }}>
                                <div>
                                    <span style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>NAMA PEMESAN</span>
                                    <strong style={{ fontSize: 15, color: TEXT }}>{state.customerName} ({state.instagramHandle})</strong>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <span style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>STUDIO & PAKET</span>
                                        <strong style={{ color: TEXT }}>{state.selectedRoom} — {state.selectedPackage?.nama}</strong>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>TANGGAL & JAM</span>
                                        <strong style={{ color: MAROON }}>{state.preferredDate} ({state.preferredTime})</strong>
                                    </div>
                                </div>
                            </div>

                            {/* QRIS Dynamic Display if QRIS booking */}
                            {state.bookingType === 'ONLINE_QRIS' && displayPrice > 0 && (
                                <div style={{ background: 'rgba(98,33,40,0.04)', border: '1px solid rgba(98,33,40,0.12)', borderRadius: 16, padding: 16, textAlign: 'center', marginBottom: 20 }}>
                                    <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: MAROON }}>SCAN QRIS UNTUK PEMBAYARAN ({formatIDR(displayPrice)})</p>
                                    <div style={{ background: '#fff', padding: 12, borderRadius: 12, display: 'inline-block', border: '1px solid rgba(0,0,0,0.1)' }}>
                                        <QRCode value={generateDynamicQRIS(displayPrice)} size={160} />
                                    </div>
                                </div>
                            )}

                            {/* QR Code Ticket */}
                            <div style={{ borderTop: '1px dashed rgba(98,33,40,0.2)', paddingTop: 20, textAlign: 'center' }}>
                                <p style={{ margin: '0 0 10px', fontSize: 11, color: TEXT_SEC, opacity: 0.6 }}>Tunjukkan QR Code ini ke crew studio saat check-in</p>
                                <div style={{ background: '#fff', padding: 10, borderRadius: 12, display: 'inline-block', border: '1px solid rgba(0,0,0,0.08)' }}>
                                    <QRCode value={`MERA-SESSION:${state.sessionId}`} size={120} />
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'grid', gap: 10 }}>
                            <button onClick={() => {
                                const url = window.location.origin + '/tiket/' + state.sessionId
                                navigator.clipboard.writeText(url)
                                setTicketLinkCopied(true)
                                setTimeout(() => setTicketLinkCopied(false), 3000)
                            }} style={{
                                width: '100%', background: MAROON, color: '#fff',
                                fontWeight: 800, fontSize: 14, padding: '12px 20px', borderRadius: 999,
                                border: 'none', cursor: 'pointer'
                            }}>
                                {ticketLinkCopied ? '✓ Link Tiket Tersalin!' : '📋 Salin Link Tiket'}
                            </button>

                            <button onClick={() => setShowReschedule(true)} style={{
                                width: '100%', background: 'rgba(255,255,255,0.8)', color: TEXT,
                                fontWeight: 700, fontSize: 14, padding: '12px 20px', borderRadius: 999,
                                border: '1px solid rgba(98,33,40,0.2)', cursor: 'pointer'
                            }}>
                                🗓 Reschedule Jadwal
                            </button>

                            <button onClick={() => {
                                setState(INITIAL)
                                setStep('studio')
                            }} style={{
                                width: '100%', background: 'rgba(98,33,40,0.08)', color: MAROON,
                                fontWeight: 800, fontSize: 14, padding: '12px 20px', borderRadius: 999,
                                border: '1px solid rgba(98,33,40,0.2)', cursor: 'pointer', marginTop: 4
                            }}>
                                ➕ Buat Booking Sesi Baru
                            </button>

                            <a href={`https://ig.me/m/${INSTAGRAM_DM_TARGET}`} target="_blank" rel="noopener noreferrer" style={{
                                display: 'block', textDecoration: 'none', background: 'transparent',
                                color: MAROON, fontWeight: 700, fontSize: 13, padding: '10px 20px'
                            }}>
                                Ubah Pesanan via Instagram DM →
                            </a>
                        </div>

                        {/* Reschedule Modal */}
                        {showReschedule && (
                            <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                                <div style={{ background: BG, borderRadius: 24, padding: 24, maxWidth: 440, width: '100%', textAlign: 'left', border: '1px solid rgba(98,33,40,0.2)' }}>
                                    <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: TEXT, fontFamily: SERIF }}>Reschedule Jadwal Sesi</h3>
                                    <p style={{ margin: '0 0 16px', fontSize: 12, color: TEXT_SEC, opacity: 0.6 }}>Pilih tanggal & slot waktu baru untuk sesi fotomu.</p>

                                    <div style={{ marginBottom: 14 }}>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: TEXT_SEC, marginBottom: 6 }}>TANGGAL BARU</label>
                                        <input type="date" min={todayISO()} value={rescDate} onChange={e => { setRescDate(e.target.value); setRescTime('') }}
                                            style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(98,33,40,0.2)', background: '#fff', fontSize: 13 }} />
                                    </div>

                                    {rescDate && (
                                        <div style={{ marginBottom: 20 }}>
                                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: TEXT_SEC, marginBottom: 6 }}>JAM BARU</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                                                {rescAvailableSlots.map(t => (
                                                    <button key={t} onClick={() => setRescTime(t)} style={{
                                                        background: rescTime === t ? MAROON : '#fff',
                                                        color: rescTime === t ? '#fff' : TEXT,
                                                        border: rescTime === t ? `2px solid ${MAROON}` : '1px solid rgba(98,33,40,0.15)',
                                                        borderRadius: 8, padding: '8px 2px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
                                                    }}>
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button onClick={() => setShowReschedule(false)} style={{ flex: 1, padding: 12, borderRadius: 999, border: '1px solid rgba(0,0,0,0.15)', background: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                                            Batal
                                        </button>
                                        <button onClick={handleReschedule} disabled={!rescDate || !rescTime || rescLoading} style={{ flex: 1, padding: 12, borderRadius: 999, border: 'none', background: MAROON, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: rescDate && rescTime && !rescLoading ? 1 : 0.5 }}>
                                            {rescLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                )}

            </div>
        </main>
    )
}
