import type { Metadata } from 'next'
import React from 'react'
import './globals.css'


export const metadata: Metadata = {
    metadataBase: new URL('https://meraselfstudio.com'),
    title: {
        default: 'Mera Self Studio | Self Photo Studio Mojokerto',
        template: '%s | Méra SelfStudio',
    },
    description:
        'Abadikan momen terbaikmu di Mera Self Studio. Self photo studio dengan fasilitas lengkap, properti estetik, dan hasil cetak berkualitas di Mojokerto.',
    keywords: ['self photo studio mojokerto', 'mera self studio', 'foto studio mojokerto', 'photobox mojokerto', 'studio foto estetik', 'self studio foto', 'booking foto'],
    icons: {
        icon: [
            { url: '/mera-icon-maroon.png', type: 'image/png' },
            { url: '/mera-icon-maroon.png', sizes: '32x32', type: 'image/png' },
        ],
        apple: '/mera-icon-maroon.png',
    },
    openGraph: {
        type: 'website',
        locale: 'id_ID',
        url: 'https://meraselfstudio.com',
        siteName: 'Mera Self Studio',
        title: 'Mera Self Studio | Self Photo Studio Mojokerto',
        description: 'Abadikan momen terbaikmu di Mera Self Studio. Self photo studio dengan fasilitas lengkap dan properti estetik di Mojokerto.',
        images: [{ url: '/mera-logo-maroon.png', width: 800, height: 600, alt: 'Mera Self Studio Logo' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Mera Self Studio | Self Photo Studio Mojokerto',
        description: 'Abadikan momen terbaikmu di Mera Self Studio. Self photo studio dengan fasilitas lengkap dan properti estetik di Mojokerto.',
    },
    robots: { index: true, follow: true },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="id">
            <body style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                margin: 0,
                background: '#000000',
                color: '#FFFFFF',
            }}>
                {children}
            </body>
        </html>
    )
}
