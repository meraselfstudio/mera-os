'use client'

import Image from 'next/image'
import styles from './LandingPage.module.css'

type Photo = { src: string; alt: string }

export default function PhotoStrip({ photos }: { photos: Photo[] }) {
    if (!photos || photos.length === 0) return null

    const doubled = [...photos, ...photos]
    const ROTATIONS = [-4, 3, -6, 2, 5, -3, 4, -5];

    return (
        <div className={styles.photoRow}>
            <div className={styles.photoTrack}>
                {doubled.map((photo, index) => {
                    const rot = ROTATIONS[index % ROTATIONS.length];
                    return (
                        <div
                            key={`${photo.src}-${index}`}
                            className={styles.photoItem}
                            style={{
                                transform: `rotate(${rot}deg)`,
                                transition: 'transform 0.3s ease',
                                transformOrigin: 'center'
                            }}
                        >
                            <Image
                                src={photo.src}
                                alt={photo.alt}
                                width={130}
                                height={175}
                                sizes="(max-width: 768px) 33vw, 156px"
                                className={styles.photoImage}
                                style={{ borderRadius: 8 }}
                            />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
