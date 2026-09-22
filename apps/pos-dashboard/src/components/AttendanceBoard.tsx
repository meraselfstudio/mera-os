import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPOSClient } from '@mera/supabase'
const supabase = createPOSClient()
import { Clock, RefreshCw, CheckCircle2, Circle, AlertTriangle, Camera, XCircle, ArrowLeft, Download, LogIn } from 'lucide-react'
import type { Crew, Attendance } from '@mera/supabase'

// ── Shift Definitions ─────────────────────────────────────────
// Studio Shifts (Senin–Kamis 11.30–21.00, Jum'at–Minggu 08.30–21.00)
// Days: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
const STUDIO_SHIFTS = [
    {
        key: 'Weekday Full Time',
        label: 'Weekday Full Time',
        desc: 'Senin – Kamis · 11.30–21.00',
        rate: 75_000,
        startH: 11, startM: 30,
        days: [1, 2, 3, 4] as number[], // Mon-Thu
    },
    {
        key: 'Weekend Shift 1',
        label: 'Weekend Shift 1',
        desc: "Jum'at – Minggu · 08.30–15.00",
        rate: 35_000,
        startH: 8, startM: 30,
        days: [0, 5, 6] as number[], // Fri,Sat,Sun
    },
    {
        key: 'Weekend Shift 2',
        label: 'Weekend Shift 2',
        desc: "Jum'at – Minggu · 14.30–21.00",
        rate: 35_000,
        startH: 14, startM: 30,
        days: [0, 5, 6] as number[],
    },
    {
        key: 'Weekend Full Time',
        label: 'Weekend Full Time',
        desc: "Jum'at – Minggu · 08.30–21.00",
        rate: 100_000,
        startH: 8, startM: 30,
        days: [0, 5, 6] as number[],
    },
] as const

// Méra Hause Cafe Shifts (Operasional 12.00–23.00, Base Rp 50.000, Solo Rp 100.000)
const CAFE_SHIFTS = [
    {
        key: 'Cafe Shift 1',
        label: 'Shift 1 (Méra Hause)',
        desc: 'Shift 1 · 11.00–20.00',
        rate: 50_000,
        startH: 11, startM: 0,
        days: [0, 1, 2, 3, 4, 5, 6] as number[],
    },
    {
        key: 'Cafe Shift 2',
        label: 'Shift 2 (Méra Hause)',
        desc: 'Shift 2 · 15.00–23.00',
        rate: 50_000,
        startH: 15, startM: 0,
        days: [0, 1, 2, 3, 4, 5, 6] as number[],
    },
    {
        key: 'Méra Hause Full Time',
        label: 'Full Time (Méra Hause)',
        desc: 'Full Time · 11.00–23.00',
        rate: 100_000,
        startH: 11, startM: 0,
        days: [0, 1, 2, 3, 4, 5, 6] as number[],
    },
] as const

const ALL_SHIFTS = [...STUDIO_SHIFTS, ...CAFE_SHIFTS]
type ShiftItem = typeof ALL_SHIFTS[number]
type ShiftKey = ShiftItem['key']

export function isCafeCrew(c?: Crew | { role?: string; nama?: string } | null): boolean {
    if (!c) return false
    const r = (c.role || '').toLowerCase()
    const n = (c.nama || '').toLowerCase()
    return r.includes('cafe') || r.includes('hause') || r.includes('barista') || n === 'nona' || n === 'rara' || n === 'izza'
}

// ── Bonus Parameters ──────────────────────────────────────────
const TARGET_WEEKDAY = 1_000_000
const TARGET_WEEKEND = 1_500_000
const GRACE_MINUTES = 10
const PENALTY_PER_10MIN = 5_000

function isWeekendDay(date: Date) {
    const d = date.getDay(); return d === 0 || d === 5 || d === 6
}

function calcLateMinutes(clockInISO: string, shift: ShiftItem): number {
    const d = new Date(clockInISO)
    const start = new Date(d)
    start.setHours(shift.startH, shift.startM, 0, 0)
    const diffMin = Math.floor((d.getTime() - start.getTime()) / 60_000)
    return diffMin > 0 ? diffMin : 0
}

function calcPenalty(lateMin: number, isIntern: boolean): number {
    if (isIntern || lateMin <= GRACE_MINUTES) return 0
    const overGrace = lateMin - GRACE_MINUTES
    return Math.ceil(overGrace / 10) * PENALTY_PER_10MIN
}

function calcDailyBonus(omset: number, crewCount: number): number {
    if (crewCount === 0) return 0
    const target = isWeekendDay(new Date()) ? TARGET_WEEKEND : TARGET_WEEKDAY
    if (omset < target) return 0
    const over = omset - target
    const total = 20_000 + Math.floor(over / 50_000) * 5_000
    return Math.floor(total / crewCount)
}

