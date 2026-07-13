import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@mera/supabase/client'
import type { Product, Studio } from '@mera/supabase'

export const revalidate = 60 // ISR: regenerate every 60 seconds

export const metadata: Metadata = {
    title: 'Pricelist',
    description: 'Pricelist Mera Self Studio Mojokerto — Self Photo, Pas Photo, Thematic, dan Add-ons.',
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

const STUDIO_PHOTOS = [
    { src: '/photo-basic-mr-1.png', label: 'Basic · Maroon' },
    { src: '/photo-basic-lg-1.png', label: 'Basic · Light Grey' },
    { src: '/photo-basic-dg-1.png', label: 'Basic · Dark Grey' },
    { src: '/photo-basic-sp-1.png', label: 'Basic · Soft Pink' },
    { src: '/photo-basic-cc-1.png', label: 'Basic · Choco' },
    { src: '/photo-basic-og-1.png', label: 'Basic · Olive Green' },
    { src: '/photo-pasphoto-bl.png', label: 'Pas Photo' },
    { src: '/photo-yearbook-1.png', label: 'Yearbook' },
]

function PhotoRow({ photos }: { photos: { src: string; label: string }[] }) {
    if (!photos || photos.length === 0) return null
    return (
        <div style={{ overflow: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', margin: '0 -20px', padding: '0 20px 20px' }}>
            <div style={{ display: 'flex', gap: 12, width: 'max-content' }}>
                {photos.map(p => (
                    <div key={p.src} style={{ flexShrink: 0, width: 140 }}>
                        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(98,33,40,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                            <Image src={p.src} alt={p.label} width={280} height={360} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                        </div>
                        <p style={{ margin: '8px 0 0', fontSize: 10, fontWeight: 600, color: TEXT_SEC, opacity: 0.5, textAlign: 'center', letterSpacing: '0.02em' }}>{p.label}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

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
        <main style={{ minHeight: '100dvh', background: BG, color: TEXT, fontFamily: FONT }}>
            {/* Nav */}
            <nav style={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', background: 'hsla(33, 24%, 93%, 0.85)', borderBottom: '1px solid rgba(98,33,40,0.08)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                    <Image src="/mera-logo-maroon.png" alt="Méra" width={100} height={36} style={{ height: 26, width: 'auto' }} />
                </Link>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <Link href="/pricelist" style={{ fontSize: 13, color: MAROON, textDecoration: 'none', fontWeight: 700 }}>Pricelist</Link>
                    <Link href="/cara-booking" style={{ fontSize: 13, color: TEXT_SEC, textDecoration: 'none', fontWeight: 600, opacity: 0.7 }}>How to Book?</Link>
                </div>
            </nav>

            {/* Hero */}
            <section style={{ textAlign: 'center', padding: '56px 20px 36px' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: MAROON, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>Pricelist</p>
                <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, fontFamily: SERIF, fontStyle: 'italic', lineHeight: 1.1, color: TEXT }}>
                    Pilihan Paket
                </h1>
                <p style={{ margin: 0, fontSize: 15, color: TEXT_SEC, opacity: 0.6, maxWidth: 420, marginInline: 'auto' }}>
                    Pilih paket sesuai kebutuhanmu.
                </p>
            </section>

            {/* Dynamic Studio Packages */}
            {studios.map(studio => {
                // Filter products that match this studio's allowed_categories
                const studioProducts = products.filter(p => {
                    if (p.is_addon) return false
                    if (!p.kategori) return false
                    const allowed = studio.allowed_categories || []
                    return allowed.some((c: string) => c.toLowerCase() === p.kategori.toLowerCase())
                })

                if (studioProducts.length === 0) return null

                // Fallback Option B: if it's the Basic Studio, use the rich gallery, otherwise use single image
                const isBasic = studio.name.toLowerCase().includes('basic')
                const photosToRender = isBasic 
                    ? STUDIO_PHOTOS 
                    : (studio.image_url ? [{ src: studio.image_url, label: studio.name }] : [])

                return (
                    <section key={studio.id} style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px 36px' }}>
                        <h2 style={{ fontSize: 11, fontWeight: 700, color: TEXT_SEC, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, paddingLeft: 4 }}>
                            {studio.emoji} {studio.name} {studio.description ? `- ${studio.description}` : ''}
                        </h2>
                        
                        <PhotoRow photos={photosToRender} />
                        
                        <div style={{ display: 'grid', gap: 12 }}>
                            {studioProducts.map(item => {
                                const isHighlight = item.nama === 'Self Photo Session'
                                return (
                                <div key={item.id} style={{
                                    background: isHighlight ? 'linear-gradient(135deg, rgba(98,33,40,0.08) 0%, rgba(98,33,40,0.03) 100%)' : 'rgba(255,255,255,0.6)',
                                    border: isHighlight ? '1px solid rgba(98,33,40,0.2)' : '1px solid rgba(98,33,40,0.06)',
                                    borderRadius: 16, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{item.nama}</span>
                                            {isHighlight && <span style={{ fontSize: 9, fontWeight: 700, background: MAROON, color: '#fff', padding: '3px 8px', borderRadius: 10 }}>BEST SELLER</span>}
                                        </div>
                                        <p style={{ margin: 0, fontSize: 12, color: TEXT_SEC, opacity: 0.55, lineHeight: 1.4 }}>
                                            {item.deskripsi || item.kategori}
                                        </p>
                                    </div>
                                    <span style={{ fontSize: 16, fontWeight: 800, color: isHighlight ? MAROON : TEXT, whiteSpace: 'nowrap' }}>
                                        {fmtRp(item.harga_dasar)}
                                    </span>
                                </div>
                            )})}
                        </div>
                    </section>
                )
            })}

            {/* Add-ons */}
            <section style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px 48px' }}>
                <h2 style={{ fontSize: 11, fontWeight: 700, color: TEXT_SEC, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, paddingLeft: 4 }}>✨ Add-ons</h2>
                <div style={{ display: 'grid', gap: 12 }}>
                    {addons.map(item => {
                        const isTiered = item.tipe_harga === 'bertingkat' && item.tier_1 != null
                        return (
                        <div key={item.id} style={{
                            background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(98,33,40,0.06)',
                            borderRadius: 16, padding: '18px 20px',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{item.nama}</span>
                                    <p style={{ margin: '4px 0 0', fontSize: 12, color: TEXT_SEC, opacity: 0.55, lineHeight: 1.4 }}>
                                        {item.deskripsi || ''}
                                    </p>
                                </div>
                                <span style={{ fontSize: 16, fontWeight: 800, color: MAROON, whiteSpace: 'nowrap' }}>
                                    {isTiered ? `Mulai ${fmtRp(item.harga_dasar)}` : fmtRp(item.harga_dasar)}
                                </span>
                            </div>
                            {isTiered && (
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(98,33,40,0.06)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ margin: 0, fontSize: 10, color: TEXT_SEC, opacity: 0.4, marginBottom: 2 }}>1 pax</p>
                                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT_SEC }}>{fmtRp(item.tier_1)}</p>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ margin: 0, fontSize: 10, color: TEXT_SEC, opacity: 0.4, marginBottom: 2 }}>2 pax</p>
                                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT_SEC }}>{fmtRp(item.tier_2)}</p>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ margin: 0, fontSize: 10, color: TEXT_SEC, opacity: 0.4, marginBottom: 2 }}>3 pax</p>
                                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT_SEC }}>{fmtRp(item.tier_3)}</p>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ margin: 0, fontSize: 10, color: TEXT_SEC, opacity: 0.4, marginBottom: 2 }}>4+ pax</p>
                                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT_SEC }}>+{fmtRp(item.tier_lebih)}/ea</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )})}
                </div>
            </section>

            {/* CTA */}
            <section style={{ textAlign: 'center', padding: '0 20px 60px' }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(98,33,40,0.08) 0%, rgba(98,33,40,0.03) 100%)', border: '1px solid rgba(98,33,40,0.15)', borderRadius: 20, padding: '32px 24px', maxWidth: 480, margin: '0 auto' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: TEXT }}>Siap foto? 📸</p>
                    <p style={{ margin: '0 0 20px', fontSize: 13, color: TEXT_SEC, opacity: 0.55 }}>Booking sekarang, amankan slotmu!</p>
                    <Link href="/booking" style={{ display: 'inline-block', background: MAROON, color: '#fff', fontWeight: 800, fontSize: 14, padding: '12px 32px', borderRadius: 999, textDecoration: 'none', boxShadow: '0 8px 24px rgba(98,33,40,0.3)' }}>
                        Book Now
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ borderTop: '1px solid rgba(98,33,40,0.08)', padding: '24px 20px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 11, color: TEXT_SEC, opacity: 0.3 }}>© 2026 Mera Self Studio</p>
            </footer>
        </main>
    )
}
