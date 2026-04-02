'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@mera/supabase/client'
import type { Product, BookingType } from '@mera/supabase'
import { hitungHargaBertingkat } from '@mera/supabase'
import QRCode from 'react-qr-code'

// ── Constants ───────────────────────────────────────────────────
export const STUDIO_ROOMS = [
    {
        id: 'Basic Studio',
        name: 'Basic Studio',
        desc: '',
        emoji: '',
        accent: '#ffffffff',
        bgGradient: 'linear-gradient(160deg, #000000ff 0%, #1b1b1bff 100%)',
        image: '/photo-basic-lg-1.png',
    },
    {
        id: 'Pas Photo',
        name: 'Pas Photo',
        desc: '',
        emoji: '',
        accent: '#ffffffff',
        bgGradient: 'linear-gradient(160deg, #000000ff 0%, #1b1b1bff 100%)',
        image: '/photo-pasphoto-bl.png',
    },
    {
        id: 'Majestic Studio',
        name: 'Majestic Studio',
        desc: '',
        emoji: '',
        accent: '#ffffffff',
        bgGradient: 'linear-gradient(160deg, #000000ff 0%, #1b1b1bff 100%)',
        image: '/photo-majestic-1.png',
    },
    {
        id: 'Elevator Studio',
        name: 'Elevator Studio',
        desc: '',
        emoji: '',
        accent: '#ffffffff',
        bgGradient: 'linear-gradient(160deg, #000000ff 0%, #1b1b1bff 100%)',
        image: '/photo-elevator-1.png',
    },
]

export const VARIANTS = {
    'Basic Studio': [
        { code: 'LG', label: 'Light Grey', hex: '#aaaaaaff' },
        { code: 'MR', label: 'Maroon', hex: '#6f0505ff' },
        { code: 'DG', label: 'Dark Grey', hex: '#494747ff' },
        { code: 'BR', label: 'Brown', hex: '#b16a37ff' },
        { code: 'DP', label: 'Dusty Pink', hex: '#c97ca4ff' },
        { code: 'BL', label: 'Blue', hex: '#00437aff' },
    ]
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

const BOOKING_TYPE_LABELS: Record<BookingType, { label: string; desc: string; icon: string }> = {
    ONLINE_KEEPSLOT: { icon: '📌', label: 'Keep Slot', desc: 'Slot terkunci 6 jam setelah booking.' },
    ONLINE_QRIS: { icon: '💳', label: 'QRIS', desc: 'Bayar sekarang via QRIS — slot terjamin 100%' },
}

const ADDON_EDITED_COLORED = 'EDITED_COLORED'
const ADDON_PRICE = 20000

const MONTH_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const DAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
const SERIF = "Georgia, 'Times New Roman', serif"
const INSTAGRAM_DM_TARGET = 'mera.selfstudio'
const LANDING_BG = 'hsl(33, 24%, 93%)'
const LANDING_BG_NAV = 'hsla(33, 24%, 93%, 0.9)'
const TYPE = {
    micro: 'var(--mera-step--2)',
    xs: 'var(--mera-step--1)',
    sm: 'var(--mera-step-0)',
    md: 'var(--mera-step-1)',
    lg: 'var(--mera-step-2)',
    xl: 'var(--mera-step-3)',
    hero: 'var(--mera-step-4)',
    display: 'var(--mera-step-5)',
} as const
const TRACK = {
    tight: 'var(--mera-track-tight)',
    base: 'var(--mera-track-base)',
    soft: 'var(--mera-track-soft)',
    wide: 'var(--mera-track-wide)',
} as const

// ── Types ───────────────────────────────────────────────────────
type Step = 'studio' | 'packages' | 'datetime' | 'form' | 'confirm'

interface BookingState {
    selectedRoom: string | null
    selectedPackage: Product | null
    selectedVariant: string | null
    selectedAddons: string[]        // e.g. ['EDITED_COLORED']
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
    } else if (room === 'Pas Photo') {
        code = 'PS'
    } else if (room === 'Elevator Studio') {
        code = 'ELV'
    } else if (room === 'Majestic Studio') {
        code = 'MJ'
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

// ── QRIS Helpers ────────────────────────────────────────────────
const MOCK_STATIC_QRIS = "00020101021126670016ID.CO.SHOPEE.WWW011893600918000000000002150000000000000000303UMI51440014ID.CO.QRIS.WWW0215ID10200210344580303UMI5204549953033605802ID5914Mera SelfStudio6006Sleman610555581621507119139851416304AE49";

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
    // Real Mera Selfstudio QRIS (Bank Mandiri, NMID: ID10253901525400)
    const REAL_STATIC = "00020101021126690021ID.CO.BANKMANDIRI.WWW01189360000801777298280211717772982880303UMI51440014ID.CO.QRIS.WWW0215ID10253901525400303UMI5204274153033605802ID5915Mera Selfstudio6015Mojokerto (Kab)61056136362070703A0163042FA3";
    
    // Strip the trailing CRC (6304XXXX = 8 chars)
    let base = REAL_STATIC.slice(0, -8);
    // Switch from static (010211) to dynamic (010212)
    base = base.replace("010211", "010212");
    
    // Build amount tag (54 + len + value)
    const amountStr = amount.toString();
    const amountLen = amountStr.length.toString().padStart(2, '0');
    const amountField = `54${amountLen}${amountStr}`;
    
    // Insert amount before country code tag (5802ID)
    const idx = base.indexOf("5802ID");
    if (idx !== -1) {
        base = base.slice(0, idx) + amountField + base.slice(idx);
    } else {
        base += amountField;
    }
    
    // Append CRC placeholder and calculate
    base += "6304";
    return base + crc16(base);
}
// ── Wavy Divider ───────────────────────────────────────────────
function WavyTopDivider({ fill }: { fill: string }) {
    return (
        <svg viewBox="0 0 1200 80" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 'clamp(30px, 6vw, 60px)', backgroundColor: 'transparent', transform: 'translateY(1px)' }}>
            <path d="M0,40 Q150,80 300,40 T600,40 T900,40 T1200,40 L1200,80 L0,80 Z" fill={fill} />
        </svg>
    )
}

// ── Striped Background Hook ─────────────────────────────────────
function useStripedBackground(room: string | null) {
    if (!room) return '#5D2227' // Default Maroon
    switch (room) {
        case 'Basic Studio': 
            // Maroon stripes
            return 'repeating-linear-gradient(0deg, #5D2227, #5D2227 40px, #7A3339 40px, #7A3339 80px)'
        case 'Pas Photo':
            // Blue stripes
            return 'repeating-linear-gradient(0deg, #2E4B72, #2E4B72 40px, #3A5F8F 40px, #3A5F8F 80px)'
        case 'Elevator Studio':
            // Grey stripes
            return 'repeating-linear-gradient(0deg, #9C9B98, #9C9B98 40px, #B2B1AE 40px, #B2B1AE 80px)'
        default:
            // Brown stripes
            return 'repeating-linear-gradient(0deg, #471d06d0, #471d06d0 40px, #55241b 40px, #55241b 80px)'
            return '#5D2227'
    }
}