function fmtRp(n: number) { return `Rp ${n.toLocaleString('id-ID')}` }
function fmtTime(iso: string | null) {
    if (!iso) return '–'
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
function todayISO() {
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

// ── Webcam Hook ───────────────────────────────────────────────
function useCamera() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [ready, setReady] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const streamRef = useRef<MediaStream | null>(null)

    const start = useCallback(async () => {
        setError(null)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.play()
            }
            setReady(true)
        } catch (e) {
            setError('Camera not accessible. Please ensure camera permissions are granted.')
            setReady(false)
        }
    }, [])

    const stop = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        setReady(false)
    }, [])

    const capture = useCallback((): string | null => {
        const video = videoRef.current
        if (!video) return null
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d')?.drawImage(video, 0, 0)
        return canvas.toDataURL('image/jpeg', 0.75)
    }, [])

    return { videoRef, ready, error, start, stop, capture }
}

// ── Upload photo to Supabase Storage ─────────────────────────
async function uploadPhoto(base64: string, filename: string, metadata?: any): Promise<string | null> {
    try {
        const res = await fetch(base64)
        const blob = await res.blob()
        const { data, error } = await supabase.storage
            .from('attendance-photos')
            .upload(filename, blob, { contentType: 'image/jpeg', upsert: true })
        if (error || !data?.path) return null
        const { data: urlData } = supabase.storage.from('attendance-photos').getPublicUrl(data.path)

        // Also upload to Google Drive via Apps Script (silent, best-effort)
        uploadToDriveBackground(base64, filename, metadata)

        return urlData.publicUrl
    } catch {
        return null
    }
}

// ── Background upload to Google Drive via server-side proxy ──

async function uploadToDriveBackground(base64: string, filename: string, metadata?: any) {
    const data = base64.split(',')[1]
    if (!data) return

    const actionType = metadata?.type === 'OUT' ? 'Clock Out' : 'Clock In'
    const payload = {
        fileName: filename,
        mimeType: 'image/jpeg',
        data,
        folderId: '1KfG7aIPXbZIoOG857fFl73jfYJozAYBI',
        crewName: metadata?.crewName || 'Unknown',
        type: metadata?.type || 'IN',
        actionType: actionType,
        subFolder: metadata?.crewName || 'Unknown',
    }

    // 1. Try server proxy (/api/upload)
    try {
        const proxyRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        if (proxyRes.ok) {
            const result = await proxyRes.json().catch(() => null)
            if (result?.ok) {
                console.log('[Attendance] Drive upload success:', filename)
                return
            }
        }
    } catch {
        // Fallback to direct Apps Script call
    }

    // 2. Direct Apps Script fetch fallback
    const scriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL
    if (!scriptUrl) return

    try {
        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            body: JSON.stringify(payload),
        })
        console.log('[Attendance] Direct Drive upload dispatched:', filename)
    } catch (e) {
        console.warn('[Attendance] Background Drive upload failed:', e)
    }
}

// ── Export Intern PDF ─────────────────────────────────────────

