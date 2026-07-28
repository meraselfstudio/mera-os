import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
    title: 'How to Book?',
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
        emoji: '📷',
        title: 'Pilih Studio',
        desc: 'Pilih studio yang kamu inginkan: Basic Studio, Close Up Room, atau Pas Photo.',
        img: '/how-to-book-steps/step1.png',
    },
    {
        number: '02',
        emoji: '🎨',
        title: 'Pilih Paket & Background',
        desc: 'Pilih paket foto yang sesuai, pilihan warna background, dan add-ons opsional (misal: Cetak / Edit & Color).',
        img: '/how-to-book-steps/step2.png',
    },
    {
        number: '03',
        emoji: '📅',
        title: 'Pilih Tanggal & Waktu',
        desc: 'Pilih tanggal sesi foto dan jam operasional yang tersedia. Senin–Kamis buka jam 12:00–21:00, Jumat–Minggu buka mulai jam 09:00–21:00.',
        img: '/how-to-book-steps/step3.png',
    },
    {
        number: '04',
        emoji: '✍️',
        title: 'Data Diri & Pembayaran',
        desc: 'Masukkan Nama & Username Instagram (@username), lalu pilih metode pembayaran (Keep Slot 6 Jam atau QRIS Instant).',
        img: '/how-to-book-steps/step4.png',
    },
    {
        number: '05',
        emoji: '🎟️',
        title: 'Dapatkan Tiket Digital',
        desc: 'Setelah submit, kamu mendapatkan Tiket Digital resmi dengan Kode Booking & Kode QR. Tunjukkan tiket ke staf saat datang ke studio.',
        img: '/how-to-book-steps/step5.png',
    },
]

const RESCHEDULE_STEPS = [
    {
        step: '1',
        title: 'Buka Tiket Digital',
        desc: 'Buka halaman tiket digital sesi kamu dari link konfirmasi booking atau simpanan link tiketmu.',
    },
    {
        step: '2',
        title: 'Klik Tombol "Reschedule Sesi"',
        desc: 'Pada bagian bawah informasi tiket, klik tombol Reschedule Sesi. (Catatan: Reschedule maksimal dilakukan H-1 sebelum tanggal sesi).',
    },
    {
        step: '3',
        title: 'Pilih Tanggal & Jam Baru',
        desc: 'Pilih tanggal dan slot jam operasional baru yang masih tersedia sesuai kebutuhanmu.',
    },
    {
        step: '4',
        title: 'Konfirmasi & Tiket Diperbarui',
        desc: 'Klik Konfirmasi Reschedule. Jadwal barumu otomatis ter-update di sistem studio dan tiket digitalmu langsung diperbarui!',
    },
]

const RULES = [
    { emoji: '📍', text: 'Alamat Studio: Jalan Sawunggaling no.4, Magersari, Mojokerto.' },
    { emoji: '⏰', text: 'Datang minimal 10 menit sebelum jadwal sesi. Keterlambatan dapat mengurangi durasi sesi.' },
    { emoji: '📌', text: 'Keep Slot bertahan 6 jam. Jika tidak dikonfirmasi/dibayar di studio dalam 6 jam, booking otomatis terhapus.' },
    { emoji: '💳', text: 'Pembayaran QRIS Instant terkonfirmasi 100% langsung tanpa batas waktu 6 jam.' },
    { emoji: '👥', text: 'Self Photo Session (1-2 orang), Party Photo Session (3-8 orang). Tambahan orang bisa pakai Add Person.' },
    { emoji: '👗', text: 'Gunakan outfit terbaik sesuai tema pilihanmu.' },
    { emoji: '🚫', text: 'Dilarang membawa makanan dan minuman ke dalam area studio foto.' },
    { emoji: '🚭', text: 'Dilarang merokok / vaping di dalam area studio.' },
    { emoji: '🔄', text: 'Reschedule maksimal H-1 secara online via website tiket atau konfirmasi via Instagram DM.' },
    { emoji: '📱', text: 'Soft file hasil foto dapat diakses langsung via Google Drive setelah sesi.' },
]

