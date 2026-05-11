// Screen 4 — Print & Download
// For each selected photo: renders an offscreen canvas (photo + frame + pan/zoom),
// exports to base64 JPEG (quality 0.95), and POSTs to Capture Engine /api/print.
// Shows per-photo progress → success with optional download QR → auto-reset 30s.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@supabase/supabase-js'
import { useKioskStore, getFrameAddonTotal } from '../store/useKioskStore'
import type { PhotoEdit } from '../store/useKioskStore'
import { api } from '../lib/api'
import type { Photo } from '../lib/api'
import type { FrameProduct } from '../lib/frames'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
)

// ─── Offscreen canvas render ─────────────────────────────────────────────────

const CANVAS_W = 1800
const CANVAS_H = 1200  // 3:2

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load: ${src}`))
    img.src = src
  })
}

async function renderToBase64(
  photo: Photo,
  edit: PhotoEdit,
  frame: FrameProduct | null,
): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')!

  // Photo with pan/zoom
  const photoImg = await loadImage(photo.full_url).catch(() => loadImage(photo.thumbnail_url))
  const drawW = CANVAS_W * edit.zoom
  const drawH = CANVAS_H * edit.zoom
  const drawX = (CANVAS_W - drawW) / 2 + edit.panX
  const drawY = (CANVAS_H - drawH) / 2 + edit.panY
  ctx.drawImage(photoImg, drawX, drawY, drawW, drawH)

  // Frame overlay (non-fatal on failure)
  if (frame?.frame_url) {
    try {
      const frameImg = await loadImage(frame.frame_url)
      ctx.drawImage(frameImg, 0, 0, CANVAS_W, CANVAS_H)
    } catch { /* skip */ }
  }

  return canvas.toDataURL('image/jpeg', 0.95)
}

// ─── Component ────────────────────────────────────────────────────────────────

type Phase = 'printing' | 'success' | 'error'

const DEFAULT_EDIT: PhotoEdit = { frameProductId: null, zoom: 1, panX: 0, panY: 0 }

export function PrintScreen() {
  const {
    currentSession,
    pax,
    photos,
    selectedPhotoIds,
    photoEdits,
    frameProducts,
    setPrintResult,
    printJobId,
    printError,
    reset,
  } = useKioskStore()

  const [phase, setPhase] = useState<Phase>('printing')
  const [progress, setProgress] = useState(0)   // index of photo currently being sent
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runPrint = useCallback(async () => {
    if (!currentSession || selectedPhotoIds.length === 0) {
      setPrintResult(null, 'Data sesi tidak lengkap')
      setPhase('error')
      return
    }

    setPhase('printing')
    setProgress(0)

    let lastJobId: string | null = null

    for (let i = 0; i < selectedPhotoIds.length; i++) {
      setProgress(i)
      const photoId = selectedPhotoIds[i]
      const photo = photos.find((p) => p.id === photoId)
      if (!photo) continue

      const edit = photoEdits[photoId] ?? DEFAULT_EDIT
      const frame = edit.frameProductId !== null
        ? (frameProducts.find((f) => f.id === edit.frameProductId) ?? null)
        : null

      try {
        const base64 = await renderToBase64(photo, edit, frame)
        const result = await api.print({ sessionId: currentSession, image: base64, photoId, copies: 1 })
        if (result.jobId) lastJobId = result.jobId
        if (result.status === 'error') throw new Error(result.error ?? 'Print error')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal mengirim ke printer'
        setPrintResult(null, msg)
        setPhase('error')
        return
      }
    }

    // ── Record frame add-on costs to Supabase finance ──────────────────────
    const frameTotal = getFrameAddonTotal(frameProducts, selectedPhotoIds, photoEdits, pax)
    if (frameTotal > 0 && currentSession) {
      // Build a note listing which frames were used
      const frameNote = selectedPhotoIds
        .map((id) => {
          const fp = frameProducts.find((f) => f.id === photoEdits[id]?.frameProductId)
          return fp ? fp.nama : null
        })
        .filter(Boolean)
        .join(', ')

      await supabase.from('transactions').insert({
        session_id: currentSession,
        total_amount: frameTotal,
        discount_amount: 0,
        payment_method: 'CASH',
        status: 'PAID',
        discount_reason: frameNote ? `[Kiosk frames: ${frameNote}]` : '[Kiosk frame add-ons]',
      } as never)
    }

    setPrintResult(lastJobId, null)
    setPhase('success')
  }, [currentSession, pax, selectedPhotoIds, photos, photoEdits, frameProducts, setPrintResult])

  // Kick off on mount
  useEffect(() => { runPrint() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-reset 30s after terminal phase
  useEffect(() => {
    if (phase === 'success' || phase === 'error') {
      resetTimer.current = setTimeout(() => reset(), 30_000)
    }
    return () => { if (resetTimer.current) clearTimeout(resetTimer.current) }
  }, [phase, reset])

  const total = selectedPhotoIds.length

  return (
    <div style={s.container}>
      <div style={s.glow1} />
      <div style={s.glow2} />

      <div style={s.card}>

        {/* ── PRINTING ─────────────────────────────────────────────── */}
        {phase === 'printing' && (
          <div style={s.body}>
            <div style={s.spinnerRing} />
            <h2 style={s.heading}>Sedang Mencetak…</h2>
            <p style={s.sub}>
              Foto {progress + 1} dari {total}
            </p>
            <div style={s.track}>
              <div
                style={{
                  ...s.fill,
                  width: `${Math.max(4, (progress / total) * 100)}%`,
                  transition: progress === 0 ? 'none' : 'width 0.45s ease',
                }}
              />
            </div>
            <p style={s.hint}>Jangan matikan perangkat</p>
          </div>
        )}

        {/* ── SUCCESS ──────────────────────────────────────────────── */}
        {phase === 'success' && (
          <div style={s.body}>
            <div style={s.iconRing}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path
                  d="M7 16l6 6 12-14"
                  stroke={MAROON}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2 style={s.heading}>Foto Sedang Dicetak!</h2>
            <p style={s.sub}>{total} foto dikirim ke printer</p>

            {printJobId && (
              <p style={s.jobId}>Job #{printJobId}</p>
            )}

            <div style={s.divider} />

            <p style={s.qrLabel}>Scan untuk download soft copy ke HP Anda</p>
            <div style={s.qrWrap}>
              {/* QR placeholder — Capture Engine may return a download URL in future */}
              <QRCodeSVG
                value={`https://edit.meraselfstudio.com/download/${currentSession}`}
                size={168}
                bgColor="#ffffff"
                fgColor="#0a0a0a"
                level="M"
              />
            </div>

            <p style={s.countdown}>Layar kembali otomatis dalam 30 detik</p>

            <button style={s.btnDone} onClick={reset}>
              Selesai
            </button>
          </div>
        )}

        {/* ── ERROR ────────────────────────────────────────────────── */}
        {phase === 'error' && (
          <div style={s.body}>
            <div style={{ ...s.iconRing, ...s.iconRingError }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 8v10M16 22v1" stroke="#e74c3c" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            <h2 style={{ ...s.heading, color: '#e74c3c' }}>Cetak Gagal</h2>
            <p style={s.errorMsg}>{printError ?? 'Terjadi kesalahan pada printer'}</p>
            <p style={s.hint}>Mohon panggil operator studio</p>

            <div style={s.errActions}>
              <button style={s.btnRetry} onClick={runPrint}>
                Coba Lagi
              </button>
              <button style={s.btnBack} onClick={reset}>
                Batal Sesi
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const MAROON = '#622128'
const BG     = 'hsl(33, 24%, 93%)'

const s: Record<string, CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: BG,
    position: 'relative',
    overflow: 'hidden',
    padding: 24,
  },
  glow1: {},
  glow2: {},

  card: {
    position: 'relative',
    zIndex: 1,
    background: '#fff',
    border: '1px solid rgba(98,33,40,0.12)',
    borderRadius: 28,
    padding: '44px 40px',
    width: 'min(94vw, 420px)',
    boxShadow: '0 16px 48px rgba(46,27,31,0.12)',
  },

  body: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    textAlign: 'center',
  },

  spinnerRing: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    border: '3px solid rgba(98,33,40,0.12)',
    borderTopColor: MAROON,
    animation: 'spin 0.9s linear infinite',
    flexShrink: 0,
  },

  iconRing: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'rgba(98,33,40,0.06)',
    border: '1px solid rgba(98,33,40,0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconRingError: {
    background: 'rgba(192,57,43,0.06)',
    border: '1px solid rgba(192,57,43,0.20)',
  },

  heading: {
    fontSize: 22,
    fontWeight: 700,
    color: '#2e1b1f',
    fontFamily: 'Times New Roman, Times, serif',
    fontStyle: 'italic',
    letterSpacing: '0.01em',
    margin: 0,
  },
  sub: {
    fontSize: 14,
    color: 'rgba(74,52,56,0.55)',
    letterSpacing: '0.03em',
    margin: 0,
  },
  hint: {
    fontSize: 12,
    color: 'rgba(74,52,56,0.4)',
    letterSpacing: '0.04em',
  },

  track: {
    width: '100%',
    height: 4,
    background: 'rgba(98,33,40,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    background: MAROON,
    borderRadius: 2,
  },

  jobId: {
    fontSize: 11,
    color: 'rgba(74,52,56,0.3)',
    fontFamily: 'monospace',
    letterSpacing: '0.06em',
  },

  divider: {
    width: '100%',
    height: 1,
    background: 'rgba(98,33,40,0.08)',
    borderRadius: 1,
    marginTop: 4,
  },

  qrLabel: {
    fontSize: 12,
    color: 'rgba(74,52,56,0.55)',
    maxWidth: 220,
    lineHeight: 1.6,
    letterSpacing: '0.02em',
  },
  qrWrap: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 4px 20px rgba(46,27,31,0.14)',
    border: '1px solid rgba(98,33,40,0.10)',
  },

  countdown: {
    fontSize: 11,
    color: 'rgba(74,52,56,0.35)',
    letterSpacing: '0.03em',
  },

  btnDone: {
    width: '100%',
    padding: '14px',
    borderRadius: 999,
    background: 'transparent',
    border: '1px solid rgba(98,33,40,0.18)',
    color: '#4a3438',
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: '0.02em',
    marginTop: 4,
    cursor: 'pointer',
  },

  errorMsg: {
    fontSize: 13,
    color: 'rgba(74,52,56,0.5)',
    fontFamily: 'monospace',
    letterSpacing: '0.02em',
    maxWidth: 300,
    lineHeight: 1.55,
  },

  errActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },

  btnRetry: {
    width: '100%',
    padding: '15px',
    borderRadius: 999,
    background: MAROON,
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(98,33,40,0.28)',
  },

  btnBack: {
    width: '100%',
    padding: '13px',
    borderRadius: 999,
    background: 'transparent',
    border: '1px solid rgba(98,33,40,0.14)',
    color: 'rgba(74,52,56,0.55)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
}
