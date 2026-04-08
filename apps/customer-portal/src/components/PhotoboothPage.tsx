'use client'

/**
 * Méra PhoneBooth
 * - Camera capture with B&W / Normal filter
 * - Uses actual frame images (black/white/maroon) with MÉRA logo
 * - Photos placed in frame slots with matching corner radius
 * - Direct download to device
 * - Silent background upload to Google Drive via API route
 */

import React, { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Filter = 'bw' | 'none'
type AppState = 'idle' | 'camera' | 'countdown' | 'capturing' | 'reviewing' | 'preview'
type FrameColor = 'white' | 'black' | 'maroon'

/* ── Frame geometry (matching 602×1795 frame images) ─────────── */
const FRAME_W = 602
const FRAME_H = 1795
const SLOT_X = 44
const SLOT_Y_START = 44
const SLOT_W = 514
const SLOT_H = 486
const SLOT_GAP = 45
const SLOT_RADIUS = 24
const PHOTO_COUNT = 3
const BLEED = 14
const ASPECT = SLOT_W / SLOT_H

const FRAME_IMAGES: Record<FrameColor, string> = {
    white: '/mera-photostrips-whitejpg.jpg',
    black: '/mera-photostrips-black.jpg',
    maroon: '/mera-photostrips-maroon.jpg',
}

const FRAME_LABELS: Record<FrameColor, { label: string; bg: string; text: string }> = {
    white: { label: 'White', bg: '#FFFFFF', text: '#333' },
    black: { label: 'Black', bg: '#1A1A1A', text: '#fff' },
    maroon: { label: 'Maroon', bg: '#622128', text: '#fff' },
}

/* ── Customer-portal palette ─────────────────────────────────── */
const BG = 'hsl(33, 24%, 93%)'
const SURFACE = 'rgba(255,255,255,0.6)'
const MAROON = '#622128'
const TEXT = '#2e1b1f'
const TEXT_SUB = '#4a3438'
const BORDER = 'rgba(98,33,40,0.1)'
const BORDER_STRONG = 'rgba(98,33,40,0.2)'
const SHADOW = '0 4px 16px rgba(98,33,40,0.12)'
const RADIUS = 14
const RADIUS_FULL = 999

/** Draw a rounded rectangle path */
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
}

