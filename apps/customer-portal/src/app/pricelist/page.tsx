import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@mera/supabase/client'
import type { Product, Studio } from '@mera/supabase'

export const revalidate = 60 // ISR: regenerate every 60 seconds

export const metadata: Metadata = {
    title: 'Pricelist'
}

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
const SERIF = "Georgia, 'Times New Roman', serif"
const BG = 'hsl(33, 24%, 93%)'
const TEXT = '#2e1b1f'
const TEXT_SEC = '#4a3438'
const MAROON = '#622128'

function fmtRp(n: number | null | undefined) {
    if (n == null) return ''
    return 'Rp ' + n.toLocaleString('id-ID')
}

const PRICELIST_PAGES = [
    { title: 'Cover Catalog', src: '/pricelist-3-pages/page_1.png', tag: 'Méra 3.0' },
    { title: 'Basic Studio', src: '/pricelist-3-pages/page_2.png', tag: 'Self & Party' },
    { title: 'Close Up Room', src: '/pricelist-3-pages/page_3.png', tag: '3 Background' },
    { title: 'Pas Photo', src: '/pricelist-3-pages/page_4.png', tag: 'Basic & Couple' },
    { title: 'Add-Ons', src: '/pricelist-3-pages/page_5.png', tag: 'Extra Print & Time' },
]

