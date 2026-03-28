/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react'
import { supabase } from '@mera/supabase/client'
import type { Product } from '@mera/supabase/types'

/**
 * KioskView — Route: /kiosk
 *
 * Touch-friendly single-column tablet UI for self-booking initiation.
 * Customers browse packages and scan a QR or tap to open the booking portal.
 * This view is display-only; actual booking is completed on the Customer Portal.
 */
export default function KioskView() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState<Product | null>(null)

    useEffect(() => {
        supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .eq('kategori', 'package')
            .order('harga_dasar')
            .then(({ data }) => {
                setProducts(data ?? [])
                setLoading(false)
            })
    }, [])

    // Build booking URL for selected package
    const bookingUrl = selected
        ? `${import.meta.env.VITE_PORTAL_URL ?? 'https://meraselfstudio.com'}/booking?package=${selected.id}`
        : null

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--mera-bg)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '40px 24px', userSelect: 'none',
        }}>
            {/* Header */}
            <header style={{ padding: '60px 40px 40px', textAlign: 'center' }}>
                <h1 style={{ fontSize: 52, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--mera-text-primary)', lineHeight: 1 }}>
                    méra.
                </h1>
                <p style={{ fontSize: 18, color: 'var(--mera-text-secondary)', marginTop: 10, fontWeight: 400 }}>
                    Pilih paket dan mulai sesi fotomu
                </p>
            </header>

            {/* Loading State */}
            {loading && (
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', paddingTop: 100 }}>
                    <p style={{ fontSize: 16, color: 'var(--mera-text-secondary)' }}>Memuat paket...</p>
                </div>
            )}
            {/* Package cards — large touch targets */}
            {!loading && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 20, width: '100%', maxWidth: 900, marginBottom: 40,
                }}>
                    {products.map(p => {
                        const isSelected = selected?.id === p.id
                        return (
                            <button
                                key={p.id}
                                onClick={() => setSelected(isSelected ? null : p)}
                                style={{
                                    padding: '32px 24px', borderRadius: 'var(--mera-radius-xl)',
                                    background: isSelected ? 'var(--mera-surface-raised)' : 'var(--mera-surface)',
                                    color: 'var(--mera-text-primary)',
                                    border: `2px solid ${isSelected ? 'var(--mera-accent)' : 'var(--mera-border)'}`,
                                    cursor: 'pointer', transition: 'all var(--mera-duration) var(--mera-ease)',
                                    boxShadow: isSelected ? '0 8px 32px rgba(0,0,0,0.5)' : 'none',
                                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                    fontFamily: 'inherit',
                                }}
                            >
                                <p style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>
                                    {p.nama}
                                </p>
                                <p style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em', marginTop: 10 }}>
                                    Rp {p.harga_dasar.toLocaleString('id-ID')}
                                </p>
                                {isSelected && (
                                    <p style={{ marginTop: 16, fontSize: 14, opacity: 0.8, fontWeight: 500 }}>
                                        ✓ Dipilih — tap tombol di bawah untuk lanjut
                                    </p>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* CTA */}
            {selected && bookingUrl && (
                <div style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0,
                    padding: '20px 32px',
                    background: 'rgba(245, 245, 247, 0.9)', backdropFilter: 'blur(20px)',
                    borderTop: '1px solid rgba(0,0,0,0.08)',
                    display: 'flex', justifyContent: 'center',
                }}>
                    <a
                        href={bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            borderRadius: 'var(--mera-radius-full)', fontWeight: 600, fontSize: 18,
                            padding: '20px 52px', background: 'var(--mera-accent)', color: '#fff',
                            border: 'none', cursor: 'pointer', display: 'inline-block',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)', textDecoration: 'none',
                            letterSpacing: '-0.01em',
                        }}
                    >
                        Booking {selected.nama} →
                    </a>
                </div>
            )}

            {/* Back to Islands */}
            <a
                href="/"
                style={{
                    position: 'fixed', bottom: 0, left: 0, fontSize: 13,
                    color: 'var(--mera-text-secondary)',
                    width: '100%', padding: '32px 40px', background: 'var(--mera-surface)',
                    borderTop: '1px solid var(--mera-border)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
            >
                ← All Islands
            </a>
        </div>
    )
}