export default function PhotoboothPage() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const stripRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    const [appState, setAppState] = useState<AppState>('idle')
    const [filter, setFilter] = useState<Filter>('bw')
    const [mirrored, setMirrored] = useState(true)
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
    const [photos, setPhotos] = useState<string[]>([])
    const [countdown, setCountdown] = useState(0)
    const [currentShot, setCurrentShot] = useState(0)
    const [showFlash, setShowFlash] = useState(false)
    const [stripUrl, setStripUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Frame selection
    const [selectedFrame, setSelectedFrame] = useState<FrameColor>('white')
    const [promoConsent, setPromoConsent] = useState(false)

    // ── Assign camera stream after video element renders ────────
    useEffect(() => {
        const video = videoRef.current
        const stream = streamRef.current
        if (video && stream && ['camera', 'countdown', 'capturing'].includes(appState) && !video.srcObject) {
            video.srcObject = stream
            video.play().catch(() => { })
        }
    }, [appState])

    // ── Start camera ────────────────────────────────────────────
    const startCamera = useCallback(async (facing?: 'user' | 'environment') => {
        setError(null)
        const mode = facing ?? facingMode
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            })
            // Stop any existing stream first
            streamRef.current?.getTracks().forEach(t => t.stop())
            streamRef.current = stream
            const video = videoRef.current
            if (video) { video.srcObject = stream; video.play().catch(() => { }) }
            setAppState('camera')
        } catch {
            setError('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.')
        }
    }, [facingMode])

    // ── Switch camera ───────────────────────────────────────────
    const switchCamera = useCallback(() => {
        const newMode = facingMode === 'user' ? 'environment' : 'user'
        setFacingMode(newMode)
        setMirrored(newMode === 'user')
        if (appState === 'camera') startCamera(newMode)
    }, [facingMode, appState, startCamera])

    // ── Stop camera ─────────────────────────────────────────────
    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
    }, [])

    useEffect(() => () => stopCamera(), [stopCamera])

    // ── Capture single frame (cropped to strip slot aspect) ─────
    const captureFrame = useCallback((): string | null => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas) return null

        const ctx = canvas.getContext('2d')
        if (!ctx) return null

        const vw = video.videoWidth || 640
        const vh = video.videoHeight || 480

        // Crop centre to match strip slot aspect ratio
        let srcW = vw, srcH = vw / ASPECT, srcX = 0, srcY = (vh - vw / ASPECT) / 2
        if (srcH > vh) { srcH = vh; srcW = vh * ASPECT; srcX = (vw - srcW) / 2; srcY = 0 }

        canvas.width = SLOT_W
        canvas.height = SLOT_H

        ctx.save()
        if (mirrored) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1) }
        ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, SLOT_W, SLOT_H)
        ctx.restore()

        if (filter === 'bw') {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const d = imgData.data
            for (let i = 0; i < d.length; i += 4) {
                const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
                d[i] = d[i + 1] = d[i + 2] = g
            }
            ctx.putImageData(imgData, 0, 0)
        }

        return canvas.toDataURL('image/jpeg', 0.92)
    }, [filter, mirrored])

    // ── Countdown beep ──────────────────────────────────────────
    const playBeep = useCallback((freq = 880, ms = 120) => {
        try {
            const ac = new AudioContext()
            const osc = ac.createOscillator()
            const gain = ac.createGain()
            osc.frequency.value = freq; osc.type = 'sine'; gain.gain.value = 0.15
            osc.connect(gain).connect(ac.destination)
            osc.start(); osc.stop(ac.currentTime + ms / 1000)
        } catch { /* silent */ }
    }, [])

    // ── Auto-capture with 2s review between shots ───────────────
    const startCapture = useCallback(async () => {
        const captured: string[] = []
        setPhotos([])
        setCurrentShot(0)
        setAppState('countdown')

        for (let i = 0; i < PHOTO_COUNT; i++) {
            setCurrentShot(i + 1)

            // 3-2-1 countdown
            for (let c = 3; c >= 1; c--) {
                setCountdown(c)
                playBeep(c === 1 ? 1200 : 880, c === 1 ? 200 : 100)
                await sleep(1000)
            }
            setCountdown(0)

            // Full-screen white flash — acts as light for better photo
            setShowFlash(true)
            await sleep(300) // let screen go fully white before capture

            setAppState('capturing')
            playBeep(1600, 80)

            const dataUrl = captureFrame()
            if (dataUrl) {
                captured.push(dataUrl)
                setPhotos([...captured])
            }

            // Hold flash briefly then fade out
            await sleep(200)
            setShowFlash(false)

            // 2 second review before next shot
            if (i < PHOTO_COUNT - 1) {
                setAppState('reviewing')
                await sleep(2000)
                setAppState('countdown')
            }
        }

        stopCamera()
        setAppState('preview')
    }, [captureFrame, playBeep, stopCamera])

    // ── Build strip using actual frame image ────────────────────
    const buildStrip = useCallback(async (dataUrls: string[], frame: FrameColor) => {
        const canvas = stripRef.current
        if (!canvas) return null

        canvas.width = FRAME_W
        canvas.height = FRAME_H
        const ctx = canvas.getContext('2d')
        if (!ctx) return null

        const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
            const img = new window.Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => res(img)
            img.onerror = rej
            img.src = src
        })

        // 1. Draw frame image first (background + borders + logo)
        const frameImg = await loadImg(FRAME_IMAGES[frame])
        ctx.drawImage(frameImg, 0, 0, FRAME_W, FRAME_H)

        // 2. Draw photos ON TOP, clipped to rounded-rect slots (covers the grey placeholders)
        for (let i = 0; i < dataUrls.length; i++) {
            const img = await loadImg(dataUrls[i])
            const slotX = SLOT_X - BLEED
            const slotY = SLOT_Y_START + i * (SLOT_H + SLOT_GAP) - BLEED
            const slotW = SLOT_W + BLEED * 2
            const slotH = SLOT_H + BLEED * 2

            ctx.save()
            roundedRect(ctx, slotX, slotY, slotW, slotH, SLOT_RADIUS + BLEED)
            ctx.clip()

            // Cover-fill the slot
            const scale = Math.max(slotW / img.naturalWidth, slotH / img.naturalHeight)
            const dw = img.naturalWidth * scale
            const dh = img.naturalHeight * scale
            const dx = slotX + (slotW - dw) / 2
            const dy = slotY + (slotH - dh) / 2
            ctx.drawImage(img, dx, dy, dw, dh)

            ctx.restore()
        }

        return canvas.toDataURL('image/png')
    }, [])

    // Rebuild strip when frame changes
    useEffect(() => {
        if (appState === 'preview' && photos.length === PHOTO_COUNT) {
            buildStrip(photos, selectedFrame).then(url => {
                if (url) setStripUrl(url)
            })
        }
    }, [selectedFrame, appState, photos, buildStrip])

    // ── Silent background upload via server-side proxy → Google Drive ──
    const uploadBackground = useCallback((dataUrl: string, consent: boolean) => {
        const base64 = dataUrl.split(',')[1]
        if (!base64) return

        fetch('/api/upload-strip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileName: `mera-phonebooth-${Date.now()}.png`,
                mimeType: 'image/png',
                data: base64,
                folder: 'phonebooth',
                promoConsent: consent,
            }),
        })
            .then(r => r.json())
            .then(d => console.log('[PhoneBooth] Upload result:', d))
            .catch(err => console.warn('[PhoneBooth] Upload failed:', err))
    }, [])

    // ── Handle download (native share → Save to Photos on mobile) ──
    const handleDownload = useCallback(async () => {
        if (!stripUrl) return

        const filename = `mera-phonebooth-${Date.now()}.png`

        // Convert data URL to File for share API
        const res = await fetch(stripUrl)
        const blob = await res.blob()
        const file = new File([blob], filename, { type: 'image/png' })

        // Use Web Share API if available (mobile → "Save to Photos")
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
            try {
                await navigator.share({ files: [file] })
            } catch {
                // User cancelled share — ignore
            }
        } else {
            // Fallback for desktop: normal download
            const a = document.createElement('a')
            a.href = stripUrl
            a.download = filename
            a.click()
        }

        // Silent background upload to studio's Drive
        uploadBackground(stripUrl, promoConsent)
    }, [stripUrl, uploadBackground, promoConsent])

    const retake = useCallback(() => {
        setPhotos([])
        setStripUrl(null)
        setPromoConsent(false)
        startCamera()
    }, [startCamera])

    const reset = () => {
        stopCamera()
        setPhotos([])
        setStripUrl(null)
        setAppState('idle')
        setCurrentShot(0)
        setPromoConsent(false)
    }

    return (
        <div style={{ minHeight: '100dvh', background: BG }}>
            {/* ── Nav ──────────────────────────────────────── */}
            <nav style={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', background: 'hsla(33, 24%, 93%, 0.85)', borderBottom: '1px solid ' + BORDER, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                    <Image src="/mera-logo-maroon.png" alt="Méra" width={80} height={28} style={{ height: 20, width: 'auto' }} />
                </Link>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <Link href="/pricelist" style={{ fontSize: 13, color: TEXT_SUB, textDecoration: 'none', fontWeight: 600, opacity: 0.7 }}>Pricelist</Link>
                    <Link href="/booking" style={{ fontSize: 13, color: TEXT_SUB, textDecoration: 'none', fontWeight: 600, opacity: 0.7 }}>Book</Link>
                </div>
            </nav>

            <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 20px 48px' }}>

                {/* ── Header ──────────────────────────────── */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <h1 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', fontWeight: 700, letterSpacing: '-0.02em', color: TEXT, margin: '0 0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Image src="/mera-logo-maroon.png" alt="Méra" width={100} height={36} style={{ height: 28, width: 'auto' }} />
                        <span>PhoneBooth</span>
                    </h1>
                    <p style={{ fontSize: 14, color: TEXT_SUB, opacity: 0.8, fontStyle: 'italic', fontFamily: "'Times New Roman', Times, serif", margin: 0 }}>
                        Turn your selfies into photostrip!
                    </p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.2)', borderRadius: RADIUS, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#9c3030' }}>
                        {error}
                    </div>
                )}

                {/* ── State: Idle ─────────────────────────── */}
                {appState === 'idle' && (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 28, opacity: 0.5 }}>
                            <Image src="/mera-photostrips-black.jpg" alt="" width={602} height={1795} style={{ width: 52, height: 'auto', borderRadius: 3, transform: 'rotate(-4deg)' }} />
                            <Image src="/mera-photostrips-whitejpg.jpg" alt="" width={602} height={1795} style={{ width: 52, height: 'auto', borderRadius: 3, transform: 'translateY(-4px)' }} />
                            <Image src="/mera-photostrips-maroon.jpg" alt="" width={602} height={1795} style={{ width: 52, height: 'auto', borderRadius: 3, transform: 'rotate(3deg)' }} />
                        </div>
                        <button onClick={() => startCamera()} style={{ padding: '14px 44px', background: MAROON, color: '#fff', border: 'none', borderRadius: RADIUS_FULL, fontWeight: 700, fontSize: 16, letterSpacing: '0.02em', cursor: 'pointer', boxShadow: '0 10px 28px rgba(98,33,40,0.35)' }}>
                            Start Snap!
                        </button>
                        <p style={{ fontSize: 12, color: TEXT_SUB, opacity: 0.5, marginTop: 12 }}>
                            Experience the Fun!
                        </p>
                    </div>
                )}

                {/* ── State: Camera / Countdown / Capturing / Reviewing ── */}
                {(appState === 'camera' || appState === 'countdown' || appState === 'capturing' || appState === 'reviewing') && (
                    <div>
                        {/* Filter + Mirror */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center' }}>
                            {(['bw', 'none'] as Filter[]).map(f => (
                                <button key={f} onClick={() => setFilter(f)} style={{
                                    padding: '7px 18px', borderRadius: RADIUS_FULL, fontSize: 13, fontWeight: 600,
                                    border: '1px solid ' + (filter === f ? MAROON : BORDER),
                                    background: filter === f ? MAROON : SURFACE,
                                    color: filter === f ? '#fff' : TEXT_SUB, cursor: 'pointer',
                                    transition: 'all 150ms ease',
                                }}>
                                    {f === 'bw' ? '⬛ Black & White' : '🌈 Natural'}
                                </button>
                            ))}
                            <button onClick={switchCamera} style={{
                                marginLeft: 'auto', padding: '7px 14px', borderRadius: RADIUS_FULL,
                                fontSize: 13, fontWeight: 600, border: '1px solid ' + BORDER,
                                background: SURFACE, color: TEXT_SUB, cursor: 'pointer',
                            }}>
                                📷 {facingMode === 'user' ? 'Main Camera' : 'Selfie Camera'}
                            </button>
                            <button onClick={() => setMirrored(m => !m)} style={{
                                padding: '7px 14px', borderRadius: RADIUS_FULL,
                                fontSize: 13, fontWeight: 600, border: '1px solid ' + BORDER,
                                background: mirrored ? MAROON : SURFACE,
                                color: mirrored ? '#fff' : TEXT_SUB, cursor: 'pointer',
                            }}>
                                🔄 Mirror Camera
                            </button>
                        </div>

                        {/* Viewfinder — matches strip slot aspect */}
                        <div style={{ position: 'relative', borderRadius: RADIUS, overflow: 'hidden', background: '#000', marginBottom: 14, boxShadow: SHADOW, aspectRatio: String(ASPECT) }}>
                            {/* Show captured photo during 2s review */}
                            {appState === 'reviewing' && photos.length > 0 ? (
                                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                    <img src={photos[photos.length - 1]} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: RADIUS_FULL, padding: '6px 14px', fontSize: 13, fontWeight: 600 }}>
                                        ✓ Photo {photos.length}/{PHOTO_COUNT}
                                    </div>
                                    <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: RADIUS_FULL, padding: '4px 12px', fontSize: 11 }}>
                                        Say Cheese! 📸
                                    </div>
                                </div>
                            ) : (
                                <video ref={videoRef} autoPlay playsInline muted style={{
                                    width: '100%', height: '100%', objectFit: 'cover',
                                    transform: mirrored ? 'scaleX(-1)' : 'none',
                                    filter: filter === 'bw' ? 'grayscale(100%)' : 'none',
                                }} />
                            )}

                            {/* Countdown overlay */}
                            {appState === 'countdown' && countdown > 0 && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                                    <div style={{ fontSize: 72, fontWeight: 900, color: '#fff', lineHeight: 1, animation: 'pb-pop 0.5s both' }}>{countdown}</div>
                                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 8 }}>Foto {currentShot} dari {PHOTO_COUNT}</p>
                                </div>
                            )}

                            {/* Flash (in-frame, for visual feedback) */}
                            {appState === 'capturing' && (
                                <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: 0.8, animation: 'pb-flash 0.4s both' }} />
                            )}
                        </div>

                        {/* Photo thumbnails */}
                        {photos.length > 0 && (
                            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                                {Array.from({ length: PHOTO_COUNT }).map((_, i) => (
                                    <div key={i} style={{
                                        position: 'relative', width: '100%', aspectRatio: String(ASPECT),
                                        overflow: 'hidden', background: 'rgba(0,0,0,0.06)',
                                        border: '2px solid ' + (photos[i] ? (i === photos.length - 1 && appState === 'reviewing' ? MAROON : BORDER) : 'transparent'),
                                        borderRadius: 8, transition: 'border-color 200ms ease',
                                    }}>
                                        {photos[i] ? (
                                            <img src={photos[i]} alt={'Frame ' + (i + 1)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 11, color: TEXT_SUB, opacity: 0.4 }}>{i + 1}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {appState === 'camera' && (
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={startCapture} style={{ flex: 1, padding: '14px', background: MAROON, color: '#fff', border: 'none', borderRadius: RADIUS_FULL, fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 8px 24px rgba(98,33,40,0.3)' }}>
                                    📸 3x Snap!
                                </button>
                                <button onClick={reset} style={{ padding: '14px 18px', border: '1px solid ' + BORDER_STRONG, borderRadius: RADIUS_FULL, background: SURFACE, cursor: 'pointer', fontSize: 15, color: TEXT_SUB }}>
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── State: Preview — frame selection + download ── */}
                {appState === 'preview' && (
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 15, color: TEXT, fontWeight: 600, marginBottom: 16 }}>Pilih warna frame & download! 🎉</p>

                        {/* Frame selector */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
                            {(Object.keys(FRAME_LABELS) as FrameColor[]).map(fc => (
                                <button key={fc} onClick={() => setSelectedFrame(fc)} style={{
                                    padding: '8px 20px', borderRadius: RADIUS_FULL,
                                    border: '2px solid ' + (selectedFrame === fc ? MAROON : 'transparent'),
                                    background: FRAME_LABELS[fc].bg, color: FRAME_LABELS[fc].text,
                                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                                    boxShadow: selectedFrame === fc ? ('0 0 0 2px ' + MAROON) : '0 2px 8px rgba(0,0,0,0.1)',
                                    transition: 'all 150ms ease', minWidth: 80,
                                }}>
                                    {FRAME_LABELS[fc].label}
                                </button>
                            ))}
                        </div>

                        {/* Strip preview */}
                        {stripUrl && (
                            <img src={stripUrl} alt="Photo strip" style={{ width: '55%', maxWidth: 220, borderRadius: 6, boxShadow: '0 12px 40px rgba(98,33,40,0.2)', marginBottom: 24, border: '1px solid ' + BORDER }} />
                        )}

                        {/* Consent + Download */}
                        <div style={{ background: SURFACE, border: '1px solid ' + BORDER_STRONG, borderRadius: 16, padding: '16px 20px', marginBottom: 16, textAlign: 'left' }}>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: TEXT_SUB, lineHeight: 1.5 }}>
                                <input
                                    type="checkbox"
                                    checked={promoConsent}
                                    onChange={e => setPromoConsent(e.target.checked)}
                                    style={{ marginTop: 3, accentColor: MAROON, width: 18, height: 18, flexShrink: 0 }}
                                />
                                <span>
                                    Izinkan foto ini digunakan untuk media promosi Méra (Instagram, website, dll.)
                                </span>
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={handleDownload} style={{
                                padding: '12px 28px', background: MAROON, color: '#fff',
                                border: 'none', borderRadius: RADIUS_FULL, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                                boxShadow: '0 8px 24px rgba(98,33,40,0.3)',
                            }}>
                                ⬇ Download
                            </button>
                            <button onClick={retake} style={{
                                padding: '12px 22px', background: SURFACE, color: TEXT_SUB,
                                border: '1px solid ' + BORDER_STRONG, borderRadius: RADIUS_FULL, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                            }}>
                                🔄 Foto Lagi
                            </button>
                        </div>

                        {/* Booking CTA */}
                        <div style={{ marginTop: 32, padding: '20px 24px', background: SURFACE, borderRadius: 16, border: '1px solid ' + BORDER }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 10 }}>Suka hasilnya? Rasakan pengalaman penuh di studio!</p>
                            <Link href="/booking" style={{ display: 'inline-block', padding: '10px 28px', fontSize: 14, fontWeight: 700, background: MAROON, color: '#fff', borderRadius: RADIUS_FULL, textDecoration: 'none', boxShadow: '0 8px 24px rgba(98,33,40,0.3)' }}>
                                Book Now!
                            </Link>
                        </div>
                    </div>
                )}

                {/* Hidden canvases */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <canvas ref={stripRef} style={{ display: 'none' }} />
            </div>

            {/* Full-screen white flash overlay — maximizes screen brightness as light source */}
            {showFlash && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 99999,
                    background: '#FFFFFF',
                    animation: 'pb-screen-flash 0.6s ease-out both',
                }} />
            )}

            <style>{`
                @keyframes pb-flash { from { opacity: 0.8 } to { opacity: 0 } }
                @keyframes pb-pop { from { opacity: 0; transform: scale(0.5) } to { opacity: 1; transform: scale(1) } }
                @keyframes pb-screen-flash { 0% { opacity: 1 } 60% { opacity: 1 } 100% { opacity: 0 } }
            `}</style>
        </div>
    )
}

const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms))