// ── Main Component ──────────────────────────────────────────────
export default function BookingFlow() {
    const searchParams = useSearchParams()
    const [step, setStep] = useState<Step>('studio')
    const [state, setState] = useState<BookingState>(INITIAL)
    const [allProducts, setAllProducts] = useState<Product[]>([])
    const [addonProducts, setAddonProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(false)
    const [calendarDate, setCalendarDate] = useState<Date>(() => new Date())

    // ── Reschedule modal state ───────────────────────────────────
    const [showReschedule, setShowReschedule] = useState(false)
    const [rescDate, setRescDate] = useState('')
    const [rescTime, setRescTime] = useState('')
    const [rescCalDate, setRescCalDate] = useState<Date>(() => new Date())
    const [rescLoading, setRescLoading] = useState(false)

    // Fetch all active products
    useEffect(() => {
        supabase.from('products').select('*').eq('is_active', true).order('id')
            .then(({ data }) => {
                const all = (data ?? []) as Product[]
                setAllProducts(all.filter(p => !p.is_addon))
                setAddonProducts(all.filter(p => p.is_addon))
            })
    }, [])

    // URL Pre-select logic
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
                            if (product.kategori.toLowerCase().includes('elevator')) detectedRoom = 'Elevator Studio'
                            else if (product.kategori.toLowerCase().includes('majestic')) detectedRoom = 'Majestic Studio'
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
            if (state.selectedRoom === 'Basic Studio') return cat === 'basic studio'
            if (state.selectedRoom === 'Pas Photo') return cat === 'pas photo'
            if (state.selectedRoom === 'Elevator Studio') return cat === 'thematic'
            if (state.selectedRoom === 'Majestic Studio') return cat === 'thematic'
            return false
        })
    }, [state.selectedRoom, allProducts])

    // Dynamic Time Slots based on Date
    const availableSlots = useMemo(() => {
        if (!state.preferredDate) return []
        const d = new Date(state.preferredDate)
        const day = d.getDay()
        const baseSlots = (day === 0 || day === 6) ? WEEKEND_SLOTS : WEEKDAY_SLOTS
        const todayStr = todayISO()
        if (state.preferredDate === todayStr) {
            const now = new Date()
            const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
            return baseSlots.filter(slot => slot > currentTimeStr)
        }
        return baseSlots
    }, [state.preferredDate])

    // Reschedule — available slots for new date
    const rescAvailableSlots = useMemo(() => {
        if (!rescDate) return []
        const d = new Date(rescDate)
        const day = d.getDay()
        const baseSlots = (day === 0 || day === 6) ? WEEKEND_SLOTS : WEEKDAY_SLOTS
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
        const { error } = await (supabase
            .from('registrations') as any)
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

    // Price calculation — base + add-ons
    const basePrice = state.selectedPackage
        ? (state.selectedPackage.tipe_harga === 'bertingkat'
            ? hitungHargaBertingkat(state.selectedPackage, state.pax)
            : state.selectedPackage.harga_dasar)
        : 0

    const getBaseCapacity = () => {
        if (!state.selectedPackage) return 1
        const n = state.selectedPackage.nama.toLowerCase()
        if (n.includes('party')) return 8
        if (n.includes('pas photo package') || n.includes('thematic package')) return 2
        if (state.selectedRoom === 'Basic Studio') return 2
        return 1
    }
    const extraPax = Math.max(0, state.pax - getBaseCapacity())
    const extraPaxPrice = extraPax * 25000 // Add Person fee is 25000

    const addonPrice = state.selectedAddons.length * ADDON_PRICE
    const displayPrice = basePrice + addonPrice + extraPaxPrice

    // Package step complete: needs package + variant if Basic Studio or Pas Photo
    const needsVariant = state.selectedRoom === 'Basic Studio' || state.selectedRoom === 'Pas Photo'
    const isPackageStepComplete = state.selectedPackage &&
        (needsVariant ? state.selectedVariant !== null : true)

    // Show add-on selector if selected package defaults to BW
    const isBwPackage = (name: string) => name.toLowerCase().includes('self photo') || name.toLowerCase().includes('party photo') || name.toLowerCase().includes('thematic basic')
    const isPasPhoto = state.selectedRoom === 'Pas Photo' || (state.selectedPackage && state.selectedPackage.nama.toLowerCase().includes('pas photo'))
    const showAddonSelector = state.selectedPackage ? (!isPasPhoto && (state.selectedPackage.default_bw || isBwPackage(state.selectedPackage.nama))) : false

    const stripedBg = useStripedBackground(state.selectedRoom)
    const baseBgColor = state.selectedRoom === 'Pas Photo' ? '#2E4B72' : (state.selectedRoom === 'Elevator Studio' || state.selectedRoom === 'Majestic Studio' ? '#9C9B98' : '#5D2227')

    const handleSubmit = async () => {
        setLoading(true)
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
                    computed_price: displayPrice,
                }
            }
            // @ts-expect-error - addons shape includes pax and computed_price for local state
            const result: any = await supabase.from('registrations').insert(payload).select('id').single()

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
            setState(p => ({ ...p, registrationId: data.id, sessionId: sid }))
            setStep('confirm')
        } else {
            alert(`Gagal booking: ${error?.message || 'Terjadi kendala saat membuat session ID unik'}`)
        }
    }

    // Form valid check
    const formValid = state.customerName.trim() !== '' && state.instagramHandle.trim() !== ''
    const isLightBookingStep = step === 'studio' || step === 'packages'

    return (
        <div style={{ minHeight: '100vh', background: isLightBookingStep ? LANDING_BG : '#4A1A1A', fontFamily: FONT, color: isLightBookingStep ? '#000' : '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
            {/* ── Top Nav: [← Kembali] [LOGO] [Booking] */}
            <nav style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: isLightBookingStep ? LANDING_BG_NAV : 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)',
                borderBottom: `1px solid ${isLightBookingStep ? 'rgba(0,0,0,0.05)' : '#222222'}`,
                padding: '0 16px', height: 56,
                display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
            }}>
                {/* Left — back button */}
                {step === 'studio' ? (
                <Link href="/" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 10,
                    border: `1px solid rgba(0,0,0,0.1)`, 
                    background: '#FFFFFF',
                    fontSize: 13, fontWeight: 600, color: '#000000', textDecoration: 'none',
                    justifySelf: 'start',
                }}>
                    ←
                </Link>
                ) : (
                <button onClick={() => {
                    if (step === 'packages') setStep('studio')
                    else if (step === 'datetime') setStep('packages')
                    else if (step === 'form') setStep('datetime')
                    else if (step === 'confirm') setStep('form')
                }} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 10,
                    border: `1px solid ${step === 'packages' ? 'rgba(0,0,0,0.1)' : '#333333'}`, 
                    background: step === 'packages' ? '#FFFFFF' : '#1C1C1E',
                    fontSize: 13, fontWeight: 600, color: step === 'packages' ? '#000000' : '#FFFFFF', cursor: 'pointer',
                    justifySelf: 'start',
                }}>
                    ←
                </button>
                )}

                {/* Center — logo home button */}
                <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Image src={(step === 'studio' || step === 'packages') ? "/mera-logo-maroon.png" : "/mera-logo-white.png"} alt="Méra" width={80} height={28}
                        style={{ objectFit: 'contain', height: 24, width: 'auto' }} priority />
                </Link>

                {/* Right — empty */}
                <span />
            </nav>

            {/* Wavy Divider Transition to Striped Area (Rendered conditionally for other steps as needed, or kept unique to selection) */}

            {/* Shared Styles */}
            {(() => {
                const backBtnStyle: React.CSSProperties = {
                    background: 'none', border: 'none', color: '#AAAAAA', fontSize: TYPE.xs,
                    fontWeight: 600, cursor: 'pointer', padding: '8px 0',
                    display: 'inline-block', marginBottom: 24,
                    letterSpacing: TRACK.soft
                };
                const inputStyle: React.CSSProperties = {
                    width: '100%', padding: '12px 14px', background: '#2A2A2C',
                    border: '1px solid #3C3C3E', borderRadius: 10, color: '#FFFFFF',
                    fontSize: TYPE.sm, letterSpacing: TRACK.soft, outline: 'none',
                    boxSizing: 'border-box', fontFamily: FONT,
                };
                
                return (
                    <>
            {/* ── Step 1: Studio Selection ─────────── */}
            {step === 'studio' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: LANDING_BG, padding: '24px 16px 40px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <h2 style={{ fontSize: TYPE.xs, fontWeight: 700, color: '#333', letterSpacing: TRACK.wide, margin: '0 0 12px' }}>
                        </h2>
                        <h1 style={{ font: `italic 700 48px/1.05 "Times New Roman Condensed", serif`, color: '#1e1e1e', margin: 0, letterSpacing: TRACK.tight }}>
                            Choose Studio:
                        </h1>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%', maxWidth: 760 }}>
                        {/* Row 1: Basic Studio & Pas Photo */}
                        <div>
                            <h3 style={{ fontSize: TYPE.xs, fontWeight: 700, color: '#888', marginBottom: 14, textAlign: 'center', letterSpacing: TRACK.soft }}>Basic Studio Packages:</h3>
                            <div style={{ 
                                display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, width: '100%'
                            }}>
                                {[STUDIO_ROOMS[0], STUDIO_ROOMS[1]].map(r => (
                                    <div key={r.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifySelf: 'center', width: 'clamp(120px, 42vw, 168px)' }}>
                                        <div style={{ width: '100%', position: 'relative', marginBottom: 12, aspectRatio: '4/5' }}>
                                            <div style={{ width: '100%', height: '100%', background: `url(${r.image}) center/contain no-repeat` }} />
                                        </div>
                                        <button onClick={() => { setState(p => ({ ...p, selectedRoom: r.id, selectedPackage: null, selectedVariant: null, selectedAddons: [] })); setStep('packages'); }}
                                                style={{ background: '#5D2227', color: '#fff', border: 'none', borderRadius: 999, padding: '11px 14px', width: '100%', minHeight: 44, fontSize: TYPE.xs, fontWeight: 700, letterSpacing: TRACK.soft, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', lineHeight: 1.2, textAlign: 'center', transition: 'transform 0.15s ease' }}>
                                            {r.name} <span style={{ opacity: 0.6 }}>→</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Row 2: Majestic & Elevator */}
                        <div>
                            <h3 style={{ fontSize: TYPE.xs, fontWeight: 700, color: '#888', marginBottom: 14, textAlign: 'center', marginTop: 6, letterSpacing: TRACK.soft }}>Thematic Studio Packages:</h3>
                            <div style={{ 
                                display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, width: '100%'
                            }}>
                                {[STUDIO_ROOMS[2], STUDIO_ROOMS[3]].map(r => (
                                    <div key={r.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifySelf: 'center', width: 'clamp(120px, 42vw, 168px)' }}>
                                        <div style={{ width: '100%', position: 'relative', marginBottom: 12, aspectRatio: '4/5' }}>
                                            <div style={{ width: '100%', height: '100%', background: `url(${r.image}) center/contain no-repeat` }} />
                                        </div>
                                        <button onClick={() => { setState(p => ({ ...p, selectedRoom: r.id, selectedPackage: null, selectedVariant: null, selectedAddons: [] })); setStep('packages'); }}
                                                style={{ background: '#5D2227', color: '#fff', border: 'none', borderRadius: 999, padding: '11px 14px', width: '100%', minHeight: 44, fontSize: TYPE.xs, fontWeight: 700, letterSpacing: TRACK.soft, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', lineHeight: 1.2, textAlign: 'center', transition: 'transform 0.15s ease' }}>
                                            {r.name} <span style={{ opacity: 0.6 }}>→</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Step 2: Package Selection ─────────── */}
            {step === 'packages' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Wavy Divider Transition to Striped Area */}
                    <div style={{ background: LANDING_BG }}>
                        <WavyTopDivider fill={baseBgColor} />
                    </div>

                    {/* Striped Background Area */}
                    <div style={{ 
                        flex: 1, 
                        background: stripedBg,
                        paddingBottom: 140, 
                        paddingTop: 32,
                    }}>
                        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'row', gap: 40, alignItems: 'flex-start', padding: '0 20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            
                            {/* LEFT: Selected Studio Polaroid */}
                            {state.selectedRoom && (
                                <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ fontSize: TYPE.xs, fontWeight: 700, color: '#FFFFFF', letterSpacing: TRACK.soft, marginLeft: 8 }}>
                                    </div>
                                    <div style={{
                                        width: 260, position: 'relative', aspectRatio: '4/5'
                                    }}>
                                        <div style={{
                                            width: '100%', height: '100%',
                                            background: `url(${STUDIO_ROOMS.find(r => r.id === state.selectedRoom)?.image || ''}) center/contain no-repeat`,
                                        }} />
                                    </div>
                                </div>
                            )}

                            {/* RIGHT: Packages & Options */}
                            <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480 }}>
                                <div style={{ fontSize: TYPE.lg, fontWeight: 800, color: '#FFFFFF', marginLeft: 8, letterSpacing: TRACK.tight }}>
                                    Choose Package :
                                </div>

                                {/* Packages List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {allProducts.filter(p => {
                                        const name = p.nama.toLowerCase()
                                        if (state.selectedRoom === 'Basic Studio') return name.includes('photo session')
                                        if (state.selectedRoom === 'Pas Photo') return name.includes('pas photo') || name.includes('graduation')
                                        if (state.selectedRoom === 'Elevator Studio' || state.selectedRoom === 'Majestic Studio') return name.includes('thematic')
                                        return false
                                    }).map(pkg => {
                                        const selected = state.selectedPackage?.id === pkg.id
                                        let detailLines = ['10 Menit | 1-2 Orang', 'Unlimited Jepret', '1 Cetak | All Soft Files']
                                        let isBw = false
                                        const pkgName = pkg.nama.toLowerCase()
                                        if (pkgName.includes('self photo')) { detailLines = ['1-2 Orang', '10 Menit Sesi foto', 'Unlimited Jepret', 'Free 1 Print - Basic Frame', 'Semua Soft Files Hitam Putih']; isBw = true }
                                        else if (pkgName.includes('party photo')) { detailLines = ['8 Orang', '15 Menit Sesi Foto', 'Unlimited Jepret', 'Free 2 Print - Basic Frame', 'Semua Soft Files Hitam Putih']; isBw = true }
                                        else if (pkgName.includes('pas photo basic')) { detailLines = ['1 Orang', '10 Menit Sesi Foto', 'Unlimited Jepret', 'Free 2 Print', '1 Basic Frame, 1 Formal Print']; }
                                        else if (pkgName.includes('pas photo package')) { detailLines = ['2 Orang', '10 Menit Sesi Foto', 'Unlimited Jepret', 'Free 3 Print', '1 Basic Frame, 2 Formal Print']; }
                                        else if (pkgName.includes('thematic basic')) { detailLines = ['1 Orang', '10 Menit Sesi Foto', 'Unlimited Jepret', 'Semua Soft Files Hitam Putih']; isBw = true }
                                        else if (pkgName.includes('thematic package')) { detailLines = ['2 Orang', '10 Menit Sesi Foto', 'Unlimited Jepret', 'Free 1 Print - Basic Frame', 'Semua Soft Files']; }

                                        return (
                                            <button key={pkg.id} onClick={() => setState(p => ({
                                                ...p, selectedPackage: pkg, selectedVariant: null, selectedAddons: []
                                            }))}
                                                style={{
                                                    background: '#F8F6F0',
                                                    border: `2px solid ${selected ? '#333' : 'transparent'}`,
                                                    borderRadius: 24, padding: '16px 24px', textAlign: 'left', cursor: 'pointer',
                                                    display: 'flex', flexDirection: 'column', gap: 8,
                                                    boxShadow: selected ? '0 12px 24px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.1)',
                                                    transform: selected ? 'scale(1.02)' : 'scale(1)', 
                                                    transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                                }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 }}>
                                                    <h3 style={{ fontSize: TYPE.md, fontWeight: 900, color: '#333', margin: 0, letterSpacing: TRACK.tight, lineHeight: 1.1, flex: 1 }}>{pkg.nama}</h3>
                                                    <div style={{
                                                        background: '#5D2227',
                                                        color: '#FFFFFF', borderRadius: 999, padding: '6px 14px', flexShrink: 0,
                                                        fontWeight: 800, fontSize: TYPE.xs, letterSpacing: TRACK.base, display: 'inline-flex', alignItems: 'center', gap: 4
                                                    }}>
                                                        Rp {pkg.harga_dasar.toLocaleString('id-ID')}
                                                    </div>
                                                </div>
                                                
                                                <ul style={{ margin: 0, paddingLeft: 18, color: '#555', fontSize: TYPE.xs, letterSpacing: TRACK.soft, fontWeight: 500, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    {detailLines.map((line, idx) => (
                                                        <li key={idx}>{line}</li>
                                                    ))}
                                                </ul>

                                                {selected && (
                                                    <div style={{ position: 'absolute', bottom: 16, right: 16, width: 20, height: 20, borderRadius: '50%', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 12, fontWeight: 800 }}>✓</div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Options Container (Shown when a package is selected) */}
                                {state.selectedPackage && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                                        
                                        {/* Warning Banner */}
                                        {showAddonSelector && (
                                             <div style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 100, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <span style={{ fontSize: TYPE.md }}>⚠️</span>
                                                <p style={{ fontSize: TYPE.micro, letterSpacing: TRACK.soft, color: '#FFFFFF', margin: 0, lineHeight: 1.4 }}>
                                                    Paket foto ini menghasilkan foto dalam format <strong>Hitam Putih</strong>.<br/>
                                                    Tambah <strong>Add-Ons</strong> dibawah untuk hasil <strong>ter-edit</strong> & <strong>berwarna</strong>.
                                                </p>
                                             </div>
                                        )}

                                        {/* Add-On Pill */}
                                        {showAddonSelector && (
                                            <label 
                                                onClick={() => setState(p => ({ ...p, selectedAddons: p.selectedAddons.includes(ADDON_EDITED_COLORED) ? p.selectedAddons.filter(a => a !== ADDON_EDITED_COLORED) : [...p.selectedAddons, ADDON_EDITED_COLORED] }))}
                                                style={{
                                                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderRadius: 100,
                                                background: '#F8F6F0', cursor: 'pointer',
                                                border: `2px solid ${state.selectedAddons.includes(ADDON_EDITED_COLORED) ? '#333' : 'transparent'}`,
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                            }}>
                                                <div style={{ 
                                                    width: 20, height: 20, borderRadius: '50%', border: '1px solid #333', 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: state.selectedAddons.includes(ADDON_EDITED_COLORED) ? '#333' : 'transparent'
                                                }}>
                                                    {state.selectedAddons.includes(ADDON_EDITED_COLORED) && <span style={{ color: '#FFF', fontSize: 12, fontWeight: 800 }}>✓</span>}
                                                </div>
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: TYPE.micro, fontWeight: 700, color: '#888', letterSpacing: TRACK.soft }}>Add-On</span>
                                                    <span style={{ fontSize: TYPE.xs, fontWeight: 900, color: '#333', letterSpacing: TRACK.tight }}>Edited & Colored Photo</span>
                                                </div>
                                                <div style={{
                                                    background: '#5D2227', color: '#FFFFFF', borderRadius: 999, padding: '6px 14px',
                                                    fontWeight: 800, fontSize: TYPE.xs, letterSpacing: TRACK.soft
                                                }}>
                                                    +{formatIDR(ADDON_PRICE)}
                                                </div>
                                            </label>
                                        )}

                                        {/* Pax Config (Add Person) */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 4 }}>
                                            <span style={{ fontSize: TYPE.xs, color: '#FFFFFF', fontWeight: 700, letterSpacing: TRACK.soft }}>Jumlah Orang :</span>
                                            <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', borderRadius: 100, padding: '4px 6px' }}>
                                                <button onClick={() => setState(p => ({ ...p, pax: Math.max(1, p.pax - 1) }))} 
                                                    style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#EAE8E0', color: '#333', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                                <span style={{ fontSize: TYPE.sm, fontWeight: 900, width: 32, textAlign: 'center', color: '#333' }}>{state.pax}</span>
                                                <button onClick={() => setState(p => {
                                                    const n = p.selectedPackage?.nama.toLowerCase() || ''
                                                    let maxLimit = p.selectedPackage?.max_orang || 20
                                                    if (n.includes('party')) maxLimit = 20
                                                    if (n.includes('pas photo package')) maxLimit = 2
                                                    if (n.includes('thematic package')) maxLimit = 8
                                                    return { ...p, pax: Math.min(maxLimit, p.pax + 1) }
                                                })} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#EAE8E0', color: '#333', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                            </div>
                                            <span style={{ fontSize: TYPE.sm, fontWeight: 800, color: '#FFF' }}></span>
                                        </div>

                                        {/* Background Selection */}
                                        {(state.selectedRoom === 'Basic Studio' || state.selectedRoom === 'Pas Photo') && (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 16 }}>
                                                <span style={{ fontSize: TYPE.xs, fontWeight: 700, color: '#FFFFFF', letterSpacing: TRACK.soft, marginBottom: 12 }}>
                                                    Background Color :
                                                </span>
                                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                                                    {VARIANTS['Basic Studio'].map(variant => {
                                                        const sel = state.selectedVariant === variant.code
                                                        return (
                                                            <button key={variant.code} onClick={() => setState(p => ({ ...p, selectedVariant: variant.code }))}
                                                                style={{
                                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                                    transform: sel ? 'scale(1.1) translateY(-4px)' : 'scale(1)',
                                                                    transition: 'all 0.2s', padding: 0
                                                                }}>
                                                                <div style={{
                                                                    width: 48, height: 48, borderRadius: 12,
                                                                    background: variant.hex,
                                                                    border: `2px solid ${sel ? '#FFF' : 'rgba(255,255,255,0.2)'}`,
                                                                    boxShadow: sel ? '0 0 0 2px rgba(255,255,255,0.4), inset 0 2px 4px rgba(0,0,0,0.2)' : 'inset 0 2px 4px rgba(0,0,0,0.1)'
                                                                }} />
                                                                <span style={{ fontSize: TYPE.micro, fontWeight: 700, color: sel ? '#FFF' : 'rgba(255,255,255,0.6)', letterSpacing: TRACK.soft }}>
                                                                    {variant.label}
                                                                </span>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Bottom Action Footer */}
                                        <div style={{ 
                                            position: 'fixed', bottom: 0, left: 0, right: 0, 
                                            background: '#F8F6F0', padding: '16px 24px 32px', 
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            boxShadow: '0 -10px 30px rgba(0,0,0,0.3)', zIndex: 50
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: TYPE.xs, fontWeight: 700, color: '#888', letterSpacing: TRACK.soft }}>Total Payment</span>
                                                <span style={{ fontSize: TYPE.lg, fontWeight: 900, color: '#333', letterSpacing: TRACK.tight }}>{formatIDR(displayPrice)}</span>
                                            </div>
                                            <button onClick={() => { setStep('datetime'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                                                disabled={!isPackageStepComplete}
                                                style={{
                                                    background: isPackageStepComplete ? '#5D2227' : '#CCC',
                                                    color: '#FFF', padding: '14px 32px', borderRadius: 999, border: 'none',
                                                    fontSize: TYPE.sm, fontWeight: 700, letterSpacing: TRACK.soft, cursor: isPackageStepComplete ? 'pointer' : 'not-allowed',
                                                    boxShadow: isPackageStepComplete ? '0 4px 12px rgba(93,34,39,0.3)' : 'none',
                                                    transition: 'all 0.2s'
                                                }}>
                                                Continue &rarr;
                                            </button>
                                        </div>

                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Step 3: Date & Time ─────────────── */}
            {step === 'datetime' && (
                <div style={{ padding: '40px 20px', maxWidth: 900, margin: '0 auto' }}>
                    <button onClick={() => setStep('packages')} style={backBtnStyle}></button>

                    {/* Selected package summary banner */}
                    <div style={{
                        background: '#1C1C1E', borderRadius: 14, border: '1px solid #2C2C2E', padding: '14px 18px', marginBottom: 28,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                    }}>
                        <div>
                            <p style={{ fontSize: TYPE.xs, color: '#AAAAAA', letterSpacing: TRACK.soft, marginBottom: 2 }}>Summary</p>
                            <p style={{ fontSize: TYPE.md, fontWeight: 700, color: '#FFFFFF', letterSpacing: TRACK.tight }}>{state.selectedRoom} : <br/> {state.selectedPackage?.nama}</p>
                        </div>
                        <p style={{ fontSize: TYPE.md, fontWeight: 800, color: '#ffffffff', letterSpacing: TRACK.tight }}>{formatIDR(displayPrice)}</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                        <div style={{ background: '#1C1C1E', borderRadius: 16, border: '1px solid #2C2C2E', padding: 24 }}>
                            <MiniCalendar value={state.preferredDate} viewDate={calendarDate} onViewChange={setCalendarDate}
                                onChange={d => setState(p => ({ ...p, preferredDate: d, preferredTime: '' }))} />
                        </div>

                        <div style={{ background: '#1C1C1E', borderRadius: 16, border: '1px solid #2C2C2E', padding: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <p style={{ fontSize: TYPE.xs, fontWeight: 700, letterSpacing: TRACK.soft, color: '#AAAAAA' }}>Available Slot</p>
                                <span style={{ fontSize: TYPE.micro, background: '#2C2C2E', color: '#AAAAAA', padding: '3px 8px', borderRadius: 4, fontWeight: 600, letterSpacing: TRACK.soft }}>
                                    {state.preferredDate ? (new Date(state.preferredDate).getDay() === 0 || new Date(state.preferredDate).getDay() === 6 ? 'Weekend' : 'Weekday') : 'Pilih Tanggal'}
                                </span>
                            </div>
                            {!state.preferredDate ? (
                                <div style={{ padding: '30px 0', textAlign: 'center', color: '#555555', fontSize: TYPE.sm, letterSpacing: TRACK.soft }}>Pilih tanggal terlebih dahulu</div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {availableSlots.map(t => (
                                        <button key={t} onClick={() => setState(p => ({ ...p, preferredTime: t }))}
                                            style={{
                                                padding: '10px 0', fontSize: TYPE.sm, fontWeight: 600, letterSpacing: TRACK.soft, border: '1px solid',
                                                borderColor: state.preferredTime === t ? '#8f0700ff' : '#333333',
                                                background: state.preferredTime === t ? '#8f0700ff' : '#2C2C2E',
                                                color: state.preferredTime === t ? '#FFFFFF' : '#888888',
                                                borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', fontFamily: FONT,
                                            }}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: 24, textAlign: 'right' }}>
                        <button onClick={() => { setStep('form'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                            disabled={!state.preferredDate || !state.preferredTime}
                            style={{
                                padding: '14px 36px', fontSize: TYPE.sm, fontWeight: 700, letterSpacing: TRACK.soft,
                                background: state.preferredDate && state.preferredTime ? '#FFFFFF' : '#ffffff',
                                color: state.preferredDate && state.preferredTime ? '#000000' : '#ffffff',
                                borderRadius: 12, border: 'none',
                                cursor: state.preferredDate && state.preferredTime ? 'pointer' : 'not-allowed', fontFamily: FONT,
                            }}>
                            Next →
                        </button>
                    </div>
                </div>
            )}

            {/* ── Step 4: Booking Form ─────────────── */}
            {step === 'form' && (
                <div style={{ padding: '16px 16px 32px', margin: '0 auto', width: '100%' }}>
                    <button onClick={() => setStep('datetime')} style={backBtnStyle}></button>

                    <div className="form-layout">
                        {/* Form main */}
                        <div className="form-main">

                            <div style={{ background: '#1C1C1E', borderRadius: 16, border: '1px solid #2C2C2E', padding: '20px 18px' }}>
                                <h2 style={{ fontSize: TYPE.md, fontWeight: 700, marginBottom: 18, color: '#FFFFFF', letterSpacing: TRACK.tight }}>Personal Information</h2>

                                <FormField label="Nama*">
                                    <input style={inputStyle} placeholder="Nama..."
                                        value={state.customerName}
                                        onChange={e => setState(p => ({ ...p, customerName: e.target.value }))} />
                                </FormField>

                                <FormField label="Instagram*">
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#666666', fontSize: TYPE.sm, pointerEvents: 'none', userSelect: 'none' }}>@</span>
                                        <input style={{ ...inputStyle, paddingLeft: 32 }} placeholder="username"
                                            value={state.instagramHandle.replace('@', '')}
                                            onChange={e => setState(p => ({ ...p, instagramHandle: e.target.value }))} />
                                    </div>
                                    <p style={{ fontSize: TYPE.xs, color: '#666666', marginTop: 5, letterSpacing: TRACK.soft }}>Pastikan username Instagram kamu benar dan aktif. <br/> Konfirmasi booking, mengirim hasil foto dan komunikasi lainnya akan dilakukan melalui DM @mera.selfstudio.</p>
                                </FormField>

                                <FormField label="Payment Method*">
                                    <div style={{ display: 'flex', color: '#FFFFFF', flexDirection: 'column', gap: 10 }}>
                                        {(Object.keys(BOOKING_TYPE_LABELS) as BookingType[]).map(bt => {
                                            const { icon, label, desc } = BOOKING_TYPE_LABELS[bt]
                                            const checked = state.bookingType === bt
                                            return (
                                                <label key={bt} style={{
                                                    display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 12,
                                                    border: `1.5px solid ${checked ? '#FF3B30' : '#2C2C2E'}`,
                                                    background: checked ? '#1A0000' : '#2C2C2E', cursor: 'pointer', transition: 'all 0.15s',
                                                }}>
                                                    <input type="radio" name="booking_type" checked={checked}
                                                        onChange={() => setState(p => ({ ...p, bookingType: bt }))} style={{ marginTop: 3 }} />
                                                    <div>
                                                        <p style={{ fontWeight: 600, fontSize: TYPE.sm, color: '#FFFFFF', letterSpacing: TRACK.soft }}>{icon} {label}</p>
                                                        <p style={{ fontSize: TYPE.xs, color: '#888888', marginTop: 2, letterSpacing: TRACK.soft }}>{desc}</p>
                                                    </div>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </FormField>

                                {/* KEEPSLOT expiry warning */}
                                {state.bookingType === 'ONLINE_KEEPSLOT' && (
                                    <div style={{ background: '#2B2200', border: '1px solid #ffc400ff', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                                        <p style={{ fontSize: TYPE.xs, color: '#ffffffff', letterSpacing: TRACK.soft }}>⏰ Booking <strong>EXPIRED otomatis dalam 6 JAM</strong> jika tidak konfirmasi dan datang ke Studio.</p>
                                    </div>
                                )}

                                <button onClick={handleSubmit} disabled={loading || !formValid}
                                    style={{
                                        width: '100%', padding: '15px', fontSize: TYPE.md, fontWeight: 700, letterSpacing: TRACK.soft,
                                        background: formValid ? '#FFFFFF' : '#2C2C2E',
                                        color: formValid ? '#000000' : '#555555', borderRadius: 12, border: 'none',
                                        cursor: formValid ? 'pointer' : 'not-allowed', marginTop: 8, fontFamily: FONT,
                                    }}>
                                    {loading ? 'Loading...' : 'Konfirmasi Booking →'}
                                </button>
                            </div>
                        </div>

                        {/* Compact Summary */}
                        <div className="form-summary">
                            <div style={{ background: '#1C1C1E', borderRadius: 14, border: '1px solid #2C2C2E', padding: '16px 18px' }}>
                                <p style={{ fontSize: TYPE.xs, fontWeight: 700, letterSpacing: TRACK.soft, color: '#666666', marginBottom: 12 }}>Ringkasan</p>

                                <p style={{ fontSize: TYPE.xs, color: '#666666', marginBottom: 2, letterSpacing: TRACK.soft }}>{state.selectedRoom}</p>
                                <p style={{ fontSize: TYPE.md, fontWeight: 800, marginBottom: 2, color: '#FFFFFF', letterSpacing: TRACK.tight }}>{state.selectedPackage?.nama}</p>
                                <p style={{ fontSize: TYPE.xs, color: '#AAAAAA', marginBottom: 8, letterSpacing: TRACK.soft }}>{state.pax} Orang</p>

                                {state.selectedVariant && (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: '#2C2C2E', borderRadius: 8, marginBottom: 8 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: VARIANTS['Basic Studio'].find(v => v.code === state.selectedVariant)?.hex }} />
                                        <span style={{ fontSize: TYPE.xs, fontWeight: 600, color: '#FFFFFF', letterSpacing: TRACK.soft }}>{VARIANTS['Basic Studio'].find(v => v.code === state.selectedVariant)?.label}</span>
                                    </div>
                                )}

                                {state.selectedAddons.includes(ADDON_EDITED_COLORED) && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                                        <span style={{ fontSize: TYPE.xs, color: '#30D158', fontWeight: 600, letterSpacing: TRACK.soft }}>✨ Edited + Colored</span>
                                    </div>
                                )}

                                <div style={{ borderTop: '1px solid #2C2C2E', paddingTop: 10, marginTop: 4 }}>
                                    <SummaryRow label="Tanggal" value={state.preferredDate ? new Date(state.preferredDate + 'T00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
                                    <SummaryRow label="Jam" value={state.preferredTime || '—'} />
                                </div>

                                <div style={{ borderTop: '1px solid #2C2C2E', paddingTop: 10, marginTop: 4 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: TYPE.xs, fontWeight: 700, color: '#FFFFFF', letterSpacing: TRACK.soft }}>Total</span>
                                        <span style={{ fontSize: TYPE.md, fontWeight: 800, color: '#ffffffff', letterSpacing: TRACK.tight }}>{formatIDR(displayPrice)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Step 5: Confirmation ─────────────── */}
            {step === 'confirm' && (
                <div style={{ padding: '40px 20px', maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
                    <div style={{ fontSize: TYPE.xl, marginBottom: 8 }}>📸</div>
                    <h1 style={{ fontSize: TYPE.lg, fontWeight: 800, marginBottom: 8, color: '#FFFFFF', letterSpacing: TRACK.tight }}>Booking Berhasil!</h1>
                    <p style={{ fontSize: TYPE.sm, color: '#AAAAAA', marginBottom: 24, lineHeight: 1.5, letterSpacing: TRACK.soft }}>
                        Screenshot tiket ini dan kirimkan via <strong>Instagram DM</strong> untuk konfirmasi bookingmu.
                    </p>

                    {/* RECEIPT TICKET */}
                    <div style={{
                        background: state.bookingType === 'ONLINE_KEEPSLOT' ? '#fff3cd' :
                            state.bookingType === 'ONLINE_QRIS' ? '#ffccbc' : '#111111',
                        borderRadius: 20,
                        border: `1px solid ${state.bookingType === 'ONLINE_KEEPSLOT' ? '#ffeeba' : state.bookingType === 'ONLINE_QRIS' ? '#ffab91' : '#333333'}`,
                        marginBottom: 24,
                        textAlign: 'left',
                        position: 'relative',
                        overflow: 'hidden'
                    }} className="receipt-ticket">

                        {/* Ticket Header */}
                        <div style={{ padding: '24px 24px 16px', borderBottom: `2px dashed ${state.bookingType === 'ONLINE_KEEPSLOT' ? '#E6DCB8' : state.bookingType === 'ONLINE_QRIS' ? '#EAB8B2' : '#333'}`, position: 'relative' }}>
                            <div style={{ position: 'absolute', bottom: -10, left: -10, width: 20, height: 20, borderRadius: '50%', background: '#000' }} />
                            <div style={{ position: 'absolute', bottom: -10, right: -10, width: 20, height: 20, borderRadius: '50%', background: '#000' }} />

                            <p style={{ fontSize: TYPE.xs, color: state.bookingType ? 'rgba(0,0,0,0.5)' : '#888', letterSpacing: TRACK.soft, marginBottom: 4 }}>Booking Id</p>
                            <p style={{ fontSize: TYPE.lg, fontFamily: 'monospace', fontWeight: 800, color: state.bookingType ? '#000' : '#FFF', letterSpacing: TRACK.soft }}>{state.sessionId}</p>
                            <p style={{ fontSize: TYPE.xs, color: state.bookingType ? 'rgba(0,0,0,0.6)' : '#AAA', marginTop: 4, letterSpacing: TRACK.soft }}>a.n. {state.customerName} (@{state.instagramHandle.replace('@', '')})</p>
                        </div>

                        {/* Ticket Body */}
                        <div style={{ padding: '20px 24px 24px' }}>
                            <SummaryRowDark label="Studio" value={state.selectedRoom ?? '—'} bookingType={state.bookingType} />
                            <SummaryRowDark label="Paket" value={state.selectedPackage?.nama ?? '—'} bookingType={state.bookingType} />
                            <SummaryRowDark label="Jumlah Orang" value={`${state.pax} Orang`} bookingType={state.bookingType} />
                            {state.selectedVariant && <SummaryRowDark label="Warna" value={VARIANTS['Basic Studio'].find(v => v.code === state.selectedVariant)?.label} bookingType={state.bookingType} />}
                            {state.selectedAddons.includes(ADDON_EDITED_COLORED) && <SummaryRowDark label="Add On" value="Edited + Colored" bookingType={state.bookingType} />}
                            <div style={{ marginTop: 12, marginBottom: 12, borderTop: `1px solid ${state.bookingType === 'ONLINE_KEEPSLOT' ? '#E6DCB8' : state.bookingType === 'ONLINE_QRIS' ? '#EAB8B2' : '#222'}` }} />
                            <SummaryRowDark label="Tanggal" value={state.preferredDate ? new Date(state.preferredDate).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '—'} bookingType={state.bookingType} />
                            <SummaryRowDark label="Jam Sesi" value={state.preferredTime || '—'} bookingType={state.bookingType} />
                            <SummaryRowDark label="Tipe Pembayaran" value={BOOKING_TYPE_LABELS[state.bookingType]?.label || '—'} bookingType={state.bookingType} />
                            <div style={{ marginTop: 12, marginBottom: 16, borderTop: `1px solid ${state.bookingType === 'ONLINE_KEEPSLOT' ? '#E6DCB8' : state.bookingType === 'ONLINE_QRIS' ? '#EAB8B2' : '#222'}` }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: TYPE.sm, color: state.bookingType ? 'rgba(0,0,0,0.6)' : '#AAA', letterSpacing: TRACK.soft }}>Total Tagihan</span>
                                <span style={{ fontSize: TYPE.lg, fontWeight: 800, color: state.bookingType ? '#000' : '#FFF', letterSpacing: TRACK.tight }}>{formatIDR(displayPrice)}</span>
                            </div>

                            {state.bookingType === 'ONLINE_KEEPSLOT' && (
                                <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(0,0,0,0.05)', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)' }}>
                                    <p style={{ fontSize: TYPE.xs, color: '#7A5C00', lineHeight: 1.4, fontWeight: 600, letterSpacing: TRACK.soft }}>
                                        ⏰ Tiket booking EXPIRED dalam 6 jam. Harap segera konfirmasi pembayaran via DM.
                                    </p>
                                </div>
                            )}

                            {state.bookingType === 'ONLINE_QRIS' && (
                                <div style={{ marginTop: 24, padding: '24px', background: '#FFFFFF', borderRadius: 16, textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                    <p style={{ fontSize: TYPE.sm, fontWeight: 700, color: '#000000', marginBottom: 16, letterSpacing: TRACK.soft }}>Scan QRIS untuk Membayar</p>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                                        <QRCode value={generateDynamicQRIS(displayPrice)} size={200} />
                                    </div>
                                    <p style={{ fontSize: TYPE.xs, color: '#666', lineHeight: 1.4, letterSpacing: TRACK.soft }}>
                                        Nominal <strong>{formatIDR(displayPrice)}</strong> sudah terisi otomatis.
                                        Setelah berhasil bayar, kirimkan screenshot ke DM kami.
                                    </p>
                                    <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(0,0,0,0.04)', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)' }}>
                                        <p style={{ fontSize: TYPE.xs, color: '#555', lineHeight: 1.4, letterSpacing: TRACK.soft }}>
                                            Ingin ubah jadwal? Gunakan tombol <strong>Reschedule</strong> di bawah. Sudah tiba di studio? Tap <strong>Self Check-in</strong>.
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                        <button
                                            onClick={() => {
                                                setRescDate(state.preferredDate)
                                                setRescTime(state.preferredTime)
                                                setRescCalDate(new Date())
                                                setShowReschedule(true)
                                            }}
                                            style={{ flex: 1, padding: '10px', background: '#F2F2F7', color: '#000', border: 'none', borderRadius: 8, fontSize: TYPE.xs, fontWeight: 700, letterSpacing: TRACK.soft, cursor: 'pointer' }}>📅 Reschedule</button>
                                        <a
                                            href={`/checkin?sid=${encodeURIComponent(state.sessionId ?? '')}`}
                                            target="_blank" rel="noopener noreferrer"
                                            style={{ flex: 1, padding: '10px', background: '#000', color: '#FFF', border: 'none', borderRadius: 8, fontSize: TYPE.xs, fontWeight: 700, letterSpacing: TRACK.soft, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📷 Self Check-in</a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Instagram DM button */}
                    <a
                        href={`https://ig.me/m/${INSTAGRAM_DM_TARGET}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                            padding: '16px 28px',
                            background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)',
                            color: '#fff', borderRadius: 14, fontWeight: 700, fontSize: TYPE.md, letterSpacing: TRACK.soft, marginBottom: 16, textDecoration: 'none',
                        }}>
                        <InstagramIcon /> Konfirmasi Booking
                    </a>

                    <Link href="/" style={{ display: 'block', fontSize: TYPE.sm, color: '#ffffffff', padding: '10px 0', letterSpacing: TRACK.soft, textDecoration: 'none' }}>
                        ← Home
                    </Link>
                </div>
                            )}
                        </>
                    )
                })()}

            {/* ── Reschedule Modal ────────────────────────────────── */}
            {showReschedule && (
                <div
                    onClick={e => { if (e.target === e.currentTarget) setShowReschedule(false) }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 999,
                        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                        padding: '0 0 env(safe-area-inset-bottom)',
                    }}
                >
                    <div style={{
                        width: '100%', maxWidth: 480,
                        background: '#1C1C1E', borderRadius: '20px 20px 0 0',
                        border: '1px solid #2C2C2E', padding: '24px 20px 32px',
                        maxHeight: '90dvh', overflowY: 'auto',
                    }}>
                        {/* Handle bar */}
                        <div style={{ width: 36, height: 4, background: '#3A3A3C', borderRadius: 2, margin: '0 auto 20px' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <h2 style={{ fontSize: TYPE.md, fontWeight: 800, color: '#FFFFFF', letterSpacing: TRACK.tight, margin: 0 }}>
                                📅 Reschedule Booking
                            </h2>
                            <button onClick={() => setShowReschedule(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: 22, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
                        </div>
                        <p style={{ fontSize: TYPE.xs, color: '#666', marginBottom: 20, letterSpacing: TRACK.soft }}>
                            Booking ID: <span style={{ fontFamily: 'monospace', color: '#AAAAAA', fontWeight: 700 }}>{state.sessionId}</span>
                        </p>

                        {/* Calendar */}
                        <div style={{ background: '#111111', borderRadius: 14, border: '1px solid #2C2C2E', padding: 16, marginBottom: 16 }}>
                            <p style={{ fontSize: TYPE.xs, fontWeight: 700, color: '#AAAAAA', letterSpacing: TRACK.soft, marginBottom: 12 }}>Pilih Tanggal Baru</p>
                            <MiniCalendar
                                value={rescDate}
                                viewDate={rescCalDate}
                                onViewChange={setRescCalDate}
                                onChange={d => { setRescDate(d); setRescTime('') }}
                            />
                        </div>

                        {/* Time slots */}
                        <div style={{ background: '#111111', borderRadius: 14, border: '1px solid #2C2C2E', padding: 16, marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <p style={{ fontSize: TYPE.xs, fontWeight: 700, color: '#AAAAAA', letterSpacing: TRACK.soft }}>Pilih Jam Sesi</p>
                                {rescDate && (
                                    <span style={{ fontSize: TYPE.micro, background: '#2C2C2E', color: '#AAAAAA', padding: '3px 8px', borderRadius: 4, fontWeight: 600, letterSpacing: TRACK.soft }}>
                                        {new Date(rescDate).getDay() === 0 || new Date(rescDate).getDay() === 6 ? 'Weekend' : 'Weekday'}
                                    </span>
                                )}
                            </div>
                            {!rescDate ? (
                                <p style={{ color: '#555', fontSize: TYPE.sm, textAlign: 'center', padding: '16px 0', letterSpacing: TRACK.soft }}>Pilih tanggal terlebih dahulu</p>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {rescAvailableSlots.map(t => (
                                        <button key={t} onClick={() => setRescTime(t)}
                                            style={{
                                                padding: '10px 0', fontSize: TYPE.sm, fontWeight: 600, letterSpacing: TRACK.soft, border: '1px solid',
                                                borderColor: rescTime === t ? '#8f0700ff' : '#333333',
                                                background: rescTime === t ? '#8f0700ff' : '#2C2C2E',
                                                color: rescTime === t ? '#FFFFFF' : '#888888',
                                                borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', fontFamily: FONT,
                                            }}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected summary */}
                        {rescDate && rescTime && (
                            <div style={{ padding: '12px 16px', background: 'rgba(48,209,88,0.1)', borderRadius: 12, border: '1px solid rgba(48,209,88,0.2)', marginBottom: 16 }}>
                                <p style={{ fontSize: TYPE.xs, color: '#30D158', fontWeight: 600, letterSpacing: TRACK.soft }}>
                                    ✓ Jadwal baru: {new Date(rescDate).toLocaleDateString('id-ID', { dateStyle: 'long' })} · {rescTime}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={handleReschedule}
                            disabled={!rescDate || !rescTime || rescLoading}
                            style={{
                                width: '100%', padding: '14px', fontSize: TYPE.sm, fontWeight: 700, letterSpacing: TRACK.soft,
                                border: 'none', borderRadius: 12, fontFamily: FONT,
                                background: rescDate && rescTime && !rescLoading ? '#FFFFFF' : '#2C2C2E',
                                color: rescDate && rescTime && !rescLoading ? '#000000' : '#555555',
                                cursor: rescDate && rescTime && !rescLoading ? 'pointer' : 'not-allowed',
                                transition: 'all 0.15s',
                            }}
                        >
                            {rescLoading ? 'Menyimpan...' : 'Simpan Jadwal Baru →'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Shared Styles ────────────────────────────────────────────────
const backBtnStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 10, border: '1px solid #2C2C2E',
    background: '#1C1C1E', fontSize: TYPE.xs, fontWeight: 600, letterSpacing: TRACK.soft, color: '#AAAAAA',
    cursor: 'pointer', marginBottom: 28, transition: 'color 0.15s',
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', fontSize: TYPE.sm, letterSpacing: TRACK.soft,
    border: '1px solid #2C2C2E', borderRadius: 10,
    background: '#2C2C2E', color: '#FFFFFF', outline: 'none',
    boxSizing: 'border-box', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
}

// ── Shared Sub-Components ────────────────────────────────────────
function MiniCalendar({ value, viewDate, onViewChange, onChange }: { value: string, viewDate: Date, onViewChange: (d: Date) => void, onChange: (iso: string) => void }) {
    const FONT_LOCAL = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const todayStr = todayISO()

    const days = useMemo(() => {
        const firstDay = new Date(year, month, 1).getDay()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const cells: (number | null)[] = []
        for (let i = 0; i < firstDay; i++) cells.push(null)
        for (let d = 1; d <= daysInMonth; d++) cells.push(d)
        return cells
    }, [year, month])

    const toISO = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <button onClick={() => onViewChange(new Date(year, month - 1, 1))} style={{ background: 'none', border: '1px solid #333333', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: TYPE.sm, color: '#FFFFFF' }}>‹</button>
                <span style={{ font: `600 ${TYPE.sm} ${FONT_LOCAL}`, color: '#FFFFFF', letterSpacing: TRACK.soft }}>{MONTH_ID[month]} {year}</span>
                <button onClick={() => onViewChange(new Date(year, month + 1, 1))} style={{ background: 'none', border: '1px solid #333333', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: TYPE.sm, color: '#FFFFFF' }}>›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
                {DAY_SHORT.map(d => <div key={d} style={{ textAlign: 'center', fontSize: TYPE.micro, fontWeight: 600, letterSpacing: TRACK.soft, color: '#555555', padding: '4px 0' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {days.map((d, i) => {
                    if (!d) return <div key={i} />
                    const iso = toISO(d)
                    const isPast = iso < todayStr
                    const isSelected = iso === value
                    return (
                        <button key={i} onClick={() => !isPast && onChange(iso)} disabled={isPast}
                            style={{
                                padding: '8px 0', fontSize: TYPE.xs, fontWeight: isSelected ? 700 : 400, letterSpacing: TRACK.soft, border: 'none', borderRadius: 8,
                                cursor: isPast ? 'default' : 'pointer',
                                background: isSelected ? '#FF3B30' : 'transparent',
                                color: isSelected ? '#FFFFFF' : isPast ? '#333333' : '#FFFFFF', fontFamily: FONT_LOCAL,
                            }}>
                            {d}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: TYPE.xs, fontWeight: 600, color: '#AAAAAA', marginBottom: 7, letterSpacing: TRACK.soft }}>
                {label}
            </label>
            {children}
        </div>
    )
}

function SummaryRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', gap: 12 }}>
            <span style={{ fontSize: TYPE.xs, color: '#666666', letterSpacing: TRACK.soft, flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: TYPE.xs, fontWeight: 600, letterSpacing: TRACK.soft, textAlign: 'right', color: '#FFFFFF' }}>{value ?? '—'}</span>
        </div>
    )
}

function SummaryRowDark({ label, value, bold, bookingType }: { label: string; value?: string | null; bold?: boolean; bookingType?: 'ONLINE_KEEPSLOT' | 'ONLINE_QRIS' | null }) {
    const isLight = !!bookingType;
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', gap: 12 }}>
            <span style={{ fontSize: TYPE.xs, color: isLight ? 'rgba(0,0,0,0.6)' : '#888888', letterSpacing: TRACK.soft, flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: TYPE.xs, fontWeight: bold ? 800 : 600, letterSpacing: TRACK.soft, textAlign: 'right', color: bold ? '#FF3B30' : (isLight ? '#000' : '#FFFFFF') }}>{value ?? '—'}</span>
        </div>
    )
}

function InstagramIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
    )
}