function exportInternPdf(attendance: Attendance[], crewList: Crew[]) {
    const jsPDF = (window as any).jspdf.jsPDF
    const doc = new jsPDF()
    const interns = crewList.filter((c: any) => c.status_gaji === 'INTERN')
    const internIds = new Set(interns.map(c => c.id))

    // Filter attendance for interns only
    const internAtt = attendance.filter(a => internIds.has(a.crew_id))

    // Prepare table data
    const tableData = internAtt.map(a => {
        const crewName = crewList.find(c => c.id === a.crew_id)?.nama || 'Unknown'
        const inTime = new Date(a.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        const outTime = a.clock_out ? new Date(a.clock_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'
        const date = new Date(a.clock_in).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        return [
            date,
            crewName,
            a.shift_type,
            inTime,
            outTime,
            a.status === 'COMPLETED' ? 'Selesai' : 'Hadir'
        ]
    })

    doc.setFontSize(16)
    doc.text('Rekap Absen Magang', 14, 20)
    doc.setFontSize(10)
    doc.text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`, 14, 26)

        ; (doc as any).autoTable({
            startY: 32,
            head: [['Tanggal', 'Nama', 'Shift', 'Clock In', 'Clock Out', 'Status']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
        })

    doc.save(`Rekap_Absen_Magang_${new Date().getTime()}.pdf`)
}

// ── Main Component ────────────────────────────────────────────
export default function AttendanceBoard({ onLogout, onClockIn }: { onLogout?: () => void; onClockIn?: (crewId: string) => void } = {}) {
    const [crew, setCrew] = useState<Crew[]>([])
    const [attendance, setAttendance] = useState<Attendance[]>([])
    const [loading, setLoading] = useState(true)

    // Modal states
    const [clockInTarget, setClockInTarget] = useState<Crew | null>(null)
    const [clockOutTarget, setClockOutTarget] = useState<{ crew: Crew; att: Attendance } | null>(null)


    // Live clock
    const [now, setNow] = useState(new Date())
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 20_000)
        return () => clearInterval(t)
    }, [])

    const load = useCallback(async () => {
        setLoading(true)
        const day = todayISO()
        const isoStart = wibDayToISOStart(day)
        const isoEnd = wibDayToISOEnd(day)
        const [{ data: crewData }, { data: attData }] = await Promise.all([
            (supabase.from('crew') as any).select('*').eq('is_active', true).order('nama'),
            (supabase.from('attendance') as any)
                .select('*')
                .gte('clock_in', isoStart)
                .lte('clock_in', isoEnd)
                .order('clock_in', { ascending: false }),
        ])

        // Deduplicate crew by lowercase name to ensure clean UI
        const seenNames = new Set<string>()
        const uniqueCrew: Crew[] = []
        for (const c of (crewData ?? []) as Crew[]) {
            const key = c.nama.trim().toLowerCase()
            if (!seenNames.has(key)) {
                seenNames.add(key)
                uniqueCrew.push(c)
            }
        }

        setCrew(uniqueCrew)
        setAttendance((attData ?? []) as Attendance[])
        setLoading(false)
    }, [])

    useEffect(() => {
        load()
        const ch = supabase
            .channel('attendance-v3')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => load())
            .subscribe()
        return () => { supabase.removeChannel(ch) }
    }, [load])

    // Derived maps
    const activeAttByCrew = new Map<string, Attendance>()
    const completedAttByCrew = new Map<string, Attendance>()
    attendance.forEach(a => {
        if (a.status === 'ACTIVE') activeAttByCrew.set(a.crew_id, a)
        else if (a.status === 'COMPLETED') completedAttByCrew.set(a.crew_id, a)
    })
    const crewMap = new Map(crew.map(c => [c.id, c]))

    if (loading) return (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--mera-text-tertiary)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div>
                <p style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Clock size={28} color="var(--mera-text-tertiary)" /></p>
                <p>Loading...</p>
            </div>
        </div>
    )

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px' }}>

            {/* ── Header ─────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h2 style={{ fontSize: 25, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.02em' }}>Crew Attendance</h2>
                    <p style={{ fontSize: 12, color: 'var(--mera-text-tertiary)' }}>
                        {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => exportInternPdf(attendance, crew)} style={{
                        padding: '6px 14px', fontSize: 12, border: '1px solid var(--mera-border)',
                        borderRadius: 'var(--mera-radius-md)', background: 'var(--mera-surface)',
                        cursor: 'pointer', color: 'var(--mera-text-secondary)', fontWeight: 600
                    }}>
                        <Download size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
                        Cetak PDF Magang
                    </button>
                    <button onClick={load} style={{
                        padding: '6px 14px', fontSize: 12, border: '1px solid var(--mera-border)',
                        borderRadius: 'var(--mera-radius-md)', background: 'var(--mera-surface)',
                        cursor: 'pointer', color: 'var(--mera-text-secondary)',
                    }}><RefreshCw size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} /> Refresh</button>
                </div>
            </div>

            {/* ── Stats strip ────────────────────────────── */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                {[
                    { label: 'Hadir', val: attendance.filter(a => a.status === 'ACTIVE').length, color: 'var(--mera-success)' },
                    { label: 'Selesai', val: attendance.filter(a => a.status === 'COMPLETED').length, color: 'var(--mera-text-secondary)' },
                    { label: 'Total Log', val: attendance.length, color: 'var(--mera-text-tertiary)' },
                ].map(s => (
                    <div key={s.label} style={{
                        background: 'var(--mera-surface)', border: '1px solid var(--mera-border)',
                        borderRadius: 'var(--mera-radius-md)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.val}</span>
                        <span style={{ fontSize: 11, color: 'var(--mera-text-tertiary)' }}>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* ── Crew Cards ─────────────────────────────── */}
            <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mera-text-tertiary)', marginBottom: 10 }}>

            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 28 }}>
                {crew.length === 0 && (
                    <p style={{ gridColumn: '1/-1', color: 'var(--mera-text-tertiary)', fontSize: 13, padding: 16 }}>
                        No Crew.
                    </p>
                )}
                {crew.map(c => {
                    const isIntern = (c as any).status_gaji === 'INTERN'
                    const isCafe = isCafeCrew(c)
                    const activeAtt = activeAttByCrew.get(c.id)
                    const doneAtt = completedAttByCrew.get(c.id)
                    const isWorking = !!activeAtt
                    const isDone = !!doneAtt

                    let borderColor = 'var(--mera-border)'
                    if (isWorking) borderColor = 'var(--mera-success)'
                    else if (isDone) borderColor = 'rgba(255,255,255,0.06)'

                    return (
                        <div key={c.id} style={{
                            background: isWorking ? 'rgba(48,209,88,0.04)' : 'var(--mera-surface)',
                            border: `1.5px solid ${borderColor}`,
                            borderRadius: 'var(--mera-radius-lg)',
                            padding: '16px 14px',
                            transition: 'border-color 0.3s, background 0.3s',
                        }}>
                            {/* Top row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: '50%',
                                    background: isWorking ? 'rgba(48,209,88,0.15)' : isDone ? 'var(--mera-surface-raised)' : 'var(--mera-accent-light)',
                                    border: `2px solid ${isWorking ? 'var(--mera-success)' : isDone ? 'var(--mera-border-strong)' : 'var(--mera-border-strong)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                                }}>
                                    {isWorking ? <CheckCircle2 size={20} color="var(--mera-success)" /> : isDone ? <CheckCircle2 size={20} color="var(--mera-text-secondary)" /> : <Circle size={20} color="var(--mera-border-strong)" />}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nama}</p>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <span style={{
                                            fontSize: 10,
                                            color: isCafe ? '#E0B88A' : 'var(--mera-text-tertiary)',
                                            fontWeight: isCafe ? 700 : 500,
                                            background: isCafe ? 'rgba(98, 33, 40, 0.25)' : 'transparent',
                                            border: isCafe ? '1px solid rgba(139, 26, 26, 0.4)' : 'none',
                                            padding: isCafe ? '1px 6px' : '0',
                                            borderRadius: 4
                                        }}>
                                            {isCafe ? '☕ ' + (c.role === 'Crew' ? 'Méra Hause' : c.role) : c.role}
                                        </span>
                                        {isIntern && (
                                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--mera-warning)', background: 'var(--mera-warning-bg)', padding: '1px 6px', borderRadius: 9999 }}>Intern</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Status info */}
                            {isWorking && activeAtt && (
                                <div style={{ marginBottom: 10, fontSize: 11 }}>
                                    <p style={{ color: 'var(--mera-success)', fontWeight: 600, marginBottom: 2 }}>
                                        ● Login {fmtTime(activeAtt.clock_in)}
                                    </p>
                                    <p style={{ color: 'var(--mera-text-tertiary)', marginBottom: 2 }}>
                                        {activeAtt.shift_type}
                                    </p>
                                    {activeAtt.late_minutes > 0 && (
                                        <p style={{ color: 'var(--mera-warning)' }}>
                                            <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} /> Late {activeAtt.late_minutes} mnt → −{fmtRp(activeAtt.penalty_amount)}
                                        </p>
                                    )}
                                </div>
                            )}

                            {isDone && doneAtt && (
                                <div style={{ marginBottom: 10, fontSize: 11 }}>
                                    <p style={{ color: 'var(--mera-text-secondary)', fontWeight: 600, marginBottom: 2 }}>
                                        Login {fmtTime(doneAtt.clock_in)} · Logout {fmtTime(doneAtt.clock_out)}
                                    </p>
                                    {!isIntern && (
                                        <p style={{ color: 'var(--mera-text-secondary)', fontWeight: 500 }}>
                                            Shift Done!.
                                        </p>
                                    )}
                                </div>
                            )}

                            {!isWorking && !isDone && (
                                <p style={{ fontSize: 11, color: 'var(--mera-text-tertiary)', marginBottom: 10 }}>Off Day?</p>
                            )}

                            {/* Action button */}
                            {isWorking && activeAtt ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <button
                                        onClick={() => { if (onClockIn) onClockIn(c.id) }}
                                        style={{
                                            width: '100%', padding: '9px', fontSize: 12, fontWeight: 700,
                                            background: 'var(--mera-accent)', color: '#fff',
                                            border: 'none', borderRadius: 'var(--mera-radius-md)', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                        }}
                                    >
                                        <LogIn size={14} /> {isCafe ? 'Masuk POS Méra Hause' : 'Masuk POS Dashboard'}
                                    </button>
                                    <button
                                        onClick={() => setClockOutTarget({ crew: c, att: activeAtt })}
                                        style={{
                                            width: '100%', padding: isCafe ? '9px' : '7px', fontSize: isCafe ? 12 : 11, fontWeight: isCafe ? 700 : 600,
                                            background: isCafe ? 'var(--mera-surface-raised)' : 'transparent', color: isCafe ? 'var(--mera-text-primary)' : 'var(--mera-text-tertiary)',
                                            border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-md)', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                        }}
                                    >
                                        <Camera size={14} /> {isCafe ? 'Clock Out Absensi' : 'Clock Out / Selesai Shift'}
                                    </button>
                                </div>
                            ) : !isDone && (
                                <button
                                    onClick={() => setClockInTarget(c)}
                                    style={{
                                        width: '100%', padding: '9px', fontSize: 12, fontWeight: 700,
                                        background: 'var(--mera-accent)', color: '#fff',
                                        border: 'none', borderRadius: 'var(--mera-radius-md)', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                    }}
                                >
                                    <Camera size={14} /> {isCafe ? 'Clock In Absensi' : 'Clock In & Login'}
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* ── Clock-In Modal ─────────────────────────── */}
            {clockInTarget && (
                <ClockInModal
                    crew={clockInTarget}
                    attendance={attendance}
                    onClose={() => setClockInTarget(null)}
                    onDone={() => {
                        const targetId = clockInTarget.id
                        const isCafe = isCafeCrew(clockInTarget)
                        setClockInTarget(null)
                        load()
                        // Cafe crew does NOT login to POS dashboard
                        if (!isCafe && onClockIn) onClockIn(targetId)
                    }}
                />
            )}

            {/* ── Clock-Out Modal ─────────────────────────── */}
            {clockOutTarget && (
                <ClockOutModal
                    crew={clockOutTarget.crew}
                    att={clockOutTarget.att}
                    attendance={attendance}
                    crew_list={crew}
                    onClose={() => setClockOutTarget(null)}
                    onDone={(shouldLogout) => { setClockOutTarget(null); load(); if (shouldLogout && onLogout) onLogout() }}
                />
            )}
        </div>
    )
}



// ─────────────────────────────────────────────────────────────
// Clock-In Modal
// ─────────────────────────────────────────────────────────────
function ClockInModal({ crew, attendance, onClose, onDone }: {
    crew: Crew
    attendance: Attendance[]
    onClose: () => void
    onDone: () => void
}) {
    const [selectedShift, setSelectedShift] = useState<ShiftKey | null>(null)
    const [photoData, setPhotoData] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const cam = useCamera()

    const isIntern = (crew as any).status_gaji === 'INTERN'
    const isCafe = isCafeCrew(crew)
    const nowDay = new Date().getDay()
    const shiftPool = isCafe ? CAFE_SHIFTS : STUDIO_SHIFTS
    const availableShifts = shiftPool.filter(s => s.days.includes(nowDay))
    const shift = ALL_SHIFTS.find(s => s.key === selectedShift)

    const lateMin = shift ? calcLateMinutes(new Date().toISOString(), shift) : 0
    const penalty = shift ? calcPenalty(lateMin, isIntern) : 0

    useEffect(() => { cam.start() }, [])
    // cleanup cam on unmount
    useEffect(() => () => cam.stop(), [])

    const handleCapture = () => {
        const data = cam.capture()
        if (data) setPhotoData(data)
    }

    const handleConfirm = async () => {
        if (!selectedShift || !shift) return
        setSaving(true)
        setSaveError(null)

        const clockInISO = new Date().toISOString()
        const lateMinutes = calcLateMinutes(clockInISO, shift)
        const penaltyAmt = calcPenalty(lateMinutes, isIntern)

        // Upload photo
        let photoUrl: string | null = null
        if (photoData) {
            const fname = `${todayISO()}_${crew.id}_in_${Date.now()}.jpg`
            photoUrl = await uploadPhoto(photoData, fname, {
                crewName: crew.nama,
                type: 'IN',
                shift: shift.key,
                time: clockInISO,
                isIntern
            })
        }

        const { error } = await (supabase.from('attendance') as any).insert({
            crew_id: crew.id,
            clock_in: clockInISO,
            shift_type: shift.key,
            base_rate: isIntern ? 0 : shift.rate,
            late_minutes: lateMinutes,
            penalty_amount: penaltyAmt,
            bonus_amount: 0,
            photo_in_url: photoUrl,
            status: 'ACTIVE',
        })
        setSaving(false)
        if (error) { setSaveError(error.message) } else { onDone() }
    }

    return (
        <Modal onClose={onClose}>
            <ModalHeader title={`Clock In — ${crew.nama}`} subtitle={new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} onClose={onClose} />

            {/* Webcam */}
            <div style={{ marginBottom: 16 }}>
                <div style={{ position: 'relative', borderRadius: 'var(--mera-radius-md)', overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
                    <video ref={cam.videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', display: photoData ? 'none' : 'block' }} muted playsInline />
                    {photoData && <img src={photoData} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="Preview" />}
                    {cam.error && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: 16 }}><p style={{ fontSize: 12, color: 'var(--mera-error)', textAlign: 'center' }}>{cam.error}</p></div>}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {!photoData ? (
                        <button onClick={handleCapture} disabled={!cam.ready} style={{ flex: 1, padding: '9px', fontSize: 12, fontWeight: 700, background: cam.ready ? 'var(--mera-surface-raised)' : 'transparent', color: cam.ready ? 'var(--mera-text-primary)' : 'var(--mera-text-tertiary)', border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-md)', cursor: cam.ready ? 'pointer' : 'not-allowed' }}>
                            📸 Ambil Foto
                        </button>
                    ) : (
                        <button onClick={() => setPhotoData(null)} style={{ flex: 1, padding: '9px', fontSize: 12, fontWeight: 600, background: 'transparent', color: 'var(--mera-text-secondary)', border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-md)', cursor: 'pointer' }}>
                            🔄 Retake
                        </button>
                    )}
                </div>
            </div>

            {/* Shift selector */}
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--mera-text-tertiary)', marginBottom: 8 }}>Pilih Shift</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {availableShifts.length === 0 && (
                    <p style={{ fontSize: 12, color: 'var(--mera-error)', padding: 8 }}>Tidak ada shift tersedia untuk hari ini.</p>
                )}
                {availableShifts.map(s => (
                    <button key={s.key} onClick={() => setSelectedShift(s.key)} style={{
                        padding: '10px 12px', borderRadius: 'var(--mera-radius-md)', textAlign: 'left', cursor: 'pointer',
                        border: `1.5px solid ${selectedShift === s.key ? 'var(--mera-accent)' : 'var(--mera-border)'}`,
                        background: selectedShift === s.key ? 'var(--mera-accent-light)' : 'var(--mera-surface-raised)',
                        transition: 'all 0.15s',
                    }}>
                        <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--mera-text-primary)', marginBottom: 1 }}>{s.label}</p>
                        <p style={{ fontSize: 11, color: 'var(--mera-text-tertiary)' }}>
                            {s.desc}{!isIntern && ` · ${fmtRp(s.rate)}`}
                        </p>
                    </button>
                ))}
            </div>

            {/* Late/penalty preview (PRO only) */}
            {shift && !isIntern && (
                <div style={{ padding: '8px 12px', borderRadius: 'var(--mera-radius-md)', marginBottom: 14, background: lateMin > 0 ? 'var(--mera-warning-bg)' : 'var(--mera-success-bg)' }}>
                    {lateMin > 0 ? (
                        <>
                            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--mera-warning)' }}><AlertTriangle size={14} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 4 }} /> Terlambat {lateMin} menit</p>
                            <p style={{ fontSize: 11, color: 'var(--mera-text-secondary)', marginTop: 2 }}>Potongan: {fmtRp(penalty)}</p>
                        </>
                    ) : (
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--mera-success)' }}><CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 4 }} /> Tepat waktu (dalam grace period 10 menit)</p>
                    )}
                </div>
            )}

            {saveError && <p style={{ fontSize: 12, color: 'var(--mera-error)', marginBottom: 10 }}><AlertTriangle size={14} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 4 }} /> {saveError}</p>}

            <button
                onClick={handleConfirm}
                disabled={!selectedShift || !photoData || saving}
                style={{
                    width: '100%', padding: '13px', fontSize: 14, fontWeight: 700,
                    background: selectedShift && photoData && !saving ? 'var(--mera-accent)' : 'var(--mera-surface-raised)',
                    color: selectedShift && photoData && !saving ? '#fff' : 'var(--mera-text-tertiary)',
                    border: 'none', borderRadius: 'var(--mera-radius-md)', cursor: selectedShift && photoData && !saving ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                }}
            >
                {saving ? 'Menyimpan...' : !photoData ? (<><Camera size={16} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} /> Ambil foto dulu</>) : !selectedShift ? 'Pilih shift dulu' : (<><CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} /> Konfirmasi Clock In</>)}
            </button>
        </Modal>
    )
}

