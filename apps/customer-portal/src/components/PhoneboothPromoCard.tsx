'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface PhoneboothPromoCardProps {
    title?: string
    subtitle?: string
    className?: string
}

export default function PhoneboothPromoCard({
    title = 'Sambil Nunggu Sesi, Cobain Méra PhoneBooth! 📸',
    subtitle = 'Ubah foto selfie HP kamu jadi photostrip estetik khas Méra secara instan & 100% gratis tanpa download aplikasi.',
    className = '',
}: PhoneboothPromoCardProps) {
    return (
        <section
            className={className}
            style={{
                background: 'linear-gradient(145deg, #3A1016 0%, #622128 55%, #7F2733 100%)',
                borderRadius: 24,
                padding: '26px 20px 22px',
                color: '#fff',
                boxShadow: '0 16px 40px rgba(98, 33, 40, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: 24,
            }}
        >
            {/* Background ambient lighting */}
            <div
                style={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 140,
                    height: 140,
                    background: 'radial-gradient(circle, rgba(255,200,150,0.25) 0%, rgba(255,255,255,0) 70%)',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    bottom: -30,
                    left: -30,
                    width: 120,
                    height: 120,
                    background: 'radial-gradient(circle, rgba(255,100,120,0.2) 0%, rgba(255,255,255,0) 70%)',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                }}
            />

            {/* Top Pill Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.25)', padding: '5px 14px', borderRadius: 999, marginBottom: 14, backdropFilter: 'blur(8px)' }}>
                <span style={{ fontSize: 13 }}>✨</span>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#FFEBEF' }}>
                    FREE EXPERIENCE · SERU-SERUAN DULU
                </span>
            </div>

            {/* Header */}
            <h2
                style={{
                    margin: '0 0 8px',
                    fontSize: 'clamp(1.25rem, 3.5vw, 1.55rem)',
                    fontWeight: 800,
                    fontFamily: 'Times New Roman Condensed, Times New Roman, Times, serif',
                    fontStyle: 'italic',
                    color: '#fff',
                    lineHeight: 1.25,
                    textShadow: '0 2px 8px rgba(0,0,0,0.25)',
                }}
            >
                {title}
            </h2>
            <p
                style={{
                    margin: '0 auto 18px',
                    maxWidth: 420,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: 'rgba(255, 255, 255, 0.85)',
                    fontWeight: 400,
                }}
            >
                {subtitle}
            </p>

            {/* Visual Strip Preview */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    gap: 12,
                    marginBottom: 20,
                    perspective: 600,
                }}
            >
                {/* Black Frame */}
                <Link
                    href="/photobooth"
                    style={{
                        transform: 'rotate(-7deg) translateY(6px)',
                        transition: 'all 0.25s ease',
                        textDecoration: 'none',
                    }}
                >
                    <Image
                        src="/mera-photostrips-black.jpg"
                        alt="Méra PhoneBooth Black Strip"
                        width={602}
                        height={1795}
                        style={{
                            width: 68,
                            height: 'auto',
                            borderRadius: 4,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                            display: 'block',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    />
                    <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginTop: 5 }}>Noir</span>
                </Link>

                {/* White Frame (Center & Raised) */}
                <Link
                    href="/photobooth"
                    style={{
                        transform: 'rotate(0deg) translateY(-6px) scale(1.04)',
                        transition: 'all 0.25s ease',
                        textDecoration: 'none',
                        zIndex: 2,
                    }}
                >
                    <Image
                        src="/mera-photostrips-whitejpg.jpg"
                        alt="Méra PhoneBooth White Strip"
                        width={602}
                        height={1795}
                        style={{
                            width: 74,
                            height: 'auto',
                            borderRadius: 4,
                            boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                            display: 'block',
                            border: '1.5px solid rgba(255,255,255,0.4)',
                        }}
                    />
                    <span style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#fff', marginTop: 5 }}>Classic</span>
                </Link>

                {/* Maroon Frame */}
                <Link
                    href="/photobooth"
                    style={{
                        transform: 'rotate(7deg) translateY(6px)',
                        transition: 'all 0.25s ease',
                        textDecoration: 'none',
                    }}
                >
                    <Image
                        src="/mera-photostrips-maroon.jpg"
                        alt="Méra PhoneBooth Maroon Strip"
                        width={602}
                        height={1795}
                        style={{
                            width: 68,
                            height: 'auto',
                            borderRadius: 4,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                            display: 'block',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    />
                    <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginTop: 5 }}>Maroon</span>
                </Link>
            </div>

            {/* Features list */}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: 6,
                    marginBottom: 18,
                }}
            >
                {[
                    '⚡️ 3 Pose Instan',
                    '🎞️ 3 Pilihan Frame',
                    '✨ Filter B&W / Color',
                    '📲 Auto-Save ke HP',
                ].map((feat, i) => (
                    <span
                        key={i}
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            background: 'rgba(255,255,255,0.12)',
                            color: 'rgba(255,255,255,0.95)',
                            padding: '4px 10px',
                            borderRadius: 999,
                            border: '1px solid rgba(255,255,255,0.15)',
                        }}
                    >
                        {feat}
                    </span>
                ))}
            </div>

            {/* Primary Action Button */}
            <Link
                href="/photobooth"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    maxWidth: 340,
                    padding: '13px 22px',
                    background: '#FFFFFF',
                    color: '#622128',
                    fontWeight: 800,
                    fontSize: 14,
                    borderRadius: 999,
                    textDecoration: 'none',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box',
                }}
            >
                <span>📸 Cobain Méra PhoneBooth Sekarang</span>
                <span style={{ fontSize: 16 }}>→</span>
            </Link>

            <p style={{ margin: '10px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                Gratis sepuasnya tanpa antri · Bisa langsung upload story!
            </p>
        </section>
    )
}
