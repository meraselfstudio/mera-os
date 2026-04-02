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
                <Link href="/booking" className={styles.cta}>Book now!</Link>
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
                        fill="#6f1f2b"
                    />
                </svg>

                <div className={styles.maroonBand} />
            </div>
        </main>
    )
}