// ─────────────────────────────────────────────────────────────
// Clock-Out Modal
// ─────────────────────────────────────────────────────────────
function ClockOutModal({ crew, att, attendance, crew_list, onClose, onDone }: {
    crew: Crew
    att: Attendance
    attendance: Attendance[]
    crew_list: Crew[]
    onClose: () => void
    onDone: (shouldLogout: boolean) => void
}) {
    const [photoData, setPhotoData] = useState<string | null>(null)
    const [omset, setOmset] = useState<{ cash: number; qris: number; total: number } | null>(null)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const cam = useCamera()

    const isIntern = (crew as any).status_gaji === 'INTERN'
    const isCafe = isCafeCrew(crew)

    // Fetch today's omset
    useEffect(() => {
        if (isCafe) return
        const fetch = async () => {
            const day = todayISO()
            const isoStart = wibDayToISOStart(day)
            const isoEnd = wibDayToISOEnd(day)
            const { data } = await (supabase.from('transactions') as any)
                .select('total_amount,payment_method')
                .eq('status', 'PAID')
                .gte('created_at', isoStart)
                .lte('created_at', isoEnd)
            const rows = (data ?? []) as { total_amount: number; payment_method: string | null }[]
            const cash = rows.filter(r => r.payment_method === 'CASH').reduce((s, r) => s + r.total_amount, 0)
            const qris = rows.filter(r => ['QRIS', 'ONLINE_QRIS', 'TRANSFER'].includes(r.payment_method ?? '')).reduce((s, r) => s + r.total_amount, 0)
            setOmset({ cash, qris, total: cash + qris })
        }
        fetch()
    }, [isCafe])

    useEffect(() => { cam.start() }, [])
    useEffect(() => () => cam.stop(), [])

    // Cafe attendance today
    const cafeAttToday = attendance.filter(a => {
        const c = crew_list.find(cr => cr.id === a.crew_id)
        return isCafeCrew(c)
    })
    // Rule: jika 1 hari yang absen hanya 1 orang, crew yang bertugas mendapat 100.000/hari
    const isSoloCafe = isCafe && (cafeAttToday.length <= 1)
    const effectiveBaseRate = isSoloCafe && att.base_rate < 100_000 ? 100_000 : att.base_rate

    // Calculate bonus for studio crew member only
    const studioNonInternToday = attendance.filter(a => {
        const c = crew_list.find(cr => cr.id === a.crew_id)
        return (c as any)?.status_gaji !== 'INTERN' && !isCafeCrew(c)
    }).length

    const bonus = !isCafe && omset && !isIntern ? calcDailyBonus(omset.total, studioNonInternToday) : 0
    const net = isIntern ? 0 : effectiveBaseRate - att.penalty_amount + bonus
    const target = isWeekendDay(new Date()) ? TARGET_WEEKEND : TARGET_WEEKDAY

    const handleCapture = () => {
        const data = cam.capture()
        if (data) setPhotoData(data)
    }

    const handleConfirm = async () => {
        setSaving(true)
        setSaveError(null)

        let photoUrl: string | null = null
        if (photoData) {
            const fname = `${todayISO()}_${crew.id}_out_${Date.now()}.jpg`
            const clockOutISO = new Date().toISOString()
            photoUrl = await uploadPhoto(photoData, fname, {
                crewName: crew.nama,
                type: 'OUT',
                shift: att.shift_type,
                time: clockOutISO,
                isIntern
            })
        }

        const updatePayload: any = {
            clock_out: photoUrl ? new Date().toISOString() : new Date().toISOString(),
            status: 'COMPLETED',
            bonus_amount: isIntern || isCafe ? 0 : bonus,
            photo_out_url: photoUrl,
        }
        if (isSoloCafe && att.base_rate < 100_000) {
            updatePayload.base_rate = 100_000
        }

        const { error } = await (supabase.from('attendance') as any)
            .update(updatePayload)
            .eq('id', att.id)

        setSaving(false)
        if (error) { setSaveError(error.message) } else { onDone(!isIntern) }
    }

    return (
        <Modal onClose={onClose}>
            <ModalHeader title={`Clock Out — ${crew.nama}`} subtitle={`Masuk: ${fmtTime(att.clock_in)} · Shift: ${att.shift_type}`} onClose={onClose} />

            {/* ── Omset Recap (Studio PRO only) ─────────────── */}
            {!isIntern && !isCafe && (
                <div style={{ background: 'var(--mera-surface-raised)', borderRadius: 'var(--mera-radius-md)', padding: '12px 14px', marginBottom: 14 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--mera-text-tertiary)', marginBottom: 8 }}>
                        Rekap Omset Hari Ini
                    </p>
                    {omset === null ? (
                        <p style={{ fontSize: 12, color: 'var(--mera-text-tertiary)' }}>Memuat...</p>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 12, color: 'var(--mera-text-secondary)' }}>💵 Tunai</span>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{fmtRp(omset.cash)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, color: 'var(--mera-text-secondary)' }}>🔷 QRIS / Transfer</span>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{fmtRp(omset.qris)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--mera-border)', paddingTop: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 700 }}>Total</span>
                                <span style={{ fontSize: 14, fontWeight: 800, color: omset.total >= target ? 'var(--mera-success)' : 'var(--mera-text-primary)' }}>{fmtRp(omset.total)}</span>
                            </div>
                            <div style={{ marginTop: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, color: 'var(--mera-text-tertiary)' }}>Target {isWeekendDay(new Date()) ? 'Weekend' : 'Weekday'}</span>
                                    <span style={{ fontSize: 10, color: 'var(--mera-text-tertiary)' }}>{fmtRp(target)}</span>
                                </div>
                                <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min(omset.total / target * 100, 100).toFixed(0)}%`, background: omset.total >= target ? 'var(--mera-success)' : 'var(--mera-accent)', borderRadius: 3, transition: 'width 0.5s' }} />
                                </div>
                            </div>
                            {omset.total >= target && (
                                <p style={{ fontSize: 11, marginTop: 8, color: 'var(--mera-success)', fontWeight: 700 }}>
                                    <CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 4 }} /> Target tercapai!
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ── Cafe Méra Hause Shift Recap ─────────────── */}
            {isCafe && (
                <div style={{ background: 'var(--mera-surface-raised)', borderRadius: 'var(--mera-radius-md)', padding: '12px 14px', marginBottom: 14 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--mera-text-tertiary)', marginBottom: 8 }}>
                        Info Shift Méra Hause
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: 'var(--mera-text-secondary)' }}>☕ Shift</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{att.shift_type}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: 'var(--mera-text-secondary)' }}>👥 Total Kru Hadir Hari Ini</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{cafeAttToday.length} orang</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--mera-border)', paddingTop: 8, marginTop: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>Gaji Harian</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--mera-success)' }}>{fmtRp(effectiveBaseRate)}</span>
                    </div>
                    {isSoloCafe && (
                        <div style={{
                            marginTop: 10, padding: '8px 10px', borderRadius: 'var(--mera-radius-sm)',
                            background: 'rgba(98, 33, 40, 0.2)', border: '1px solid rgba(139, 26, 26, 0.35)',
                            color: '#E0B88A', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6
                        }}>
                            <span>⭐</span>
                            <span>Solo Shift: Hanya 1 kru yang hadir hari ini, rate disesuaikan menjadi Rp 100.000/hari.</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── Pay Breakdown ─────────────── */}
            {!isIntern ? (
                <div style={{ background: 'var(--mera-error-bg)', border: '1px solid var(--mera-error-border)', borderRadius: 'var(--mera-radius-md)', padding: '12px 14px', marginBottom: 14 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--mera-text-tertiary)', marginBottom: 8 }}>
                        Info Kedisiplinan
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 11, color: 'var(--mera-text-secondary)' }}>Potongan Telat ({att.late_minutes}m)</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: att.penalty_amount > 0 ? 'var(--mera-error)' : 'var(--mera-text-tertiary)' }}>
                            {att.penalty_amount > 0 ? `−${fmtRp(att.penalty_amount)}` : '–'}
                        </span>
                    </div>
                </div>
            ) : null}

            {/* ── Webcam ─────────────────── */}
            <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--mera-text-tertiary)', marginBottom: 8 }}>
                    Foto Pulang
                </p>
                <div style={{ position: 'relative', borderRadius: 'var(--mera-radius-md)', overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
                    <video ref={cam.videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', display: photoData ? 'none' : 'block' }} muted playsInline />
                    {photoData && <img src={photoData} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="Preview" />}
                    {cam.error && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: 16 }}><p style={{ fontSize: 12, color: 'var(--mera-error)', textAlign: 'center' }}>{cam.error}</p></div>}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {!photoData ? (
                        <button onClick={handleCapture} disabled={!cam.ready} style={{ flex: 1, padding: '8px', fontSize: 12, fontWeight: 700, background: cam.ready ? 'var(--mera-surface-raised)' : 'transparent', color: cam.ready ? 'var(--mera-text-primary)' : 'var(--mera-text-tertiary)', border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-md)', cursor: cam.ready ? 'pointer' : 'not-allowed' }}>
                            <><Camera size={14} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} /> Ambil Foto Pulang</>
                        </button>
                    ) : (
                        <button onClick={() => setPhotoData(null)} style={{ flex: 1, padding: '8px', fontSize: 12, background: 'transparent', color: 'var(--mera-text-secondary)', border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-md)', cursor: 'pointer' }}>
                            <><RefreshCw size={14} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} /> Retake</>
                        </button>
                    )}
                </div>
            </div>

            {saveError && <p style={{ fontSize: 12, color: 'var(--mera-error)', marginBottom: 10 }}><AlertTriangle size={14} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 4 }} /> {saveError}</p>}

            <button
                onClick={handleConfirm}
                disabled={!photoData || saving}
                style={{
                    width: '100%', padding: '13px', fontSize: 14, fontWeight: 700,
                    background: photoData && !saving ? 'var(--mera-success)' : 'var(--mera-surface-raised)',
                    color: photoData && !saving ? '#000' : 'var(--mera-text-tertiary)',
                    border: 'none', borderRadius: 'var(--mera-radius-md)', cursor: photoData && !saving ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                }}
            >
                {saving ? 'Menyimpan...' : !photoData ? (<><Camera size={16} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} /> Ambil foto dulu</>) : (<><CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} /> Konfirmasi Pulang & Simpan</>)}
            </button>
        </Modal>
    )
}

// ─────────────────────────────────────────────────────────────
// Shared Modal wrapper
// ─────────────────────────────────────────────────────────────
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
            <div style={{ background: 'var(--mera-surface)', borderRadius: 'var(--mera-radius-xl)', border: '1px solid var(--mera-border)', padding: 22, width: '100%', maxWidth: 420, maxHeight: '92vh', overflowY: 'auto', boxShadow: 'var(--mera-shadow-xl)' }}>
                {children}
            </div>
        </div>
    )
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 2 }}>{title}</h3>
                <p style={{ fontSize: 11, color: 'var(--mera-text-tertiary)' }}>{subtitle}</p>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'var(--mera-surface-raised)', color: 'var(--mera-text-primary)', cursor: 'pointer', fontSize: 16, flexShrink: 0, marginLeft: 8 }}>×</button>
        </div>
    )
}
