import type { Metadata } from 'next'
import React from 'react'
import './globals.css'


export const metadata: Metadata = {
    metadataBase: new URL('https://meraselfstudio.com'),
    title: {
        default: 'Méra - Mojokerto Self Photo Studio',
        template: '%s | Méra SelfStudio',
    },
    description:
        'Mojokerto Finest Self Photo Studio',
    keywords: ['self studio foto', 'foto studio mojokerto', 'self photo studio', 'booking foto', 'méra studio'],
    icons: {
        icon: [
            { url: '/mera-logo-icon.webp', type: 'image/webp' },
            { url: '/mera-logo-icon.webp', sizes: '32x32', type: 'image/webp' },
        ],
        apple: '/mera-logo-icon.webp',
    },
    openGraph: {
        type: 'website',
        locale: 'id_ID',
        url: 'https://meraselfstudio.com',
        siteName: 'Méra SelfStudio',
        title: 'Méra SelfStudio — Mojokerto Finest Self Photo Studio',
        description: 'Méra SelfStudio. Self photo studio Mojokerto.',
        images: [{ url: '/logo-mera-white.png', width: 800, height: 600, alt: 'Méra SelfStudio Logo' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Méra SelfStudio',
        description: 'Self photo studio Mojokerto.',
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