export default async function PricelistPage() {
    // Fetch products & studios from database
    const [productsRes, studiosRes] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).order('id'),
        supabase.from('studios').select('*').eq('is_active', true).order('sort_order')
    ])

    const products = (productsRes.data || []) as Product[]
    const studios = (studiosRes.data || []) as Studio[]
    const addons = products.filter(p => p.is_addon)

    return (
        <main style={{ minHeight: '100dvh', background: BG, color: TEXT, fontFamily: FONT, paddingBottom: 60 }}>
            {/* Sticky Glass Navbar */}
            <nav style={{
                position: 'sticky', top: 0, zIndex: 50,
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                background: 'hsla(33, 24%, 93%, 0.88)',
                borderBottom: '1px solid rgba(98,33,40,0.08)',
                padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                    <Image src="/mera-logo-maroon.png" alt="Méra" width={100} height={36} style={{ height: 26, width: 'auto' }} />
                </Link>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <Link href="/cara-booking" style={{ fontSize: 13, color: TEXT_SEC, textDecoration: 'none', fontWeight: 600, opacity: 0.7 }}>How to Book?</Link>
                    <Link href="/booking" style={{
                        background: MAROON, color: '#fff', fontSize: 12, fontWeight: 800,
                        padding: '8px 18px', borderRadius: 999, textDecoration: 'none',
                        boxShadow: '0 4px 14px rgba(98,33,40,0.25)'
                    }}>
                        Book Now →
                    </Link>
                </div>
            </nav>

            {/* ── VISUAL CATALOG IMAGES (ONLY IMAGES) ── */}
            <section style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 40px' }}>
                <div style={{ display: 'grid', gap: 20 }}>
                    {PRICELIST_PAGES.map((pg, idx) => (
                        <div key={pg.src} style={{
                            borderRadius: 20, overflow: 'hidden',
                            border: '1px solid rgba(98,33,40,0.12)',
                            boxShadow: '0 8px 24px rgba(98,33,40,0.08)',
                            background: '#fff'
                        }}>
                            <Image
                                src={pg.src}
                                alt={pg.title}
                                width={1200}
                                height={1600}
                                style={{ width: '100%', height: 'auto', display: 'block' }}
                                priority={idx === 0}
                            />
                        </div>
                    ))}
                </div>
            </section>

            {/* ── INTERACTIVE PRICELIST BREAKDOWN ── */}
            <section style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px 48px' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: MAROON, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Pricelist</p>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, fontFamily: SERIF, fontStyle: 'italic', color: TEXT }}>
                        Paket & Add-Ons
                    </h2>
                </div>

                {studios.map(studio => {
                    const studioProducts = products.filter(p => {
                        if (p.is_addon) return false
                        if (!p.kategori) return false
                        const allowed = studio.allowed_categories || []
                        return allowed.some((c: string) => c.toLowerCase() === p.kategori.toLowerCase())
                    })

                    if (studioProducts.length === 0) return null

                    return (
                        <div key={studio.id} style={{ marginBottom: 28 }}>
                            <h3 style={{ fontSize: 12, fontWeight: 700, color: MAROON, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, paddingLeft: 4 }}>
                                {studio.emoji} {studio.name}
                            </h3>
                            <div style={{ display: 'grid', gap: 10 }}>
                                {studioProducts.map(item => (
                                    <div key={item.id} style={{
                                        background: 'rgba(255,255,255,0.75)',
                                        border: '1px solid rgba(98,33,40,0.1)',
                                        borderRadius: 16, padding: '14px 18px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12
                                    }}>
                                        <div>
                                            <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{item.nama}</span>
                                            <p style={{ margin: '3px 0 0', fontSize: 12, color: TEXT_SEC, opacity: 0.65, lineHeight: 1.35 }}>
                                                {item.deskripsi || item.kategori}
                                            </p>
                                        </div>
                                        <span style={{ fontSize: 16, fontWeight: 800, color: MAROON, whiteSpace: 'nowrap' }}>
                                            {fmtRp(item.harga_dasar)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}

                {/* Add-ons Breakdown */}
                <div>
                    <h3 style={{ fontSize: 12, fontWeight: 700, color: MAROON, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, paddingLeft: 4 }}>
                        (+) Add-Ons
                    </h3>
                    <div style={{ display: 'grid', gap: 10 }}>
                        {addons.map(item => {
                            const isTiered = item.tipe_harga === 'bertingkat' && item.tier_1 != null
                            return (
                                <div key={item.id} style={{
                                    background: 'rgba(255,255,255,0.75)',
                                    border: '1px solid rgba(98,33,40,0.1)',
                                    borderRadius: 16, padding: '14px 18px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                        <div>
                                            <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{item.nama}</span>
                                            <p style={{ margin: '3px 0 0', fontSize: 12, color: TEXT_SEC, opacity: 0.65, lineHeight: 1.35 }}>
                                                {item.deskripsi || ''}
                                            </p>
                                        </div>
                                        <span style={{ fontSize: 15, fontWeight: 800, color: MAROON, whiteSpace: 'nowrap' }}>
                                            {isTiered ? `Mulai ${fmtRp(item.harga_dasar)}` : fmtRp(item.harga_dasar)}
                                        </span>
                                    </div>
                                    {isTiered && (
                                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(98,33,40,0.08)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ margin: 0, fontSize: 10, color: TEXT_SEC, opacity: 0.5 }}>1 Print</p>
                                                <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: TEXT }}>{fmtRp(item.tier_1)}</p>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ margin: 0, fontSize: 10, color: TEXT_SEC, opacity: 0.5 }}>2 Print</p>
                                                <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: TEXT }}>{fmtRp(item.tier_2)}</p>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ margin: 0, fontSize: 10, color: TEXT_SEC, opacity: 0.5 }}>3 Print</p>
                                                <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: TEXT }}>{fmtRp(item.tier_3)}</p>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ margin: 0, fontSize: 10, color: TEXT_SEC, opacity: 0.5 }}>&gt;3 Print</p>
                                                <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: MAROON }}>{fmtRp(item.tier_lebih)}/ea</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* Bottom CTA Banner */}
            <section style={{ textAlign: 'center', padding: '0 20px 40px', maxWidth: 640, margin: '0 auto' }}>
                <div style={{
                    background: 'linear-gradient(135deg, rgba(98,33,40,0.1) 0%, rgba(98,33,40,0.04) 100%)',
                    border: '1px solid rgba(98,33,40,0.18)', borderRadius: 24, padding: '28px 20px'
                }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, fontFamily: SERIF, fontStyle: 'italic', color: TEXT }}>
                        Udah siap belum foto di Méra?
                    </h3>
                    <p style={{ margin: '0 0 18px', fontSize: 13, color: TEXT_SEC, opacity: 0.7 }}>

                    </p>
                    <Link href="/booking" style={{
                        display: 'inline-block', background: MAROON, color: '#fff',
                        fontWeight: 800, fontSize: 14, padding: '14px 32px', borderRadius: 999,
                        textDecoration: 'none', boxShadow: '0 8px 24px rgba(98,33,40,0.28)'
                    }}>
                        Booking Sekarang →
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ borderTop: '1px solid rgba(98,33,40,0.08)', padding: '20px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 11, color: TEXT_SEC, opacity: 0.4 }}>© 2026 Méra SelfStudio Mojokerto</p>
            </footer>
        </main>
    )
}
