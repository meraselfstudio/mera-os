import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

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

function fmtRp(n: number) {
    return 'Rp ' + n.toLocaleString('id-ID')
}

type PriceItem = {
    name: string
    desc: string
    price: string
    badge?: string
    highlight?: boolean
}

const MAIN_PACKAGES: PriceItem[] = [
    { name: 'Self Photo Session', desc: '10 Menit sesi foto unlimited jepret di Basic Studio dengan 6 pilihan background, paket untuk 2 orang, gratis 1 Print Basic Frame, Soft Files Hitam Putih', price: fmtRp(50000), highlight: true },
    { name: 'Party Photo Session', desc: '15 Menit sesi foto unlimited jepret di Basic Studio dengan 6 pilihan background, paket untuk 8 orang, gratis 2 Print Basic Frame, Soft Files Hitam Putih', price: fmtRp(135000) },
    { name: 'Pas Photo Basic', desc: '10 menit sesi foto formal dan bebas dengan background polos untuk 1 orang, Free Soft Files Hitam Putih', price: fmtRp(80000) },
    { name: 'Pas Photo Package', desc: '10 Menit Foto formal dan bebas dengan background polos untuk 2 orang, Dapat foto 2x3, 3x4, 4x6 dan 1 Print Basic Frame + Soft Files', price: fmtRp(100000) },
]

const THEMATIC: PriceItem[] = [
    { name: 'Thematic Basic', desc: '10 menit sesi foto unlimited jepret dengan tema pilihan di Elevator dan Majestic Studio untuk 1 orang, Free Soft Files Hitam Putih', price: fmtRp(15000) },
    { name: 'Thematic Package', desc: '10 menit sesi foto unlimited jepret dengan tema pilihan di Elevator dan Majestic Studio untuk 2 orang, Free Soft Files, Free 1 Print Basic Frame', price: fmtRp(50000) },
]

type AddonItem = {
    name: string
    desc: string
    price: string
    tiered?: { labels: string[]; prices: string[] }
}

const ADDONS: AddonItem[] = [
    { name: 'Edited + Colored Photo', desc: 'Hasil Foto Soft Files + Hasil Print Berwarna dan Ter-edit dengan retouch professional', price: fmtRp(20000) },
    { name: 'Add Person', desc: 'Tambahan 1 orang di sesi yang sama', price: fmtRp(25000) + ' / orang' },
    { name: 'Add Time (5 menit)', desc: 'Perpanjangan waktu sesi (per 5 menit)', price: fmtRp(15000) + ' / 5 menit' },
    {
        name: 'Add Print',
        desc: 'Print tambahan foto',
        price: 'Mulai ' + fmtRp(15000),
        tiered: {
            labels: ['1 lembar', '2 lembar', '3 lembar', '4+ lembar'],
            prices: [fmtRp(15000), fmtRp(30000), fmtRp(35000), '+' + fmtRp(13000) + ' / lembar'],
        },
    },
    {
        name: 'Special Frame',
        desc: 'Frame premium untuk hasil print',
        price: 'Mulai ' + fmtRp(25000),
        tiered: {
            labels: ['1 frame', '2 frame', '3 frame', '4+ frame'],
            prices: [fmtRp(25000), fmtRp(40000), fmtRp(50000), '+' + fmtRp(15000) + ' / frame'],
        },
    },
]

const STUDIO_PHOTOS = [
    { src: '/photo-basic-mr-1.png', label: 'Basic · Maroon' },
    { src: '/photo-basic-lg-1.png', label: 'Basic · Light Grey' },
    { src: '/photo-basic-dp-1.png', label: 'Basic · Dusty Pink' },
    { src: '/photo-basic-bl-1.png', label: 'Basic · Blue' },
    { src: '/photo-basic-dg-1.png', label: 'Basic · Dark Grey' },
    { src: '/photo-brown-1.png', label: 'Basic · Brown' },
    { src: '/photo-pasphoto-bl.png', label: 'Pas Photo' },
    { src: '/photo-yearbook-1.png', label: 'Yearbook' },
]

