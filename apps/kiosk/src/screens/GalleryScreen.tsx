// Screen 2 — Photo Gallery
// Customer selects photos to print (up to maxPhotos from package).

import { useEffect, type CSSProperties } from 'react'
import { useKioskStore } from '../store/useKioskStore'
import { api } from '../lib/api'

const MAROON = '#622128'
const BG     = 'hsl(33, 24%, 93%)'

export function GalleryScreen() {
  const {
    currentSession,
    timeLeft,
    photos,
    maxPhotos,
    selectedPhotoIds,
    setPhotos,
    togglePhotoSelection,
    proceedToEdit,
    reset,
  } = useKioskStore()

  // Poll for newly captured photos every 3s
  useEffect(() => {
    if (!currentSession) return
    let active = true
    const poll = async () => {
      try {
        const res = await api.getPhotos(currentSession)
        if (active) setPhotos(res.photos)
      } catch { /* silent */ }
    }
    poll()
    const interval = setInterval(poll, 3000)
    return () => { active = false; clearInterval(interval) }
  }, [currentSession, setPhotos])

  const minutes  = Math.floor(timeLeft / 60)
  const seconds  = timeLeft % 60
  const urgent   = timeLeft < 60
  const selected = selectedPhotoIds.length
  const atLimit  = selected >= maxPhotos

  return (
    <div style={s.container}>

      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <img src="/mera-logo-maroon.png" alt="Méra" style={s.headerLogo} />
        </div>
        <div style={{ ...s.timer, ...(urgent ? s.timerUrgent : {}) }}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      {/* Instruction bar */}
      <div style={s.bar}>
        <p style={s.instruction}>
          {atLimit ? `Maks. ${maxPhotos} foto dipilih` : 'Pilih foto yang akan dicetak'}
        </p>
        {maxPhotos < 9999 && (
          <span style={{ ...s.badge, ...(atLimit ? s.badgeFull : {}) }}>
            {selected} / {maxPhotos}
          </span>
        )}
      </div>

      {/* Grid */}
      {photos.length === 0 ? (
        <div style={s.empty}>
          <div style={s.spinner} />
          <p style={s.emptyText}>Menunggu foto dari kamera…</p>
          <p style={s.emptyHint}>Pastikan Capture Engine aktif di Mac Mini</p>
        </div>
      ) : (
        <div style={s.grid}>
          {photos.map((photo) => {
            const isSel  = selectedPhotoIds.includes(photo.id)
            const isDisabled = !isSel && atLimit
            return (
              <button
                key={photo.id}
                style={{
                  ...s.thumb,
                  ...(isSel     ? s.thumbSelected  : {}),
                  ...(isDisabled ? s.thumbDisabled : {}),
                }}
                onClick={() => togglePhotoSelection(photo.id)}
                disabled={isDisabled}
              >
                <img
                  src={photo.thumbnail_url}
                  alt={photo.id}
                  style={s.thumbImg}
                  loading="lazy"
                  crossOrigin="anonymous"
                />
                {isSel && <div style={s.checkBadge}>✓</div>}
                {isDisabled && <div style={s.disabledOverlay} />}
              </button>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div style={s.footer}>
        <button style={s.btnBack} onClick={reset}>
          ← Batalkan
        </button>
        <button
          style={{ ...s.btnProceed, ...(selected === 0 ? s.btnOff : {}) }}
          onClick={proceedToEdit}
          disabled={selected === 0}
        >
          Edit {selected > 0 ? `${selected} Foto` : 'Foto'} →
        </button>
      </div>
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: BG,
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: `1px solid rgba(98,33,40,0.10)`,
    flexShrink: 0,
    background: '#fff',
  },
  headerLeft: { display: 'flex', alignItems: 'center' },
  headerLogo: { height: 28, width: 'auto', display: 'block' },
  timer: {
    fontSize: 17,
    fontWeight: 700,
    color: '#4a3438',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.04em',
  },
  timerUrgent: { color: '#c0392b' },

  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    flexShrink: 0,
    background: BG,
  },
  instruction: {
    fontSize: 13,
    color: 'rgba(74,52,56,0.65)',
    letterSpacing: '0.02em',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: 20,
    background: 'rgba(98,33,40,0.08)',
    border: `1px solid rgba(98,33,40,0.14)`,
    color: MAROON,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  badgeFull: {
    background: 'rgba(98,33,40,0.15)',
  },

  grid: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 14px 14px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 10,
    alignContent: 'start',
  },

  thumb: {
    position: 'relative',
    background: 'rgba(98,33,40,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
    border: '2px solid transparent',
    padding: 0,
    aspectRatio: '3/2',
    transition: 'border-color 0.15s, transform 0.12s',
    boxShadow: '0 2px 8px rgba(46,27,31,0.08)',
  },
  thumbSelected: {
    border: `2px solid ${MAROON}`,
    boxShadow: `0 0 0 1px rgba(98,33,40,0.25), 0 4px 16px rgba(98,33,40,0.18)`,
  },
  thumbDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: MAROON,
    color: '#fff',
    fontSize: 12,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(237,232,224,0.55)',
    pointerEvents: 'none',
  },

  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: '3px solid rgba(98,33,40,0.12)',
    borderTopColor: MAROON,
    animation: 'spin 0.9s linear infinite',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: 600,
    color: '#4a3438',
  },
  emptyHint: {
    fontSize: 12,
    color: 'rgba(74,52,56,0.45)',
    letterSpacing: '0.03em',
  },

  footer: {
    flexShrink: 0,
    display: 'flex',
    gap: 10,
    padding: '12px 16px 20px',
    borderTop: `1px solid rgba(98,33,40,0.10)`,
    background: '#fff',
  },
  btnBack: {
    flex: 1,
    padding: '14px',
    borderRadius: 999,
    background: 'transparent',
    border: `1px solid rgba(98,33,40,0.18)`,
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
  btnOff: {
    opacity: 0.35,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
}
