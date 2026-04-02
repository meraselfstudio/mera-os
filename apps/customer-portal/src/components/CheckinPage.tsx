'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@mera/supabase/client'
import type { Registration } from '@mera/supabase'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

function CheckinContent() {
    const searchParams = useSearchParams()
    const [sessionId, setSessionId] = useState(searchParams.get('sid') ?? '')
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'already' | 'notfound' | 'error'>('idle')
    const [reg, setReg] = useState<Registration | null>(null)
    const [errorMsg, setErrorMsg] = useState('')

    // If URL has ?sid= pre-filled, trigger check-in immediately on mount
    useEffect(() => {
        const sidParam = searchParams.get('sid')
        if (sidParam) {
            setSessionId(sidParam)
        }
    }, [searchParams])

    const handleCheckin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        const sid = sessionId.trim().toUpperCase()
        if (!sid) return
        setStatus('loading')

        // Lookup registration
        const { data, error: fetchError } = await supabase
            .from('registrations')
            .select('*')
            .eq('session_id', sid)
            .single()

        if (fetchError || !data) {
            setStatus('notfound')
            return
        }

        const registration = data as Registration

        // Already checked in
        if (registration.checked_in_at) {
            setReg(registration)
            setStatus('already')
            return
        }

        // Mark check-in
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase.from('registrations') as any)
            .update({ checked_in_at: new Date().toISOString() })
            .eq('session_id', sid)

        if (updateError) {
            setErrorMsg(updateError.message)
            setStatus('error')
            return
        }

        setReg({ ...registration, checked_in_at: new Date().toISOString() })
        setStatus('success')
    }

    const roomEmoji: Record<string, string> = {
        'Basic Studio': '🖤',
        'Pas Photo': '🎩',
        'Elevator Studio': '🛗',
        'Majestic Studio': '👑',
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const room = (reg?.addons as any)?.room ?? '—'
    const checkinTime = reg?.checked_in_at
        ? new Date(reg.checked_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : null

    return (
        <div style={{
            minHeight: '100dvh',
            background: '#111111',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 20px',
            fontFamily: FONT,
            color: '#FFFFFF',
        }}>
            {/* Logo / title */}
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
                <p style={{ fontSize: 40, marginBottom: 4 }}>📸</p>
                <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>Méra SelfStudio</h1>
                <p style={{ fontSize: 13, color: '#888', marginTop: 4, letterSpacing: '0.04em' }}>Self Check-in</p>
            </div>

            {/* ── Idle / Form ── */}
            {(status === 'idle' || status === 'notfound' || status === 'error') && (
                <form onSubmit={handleCheckin} style={{ width: '100%', maxWidth: 380 }}>
                    <div style={{ background: '#1C1C1E', borderRadius: 18, padding: '28px 24px', border: '1px solid #2C2C2E' }}>
                        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.01em' }}>Masukkan Booking ID</p>
                        <p style={{ fontSize: 12, color: '#888', marginBottom: 20, lineHeight: 1.5 }}>
                            Booking ID ada di tiket konfirmasimu, contoh: <code style={{ color: '#F5A623', fontFamily: 'monospace' }}>02-AYU-MR</code>
                        </p>

                        <input
                            value={sessionId}
                            onChange={e => setSessionId(e.target.value.toUpperCase())}
                            placeholder="Contoh: 02-AYU-MR"
                            style={{
                                width: '100%', padding: '14px 16px', fontSize: 18,
                                fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.08em',
                                background: '#2C2C2E', color: '#FFF', border: '1px solid #3A3A3C',
                                borderRadius: 12, outline: 'none', boxSizing: 'border-box',
                                textTransform: 'uppercase',
                            }}
                            autoFocus
                            autoComplete="off"
                            spellCheck={false}
                        />

                        {status === 'notfound' && (
                            <p style={{ fontSize: 13, color: '#FF453A', marginTop: 10, fontWeight: 600 }}>
                                ❌ Booking ID tidak ditemukan. Cek kembali tiketmu.
                            </p>
                        )}
                        {status === 'error' && (
                            <p style={{ fontSize: 13, color: '#FF453A', marginTop: 10, fontWeight: 600 }}>
                                ❌ Terjadi kesalahan: {errorMsg}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={!sessionId.trim()}
                            style={{
                                marginTop: 20, width: '100%', padding: '14px', fontSize: 15,
                                fontWeight: 700, letterSpacing: '-0.01em', border: 'none',
                                borderRadius: 12, cursor: sessionId.trim() ? 'pointer' : 'not-allowed',
                                background: sessionId.trim() ? '#FFFFFF' : '#2C2C2E',
                                color: sessionId.trim() ? '#000' : '#555',
                                transition: 'all 0.15s',
                            }}
                        >
                            ✓ Check-in Sekarang
                        </button>
                    </div>
                </form>
            )}

            {/* ── Loading ── */}
            {status === 'loading' && (
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 40, marginBottom: 12 }}>⏳</p>
                    <p style={{ color: '#888', fontSize: 14 }}>Memverifikasi booking...</p>
                </div>
            )}

            {/* ── Success ── */}
            {status === 'success' && reg && (
                <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
                    <p style={{ fontSize: 56, marginBottom: 4 }}>✅</p>
                    <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.03em' }}>Check-in Berhasil!</h2>
                    <p style={{ fontSize: 14, color: '#888', marginBottom: 28 }}>Selamat datang di Méra SelfStudio!</p>

                    <div style={{ background: '#1C1C1E', borderRadius: 18, padding: '24px', border: '1px solid #2C2C2E', textAlign: 'left' }}>
                        <Row label="Nama" value={reg.customer_name} />
                        <Row label="Booking ID" value={reg.session_id ?? '—'} mono />
                        <Row label="Studio" value={`${roomEmoji[room] ?? '📷'} ${room}`} />
                        {reg.preferred_date && (
                            <Row label="Jadwal" value={`${new Date(reg.preferred_date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}${reg.preferred_time ? ` · ${reg.preferred_time}` : ''}`} />
                        )}
                        <Row label="Check-in" value={`${checkinTime} WIB`} highlight />
                    </div>

                    <p style={{ fontSize: 12, color: '#555', marginTop: 20, lineHeight: 1.6 }}>
                        Silakan tunggu, crew kami akan segera memandu sesimu. 📸
                    </p>
                </div>
            )}

            {/* ── Already checked in ── */}
            {status === 'already' && reg && (
                <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
                    <p style={{ fontSize: 56, marginBottom: 4 }}>🎟️</p>
                    <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.03em' }}>Sudah Check-in</h2>
                    <p style={{ fontSize: 14, color: '#888', marginBottom: 28 }}>
                        Booking ini sudah check-in pukul <strong style={{ color: '#FFFFFF' }}>{checkinTime} WIB</strong>.
                    </p>

                    <div style={{ background: '#1C1C1E', borderRadius: 18, padding: '24px', border: '1px solid #2C2C2E', textAlign: 'left' }}>
                        <Row label="Nama" value={reg.customer_name} />
                        <Row label="Booking ID" value={reg.session_id ?? '—'} mono />
                        <Row label="Studio" value={`${roomEmoji[room] ?? '📷'} ${room}`} />
                    </div>

                    <p style={{ fontSize: 12, color: '#555', marginTop: 20 }}>Ada masalah? Hubungi crew kami. 🙋</p>
                </div>
            )}
        </div>
    )
}

function Row({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #2C2C2E' }}>
            <span style={{ fontSize: 12, color: '#888', letterSpacing: '0.03em' }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: highlight ? '#30D158' : '#FFFFFF', fontFamily: mono ? 'monospace' : 'inherit', letterSpacing: mono ? '0.06em' : 'inherit' }}>
                {value}
            </span>
        </div>
    )
}

export default function CheckinPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100dvh', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
                <p style={{ color: '#555', fontSize: 14 }}>Loading...</p>
            </div>
        }>
            <CheckinContent />
        </Suspense>
    )
}