const THEMATIC_PHOTOS = [
    { src: '/photo-majestic-1.png', label: 'Majestic Studio' },
    { src: '/photo-majestic-2.png', label: 'Majestic Studio' },
    { src: '/photo-elevator-1.png', label: 'Elevator Studio' },
    { src: '/photo-elevator-2.png', label: 'Elevator Studio' },
]

function PhotoRow({ photos }: { photos: { src: string; label: string }[] }) {
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

export default function PricelistPage() {
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

            {/* Main Packages */}
            <section style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px 36px' }}>
                <h2 style={{ fontSize: 11, fontWeight: 700, color: TEXT_SEC, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, paddingLeft: 4 }}>📸 Basic Studio - Background Polos</h2>
                <PhotoRow photos={STUDIO_PHOTOS} />
                <div style={{ display: 'grid', gap: 12 }}>
                    {MAIN_PACKAGES.map(item => (
                        <div key={item.name} style={{
                            background: item.highlight ? 'linear-gradient(135deg, rgba(98,33,40,0.08) 0%, rgba(98,33,40,0.03) 100%)' : 'rgba(255,255,255,0.6)',
                            border: item.highlight ? '1px solid rgba(98,33,40,0.2)' : '1px solid rgba(98,33,40,0.06)',
                            borderRadius: 16, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{item.name}</span>
                                    {item.badge && <span style={{ fontSize: 9, fontWeight: 700, background: MAROON, color: '#fff', padding: '3px 8px', borderRadius: 10 }}>{item.badge}</span>}
                                </div>
                                <p style={{ margin: 0, fontSize: 12, color: TEXT_SEC, opacity: 0.55, lineHeight: 1.4 }}>{item.desc}</p>
                            </div>
                            <span style={{ fontSize: 16, fontWeight: 800, color: item.highlight ? MAROON : TEXT, whiteSpace: 'nowrap' }}>{item.price}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Thematic */}
            <section style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px 36px' }}>
                <h2 style={{ fontSize: 11, fontWeight: 700, color: TEXT_SEC, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, paddingLeft: 4 }}>🎨 Thematic Studio - Elevator Studio & Majestic Studio</h2>
                <PhotoRow photos={THEMATIC_PHOTOS} />
                <div style={{ display: 'grid', gap: 12 }}>
                    {THEMATIC.map(item => (
                        <div key={item.name} style={{
                            background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(98,33,40,0.06)',
                            borderRadius: 16, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
                        }}>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{item.name}</span>
                                <p style={{ margin: '4px 0 0', fontSize: 12, color: TEXT_SEC, opacity: 0.55, lineHeight: 1.4 }}>{item.desc}</p>
                            </div>
                            <span style={{ fontSize: 16, fontWeight: 800, color: TEXT, whiteSpace: 'nowrap' }}>{item.price}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Add-ons */}
            <section style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px 48px' }}>
                <h2 style={{ fontSize: 11, fontWeight: 700, color: TEXT_SEC, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, paddingLeft: 4 }}>✨ Add-ons</h2>
                <div style={{ display: 'grid', gap: 12 }}>
                    {ADDONS.map(item => (
                        <div key={item.name} style={{
                            background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(98,33,40,0.06)',
                            borderRadius: 16, padding: '18px 20px',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{item.name}</span>
                                    <p style={{ margin: '4px 0 0', fontSize: 12, color: TEXT_SEC, opacity: 0.55, lineHeight: 1.4 }}>{item.desc}</p>
                                </div>
                                <span style={{ fontSize: 16, fontWeight: 800, color: MAROON, whiteSpace: 'nowrap' }}>{item.price}</span>
                            </div>
                            {item.tiered && (
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(98,33,40,0.06)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                                    {item.tiered.labels.map((label, i) => (
                                        <div key={label} style={{ textAlign: 'center' }}>
                                            <p style={{ margin: 0, fontSize: 10, color: TEXT_SEC, opacity: 0.4, marginBottom: 2 }}>{label}</p>
                                            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT_SEC }}>{item.tiered!.prices[i]}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
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
