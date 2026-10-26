import React, { useState, useEffect } from 'react'
import { createPOSClient } from '@mera/supabase'
import type { Crew, Attendance } from '@mera/supabase'
import { 
    X, 
    Calendar, 
    Clock, 
    Camera, 
    AlertTriangle, 
    CheckCircle2, 
    Coins, 
    Users, 
    ZoomIn,
    TrendingUp,
    ShieldAlert
} from 'lucide-react'

const supabase = createPOSClient()

interface CrewAttendanceDetailModalProps {
    crew: Crew
    allCrews: Crew[]
    onSelectCrew: (crew: Crew) => void
    currentPeriodAtt: Attendance[]
    periodLabel: string
    onClose: () => void
}

function fmtRp(n: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(iso: string): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta'
    })
}

function fmtTime(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
    }) + ' WIB'
}

function calcDuration(inIso: string, outIso: string | null): string {
    if (!outIso) return 'Sedang berjalan'
    const start = new Date(inIso).getTime()
    const end = new Date(outIso).getTime()
    const diffMin = Math.max(0, Math.floor((end - start) / 60000))
    const h = Math.floor(diffMin / 60)
    const m = diffMin % 60
    return `${h}j ${m}m`
}

export default function CrewAttendanceDetailModal({
    crew,
    allCrews,
    onSelectCrew,
    currentPeriodAtt,
    periodLabel,
    onClose
}: CrewAttendanceDetailModalProps) {
    const [scope, setScope] = useState<'period' | 'all'>('period')
    const [allTimeAtt, setAllTimeAtt] = useState<Attendance[]>([])
    const [loadingAllTime, setLoadingAllTime] = useState(false)
    const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; meta?: string } | null>(null)

    // Fetch all-time records for this crew on demand or when switched to 'all'
    useEffect(() => {
        let isMounted = true
        async function fetchAllTime() {
            setLoadingAllTime(true)
            const { data, error } = await (supabase.from('attendance') as any)
                .select('*')
                .eq('crew_id', crew.id)
                .order('clock_in', { ascending: false })
            if (isMounted) {
                if (!error && data) {
                    setAllTimeAtt(data as Attendance[])
                } else {
                    console.error('[DetailModal] Gagal ambil all-time attendance:', error)
                }
                setLoadingAllTime(false)
            }
        }
        fetchAllTime()
        return () => { isMounted = false }
    }, [crew.id])

    // Filter active records based on scope
    const displayedRecords: Attendance[] = scope === 'period'
        ? currentPeriodAtt.filter(a => a.crew_id === crew.id)
        : allTimeAtt

    // Stats calculations
    const totalShifts = displayedRecords.length
    const totalBase = displayedRecords.reduce((s, a) => s + (a.base_rate || 0), 0)
    const totalPenalty = displayedRecords.reduce((s, a) => s + (a.penalty_amount || 0), 0)
    const totalBonus = displayedRecords.reduce((s, a) => s + (a.bonus_amount || 0), 0)
    const totalLate = displayedRecords.reduce((s, a) => s + (a.late_minutes || 0), 0)
    const isIntern = crew.status_gaji === 'INTERN'
    const totalNet = isIntern ? 0 : totalBase - totalPenalty + totalBonus

    return (
        <div 
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(8px)',
                zIndex: 2000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px 16px',
            }}
            onClick={onClose}
        >
            <div 
                style={{
                    background: '#1C1C1E',
                    color: '#fff',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.12)',
                    width: '100%',
                    maxWidth: 880,
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Modal Header ── */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    background: 'rgba(255,255,255,0.02)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 46,
                            height: 46,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #622128 0%, #8B2E37 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18,
                            fontWeight: 800,
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.15)',
                            flexShrink: 0,
                        }}>
                            {crew.nama.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>
                                    {crew.nama}
                                </h3>
                                <span style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: 12,
                                    background: isIntern ? 'rgba(155,184,208,0.2)' : 'rgba(168,197,160,0.2)',
                                    color: isIntern ? '#9BB8D0' : '#A8C5A0',
                                    border: `1px solid ${isIntern ? 'rgba(155,184,208,0.3)' : 'rgba(168,197,160,0.3)'}`,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    {crew.role} {isIntern && '• INTERN'}
                                </span>
                            </div>
                            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                                Riwayat kehadiran lengkap, bukti foto webcam, dan kalkulasi payroll shift
                            </p>
                        </div>
                    </div>

                    {/* Crew selector dropdown & Close button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <select
                            value={crew.id}
                            onChange={e => {
                                const next = allCrews.find(c => c.id === e.target.value)
                                if (next) onSelectCrew(next)
                            }}
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: 8,
                                padding: '6px 12px',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            {allCrews.map(c => (
                                <option key={c.id} value={c.id} style={{ background: '#222', color: '#fff' }}>
                                    {c.nama} ({c.role})
                                </option>
                            ))}
                        </select>

                        <button 
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: 'none',
                                borderRadius: '50%',
                                width: 34,
                                height: 34,
                                display: 'grid',
                                placeItems: 'center',
                                cursor: 'pointer',
                                color: 'rgba(255,255,255,0.6)',
                                transition: 'all 0.15s',
                            }}
                            title="Tutup Modal"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ── Subheader Controls (Tabs & Period Info) ── */}
                <div style={{
                    padding: '12px 24px',
                    background: 'rgba(0,0,0,0.2)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                }}>
                    {/* Filter Tabs */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', padding: 3, borderRadius: 8, gap: 4 }}>
                        <button
                            onClick={() => setScope('period')}
                            style={{
                                border: 'none',
                                background: scope === 'period' ? '#622128' : 'transparent',
                                color: scope === 'period' ? '#fff' : 'rgba(255,255,255,0.5)',
                                padding: '6px 14px',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                        >
                            Periode Aktif
                        </button>
                        <button
                            onClick={() => setScope('all')}
                            style={{
                                border: 'none',
                                background: scope === 'all' ? '#622128' : 'transparent',
                                color: scope === 'all' ? '#fff' : 'rgba(255,255,255,0.5)',
                                padding: '6px 14px',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                        >
                            Semua Riwayat (All-Time) {loadingAllTime ? '...' : `(${allTimeAtt.length})`}
                        </button>
                    </div>

                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={14} />
                        <span>{scope === 'period' ? periodLabel : 'Menampilkan seluruh riwayat tercatat di database'}</span>
                    </div>
                </div>

                {/* ── Stats Summary Bar ── */}
                <div style={{
                    padding: '16px 24px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: 12,
                    background: 'rgba(255,255,255,0.01)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Shift</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{totalShifts} <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>shift</span></div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Gaji Pokok</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#9BB8D0' }}>{fmtRp(totalBase)}</div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Keterlambatan</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: totalLate > 0 ? '#E0B88A' : 'rgba(255,255,255,0.6)' }}>
                            {totalLate}m {totalPenalty > 0 && <span style={{ fontSize: 12, color: '#C89696' }}>(−{fmtRp(totalPenalty)})</span>}
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Bonus Shift</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: totalBonus > 0 ? '#A8C5A0' : 'rgba(255,255,255,0.4)' }}>
                            {totalBonus > 0 ? `+${fmtRp(totalBonus)}` : '—'}
                        </div>
                    </div>

                    <div style={{ background: 'rgba(168,197,160,0.08)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(168,197,160,0.2)' }}>
                        <div style={{ fontSize: 11, color: '#A8C5A0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 }}>Take Home Pay</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: isIntern ? 'rgba(255,255,255,0.4)' : '#A8C5A0' }}>
                            {isIntern ? 'Internship' : fmtRp(totalNet)}
                        </div>
                    </div>
                </div>

                {/* ── Attendance Log List ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {displayedRecords.length === 0 ? (
                        <div style={{ padding: '48px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                            <Clock size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Tidak ada catatan absensi untuk {crew.nama}</p>
                            <p style={{ margin: '6px 0 0', fontSize: 12 }}>
                                {scope === 'period' ? 'Pilih tab "Semua Riwayat (All-Time)" di atas untuk melihat seluruh riwayat lampau.' : 'Belum pernah melakukan clock-in di terminal POS.'}
                            </p>
                        </div>
                    ) : (
                        displayedRecords.map((att, idx) => {
                            const isLate = att.late_minutes > 0
                            const hasPenalty = att.penalty_amount > 0
                            const isCompleted = att.status === 'COMPLETED'
                            const shiftNet = isIntern ? 0 : (att.base_rate - (att.penalty_amount || 0) + (att.bonus_amount || 0))

                            return (
                                <div 
                                    key={att.id || idx}
                                    style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: 12,
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        padding: '14px 18px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 12,
                                    }}
                                >
                                    {/* Top Row: Date, Shift, and Status */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                                                {fmtDate(att.clock_in)}
                                            </span>
                                            <span style={{
                                                fontSize: 11,
                                                padding: '2px 8px',
                                                borderRadius: 6,
                                                background: 'rgba(255,255,255,0.08)',
                                                color: 'rgba(255,255,255,0.85)',
                                                fontWeight: 600,
                                            }}>
                                                {att.shift_type}
                                            </span>
                                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                                                Durasi: {calcDuration(att.clock_in, att.clock_out)}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{
                                                fontSize: 10,
                                                fontWeight: 700,
                                                padding: '3px 8px',
                                                borderRadius: 10,
                                                background: isCompleted ? 'rgba(255,255,255,0.06)' : 'rgba(46,125,50,0.2)',
                                                color: isCompleted ? 'rgba(255,255,255,0.5)' : '#4CAF50',
                                                border: isCompleted ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(46,125,50,0.4)',
                                                letterSpacing: '0.04em'
                                            }}>
                                                {isCompleted ? '✓ SELESAI' : '● SEDANG BERJALAN'}
                                            </span>

                                            <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
                                                {isIntern ? 'Intern' : fmtRp(shiftNet)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Middle Row: Clock In vs Clock Out with Photo Thumbnails */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        {/* Clock In Block */}
                                        <div style={{
                                            background: 'rgba(255,255,255,0.02)',
                                            borderRadius: 10,
                                            padding: 10,
                                            border: '1px solid rgba(255,255,255,0.04)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 12
                                        }}>
                                            <div>
                                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                                                    Clock In (Masuk)
                                                </div>
                                                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                                                    {fmtTime(att.clock_in)}
                                                </div>
                                                <div style={{ fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    {isLate ? (
                                                        <span style={{ color: '#E0B88A', display: 'flex', alignItems: 'center', gap: 3 }}>
                                                            <AlertTriangle size={12} /> Terlambat {att.late_minutes}m {hasPenalty && `(−${fmtRp(att.penalty_amount)})`}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#A8C5A0', display: 'flex', alignItems: 'center', gap: 3 }}>
                                                            <CheckCircle2 size={12} /> Tepat waktu
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Photo In Thumbnail */}
                                            {att.photo_in_url ? (
                                                <div 
                                                    onClick={() => setPreviewPhoto({
                                                        url: att.photo_in_url!,
                                                        title: `Clock-In: ${crew.nama}`,
                                                        meta: `${fmtDate(att.clock_in)} · ${fmtTime(att.clock_in)}`
                                                    })}
                                                    style={{
                                                        width: 58,
                                                        height: 58,
                                                        borderRadius: 8,
                                                        overflow: 'hidden',
                                                        position: 'relative',
                                                        cursor: 'pointer',
                                                        border: '1px solid rgba(255,255,255,0.15)',
                                                        flexShrink: 0,
                                                    }}
                                                    title="Klik untuk perbesar foto"
                                                >
                                                    <img 
                                                        src={att.photo_in_url} 
                                                        alt="Foto Clock In" 
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                    <div style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        background: 'rgba(0,0,0,0.3)',
                                                        display: 'grid',
                                                        placeItems: 'center',
                                                        opacity: 0.85,
                                                    }}>
                                                        <ZoomIn size={14} color="#fff" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    width: 58,
                                                    height: 58,
                                                    borderRadius: 8,
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px dashed rgba(255,255,255,0.1)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'rgba(255,255,255,0.25)',
                                                    fontSize: 9,
                                                    flexShrink: 0,
                                                    textAlign: 'center',
                                                    padding: 2,
                                                }}>
                                                    <Camera size={14} style={{ marginBottom: 2 }} />
                                                    No Photo
                                                </div>
                                            )}
                                        </div>

                                        {/* Clock Out Block */}
                                        <div style={{
                                            background: 'rgba(255,255,255,0.02)',
                                            borderRadius: 10,
                                            padding: 10,
                                            border: '1px solid rgba(255,255,255,0.04)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 12
                                        }}>
                                            <div>
                                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                                                    Clock Out (Keluar)
                                                </div>
                                                <div style={{ fontSize: 15, fontWeight: 700, color: att.clock_out ? '#fff' : 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                                                    {fmtTime(att.clock_out)}
                                                </div>
                                                <div style={{ fontSize: 11, marginTop: 4, color: 'rgba(255,255,255,0.4)' }}>
                                                    {att.bonus_amount > 0 ? (
                                                        <span style={{ color: '#A8C5A0' }}>🎁 Bonus +{fmtRp(att.bonus_amount)}</span>
                                                    ) : (
                                                        <span>Gaji Pokok: {fmtRp(att.base_rate)}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Photo Out Thumbnail */}
                                            {att.photo_out_url ? (
                                                <div 
                                                    onClick={() => setPreviewPhoto({
                                                        url: att.photo_out_url!,
                                                        title: `Clock-Out: ${crew.nama}`,
                                                        meta: `${fmtDate(att.clock_in)} · ${fmtTime(att.clock_out)}`
                                                    })}
                                                    style={{
                                                        width: 58,
                                                        height: 58,
                                                        borderRadius: 8,
                                                        overflow: 'hidden',
                                                        position: 'relative',
                                                        cursor: 'pointer',
                                                        border: '1px solid rgba(255,255,255,0.15)',
                                                        flexShrink: 0,
                                                    }}
                                                    title="Klik untuk perbesar foto"
                                                >
                                                    <img 
                                                        src={att.photo_out_url} 
                                                        alt="Foto Clock Out" 
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                    <div style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        background: 'rgba(0,0,0,0.3)',
                                                        display: 'grid',
                                                        placeItems: 'center',
                                                        opacity: 0.85,
                                                    }}>
                                                        <ZoomIn size={14} color="#fff" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    width: 58,
                                                    height: 58,
                                                    borderRadius: 8,
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px dashed rgba(255,255,255,0.1)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'rgba(255,255,255,0.25)',
                                                    fontSize: 9,
                                                    flexShrink: 0,
                                                    textAlign: 'center',
                                                    padding: 2,
                                                }}>
                                                    <Camera size={14} style={{ marginBottom: 2 }} />
                                                    {att.clock_out ? 'No Photo' : 'Shift Aktif'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* ── Modal Footer ── */}
                <div style={{
                    padding: '14px 24px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(0,0,0,0.2)',
                }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                        Data tersinkronisasi otomatis dengan server Supabase & Google Drive
                    </span>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#622128',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '8px 20px',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        Tutup
                    </button>
                </div>
            </div>

            {/* ── Photo Lightbox Preview Overlay ── */}
            {previewPhoto && (
                <div 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(10px)',
                        zIndex: 3000,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                    }}
                    onClick={() => setPreviewPhoto(null)}
                >
                    <div 
                        style={{
                            maxWidth: 540,
                            width: '100%',
                            background: '#18181A',
                            borderRadius: 14,
                            overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.15)',
                            boxShadow: '0 24px 72px rgba(0,0,0,0.8)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{
                            padding: '14px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                        }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>
                                    {previewPhoto.title}
                                </h4>
                                {previewPhoto.meta && (
                                    <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                                        {previewPhoto.meta}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setPreviewPhoto(null)}
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: 32,
                                    height: 32,
                                    display: 'grid',
                                    placeItems: 'center',
                                    cursor: 'pointer',
                                    color: '#fff',
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div style={{ background: '#000', display: 'flex', justifyContent: 'center' }}>
                            <img 
                                src={previewPhoto.url} 
                                alt="Bukti Presensi Webcam"
                                style={{ width: '100%', maxHeight: '68vh', objectFit: 'contain', display: 'block' }}
                            />
                        </div>

                        <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                                Foto tangkapan kamera terminal presensi Méra OS
                            </span>
                            <a 
                                href={previewPhoto.url} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{
                                    fontSize: 12,
                                    color: '#9BB8D0',
                                    textDecoration: 'none',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                }}
                            >
                                Buka Asli ↗
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
