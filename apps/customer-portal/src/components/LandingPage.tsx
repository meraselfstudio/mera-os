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
    { src: '/photo-majestic-1.png', alt: 'Majestic studio' },
    { src: '/photo-elevator-1.png', alt: 'Elevator studio' },
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

                <svg
                    className={styles.scallop}
                    viewBox="0 0 400 64"
                    preserveAspectRatio="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        d="M0,64 L0,44 Q25,4 50,44 Q75,4 100,44 Q125,4 150,44 Q175,4 200,44 Q225,4 250,44 Q275,4 300,44 Q325,4 350,44 Q375,4 400,44 L400,64 Z"
                        fill="#622128"
                    />
                </svg>

                <section className={styles.photoboothSection}>
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

                <footer style={{ borderTop: '1px solid rgba(98,33,40,0.08)', padding: '24px 20px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#000000ff', opacity: 0.3 }}>© 2026 Mera Self Studio</p>
                </footer>
            </div>
        </main>
    )
}   