import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@mera/supabase/client'
import { Lock, Camera, XCircle, ArrowLeft } from 'lucide-react'

// ── Owner PIN ─────────────────────────────────────────────────
// Change this PIN to customize owner access
const OWNER_PIN = '1609'

function todayISO() { return new Date().toISOString().slice(0, 10) }

// ── Props ──────────────────────────────────────────────────────
interface POSGatewayProps {
    onUnlocked: () => void
    onGoToAttendance: () => void
}

// ─────────────────────────────────────────────────────────────
// Gateway Screen
// Shown if no crew has clocked in today. Crew must clock in
// before accessing POS. Owner can bypass with PIN.
// ─────────────────────────────────────────────────────────────
export default function POSGateway({ onUnlocked, onGoToAttendance }: POSGatewayProps) {
    const [activeToday, setActiveToday] = useState<number | null>(null)
    const [showOwnerPin, setShowOwnerPin] = useState(true)
    const [pinInput, setPinInput] = useState('')
    const [pinError, setPinError] = useState(false)



    const handlePinDigit = (d: string) => {
        setPinError(false)
        const next = pinInput + d
        setPinInput(next)
        if (next.length === OWNER_PIN.length) {
            if (next === OWNER_PIN) {
                onUnlocked()
            } else {
                setPinError(true)
                setTimeout(() => setPinInput(''), 600)
            }
        }
    }

    const now = new Date()
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    return (
        <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--mera-bg)', padding: 24,
        }}>
            <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>

                {/* Clock */}
                <div style={{ marginBottom: 32 }}>
                    <p style={{ fontSize: 60, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--mera-text-primary)' }}>{timeStr}</p>
                    <p style={{ fontSize: 14, color: 'var(--mera-text-tertiary)', marginTop: 6 }}>{dateStr}</p>
                </div>

                {/* Lock indicator */}
                <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'var(--mera-surface)', border: '2px solid var(--mera-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px', fontSize: 36,
                }}>
                    <Lock size={36} color="var(--mera-text-tertiary)" />
                </div>

                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
                    SYSTEM LOCKED
                </h2>
                {/* PIN Pad */}
                <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 14, color: 'var(--mera-text-secondary)', marginBottom: 16, fontWeight: 600 }}>
                        ENTER PIN
                    </p>

                    {/* Dots */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
                        {Array.from({ length: OWNER_PIN.length }).map((_, i) => (
                            <div key={i} style={{
                                width: 14, height: 14, borderRadius: '50%',
                                background: pinError ? 'var(--mera-error)' : i < pinInput.length ? 'var(--mera-text-primary)' : 'var(--mera-border)',
                                transition: 'background 0.15s',
                            }} />
                        ))}
                    </div>

                    {/* Numpad */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 260, margin: '0 auto 16px' }}>
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) => (
                            d === '' ? <div key={i} /> : (
                                <button
                                    key={i}
                                    onClick={() => d === '⌫' ? setPinInput(p => p.slice(0, -1)) : handlePinDigit(d)}
                                    style={{
                                        height: 56, fontSize: d === '⌫' ? 22 : 20, fontWeight: 600,
                                        background: 'var(--mera-surface)', border: '1px solid var(--mera-border)',
                                        borderRadius: 'var(--mera-radius-md)', cursor: 'pointer',
                                        color: 'var(--mera-text-primary)',
                                        transition: 'background 0.1s',
                                    }}
                                >{d}</button>
                            )
                        ))}
                    </div>

                    {pinError && <p style={{ fontSize: 12, color: 'var(--mera-error)', marginBottom: 8 }}><XCircle size={14} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 4 }} /> WRONG PIN</p>}
                </div>

                <button
                    onClick={onGoToAttendance}
                    style={{
                        padding: '10px 20px', fontSize: 13,
                        color: 'var(--mera-surface)', border: '1px solid var(--mera-border)',
                        borderRadius: 'var(--mera-radius-md)', cursor: 'pointer', marginTop: 16
                    }}
                ><Camera size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} /> Crew Login</button>
            </div>
        </div>
    )
}
