import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
    title: 'How to Book?',
    description: 'Panduan lengkap cara booking sesi foto di Mera Self Studio Mojokerto secara online.',
}

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
const SERIF = "Georgia, 'Times New Roman', serif"

const BG = 'hsl(33, 24%, 93%)'
const TEXT = '#2e1b1f'
const TEXT_SEC = '#4a3438'
const MAROON = '#622128'

const STEPS = [
    {
        number: '01',
        emoji: '🏠',
        title: 'Pilih Studio',
        desc: 'Pilih studio yang kamu inginkan, ada 3 pilihan Studio : Basic Studio, Elevator Studio dan Majestic Studio',
    },
    {
        number: '02',
        emoji: '🎨',
        title: 'Pilih Paket',
        desc: 'Pilih paket yang sesuai dengan kebutuhan kamu.',
    },
    {
        number: '03',
        emoji: '📅',
        title: 'Pilih Tanggal & Waktu',
        desc: 'Pilih tanggal dan slot waktu yang tersedia. Senin-Kamis buka mulai 12:00, Jumat-Minggu mulai 09:00.',
    },
    {
        number: '04',
        emoji: '✍️',
        title: 'Isi Data Diri',
        desc: 'Masukkan Nama dan Username Instagram kamu. Data ini digunakan untuk mengirim link hasil foto dan komunikasi lainnya.',
    },
    {
        number: '05',
        emoji: '💳',
        title: 'Pilih Metode Booking',
        desc: 'Dua pilihan: Keep Slot (slot terkunci 6 jam, bayar di studio) atau QRIS (bayar langsung, slot 100% terjamin). Kami sarankan QRIS agar slot tetap aman.',
    },
    {
        number: '06',
        emoji: '✅',
        title: 'Konfirmasi & Selesai!',
        desc: 'Setelah booking berhasil, kamu akan mendapat kode booking. Tunjukkan kode ini saat datang ke studio. Datang 10 menit sebelum jadwal ya!',
    },
]

const RULES = [
    { emoji: '⏰', text: 'Datang minimal 10 menit sebelum jadwal sesi. Keterlambatan mengurangi durasi sesi.' },
    { emoji: '👥', text: 'Paket Self Photo Session maks 4 orang. Lebih dari itu, wajib Pilih Paket Party Photo Session (maks 8 orang).' },
    { emoji: '👗', text: 'Pakai outfit terbaik sesuai tema fotomu untuk hasil terbaik.' },
    { emoji: '🚫', text: 'Dilarang membawa makanan, minuman ke dalam studio.' },
    { emoji: '🚭', text: 'Dilarang merokok di dalam area studio.' },
    { emoji: '📸', text: 'Jangan menyentuh atau memindahkan peralatan dalam studio.' },
    { emoji: '🔄', text: 'Booking 2 sesi atau lebih harus dilakukan secara terpisah (satu per satu).' },
    { emoji: '👶', text: 'Anak di bawah 2 tahun Gratis!.' },
    { emoji: '👶', text: 'Anak di bawah 10 tahun wajib didampingi orang dewasa.' },
    { emoji: '🧹', text: 'Jaga kebersihan studio. Buang sampah pada tempatnya.' },
    { emoji: '💳', text: 'Pembayaran QRIS bersifat final — tidak bisa di-refund.' },
    { emoji: '🕒', text: 'Keep Slot hangus otomatis jika tidak dikonfirmasi dalam 6 jam.' },
    { emoji: '📅', text: 'Reschedule maksimal H-1 melalui website (online) dan konfirmasi via DM instagram.' },
    { emoji: '📱', text: 'Hasil foto langsung bisa diakses via Google Drive setelah sesi. Link aktif 5 hari.' },
    { emoji: '💰', text: 'Kerusakan properti/peralatan studio menjadi tanggung jawab customer.' },
]

