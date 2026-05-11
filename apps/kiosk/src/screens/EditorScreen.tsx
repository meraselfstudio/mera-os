// Screen 3 — Per-photo canvas editor
// • Pan & zoom via pointer events (single-finger pan, two-finger pinch)
// • Frame selector carousel (data from Supabase via store)
// • Navigate between selected photos (prev/next)
// • Per-photo state persists in Zustand while session is active

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useKioskStore } from '../store/useKioskStore'
import { getFrameAddonTotal } from '../store/useKioskStore'

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_ASPECT = 3 / 2   // Capture One default 3:2

// ─── Component ────────────────────────────────────────────────────────────────

export function EditorScreen() {
  const {
    currentSession,
    timeLeft,
    pax,
    selectedPhotoIds,
    activePhotoIndex,
    photos,
    frameProducts,
    photoEdits,
    setActivePhotoIndex,
    updatePhotoEdit,
    selectFrame,
    backToGallery,
    proceedToPrint,
  } = useKioskStore()

  const activePhotoId = selectedPhotoIds[activePhotoIndex] ?? null
  const activePhoto = photos.find((p) => p.id === activePhotoId) ?? null
  const activeEdit = activePhotoId ? (photoEdits[activePhotoId] ?? { frameProductId: null, zoom: 1, panX: 0, panY: 0 }) : null
  const activeFrame = activeEdit
    ? frameProducts.find((f) => f.id === activeEdit.frameProductId) ?? null
    : null

  const frameTotal = getFrameAddonTotal(frameProducts, selectedPhotoIds, photoEdits, pax)

  // ─── Refs ──────────────────────────────────────────────────────────────────

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const frameImgRef = useRef<HTMLImageElement | null>(null)
  const pointerCache = useRef<Map<number, { x: number; y: number }>>(new Map())
  const lastPinchDist = useRef<number | null>(null)

  const [imgLoaded, setImgLoaded] = useState(false)
  const [frameImgLoaded, setFrameImgLoaded] = useState(false)

  // ─── Canvas draw ───────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !activeEdit) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cw = canvas.width
    const ch = canvas.height

    ctx.clearRect(0, 0, cw, ch)
    ctx.fillStyle = '#2e1b1f'
    ctx.fillRect(0, 0, cw, ch)

    const { zoom, panX, panY } = activeEdit
    const imgAspect = img.naturalWidth / img.naturalHeight
    const canvasAspect = cw / ch

    let drawW: number, drawH: number
    if (imgAspect > canvasAspect) {
      drawH = ch * zoom
      drawW = drawH * imgAspect
    } else {
      drawW = cw * zoom
      drawH = drawW / imgAspect
    }

    // Clamp pan so image always covers the full canvas
    const rawX = (cw - drawW) / 2 + panX
    const rawY = (ch - drawH) / 2 + panY
    const clampedX = clampPan(rawX, drawW, cw)
    const clampedY = clampPan(rawY, drawH, ch)

    if (clampedX !== rawX || clampedY !== rawY) {
      const dx = clampedX - (cw - drawW) / 2
      const dy = clampedY - (ch - drawH) / 2
      if (activePhotoId) updatePhotoEdit(activePhotoId, { panX: dx, panY: dy })
    }

    ctx.drawImage(img, clampedX, clampedY, drawW, drawH)

    // Frame overlay
    if (frameImgRef.current && frameImgLoaded) {
      ctx.drawImage(frameImgRef.current, 0, 0, cw, ch)
    }
  }, [activeEdit, activePhotoId, updatePhotoEdit, frameImgLoaded])

  // ─── Load photo image ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!activePhoto) return
    setImgLoaded(false)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgRef.current = img
      setImgLoaded(true)
    }
    img.onerror = () => {
      // Try thumbnail as fallback
      const fallback = new Image()
      fallback.crossOrigin = 'anonymous'
      fallback.onload = () => { imgRef.current = fallback; setImgLoaded(true) }
      fallback.src = activePhoto.thumbnail_url
    }
    img.src = activePhoto.full_url
  }, [activePhoto])

  // ─── Load frame overlay ────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeFrame?.frame_url) {
      frameImgRef.current = null
      setFrameImgLoaded(false)
      return
    }
    setFrameImgLoaded(false)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      frameImgRef.current = img
      setFrameImgLoaded(true)
    }
    img.onerror = () => { frameImgRef.current = null; setFrameImgLoaded(false) }
    img.src = activeFrame.frame_url
  }, [activeFrame?.frame_url])

  // ─── Resize canvas to fill container ──────────────────────────────────────

  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      const maxW = container.clientWidth
      const maxH = container.clientHeight
      let w = maxW
      let h = w / CANVAS_ASPECT
      if (h > maxH) { h = maxH; w = h * CANVAS_ASPECT }
      canvas.width = Math.round(w * 2)   // 2× for retina
      canvas.height = Math.round(h * 2)
      canvas.style.width = `${Math.round(w)}px`
      canvas.style.height = `${Math.round(h)}px`
      draw()
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [draw])

  // ─── Redraw on state change ────────────────────────────────────────────────

  useEffect(() => {
    if (imgLoaded) draw()
  }, [imgLoaded, frameImgLoaded, activeEdit, draw])

  // ─── Pointer handlers (pan + pinch-zoom) ──────────────────────────────────

  const handlePointerDown = (e: ReactPointerEvent) => {
    pointerCache.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }

  const handlePointerMove = (e: ReactPointerEvent) => {
    if (!pointerCache.current.has(e.pointerId) || !activePhotoId || !activeEdit) return
    pointerCache.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = Array.from(pointerCache.current.values())

    if (pts.length === 2) {
      // Two-finger pinch → zoom
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      if (lastPinchDist.current !== null) {
        const scale = dist / lastPinchDist.current
        const newZoom = Math.max(1, Math.min(5, activeEdit.zoom * scale))
        updatePhotoEdit(activePhotoId, { zoom: newZoom })
      }
      lastPinchDist.current = dist
    } else if (pts.length === 1) {
      // Single-finger pan
      const prev = pointerCache.current.get(e.pointerId)
      if (!prev) return
      const dx = e.clientX - prev.x
      const dy = e.clientY - prev.y
      pointerCache.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      updatePhotoEdit(activePhotoId, {
        panX: activeEdit.panX + dx,
        panY: activeEdit.panY + dy,
      })
    }
  }

  const handlePointerUp = (e: ReactPointerEvent) => {
    pointerCache.current.delete(e.pointerId)
    if (pointerCache.current.size < 2) lastPinchDist.current = null
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timerUrgent = timeLeft < 60
  const total = selectedPhotoIds.length

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={s.container}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <img src="/mera-logo-maroon.png" alt="Méra" style={{ height: 26, width: 'auto' }} />
          <span style={s.photoCounter}>
            Foto {activePhotoIndex + 1} / {total}
          </span>
        </div>
        <div style={{ ...s.timer, ...(timerUrgent ? s.timerUrgent : {}) }}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      {/* ── Canvas area ────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        style={s.canvasWrap}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {!imgLoaded && (
          <div style={s.loadingOverlay}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(98,33,40,0.12)', borderTopColor: '#622128', animation: 'spin 0.9s linear infinite' }} />
          </div>
        )}
        <canvas ref={canvasRef} style={s.canvas} />

        {/* Reset zoom hint */}
        {activeEdit && activeEdit.zoom > 1.05 && (
          <button
            style={s.resetZoomBtn}
            onClick={() => {
              if (activePhotoId) updatePhotoEdit(activePhotoId, { zoom: 1, panX: 0, panY: 0 })
            }}
          >
            Reset zoom
          </button>
        )}
      </div>

      {/* ── Controls panel ─────────────────────────────────────────────────── */}
      <div style={s.controls}>

        {/* Photo navigation */}
        {total > 1 && (
          <div style={s.photoNav}>
            <button
              style={{ ...s.navBtn, ...(activePhotoIndex === 0 ? s.navBtnDisabled : {}) }}
              onClick={() => setActivePhotoIndex(activePhotoIndex - 1)}
              disabled={activePhotoIndex === 0}
            >
              ←
            </button>
            <div style={s.dotRow}>
              {selectedPhotoIds.map((id, i) => {
                const hasFrame = photoEdits[id]?.frameProductId != null
                return (
                  <button
                    key={id}
                    style={{ ...s.dot, ...(i === activePhotoIndex ? s.dotActive : {}), ...(hasFrame ? s.dotFramed : {}) }}
                    onClick={() => setActivePhotoIndex(i)}
                  />
                )
              })}
            </div>
            <button
              style={{ ...s.navBtn, ...(activePhotoIndex === total - 1 ? s.navBtnDisabled : {}) }}
              onClick={() => setActivePhotoIndex(activePhotoIndex + 1)}
              disabled={activePhotoIndex === total - 1}
            >
              →
            </button>
          </div>
        )}

        {/* Frame selector */}
        <div style={s.frameSection}>
          <p style={s.sectionLabel}>PILIH FRAME</p>
          <div style={s.frameCarousel}>
            {/* No-frame option */}
            <button
              style={{
                ...s.frameCard,
                ...(activeEdit?.frameProductId === null ? s.frameCardActive : {}),
              }}
              onClick={() => activePhotoId && selectFrame(activePhotoId, null)}
            >
              <div style={s.frameCardThumbEmpty}>
                <span style={{ fontSize: 18, opacity: 0.4 }}>✕</span>
              </div>
              <span style={s.frameCardName}>Tanpa</span>
              <span style={s.frameCardPrice}>Termasuk</span>
            </button>

            {/* Frame products */}
            {frameProducts.map((fp) => {
              const isActive = activeEdit?.frameProductId === fp.id
              return (
                <button
                  key={fp.id}
                  style={{ ...s.frameCard, ...(isActive ? s.frameCardActive : {}) }}
                  onClick={() => activePhotoId && selectFrame(activePhotoId, fp.id)}
                >
                  <div style={s.frameCardThumb}>
                    {fp.thumbnail_url ? (
                      <img
                        src={fp.thumbnail_url}
                        alt={fp.nama}
                        style={s.frameCardImg}
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div style={s.frameCardImgPlaceholder}>
                        <span style={{ fontSize: 10, color: '#666' }}>IMG</span>
                      </div>
                    )}
                  </div>
                  <span style={s.frameCardName}>{fp.nama}</span>
                  <span style={{ ...s.frameCardPrice, ...(fp.harga_dasar > 0 ? s.framePriceCharged : {}) }}>
                    {fp.harga_dasar > 0
                      ? `+Rp ${fp.harga_dasar.toLocaleString('id-ID')}`
                      : 'Termasuk'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Price summary */}
        {frameTotal > 0 && (
          <div style={s.priceSummary}>
            <span style={s.priceSummaryLabel}>Tambahan frame</span>
            <span style={s.priceSummaryValue}>
              +Rp {frameTotal.toLocaleString('id-ID')}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div style={s.actions}>
          <button style={s.btnBack} onClick={backToGallery}>
            ← Galeri
          </button>
          <button style={s.btnProceed} onClick={proceedToPrint}>
            Cetak {total} Foto →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clampPan(pos: number, imgSize: number, canvasSize: number): number {
  if (imgSize <= canvasSize) return (canvasSize - imgSize) / 2
  return Math.max(canvasSize - imgSize, Math.min(0, pos))
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const MAROON     = '#622128'
const MAROON_DIM = 'rgba(98,33,40,0.08)'
const BG         = 'hsl(33, 24%, 93%)'

const s: Record<string, CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: BG,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid rgba(98,33,40,0.10)',
    flexShrink: 0,
    background: '#fff',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  sessionId: { fontSize: 14, fontWeight: 700, color: MAROON, letterSpacing: '0.05em' },
  photoCounter: {
    fontSize: 12,
    color: 'rgba(74,52,56,0.5)',
    letterSpacing: '0.06em',
    fontVariantNumeric: 'tabular-nums',
  },
  timer: {
    fontSize: 17,
    fontWeight: 700,
    color: '#4a3438',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.04em',
  },
  timerUrgent: { color: '#c0392b' },

  // ── Canvas ───────────────────────────────────────────────────────────────────
  canvasWrap: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    touchAction: 'none',
    position: 'relative',
    padding: 12,
    background: BG,
  },
  canvas: {
    borderRadius: 10,
    background: '#2e1b1f',
    boxShadow: '0 8px 32px rgba(46,27,31,0.22)',
    maxWidth: '100%',
    maxHeight: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  resetZoomBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    padding: '6px 14px',
    borderRadius: 999,
    background: 'rgba(98,33,40,0.85)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.04em',
    zIndex: 3,
  },

  // ── Controls ─────────────────────────────────────────────────────────────────
  controls: {
    flexShrink: 0,
    borderTop: '1px solid rgba(98,33,40,0.10)',
    padding: '10px 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    background: '#fff',
    maxHeight: '44vh',
    overflowY: 'auto',
  },

  // ── Photo navigation ─────────────────────────────────────────────────────────
  photoNav: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: MAROON_DIM,
    border: '1px solid rgba(98,33,40,0.14)',
    color: MAROON,
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.25, cursor: 'not-allowed' },
  dotRow: { display: 'flex', gap: 6, alignItems: 'center' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'rgba(98,33,40,0.18)',
    border: '1px solid transparent',
    padding: 0,
    transition: 'all 0.15s',
  },
  dotActive: {
    background: MAROON,
    width: 10,
    height: 10,
  },
  dotFramed: {
    background: 'rgba(98,33,40,0.35)',
    border: `1px solid rgba(98,33,40,0.5)`,
  },

  // ── Frame selector ───────────────────────────────────────────────────────────
  frameSection: { display: 'flex', flexDirection: 'column', gap: 8 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: 'rgba(74,52,56,0.45)',
    paddingLeft: 2,
  },
  frameCarousel: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 4,
    scrollbarWidth: 'none',
  },
  frameCard: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5,
    padding: '8px 6px',
    borderRadius: 12,
    background: BG,
    border: '2px solid transparent',
    width: 72,
    transition: 'border-color 0.15s, background 0.15s',
  },
  frameCardActive: {
    border: `2px solid ${MAROON}`,
    background: 'rgba(98,33,40,0.06)',
  },
  frameCardThumb: {
    width: 56,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    background: 'rgba(98,33,40,0.06)',
  },
  frameCardThumbEmpty: {
    width: 56,
    height: 40,
    borderRadius: 8,
    background: 'rgba(98,33,40,0.04)',
    border: '1px dashed rgba(98,33,40,0.20)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameCardImg: { width: '100%', height: '100%', objectFit: 'cover' },
  frameCardImgPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: MAROON_DIM,
  },
  frameCardName: {
    fontSize: 10,
    fontWeight: 600,
    color: '#4a3438',
    textAlign: 'center',
    maxWidth: 64,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  frameCardPrice: {
    fontSize: 9,
    color: 'rgba(74,52,56,0.45)',
    letterSpacing: '0.04em',
  },
  framePriceCharged: { color: MAROON, fontWeight: 700 },

  // ── Price summary ─────────────────────────────────────────────────────────────
  priceSummary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderRadius: 10,
    background: 'rgba(98,33,40,0.06)',
    border: `1px solid rgba(98,33,40,0.14)`,
  },
  priceSummaryLabel: {
    fontSize: 12,
    color: 'rgba(74,52,56,0.65)',
    letterSpacing: '0.04em',
  },
  priceSummaryValue: {
    fontSize: 13,
    fontWeight: 700,
    color: MAROON,
    letterSpacing: '0.02em',
  },

  // ── Actions ──────────────────────────────────────────────────────────────────
  actions: {
    display: 'flex',
    gap: 10,
  },
  btnBack: {
    flex: 1,
    padding: '14px',
    borderRadius: 999,
    background: 'transparent',
    border: '1px solid rgba(98,33,40,0.18)',
    color: '#4a3438',
    fontSize: 13,
    fontWeight: 600,
  },
  btnProceed: {
    flex: 2.5,
    padding: '14px',
    borderRadius: 999,
    background: MAROON,
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '0.02em',
    boxShadow: '0 8px 24px rgba(98,33,40,0.30)',
  },
}
