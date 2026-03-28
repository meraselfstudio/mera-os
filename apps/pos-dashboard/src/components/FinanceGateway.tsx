import React, { useState } from 'react'
import { Lock, XCircle } from 'lucide-react'

// ── Owner PIN ─────────────────────────────────────────────────
// Change this PIN to customize owner access
const OWNER_PIN = '1609'

// ── Props ──────────────────────────────────────────────────────
interface FinanceGatewayProps {
    onUnlocked: () => void
}

export default function FinanceGateway({ onUnlocked }: FinanceGatewayProps) {
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

    return (
        <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--mera-bg)', padding: 24,
        }}>
            <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>

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
                    FINANCE GATEWAY
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

                    {pinError && <p style={{ fontSize: 12, color: 'var(--mera-error)', marginBottom: 8 }}><XCircle size={14} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 4 }} /> PIN salah</p>}
                </div>
            </div>
        </div>
    )
}