export default function CaraBookingPage() {
    return (
        <main style={{ minHeight: '100dvh', background: BG, color: TEXT, fontFamily: FONT }}>
            {/* Nav */}
            <nav style={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', background: 'hsla(33, 24%, 93%, 0.85)', borderBottom: '1px solid rgba(98,33,40,0.08)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                    <Image src="/mera-logo-maroon.png" alt="Méra" width={100} height={36} style={{ height: 26, width: 'auto' }} />
                </Link>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <Link href="/pricelist" style={{ fontSize: 13, color: TEXT_SEC, textDecoration: 'none', fontWeight: 600, opacity: 0.7 }}>Pricelist</Link>
                    <Link href="/cara-booking" style={{ fontSize: 13, color: MAROON, textDecoration: 'none', fontWeight: 700 }}>How to Book?</Link>
                </div>
            </nav>

            {/* Hero */}
            <section style={{ textAlign: 'center', padding: '56px 20px 36px' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: MAROON, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>Panduan</p>
                <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, fontFamily: SERIF, fontStyle: 'italic', lineHeight: 1.1, color: TEXT }}>
                    How to Book?
                </h1>
                <p style={{ margin: 0, fontSize: 15, color: TEXT_SEC, opacity: 0.6, maxWidth: 420, marginInline: 'auto' }}>
                    Booking sesi foto di Mera Self Studio
                </p>
            </section>

            {/* Steps */}
            <section style={{ maxWidth: 620, margin: '0 auto', padding: '0 20px 48px' }}>
                <div style={{ position: 'relative' }}>
                    {/* Vertical line */}
                    <div style={{ position: 'absolute', left: 23, top: 24, bottom: 24, width: 2, background: 'linear-gradient(to bottom, rgba(98,33,40,0.3), rgba(98,33,40,0.06))', borderRadius: 2 }} />

                    {STEPS.map((step, i) => (
                        <div key={step.number} style={{ display: 'flex', gap: 20, marginBottom: i < STEPS.length - 1 ? 32 : 0, position: 'relative' }}>
                            {/* Number dot */}
                            <div style={{ flexShrink: 0, width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #622128, #3e151a)', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 800, color: '#f5e6d0', boxShadow: '0 4px 16px rgba(98,33,40,0.2)', zIndex: 1 }}>
                                {step.emoji}
                            </div>
                            {/* Content */}
                            <div style={{ flex: 1, paddingTop: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: MAROON, letterSpacing: '0.1em' }}>STEP {step.number}</span>
                                </div>
                                <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: TEXT }}>{step.title}</h3>
                                <p style={{ margin: 0, fontSize: 13, color: TEXT_SEC, opacity: 0.6, lineHeight: 1.6 }}>{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Rules & Info */}
            <section style={{ maxWidth: 620, margin: '0 auto', padding: '0 20px 48px' }}>
                <h2 style={{ fontSize: 11, fontWeight: 700, color: TEXT_SEC, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, paddingLeft: 4 }}>📋 Peraturan & Info Penting</h2>
                <div style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(98,33,40,0.06)', borderRadius: 16, overflow: 'hidden' }}>
                    {RULES.map((rule, i) => (
                        <div key={i} style={{ padding: '10px 18px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: i < RULES.length - 1 ? '1px solid rgba(98,33,40,0.05)' : 'none' }}>
                            <span style={{ fontSize: 15, flexShrink: 0 }}>{rule.emoji}</span>
                            <p style={{ margin: 0, fontSize: 12, color: TEXT_SEC, opacity: 0.7, lineHeight: 1.45 }}>{rule.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Metode Booking */}
            <section style={{ maxWidth: 620, margin: '0 auto', padding: '0 20px 48px' }}>
                <h2 style={{ fontSize: 11, fontWeight: 700, color: TEXT_SEC, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, paddingLeft: 4 }}>💳 Metode Pembayaran</h2>
                <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ background: 'linear-gradient(135deg, rgba(98,33,40,0.08) 0%, rgba(98,33,40,0.03) 100%)', border: '1px solid rgba(98,33,40,0.15)', borderRadius: 16, padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <span style={{ fontSize: 20 }}>📌</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Keep Slot</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: TEXT_SEC, opacity: 0.6, lineHeight: 1.6 }}>
                            Slot akan terkunci selama 6 jam setelah booking. Bayar langsung di tempat saat datang ke studio. Cocok jika kamu belum yakin tapi ingin mengamankan jadwal dulu.
                        </p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(98,33,40,0.06)', borderRadius: 16, padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <span style={{ fontSize: 20 }}>💳</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>QRIS</span>
                            <span style={{ fontSize: 9, fontWeight: 700, background: MAROON, color: '#fff', padding: '3px 8px', borderRadius: 10 }}>Recommended</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: TEXT_SEC, opacity: 0.6, lineHeight: 1.6 }}>
                            Bayar langsung via QRIS — slot 100% terjamin, bisa reschedule H-1, Booking tidak bisa dibatalkan. Scan QRIS, bayar, dan slot aman.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section style={{ textAlign: 'center', padding: '0 20px 60px' }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(98,33,40,0.08) 0%, rgba(98,33,40,0.03) 100%)', border: '1px solid rgba(98,33,40,0.15)', borderRadius: 20, padding: '32px 24px', maxWidth: 480, margin: '0 auto' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: TEXT }}>Ada pertanyaan lain? DM aja via DM Instagram!</p>
                    <p style={{ margin: '0 0 20px', fontSize: 13, color: TEXT_SEC, opacity: 0.55 }}>Sudah paham? Langsung booking dan foto seru di Mera!</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <Link href="/booking" style={{ display: 'inline-block', background: MAROON, color: '#fff', fontWeight: 800, fontSize: 14, padding: '12px 32px', borderRadius: 999, textDecoration: 'none', boxShadow: '0 8px 24px rgba(98,33,40,0.3)' }}>
                            Book Now
                        </Link>
                        <Link href="/pricelist" style={{ display: 'inline-block', background: 'rgba(255,255,255,0.6)', color: TEXT, fontWeight: 600, fontSize: 14, padding: '12px 24px', borderRadius: 999, textDecoration: 'none', border: '1px solid rgba(98,33,40,0.1)' }}>
                            Pricelist
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ borderTop: '1px solid rgba(98,33,40,0.08)', padding: '24px 20px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 11, color: TEXT_SEC, opacity: 0.3 }}>© 2026 Mera Self Studio · Mojokerto</p>
            </footer>
        </main>
    )
}
