'use client'

/**
 * CRITICAL RULE 2 — Free Photobooth
 *
 * This component runs 100% CLIENT-SIDE using Canvas API.
 * ✅ getUserMedia() — camera access
 * ✅ Canvas API — B&W filter + 4-shot collage
 * ✅ Blob URL download — save to device
 * ❌ ZERO Supabase calls
 * ❌ ZERO uploads to any cloud storage
 * ❌ ZERO network requests during capture/download
 */

import React, { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Filter = 'bw' | 'warm' | 'none'
type AppState = 'idle' | 'camera' | 'countdown' | 'capturing' | 'preview'

const PHOTO_COUNT = 4
const STRIP_W = 400
const STRIP_H = 1200
const PHOTO_H = STRIP_H / PHOTO_COUNT - 10

export default function PhotoboothPage() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const stripRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    const [appState, setAppState] = useState<AppState>('idle')
    const [filter, setFilter] = useState<Filter>('bw')
    const [photos, setPhotos] = useState<string[]>([])
    const [countdown, setCountdown] = useState(0)
    const [currentShot, setCurrentShot] = useState(0)
    const [stripUrl, setStripUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // ── Start camera ────────────────────────────────────────────
    const startCamera = useCallback(async () => {
        setError(null)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
            }
            setAppState('camera')
        } catch (err) {
            setError('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.')
            console.error('[Photobooth] Camera error:', err)
        }
    }, [])

    // ── Stop camera ─────────────────────────────────────────────
    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
    }, [])

    useEffect(() => () => stopCamera(), [stopCamera])

    // ── Capture single frame ────────────────────────────────────
    const captureFrame = useCallback((): string | null => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas) return null

        const ctx = canvas.getContext('2d')
        if (!ctx) return null

        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480

        // Mirror + draw
        ctx.save()
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(video, 0, 0)
        ctx.restore()

        // Apply B&W filter via ImageData
        if (filter === 'bw') {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imgData.data
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
                data[i] = data[i + 1] = data[i + 2] = gray
            }
            ctx.putImageData(imgData, 0, 0)
        } else if (filter === 'warm') {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imgData.data
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] + 20)      // R+
                data[i + 2] = Math.max(0, data[i + 2] - 15)  // B-
            }
            ctx.putImageData(imgData, 0, 0)
        }

        return canvas.toDataURL('image/jpeg', 0.92)
    }, [filter])

    // ── Auto-capture sequence ────────────────────────────────────
    const startCapture = useCallback(async () => {
        const captured: string[] = []
        setPhotos([])
        setCurrentShot(0)
        setAppState('countdown')

        for (let i = 0; i < PHOTO_COUNT; i++) {
            setCurrentShot(i + 1)

            // Countdown 3-2-1
            for (let c = 3; c >= 1; c--) {
                setCountdown(c)
                await sleep(1000)
            }
            setCountdown(0)
            setAppState('capturing')

            // Capture
            const dataUrl = captureFrame()
            if (dataUrl) {
                captured.push(dataUrl)
                setPhotos([...captured])
            }

            await sleep(600)
            if (i < PHOTO_COUNT - 1) setAppState('countdown')
        }

        // Build collage strip on canvas (all client-side)
        // eslint-disable-next-line react-hooks/exhaustive-deps
        await buildStrip(captured)
        setAppState('preview')
    }, [captureFrame]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Build vertical photo strip ──────────────────────────────
    // CRITICAL RULE 2: All processing stays in browser memory — no uploads
    const buildStrip = useCallback(async (dataUrls: string[]) => {
        const canvas = stripRef.current
        if (!canvas) return

        canvas.width = STRIP_W
        canvas.height = STRIP_H

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Canvas background based on dark mode aesthetics (or white for the picture itself)
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, STRIP_W, STRIP_H)

        // Load and draw each photo
        const loadImg = (src: string) => new Promise<HTMLImageElement>((res) => {
            const img = new Image()
            img.onload = () => res(img)
            img.src = src
        })

        // Layout: top strip (50px) + 4 photos + bottom strip (50px)
        const topPad = 52  // reserved for top branding strip in frame
        const bottomPad = 52  // reserved for bottom branding strip in frame
        const innerH = STRIP_H - topPad - bottomPad
        const slotH = Math.floor(innerH / PHOTO_COUNT) - 2
        const sidePad = 14

        for (let i = 0; i < dataUrls.length; i++) {
            const img = await loadImg(dataUrls[i])
            const yStart = topPad + i * (slotH + 2) + 1

            // Scale-fit photo into strip slot
            const scale = Math.min(
                (STRIP_W - sidePad * 2) / img.naturalWidth,
                slotH / img.naturalHeight
            )
            const destW = img.naturalWidth * scale
            const destH = img.naturalHeight * scale
            const x = (STRIP_W - destW) / 2

            ctx.drawImage(img, x, yStart + (slotH - destH) / 2, destW, destH)
        }

        // ── Overlay photobooth-frame.svg (CRITICAL RULE 2 compliant)
        // Frame loads from /public — same origin, no external request.
        // Drawn on canvas in browser memory only. No upload.
        try {
            const frame = await loadImg('/photobooth-frame.svg')
            ctx.drawImage(frame, 0, 0, STRIP_W, STRIP_H)
        } catch {
            // Frame load failed — fall back to minimal text watermark
            ctx.fillStyle = '#1D1D1F'
            ctx.font = 'bold 16px Inter, -apple-system, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('méra self studio', STRIP_W / 2, STRIP_H - 16)
        }

        setStripUrl(canvas.toDataURL('image/png'))
    }, [])

    // ── Download (blob URL — no upload) ─────────────────────────
    const downloadStrip = useCallback(() => {
        if (!stripUrl) return
        const a = document.createElement('a')
        a.href = stripUrl
        a.download = `mera-photobooth-${Date.now()}.png`
        a.click()
        // NOTE: No Supabase, no network. File stays on user device only.
    }, [stripUrl])

    const reset = () => {
        stopCamera()
        setPhotos([])
        setStripUrl(null)
        setAppState('idle')
        setCurrentShot(0)
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--mera-bg)', padding: '24px 16px' }}>
            <div style={{ maxWidth: 520, margin: '0 auto' }}>

                {/* Header */}
                <div style={{ marginBottom: 24 }}>
                    <Link href="/" style={{ fontSize: 'var(--mera-step-0)', color: 'var(--mera-text-secondary)', fontWeight: 600, letterSpacing: 'var(--mera-track-soft)' }}>← Home</Link>
                </div>
                <h1 style={{ fontSize: 'var(--mera-step-3)', fontWeight: 700, letterSpacing: 'var(--mera-track-tight)', marginBottom: 4 }}>Free Photobooth 📸</h1>
                <p style={{ fontSize: 'var(--mera-step-0)', color: 'var(--mera-text-secondary)', letterSpacing: 'var(--mera-track-soft)', marginBottom: 24 }}>
                    4 foto otomatis · filter · kolase · gratis · tanpa upload
                </p>

                {/* Privacy disclaimer */}
                <div style={{
                    background: 'var(--mera-info-bg)', border: '1px solid var(--mera-info-border)', borderRadius: 'var(--mera-radius-md)',
                    padding: '12px 14px', marginBottom: 24, fontSize: 'var(--mera-step--1)', letterSpacing: 'var(--mera-track-soft)', color: 'var(--mera-info)',
                }}>
                    🔒 <strong>100% Privat.</strong> Foto kamu tidak pernah dikirim ke server manapun. Semua pemrosesan dilakukan langsung di browser kamu.
                </div>

                {error && (
                    <div style={{ background: 'var(--mera-error-bg)', border: '1px solid var(--mera-error-border)', borderRadius: 'var(--mera-radius-md)', padding: '12px 14px', marginBottom: 16, fontSize: 'var(--mera-step-0)', letterSpacing: 'var(--mera-track-soft)', color: 'var(--mera-error)' }}>
                        {error}
                    </div>
                )}

                {/* ── State: Idle ─────────────────────────────────── */}
                {appState === 'idle' && (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                            <div style={{ fontSize: 'var(--mera-step-5)', marginBottom: 24 }}>📷</div>
                        <button
                            onClick={startCamera}
                            style={{
                                padding: '14px 40px', background: 'var(--mera-accent)', color: '#fff',
                                border: 'none', borderRadius: 'var(--mera-radius-md)', fontWeight: 700,
                                fontSize: 'var(--mera-step-1)', letterSpacing: 'var(--mera-track-soft)', cursor: 'pointer', boxShadow: 'var(--mera-shadow-md)',
                            }}
                        >
                            Mulai Photobooth
                        </button>
                    </div>
                )}

                {/* ── State: Camera / Countdown ───────────────────── */}
                {(appState === 'camera' || appState === 'countdown' || appState === 'capturing') && (
                    <div>
                        {/* Filter selector */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                            {(['bw', 'warm', 'none'] as Filter[]).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    style={{
                                        padding: '6px 16px', borderRadius: 'var(--mera-radius-full)', fontSize: 'var(--mera-step--1)', fontWeight: 500, letterSpacing: 'var(--mera-track-soft)', border: '1px solid',
                                        borderColor: filter === f ? 'var(--mera-accent)' : 'var(--mera-border)',
                                        background: filter === f ? 'var(--mera-accent)' : 'transparent',
                                        color: filter === f ? '#fff' : 'var(--mera-text-secondary)', cursor: 'pointer',
                                    }}
                                >
                                    {f === 'bw' ? '⬛ B&W' : f === 'warm' ? '🌅 Warm' : '🌈 Normal'}
                                </button>
                            ))}
                        </div>

                        {/* Viewfinder */}
                        <div style={{ position: 'relative', borderRadius: 'var(--mera-radius-lg)', overflow: 'hidden', background: '#000', marginBottom: 16 }}>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{ width: '100%', display: 'block', transform: 'scaleX(-1)', filter: filter === 'bw' ? 'grayscale(100%)' : filter === 'warm' ? 'sepia(30%)' : 'none' }}
                            />

                            {/* Countdown overlay */}
                            {appState === 'countdown' && countdown > 0 && (
                                <div style={{
                                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(0,0,0,0.4)',
                                }}>
                                    <div style={{ fontSize: 'var(--mera-step-5)', fontWeight: 900, color: '#fff', lineHeight: 1, animation: 'fade-in-up 0.5s both' }}>
                                        {countdown}
                                    </div>
                                    <p style={{ color: '#fff', fontSize: 'var(--mera-step-0)', letterSpacing: 'var(--mera-track-soft)', marginTop: 8 }}>Foto {currentShot} dari {PHOTO_COUNT}</p>
                                </div>
                            )}

                            {/* Flash overlay */}
                            {appState === 'capturing' && (
                                <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: 0.8, animation: 'fade-out 0.4s both' }} />
                            )}
                        </div>

                        {/* Photo thumbnails */}
                        {photos.length > 0 && (
                            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                {Array.from({ length: PHOTO_COUNT }).map((_, i) => (
                                    <div key={i} style={{
                                        position: 'relative', width: '100%', aspectRatio: '4/3',
                                        overflow: 'hidden', background: '#000', border: '1px solid var(--mera-border)',
                                        borderRadius: 'var(--mera-radius-md)'
                                    }}>
                                        {photos[i] && <img src={photos[i]} alt={`Frame ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                    </div>
                                ))}
                            </div>
                        )}

                        {appState === 'camera' && (
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    onClick={startCapture}
                                    style={{
                                        flex: 1, padding: '13px', background: 'var(--mera-accent)', color: '#fff',
                                        border: 'none', borderRadius: 'var(--mera-radius-md)', fontWeight: 700,
                                        fontSize: 'var(--mera-step-1)', letterSpacing: 'var(--mera-track-soft)', cursor: 'pointer',
                                    }}
                                >
                                    📸 Mulai Ambil {PHOTO_COUNT} Foto
                                </button>
                                <button onClick={reset} style={{ padding: '13px 16px', border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-md)', background: 'var(--mera-surface)', cursor: 'pointer', fontSize: 'var(--mera-step-1)', letterSpacing: 'var(--mera-track-soft)' }}>
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── State: Preview ──────────────────────────────── */}
                {appState === 'preview' && stripUrl && (
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 'var(--mera-step-0)', color: 'var(--mera-text-secondary)', letterSpacing: 'var(--mera-track-soft)', marginBottom: 16 }}>Kolase siap! 🎉</p>
                        <img
                            src={stripUrl}
                            alt="Photo strip"
                            style={{ width: '60%', maxWidth: 240, borderRadius: 'var(--mera-radius-md)', boxShadow: 'var(--mera-shadow-lg)', marginBottom: 24, border: '1px solid var(--mera-border)' }}
                        />
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                onClick={downloadStrip}
                                style={{
                                    padding: '12px 28px', background: 'var(--mera-accent)', color: '#fff',
                                    border: 'none', borderRadius: 'var(--mera-radius-md)', fontWeight: 600, fontSize: 'var(--mera-step-0)', letterSpacing: 'var(--mera-track-soft)', cursor: 'pointer',
                                }}
                            >
                                ⬇ Download Foto
                            </button>
                            <button
                                onClick={reset}
                                style={{
                                    padding: '12px 20px', background: 'var(--mera-surface)', color: 'var(--mera-text-secondary)',
                                    border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-md)', fontWeight: 500, fontSize: 'var(--mera-step-0)', letterSpacing: 'var(--mera-track-soft)', cursor: 'pointer',
                                }}
                            >
                                Ulangi
                            </button>
                        </div>

                        {/* Booking CTA */}
                        <div style={{ marginTop: 32, padding: 20, background: 'var(--mera-surface)', borderRadius: 'var(--mera-radius-lg)', border: '1px solid var(--mera-border)' }}>
                            <p style={{ fontSize: 'var(--mera-step-0)', fontWeight: 600, letterSpacing: 'var(--mera-track-soft)', marginBottom: 8 }}>Suka hasilnya? Rasakan pengalaman penuh di studio kami!</p>
                            <a
                                href="/booking"
                                style={{
                                    display: 'inline-block', padding: '10px 24px', fontSize: 'var(--mera-step-0)', fontWeight: 600, letterSpacing: 'var(--mera-track-soft)',
                                    background: 'var(--mera-accent)', color: '#fff', borderRadius: 'var(--mera-radius-md)',
                                }}
                            >
                                Booking Session Studio →
                            </a>
                        </div>
                    </div>
                )}

                {/* Hidden canvases */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <canvas ref={stripRef} style={{ display: 'none' }} />
            </div>

            <style>{`
        @keyframes fade-out { from { opacity: 0.8 } to { opacity: 0 } }
        @keyframes fade-in-up { from { opacity: 0; transform: scale(0.5) } to { opacity: 1; transform: scale(1) } }
      `}</style>
        </div>
    )
}

// ── Helpers ───────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms))
