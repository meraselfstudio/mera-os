'use client'

import React, { useRef } from 'react'
import QRCode from 'react-qr-code'

const CHECKIN_URL = 'https://meraselfstudio.com/checkin'
const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"

export default function QRPrintPage() {
    const qrRef = useRef<HTMLDivElement>(null)

    const handleDownloadSVG = () => {
        const svgEl = qrRef.current?.querySelector('svg')
        if (!svgEl) return
        const clone = svgEl.cloneNode(true) as SVGElement
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
        // Add white background rect
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        rect.setAttribute('width', '100%')
        rect.setAttribute('height', '100%')
        rect.setAttribute('fill', 'white')
        clone.insertBefore(rect, clone.firstChild)

        const svgData = new XMLSerializer().serializeToString(clone)
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'mera-selfstudio-checkin-qr.svg'
        a.click()
        URL.revokeObjectURL(url)
    }

    const handlePrint = () => window.print()

    return (
        <>
            {/* Print-only CSS */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white; }
                    .print-card { box-shadow: none !important; border: 2px solid #ddd !important; }
                }
            `}</style>

            <div style={{
                minHeight: '100dvh',
                background: '#F2F2F7',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 20px',
                fontFamily: FONT,
            }}>
                {/* Header */}
                <div className="no-print" style={{ textAlign: 'center', marginBottom: 32 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1C1C1E', letterSpacing: '-0.03em', margin: 0 }}>
                        QR Code Self Check-in
                    </h1>
                    <p style={{ fontSize: 14, color: '#666', marginTop: 6 }}>
                        Print dan tempel di meja studio.
                    </p>
                </div>

                {/* Printable Card */}
                <div className="print-card" style={{
                    background: '#FFFFFF',
                    borderRadius: 24,
                    padding: '40px 36px',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
                    textAlign: 'center',
                    maxWidth: 360,
                    width: '100%',
                }}>
                    {/* Studio Logo area */}
                    <p style={{ fontSize: 36, marginBottom: 4 }}>📸</p>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1C1C1E', letterSpacing: '-0.02em', margin: '0 0 4px' }}>
                        Méra SelfStudio
                    </h2>
                    <p style={{ fontSize: 13, color: '#888', marginBottom: 28, letterSpacing: '0.02em' }}>
                        Scan untuk Self Check-in
                    </p>

                    {/* QR Code */}
                    <div
                        ref={qrRef}
                        style={{
                            display: 'inline-flex',
                            padding: 16,
                            background: '#FFFFFF',
                            borderRadius: 16,
                            border: '2px solid #E5E5EA',
                        }}
                    >
                        <QRCode value={CHECKIN_URL} size={220} fgColor="#1C1C1E" bgColor="#FFFFFF" />
                    </div>

                    <p style={{ fontSize: 11, color: '#999', marginTop: 20, lineHeight: 1.6 }}>
                        Atau buka manual:<br />
                        <strong style={{ color: '#1C1C1E', fontFamily: 'monospace', fontSize: 12 }}>
                            meraselfstudio.com/checkin
                        </strong>
                    </p>

                    {/* Dashed divider */}
                    <div style={{ margin: '20px 0', borderTop: '2px dashed #E5E5EA' }} />

                    <p style={{ fontSize: 12, color: '#AAA', lineHeight: 1.5 }}>
                        Setelah scan, masukkan <strong style={{ color: '#555' }}>Booking ID</strong> dari tiket konfirmasimu untuk check-in otomatis.
                    </p>
                </div>

                {/* Action buttons */}
                <div className="no-print" style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                    <button
                        onClick={handleDownloadSVG}
                        style={{
                            padding: '12px 24px', fontSize: 14, fontWeight: 700,
                            background: '#1C1C1E', color: '#FFF', border: 'none',
                            borderRadius: 12, cursor: 'pointer', letterSpacing: '-0.01em',
                        }}
                    >
                        ↓ Download SVG
                    </button>
                    <button
                        onClick={handlePrint}
                        style={{
                            padding: '12px 24px', fontSize: 14, fontWeight: 700,
                            background: '#E5E5EA', color: '#1C1C1E', border: 'none',
                            borderRadius: 12, cursor: 'pointer', letterSpacing: '-0.01em',
                        }}
                    >
                        🖨️ Print
                    </button>
                </div>

                <p className="no-print" style={{ fontSize: 12, color: '#999', marginTop: 16, textAlign: 'center' }}>
                    QR ini mengarah ke: <code style={{ color: '#555' }}>{CHECKIN_URL}</code>
                </p>
            </div>
        </>
    )
}
