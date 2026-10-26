'use client'

/**
 * Méra PhoneBooth
 * - Camera capture with WebGL GPU filters & Mac Photo Booth distortion effects
 * - 2 Categories: Filter Warna (Natural, Noir B&W, Warm 90s, Soft Glow, Retro Film, Méra Red)
 *                 Efek Mac (Normal, Bulge, Dent, Twirl, Squeeze, Stretch, Mirror)
 * - Real-time live view, preserved upon capture, preserved in final strip assembly
 * - Filter & Effect selectors also available in Preview Screen when choosing frame colors
 * - Uses actual frame images (white/black/maroon) with MÉRA logo
 * - Direct download to device & silent background upload to Google Drive
 */

import React, { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
    type ColorTone,
    type WarpEffect,
    type PhotoboothEffect,
    PHOTOBOOTH_EFFECTS,
    COLOR_TONES,
    WebGLEffectRenderer,
    applyEffectsToPhoto,
} from '@/lib/photoEffects'

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
const SURFACE = 'rgba(255,255,255,0.7)'
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
    const liveCanvasRef = useRef<HTMLCanvasElement>(null)
    const cropCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const rendererRef = useRef<WebGLEffectRenderer | null>(null)
    const stripRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const animFrameRef = useRef<number | null>(null)
    const uploadedUrlRef = useRef<string | null>(null)

    const [appState, setAppState] = useState<AppState>('idle')
    const [selectedTone, setSelectedTone] = useState<ColorTone>('none')
    const [selectedWarp, setSelectedWarp] = useState<WarpEffect>('normal')
    const [selectedEffectId, setSelectedEffectId] = useState<string>('normal')
    const [effectSlide, setEffectSlide] = useState(0)
    const [mirrored, setMirrored] = useState(true)
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

    // Photos: raw (unfiltered for re-rendering) and filtered (with active tone & warp)
    const [rawPhotos, setRawPhotos] = useState<string[]>([])
    const [photos, setPhotos] = useState<string[]>([])

    const [countdown, setCountdown] = useState(0)
    const [currentShot, setCurrentShot] = useState(0)
    const [showFlash, setShowFlash] = useState(false)
    const [stripUrl, setStripUrl] = useState<string | null>(null)
    const [isReapplying, setIsReapplying] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Frame selection
    const [selectedFrame, setSelectedFrame] = useState<FrameColor>('white')
    const [promoConsent, setPromoConsent] = useState(false)

    // ── Keep latest filter and mirror values in refs for animation loop ──
    const filterStateRef = useRef({ tone: selectedTone, warp: selectedWarp, mirrored })
    useEffect(() => {
        filterStateRef.current = { tone: selectedTone, warp: selectedWarp, mirrored }
    }, [selectedTone, selectedWarp, mirrored])

    // ── Start Camera ────────────────────────────────────────────
    const startCamera = useCallback(async (facing?: 'user' | 'environment') => {
        setError(null)
        const mode = facing ?? facingMode
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            })
            streamRef.current?.getTracks().forEach(t => t.stop())
            streamRef.current = stream

            const video = videoRef.current
            if (video) {
                video.srcObject = stream
                await video.play().catch(() => { })
            }
            setAppState('camera')
        } catch {
            setError('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.')
        }
    }, [facingMode])

    // ── Switch Camera ───────────────────────────────────────────
    const switchCamera = useCallback(() => {
        const newMode = facingMode === 'user' ? 'environment' : 'user'
        setFacingMode(newMode)
        setMirrored(newMode === 'user')
        if (appState === 'camera') startCamera(newMode)
    }, [facingMode, appState, startCamera])

    // ── Stop Camera ─────────────────────────────────────────────
    const stopCamera = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current)
            animFrameRef.current = null
        }
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        if (rendererRef.current) {
            rendererRef.current.destroy()
            rendererRef.current = null
        }
    }, [])

    useEffect(() => () => stopCamera(), [stopCamera])

    // ── Real-time WebGL Live View Render Loop ───────────────────
    useEffect(() => {
        const isCameraActive = ['camera', 'countdown', 'capturing', 'reviewing'].includes(appState)
        if (!isCameraActive) {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current)
                animFrameRef.current = null
            }
            return
        }

        const liveCanvas = liveCanvasRef.current
        const video = videoRef.current
        if (!liveCanvas || !video) return

        liveCanvas.width = SLOT_W
        liveCanvas.height = SLOT_H

        if (!cropCanvasRef.current) {
            const cc = document.createElement('canvas')
            cc.width = SLOT_W
            cc.height = SLOT_H
            cropCanvasRef.current = cc
        }
        const cropCanvas = cropCanvasRef.current
        const cropCtx = cropCanvas.getContext('2d')

        if (!rendererRef.current) {
            rendererRef.current = new WebGLEffectRenderer(liveCanvas)
        }
        const renderer = rendererRef.current

        let active = true

        const renderFrame = () => {
            if (!active) return

            if (video.readyState >= 2 && cropCtx) {
                const vw = video.videoWidth || 640
                const vh = video.videoHeight || 480

                // Center crop to match photostrip slot aspect ratio
                let srcW = vw
                let srcH = vw / ASPECT
                let srcX = 0
                let srcY = (vh - vw / ASPECT) / 2
                if (srcH > vh) {
                    srcH = vh
                    srcW = vh * ASPECT
                    srcX = (vw - srcW) / 2
                    srcY = 0
                }

                cropCtx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, SLOT_W, SLOT_H)

                const { tone, warp, mirrored: isMirror } = filterStateRef.current

                if (renderer && renderer.isReady()) {
                    renderer.render(cropCanvas, {
                        tone,
                        warp,
                        mirrorX: isMirror,
                    })
                } else {
                    // 2D fallback
                    const lCtx = liveCanvas.getContext('2d')
                    if (lCtx) {
                        lCtx.save()
                        if (isMirror) {
                            lCtx.translate(SLOT_W, 0)
                            lCtx.scale(-1, 1)
                        }
                        const toneCss = COLOR_TONES.find(t => t.id === tone)?.css ?? 'none'
                        lCtx.filter = toneCss
                        lCtx.drawImage(cropCanvas, 0, 0, SLOT_W, SLOT_H)
                        lCtx.restore()
                    }
                }
            }

            animFrameRef.current = requestAnimationFrame(renderFrame)
        }

        animFrameRef.current = requestAnimationFrame(renderFrame)

        return () => {
            active = false
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current)
                animFrameRef.current = null
            }
        }
    }, [appState])

    // ── Capture Single Frame (Both Raw & Filtered) ──────────────
    const captureFrame = useCallback((): { raw: string; filtered: string } | null => {
        const liveCanvas = liveCanvasRef.current
        const cropCanvas = cropCanvasRef.current
        if (!liveCanvas || !cropCanvas) return null

        // 1. Filtered data URL straight from live view canvas with active effects
        const filtered = liveCanvas.toDataURL('image/jpeg', 0.95)

        // 2. Raw unwarped frame (mirrored if camera was mirrored)
        const rawCanvas = document.createElement('canvas')
        rawCanvas.width = SLOT_W
        rawCanvas.height = SLOT_H
        const rCtx = rawCanvas.getContext('2d')
        if (rCtx) {
            rCtx.save()
            if (mirrored) {
                rCtx.translate(SLOT_W, 0)
                rCtx.scale(-1, 1)
            }
            rCtx.drawImage(cropCanvas, 0, 0, SLOT_W, SLOT_H)
            rCtx.restore()
        }
        const raw = rawCanvas.toDataURL('image/jpeg', 0.95)

        return { raw, filtered }
    }, [mirrored])

    // ── Countdown beep ──────────────────────────────────────────
    const playBeep = useCallback((freq = 880, ms = 120) => {
        try {
            const ac = new AudioContext()
            const osc = ac.createOscillator()
            const gain = ac.createGain()
            osc.frequency.value = freq
            osc.type = 'sine'
            gain.gain.value = 0.15
            osc.connect(gain).connect(ac.destination)
            osc.start()
            osc.stop(ac.currentTime + ms / 1000)
        } catch { /* silent */ }
    }, [])

    // ── Auto-capture with 2s review between shots ───────────────
    const startCapture = useCallback(async () => {
        const capturedRaw: string[] = []
        const capturedFiltered: string[] = []
        setRawPhotos([])
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

            // Full-screen white flash
            setShowFlash(true)
            await sleep(250)

            setAppState('capturing')
            playBeep(1600, 80)

            const frame = captureFrame()
            if (frame) {
                capturedRaw.push(frame.raw)
                capturedFiltered.push(frame.filtered)
                setRawPhotos([...capturedRaw])
                setPhotos([...capturedFiltered])
            }

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

    // ── Build strip using actual frame image and filtered photos ──
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

        // 1. Draw frame image (background + borders + logo)
        const frameImg = await loadImg(FRAME_IMAGES[frame])
        ctx.drawImage(frameImg, 0, 0, FRAME_W, FRAME_H)

        // 2. Draw filtered photos inside slots with corner radius
        for (let i = 0; i < dataUrls.length; i++) {
            const img = await loadImg(dataUrls[i])
            const slotX = SLOT_X - BLEED
            const slotY = SLOT_Y_START + i * (SLOT_H + SLOT_GAP) - BLEED
            const slotW = SLOT_W + BLEED * 2
            const slotH = SLOT_H + BLEED * 2

            const slotCanvas = document.createElement('canvas')
            slotCanvas.width = slotW
            slotCanvas.height = slotH
            const sCtx = slotCanvas.getContext('2d')
            if (sCtx) {
                const scale = Math.max(slotW / img.naturalWidth, slotH / img.naturalHeight)
                const dw = img.naturalWidth * scale
                const dh = img.naturalHeight * scale
                const dx = (slotW - dw) / 2
                const dy = (slotH - dh) / 2
                sCtx.drawImage(img, dx, dy, dw, dh)

                ctx.save()
                roundedRect(ctx, slotX, slotY, slotW, slotH, SLOT_RADIUS + BLEED)
                ctx.clip()
                ctx.drawImage(slotCanvas, slotX, slotY)
                ctx.restore()
            }
        }

        return canvas.toDataURL('image/png')
    }, [])

    // ── Re-apply Tone & Warp to Raw Photos when changed in Preview ──
    const handleFilterChangeInPreview = useCallback(async (newTone: ColorTone, newWarp: WarpEffect) => {
        if (rawPhotos.length === 0) return
        setIsReapplying(true)
        try {
            const reprocessed = await Promise.all(
                rawPhotos.map(raw => applyEffectsToPhoto(raw, {
                    tone: newTone,
                    warp: newWarp,
                    mirrorX: false,
                    width: SLOT_W,
                    height: SLOT_H,
                }))
            )
            setPhotos(reprocessed)
            const strip = await buildStrip(reprocessed, selectedFrame)
            if (strip) setStripUrl(strip)
        } catch (err) {
            console.error('Failed to reapply filter:', err)
        } finally {
            setIsReapplying(false)
        }
    }, [rawPhotos, selectedFrame, buildStrip])

    // Update strip whenever frame color changes
    useEffect(() => {
        if (appState === 'preview' && photos.length === PHOTO_COUNT) {
            buildStrip(photos, selectedFrame).then(url => {
                if (url) setStripUrl(url)
            })
        }
    }, [selectedFrame, appState, photos, buildStrip])

    // ── Silent Background Upload via API Route with Direct Fallback ──
    const uploadBackground = useCallback((dataUrl: string, consent: boolean) => {
        const base64 = dataUrl.split(',')[1]
        if (!base64) return

        const payload = {
            fileName: `mera-phonebooth-${Date.now()}.png`,
            mimeType: 'image/png',
            data: base64,
            folder: 'phonebooth',
            promoConsent: consent,
        }

        fetch('/api/upload-strip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
            .then(r => r.json())
            .then(d => console.log('[PhoneBooth] Upload to Google Drive successful:', d))
            .catch(async err => {
                console.warn('[PhoneBooth] API proxy upload error, fallback to direct Apps Script:', err)
                try {
                    const fallbackUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxpcgJGMxndIIoaqJ9knxJroTyhgYVxKoJlCTPVQ4QMtpnqNNFjKyuoE8PCvo_Zqr4/exec'
                    await fetch(fallbackUrl, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                        body: JSON.stringify({
                            ...payload,
                            folderId: '1IAamhoERgEodQUJg1OOLGZIfwk-Z1TC6',
                        }),
                    })
                    console.log('[PhoneBooth] Direct Apps Script fallback sent')
                } catch (fallbackErr) {
                    console.warn('[PhoneBooth] Fallback upload failed:', fallbackErr)
                }
            })
    }, [])

    // ── Handle Download / Share ─────────────────────────────────
    const handleDownload = useCallback(async () => {
        if (!stripUrl) return
        const filename = `mera-phonebooth-${Date.now()}.png`

        // Selalu upload ke Google Drive setiap kali foto di-download
        uploadBackground(stripUrl, promoConsent)

        const res = await fetch(stripUrl)
        const blob = await res.blob()
        const file = new File([blob], filename, { type: 'image/png' })

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
            try {
                await navigator.share({ files: [file] })
            } catch { /* User cancelled */ }
        } else {
            const a = document.createElement('a')
            a.href = stripUrl
            a.download = filename
            a.click()
        }
    }, [stripUrl, uploadBackground, promoConsent])

    const retake = useCallback(() => {
        setRawPhotos([])
        setPhotos([])
        setStripUrl(null)
        setPromoConsent(false)
        uploadedUrlRef.current = null
        startCamera()
    }, [startCamera])

    const reset = () => {
        stopCamera()
        setRawPhotos([])
        setPhotos([])
        setStripUrl(null)
        setAppState('idle')
        setCurrentShot(0)
        setSelectedEffectId('normal')
        setSelectedTone('none')
        setSelectedWarp('normal')
        setEffectSlide(0)
        setPromoConsent(false)
        uploadedUrlRef.current = null
    }

    // ── Mac Photo Booth Style Effect Slider (No Icons, No Descriptions, Pure Slides) ──
    const touchStartXRef = useRef<number | null>(null)

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartXRef.current = e.touches[0].clientX
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartXRef.current === null) return
        const diffX = e.changedTouches[0].clientX - touchStartXRef.current
        touchStartXRef.current = null
        if (diffX > 40) {
            setEffectSlide(prev => Math.max(0, prev - 1))
        } else if (diffX < -40) {
            setEffectSlide(prev => Math.min(1, prev + 1))
        }
    }

    const onSelectEffect = (eff: PhotoboothEffect, isLiveView: boolean) => {
        setSelectedEffectId(eff.id)
        setSelectedTone(eff.tone)
        setSelectedWarp(eff.warp)
        if (!isLiveView) {
            handleFilterChangeInPreview(eff.tone, eff.warp)
        }
    }

    const renderEffectSlides = (isLiveView: boolean) => {
        const slide1 = PHOTOBOOTH_EFFECTS.slice(0, 6)
        const slide2 = PHOTOBOOTH_EFFECTS.slice(6, 12)

        return (
            <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1px solid ' + BORDER,
                    borderRadius: RADIUS,
                    padding: '12px 14px',
                    marginBottom: 16,
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 14px rgba(98,33,40,0.06)',
                    userSelect: 'none',
                }}
            >
                {/* Sliding Viewport */}
                <div style={{ overflow: 'hidden', width: '100%' }}>
                    <div style={{
                        display: 'flex',
                        width: '200%',
                        transform: `translateX(-${effectSlide * 50}%)`,
                        transition: 'transform 320ms cubic-bezier(0.25, 1, 0.5, 1)',
                    }}>
                        {/* Slide 1 */}
                        <div style={{
                            width: '50%',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 8,
                            padding: '2px',
                            boxSizing: 'border-box',
                        }}>
                            {slide1.map(eff => {
                                const isSelected = selectedEffectId === eff.id
                                return (
                                    <button
                                        key={eff.id}
                                        type="button"
                                        onClick={() => onSelectEffect(eff, isLiveView)}
                                        style={{
                                            padding: '12px 6px',
                                            borderRadius: 10,
                                            border: '1.5px solid ' + (isSelected ? MAROON : BORDER),
                                            background: isSelected ? MAROON : '#fff',
                                            color: isSelected ? '#fff' : TEXT,
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            boxShadow: isSelected ? '0 2px 8px rgba(98,33,40,0.25)' : 'none',
                                            transition: 'all 120ms ease',
                                        }}
                                    >
                                        <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 600 }}>
                                            {eff.label}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Slide 2 */}
                        <div style={{
                            width: '50%',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 8,
                            padding: '2px',
                            boxSizing: 'border-box',
                        }}>
                            {slide2.map(eff => {
                                const isSelected = selectedEffectId === eff.id
                                return (
                                    <button
                                        key={eff.id}
                                        type="button"
                                        onClick={() => onSelectEffect(eff, isLiveView)}
                                        style={{
                                            padding: '12px 6px',
                                            borderRadius: 10,
                                            border: '1.5px solid ' + (isSelected ? MAROON : BORDER),
                                            background: isSelected ? MAROON : '#fff',
                                            color: isSelected ? '#fff' : TEXT,
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            boxShadow: isSelected ? '0 2px 8px rgba(98,33,40,0.25)' : 'none',
                                            transition: 'all 120ms ease',
                                        }}
                                    >
                                        <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 600 }}>
                                            {eff.label}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Mac Photo Booth Pagination Controls */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    marginTop: 12,
                }}>
                    <button
                        type="button"
                        onClick={() => setEffectSlide(prev => Math.max(0, prev - 1))}
                        disabled={effectSlide === 0}
                        aria-label="Previous Slide"
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: RADIUS_FULL,
                            border: '1px solid ' + BORDER,
                            background: effectSlide === 0 ? 'rgba(0,0,0,0.03)' : '#fff',
                            color: effectSlide === 0 ? 'rgba(0,0,0,0.2)' : MAROON,
                            cursor: effectSlide === 0 ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                            fontWeight: 700,
                            transition: 'all 150ms ease',
                        }}
                    >
                        ‹
                    </button>

                    {/* Page Dots */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {[0, 1].map(idx => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setEffectSlide(idx)}
                                aria-label={`Slide ${idx + 1}`}
                                style={{
                                    width: effectSlide === idx ? 16 : 6,
                                    height: 6,
                                    borderRadius: RADIUS_FULL,
                                    background: effectSlide === idx ? MAROON : 'rgba(98,33,40,0.25)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'all 200ms ease',
                                }}
                            />
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => setEffectSlide(prev => Math.min(1, prev + 1))}
                        disabled={effectSlide === 1}
                        aria-label="Next Slide"
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: RADIUS_FULL,
                            border: '1px solid ' + BORDER,
                            background: effectSlide === 1 ? 'rgba(0,0,0,0.03)' : '#fff',
                            color: effectSlide === 1 ? 'rgba(0,0,0,0.2)' : MAROON,
                            cursor: effectSlide === 1 ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                            fontWeight: 700,
                            transition: 'all 150ms ease',
                        }}
                    >
                        ›
                    </button>
                </div>
            </div>
        )
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
                        Turn your selfies into photostrip with Mac Booth effects!
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
                            Filter Warna & Efek Mac Photo Booth Siap Digunakan! ✨
                        </p>
                    </div>
                )}

                {/* ── State: Camera / Countdown / Capturing / Reviewing ── */}
                {(appState === 'camera' || appState === 'countdown' || appState === 'capturing' || appState === 'reviewing') && (
                    <div>
                        {/* Camera Tools (Switch & Mirror) */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button onClick={switchCamera} style={{
                                padding: '6px 14px', borderRadius: RADIUS_FULL,
                                fontSize: 12, fontWeight: 700, border: '1px solid ' + BORDER,
                                background: SURFACE, color: TEXT_SUB, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 5,
                            }}>
                                📷 {facingMode === 'user' ? 'Kamera Belakang' : 'Kamera Depan'}
                            </button>
                            <button onClick={() => setMirrored(m => !m)} style={{
                                padding: '6px 14px', borderRadius: RADIUS_FULL,
                                fontSize: 12, fontWeight: 700, border: '1px solid ' + (mirrored ? MAROON : BORDER),
                                background: mirrored ? MAROON : SURFACE,
                                color: mirrored ? '#fff' : TEXT_SUB, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 5,
                                transition: 'all 150ms ease',
                            }}>
                                🔄 Mirror {mirrored ? 'ON' : 'OFF'}
                            </button>
                        </div>

                        {/* Viewfinder — matches strip slot aspect */}
                        <div style={{ position: 'relative', borderRadius: RADIUS, overflow: 'hidden', background: '#000', marginBottom: 12, boxShadow: SHADOW, aspectRatio: String(ASPECT) }}>
                            {/* Hidden video source feed */}
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{ display: 'none' }}
                            />

                            {/* Show captured photo during 2s review */}
                            {appState === 'reviewing' && photos.length > 0 ? (
                                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                    <img
                                        src={photos[photos.length - 1]}
                                        alt="Preview"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                        }}
                                    />
                                    <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: RADIUS_FULL, padding: '6px 14px', fontSize: 13, fontWeight: 600 }}>
                                        ✓ Photo {photos.length}/{PHOTO_COUNT}
                                    </div>
                                    <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: RADIUS_FULL, padding: '4px 12px', fontSize: 11 }}>
                                        Say Cheese! 📸
                                    </div>
                                </div>
                            ) : (
                                <canvas
                                    ref={liveCanvasRef}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'block',
                                        objectFit: 'cover',
                                    }}
                                />
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

                        {/* Mac Photo Booth Style Effect Slides */}
                        {renderEffectSlides(true)}

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
                                            <img
                                                src={photos[i]}
                                                alt={'Frame ' + (i + 1)}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                }}
                                            />
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

                {/* ── State: Preview — filter switch + frame selection + download ── */}
                {appState === 'preview' && (
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 16, color: TEXT, fontWeight: 700, marginBottom: 16 }}>Sempurnakan Strip Kamu! 🎉</p>

                        {/* Mac Photo Booth Style Effect Slides in Preview */}
                        <div style={{ textAlign: 'left', marginBottom: 18 }}>
                            {renderEffectSlides(false)}
                            {isReapplying && (
                                <p style={{ fontSize: 12, color: MAROON, fontWeight: 600, textAlign: 'center', margin: '-8px 0 12px' }}>
                                    Sedang menerapkan efek ke strip... ⏳
                                </p>
                            )}
                        </div>

                        {/* Frame selector */}
                        <div style={{ marginBottom: 20 }}>
                            <p style={{ fontSize: 12, color: TEXT_SUB, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                                🖼️ Warna Frame
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
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
                                ⬇ Download Strip
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

                {/* Hidden canvas for strip generation */}
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
