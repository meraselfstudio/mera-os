import Link from 'next/link'
import Image from 'next/image'
import styles from './LandingPage.module.css'
import PhotoStrip from './PhotoStrip'

type LandingPhoto = {
    src: string
    alt: string
}

type LandingPageProps = {
    photos: LandingPhoto[]
    fontClassName: string
}

const FALLBACK_PHOTOS: LandingPhoto[] = [
    { src: '/photo-basic-mr-1.png', alt: 'Basic studio' },
    { src: '/photo-yearbook-1.png', alt: 'Pas photo' },
    // { src: '/photo-majestic-1.png', alt: 'Majestic studio' },
    // { src: '/photo-elevator-1.png', alt: 'Elevator studio' },
]

export default function LandingPage({ photos, fontClassName }: LandingPageProps) {
    const base = photos.length > 0 ? photos : FALLBACK_PHOTOS

    return (
        <main className={`${styles.landing} ${fontClassName}`}>
            {/* Nav */}
            <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', background: 'hsla(33, 24%, 93%, 0.85)', borderBottom: '1px solid rgba(98, 33, 40, 0.08)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <Link href="/photobooth" style={{ fontSize: 13, color: '#4a3438', textDecoration: 'none', fontWeight: 600, opacity: 0.7 }}>PhoneBooth</Link>
                    <Link href="/pricelist" style={{ fontSize: 13, color: '#4a3438', textDecoration: 'none', fontWeight: 600, opacity: 0.7 }}>Pricelist</Link>
                    <Link href="/cara-booking" style={{ fontSize: 13, color: '#4a3438', textDecoration: 'none', fontWeight: 600, opacity: 0.7 }}>How to Book?</Link>
                </div>
            </nav>

            <div className={styles.heroContent}>
                <Image
                    src="/mera-logo-maroon.png"
                    alt="Mera Self Studio"
                    width={160}
                    height={60}
                    priority
                    className={styles.brand}
                />
                <h1 className={styles.title}>
                    Experience the Fun<br />All by Yourself!
                </h1>
                <p className={styles.tagline}>Finest Self Photo Studio in Town</p>
                <p className={styles.subTagline}>Give You a Space to Be Real You!</p>
                <Link href="/booking" className={styles.cta}>Book Now!</Link>
            </div>

            <div className={styles.stripSection}>
                <PhotoStrip photos={base} />

                {/* Scallop — 12 cubic-bezier semicircles overlapping bottom of photo cards */}
                <svg
                    className={styles.scallop}
                    viewBox="0 0 390 80"
                    preserveAspectRatio="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    style={{ marginTop: '-32px', marginBottom: '20px', position: 'relative' }}
                >
                    <path
                        d="M0,16.25 C0,7.25 7.25,0 16.25,0 C25.25,0 32.5,7.25 32.5,16.25 C32.5,7.25 39.75,0 48.75,0 C57.75,0 65,7.25 65,16.25 C65,7.25 72.25,0 81.25,0 C90.25,0 97.5,7.25 97.5,16.25 C97.5,7.25 104.75,0 113.75,0 C122.75,0 130,7.25 130,16.25 C130,7.25 137.25,0 146.25,0 C155.25,0 162.5,7.25 162.5,16.25 C162.5,7.25 169.75,0 178.75,0 C187.75,0 195,7.25 195,16.25 C195,7.25 202.25,0 211.25,0 C220.25,0 227.5,7.25 227.5,16.25 C227.5,7.25 234.75,0 243.75,0 C252.75,0 260,7.25 260,16.25 C260,7.25 267.25,0 276.25,0 C285.25,0 292.5,7.25 292.5,16.25 C292.5,7.25 299.75,0 308.75,0 C317.75,0 325,7.25 325,16.25 C325,7.25 332.25,0 341.25,0 C350.25,0 357.5,7.25 357.5,16.25 C357.5,7.25 364.75,0 373.75,0 C382.75,0 390,7.25 390,16.25 L390,80 L0,80 Z"
                        fill="#622128"
                    />
                </svg>

                <section className={styles.photoboothSection} style={{ position: 'relative', zIndex: 2, marginTop: '-32px' }}>
                    <h2 className={styles.photoboothHeading}>
                        <Image src="/mera-logo-white.png" alt="Méra" width={100} height={36} className={styles.photoboothLogo} />
                        <span>PhoneBooth</span>
                    </h2>
                            <p className={styles.photoboothTagline}>Turn your selfies into photostrip!</p>

                            <div className={styles.stripShowcase}>
                                <Link href="/photobooth" className={`${styles.stripPreview} ${styles.stripTiltLeft}`}>
                                    <Image src="/mera-photostrips-black.jpg" alt="Black Basic photostrip" width={602} height={1795} className={styles.stripImg} />
                                    <span className={styles.stripLabel}></span>
                                </Link>

                                <Link href="/photobooth" className={`${styles.stripPreview} ${styles.stripTiltCenter}`}>
                                    <Image src="/mera-photostrips-whitejpg.jpg" alt="White Basic photostrip" width={602} height={1795} className={styles.stripImg} />
                                    <span className={styles.stripLabel}></span>
                                </Link>

                                <Link href="/photobooth" className={`${styles.stripPreview} ${styles.stripTiltRight}`}>
                                    <Image src="/mera-photostrips-maroon.jpg" alt="Maroon Basic photostrip" width={602} height={1795} className={styles.stripImg} />
                                    <span className={styles.stripLabel}></span>
                                </Link>
                            </div>

                            <Link href="/photobooth" className={styles.photoboothCta}>Let&apos;s Snap! →</Link>
                        </section>

                        {/* Location section */}
                        <div style={{ width: '100%', maxWidth: 520, margin: '0 auto', marginTop: '8px', marginBottom: '40px', padding: '0 16px', boxSizing: 'border-box' }}>
                            {/* Section header */}
                            <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                <p style={{ margin: 30, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}></p>
                                <h2 style={{ margin: '4px 0 2px', fontFamily: 'Times New Roman Condensed, Times New Roman, Times, serif', fontStyle: 'italic', fontSize: 22, fontWeight: 800, color: '#622128', lineHeight: 1.2 }}>Our Location</h2>
                                <p style={{ margin: 10, fontSize: 10, color: '#622128' }}>Jalan Jayanegara 175A, Kecamatan Puri, Mojokerto</p>
                            </div>

                            {/* Map card */}
                            <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <iframe
                                    title="Méra Self Studio Location"
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3955.805668331364!2d112.4400146!3d-7.486698199999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e780d7da3e1e85d%3A0x6ac2f354ab61a4f4!2sMera%20Selfstudio!5e0!3m2!1sid!2sid!4v1776132096243!5m2!1sid!2sid"
                                    width="100%"
                                    height="240"
                                    style={{ border: 0, display: 'block' }}
                                    allowFullScreen={true}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            </div>

                            {/* OTW button */}
                            <a
                                href="https://www.google.com/maps/dir/?api=1&destination=-7.486698199999999,112.4400146&destination_place_id=0x2e780d7da3e1e85d:0x6ac2f354ab61a4f4"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    marginTop: 12,
                                    padding: '14px 24px',
                                    borderRadius: 26,
                                    background: '#622128',
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: 15,
                                    textDecoration: 'none',
                                    transition: 'opacity 0.15s',
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white"/>
                                </svg>
                                OTW ke Méra
                            </a>
                        </div>

                        <footer style={{ borderTop: '1px solid rgba(98,33,40,0.08)', padding: '24px 20px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: 11, color: '#000000ff', opacity: 0.3 }}>
                                © 2026 Mera Self Studio</p>
                        </footer>
                    </div>
                </main>
            );
}