export default function CaraBookingPage() {
    return (
        <main style={{ minHeight: '100dvh', background: BG, color: TEXT, fontFamily: FONT, paddingBottom: 60 }}>
            {/* Nav */}
            <nav style={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', background: 'hsla(33, 24%, 93%, 0.88)', borderBottom: '1px solid rgba(98,33,40,0.08)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                    <Image src="/mera-logo-maroon.png" alt="Méra" width={100} height={36} style={{ height: 26, width: 'auto' }} />
                </Link>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <Link href="/pricelist" style={{ fontSize: 13, color: TEXT_SEC, textDecoration: 'none', fontWeight: 600, opacity: 0.7 }}>Pricelist</Link>
                    <Link href="/cara-booking" style={{ fontSize: 13, color: MAROON, textDecoration: 'none', fontWeight: 700 }}>How to Book?</Link>
                    <Link href="/booking" style={{
                        background: MAROON, color: '#fff', fontSize: 12, fontWeight: 800,
                        padding: '8px 18px', borderRadius: 999, textDecoration: 'none',
                        boxShadow: '0 4px 14px rgba(98,33,40,0.25)'
                    }}>
                        Book Now →
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <section style={{ textAlign: 'center', padding: '44px 20px 28px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: MAROON, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Cara Booking</p>
                <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 700, fontFamily: SERIF, fontStyle: 'italic', color: TEXT }}>
                    How to Book?
                </h1>
            </section>

            {/* Steps */}
            <section style={{ maxWidth: 620, margin: '0 auto', padding: '0 20px 40px' }}>
                <div style={{ position: 'relative' }}>
                    {/* Vertical line */}
                    <div style={{ position: 'absolute', left: 23, top: 24, bottom: 24, width: 2, background: 'linear-gradient(to bottom, rgba(98,33,40,0.25), rgba(98,33,40,0.05))', borderRadius: 2 }} />

                    {STEPS.map((step, i) => (
                        <div key={step.number} style={{ display: 'flex', gap: 20, marginBottom: i < STEPS.length - 1 ? 36 : 0, position: 'relative' }}>
                            {/* Number dot */}
                            <div style={{ flexShrink: 0, width: 48, height: 48, borderRadius: '50%', background: MAROON, display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 800, color: '#fff', boxShadow: '0 6px 18px rgba(98,33,40,0.25)', zIndex: 1 }}>
                                {step.emoji}
                            </div>
                            {/* Content */}
                            <div style={{ flex: 1, paddingTop: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: MAROON, letterSpacing: '0.12em' }}>LANGKAH {step.number}</span>
                                </div>
                                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: TEXT }}>{step.title}</h3>
                                <p style={{ margin: '0 0 14px', fontSize: 13, color: TEXT_SEC, opacity: 0.65, lineHeight: 1.55 }}>{step.desc}</p>
                                
                                {/* Step Screenshot Preview Card */}
                                {step.img && (
                                    <div style={{
                                        borderRadius: 16, overflow: 'hidden',
                                        border: '1px solid rgba(98,33,40,0.12)',
                                        boxShadow: '0 6px 20px rgba(98,33,40,0.08)',
                                        background: '#fff', maxWidth: 360
                                    }}>
                                        <Image
                                            src={step.img}
                                            alt={step.title}
                                            width={800}
                                            height={1200}
                                            style={{ width: '100%', height: 'auto', display: 'block' }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Metode Pembayaran */}
            <section style={{ maxWidth: 620, margin: '0 auto', padding: '0 20px 36px' }}>
                <h2 style={{ fontSize: 11, fontWeight: 700, color: MAROON, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, paddingLeft: 4 }}>💳 Pilihan Pembayaran</h2>
                <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(98,33,40,0.12)', borderRadius: 18, padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <span style={{ fontSize: 20 }}>📌</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Keep Slot - 6 Jam (Bayar di Studio)</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: TEXT_SEC, opacity: 0.65, lineHeight: 1.55 }}>
                            Slot terkunci aman selama 6 jam. Pembayaran (Cash/QRIS) dilakukan saat tiba di studio. Jika lewat 6 jam tanpa konfirmasi, booking otomatis terhapus.
                        </p>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, rgba(98,33,40,0.08) 0%, rgba(98,33,40,0.03) 100%)', border: '1px solid rgba(98,33,40,0.18)', borderRadius: 18, padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <span style={{ fontSize: 20 }}>💳</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Bayar Sekarang via QRIS Instant</span>
                            <span style={{ fontSize: 9, fontWeight: 800, background: MAROON, color: '#fff', padding: '3px 9px', borderRadius: 999 }}>INSTANT</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: TEXT_SEC, opacity: 0.65, lineHeight: 1.55 }}>
                            Bayar langsung via QRIS dinamis — slot langsung terkonfirmasi 100% aman tanpa batas waktu 6 jam.
                        </p>
                    </div>
                </div>
            </section>

            {/* Tutorial Reschedule */}
            <section style={{ maxWidth: 620, margin: '0 auto', padding: '0 20px 40px' }}>
                <h2 style={{ fontSize: 11, fontWeight: 700, color: MAROON, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, paddingLeft: 4 }}>🔄 Cara Reschedule Jadwal</h2>
                <div style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(98,33,40,0.12)', borderRadius: 20, padding: '22px 20px' }}>
                    <div style={{ display: 'grid', gap: 18 }}>
                        {RESCHEDULE_STEPS.map(rs => (
                            <div key={rs.step} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                                <div style={{
                                    flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                                    background: 'rgba(98,33,40,0.1)', color: MAROON,
                                    fontSize: 12, fontWeight: 800, display: 'grid', placeItems: 'center'
                                }}>
                                    {rs.step}
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 700, color: TEXT }}>{rs.title}</h4>
                                    <p style={{ margin: 0, fontSize: 12, color: TEXT_SEC, opacity: 0.7, lineHeight: 1.5 }}>{rs.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Rules & Info */}
            <section style={{ maxWidth: 620, margin: '0 auto', padding: '0 20px 48px' }}>
                <h2 style={{ fontSize: 11, fontWeight: 700, color: MAROON, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, paddingLeft: 4 }}>📋 Peraturan & Info Penting</h2>
                <div style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(98,33,40,0.1)', borderRadius: 18, overflow: 'hidden' }}>
                    {RULES.map((rule, i) => (
                        <div key={i} style={{ padding: '12px 18px', display: 'flex', gap: 12, alignItems: 'center', borderBottom: i < RULES.length - 1 ? '1px solid rgba(98,33,40,0.06)' : 'none' }}>
                            <span style={{ fontSize: 16, flexShrink: 0 }}>{rule.emoji}</span>
                            <p style={{ margin: 0, fontSize: 12, color: TEXT_SEC, opacity: 0.75, lineHeight: 1.45 }}>{rule.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section style={{ textAlign: 'center', padding: '0 20px 40px', maxWidth: 620, margin: '0 auto' }}>
                <div style={{
                    background: 'linear-gradient(135deg, rgba(98,33,40,0.1) 0%, rgba(98,33,40,0.04) 100%)',
                    border: '1px solid rgba(98,33,40,0.18)', borderRadius: 24, padding: '28px 20px'
                }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, fontFamily: SERIF, fontStyle: 'italic', color: TEXT }}>
                        Udah siap belum foto di Méra? 📸
                    </h3>
                    <p style={{ margin: '0 0 20px', fontSize: 13, color: TEXT_SEC, opacity: 0.7 }}>
                        Pilih jadwal favoritmu dan amankan slot sesi fotomu sekarang!
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <Link href="/booking" style={{ display: 'inline-block', background: MAROON, color: '#fff', fontWeight: 800, fontSize: 14, padding: '14px 32px', borderRadius: 999, textDecoration: 'none', boxShadow: '0 8px 24px rgba(98,33,40,0.28)' }}>
                            Booking Sekarang →
                        </Link>
                        <Link href="/pricelist" style={{ display: 'inline-block', background: 'rgba(255,255,255,0.75)', color: TEXT, fontWeight: 700, fontSize: 14, padding: '14px 24px', borderRadius: 999, textDecoration: 'none', border: '1px solid rgba(98,33,40,0.15)' }}>
                            Lihat Pricelist
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ borderTop: '1px solid rgba(98,33,40,0.08)', padding: '20px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 11, color: TEXT_SEC, opacity: 0.4 }}>© 2026 Méra SelfStudio Mojokerto</p>
            </footer>
        </main>
    )
}
