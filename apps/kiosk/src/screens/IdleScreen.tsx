// Screen 1 — Idle / Attract
// Staff taps the hidden zone (top-left, 3×) to open session entry modal.
// Modal shows today's scheduled bookings (PROCESSED/VERIFIED with session_id)
// so staff can tap a booking directly instead of typing the session ID.

import { useState, useRef, useCallback, useEffect, type CSSProperties } from 'react'
import { useKioskStore } from '../store/useKioskStore'
import { api } from '../lib/api'
import { fetchFrameProducts } from '../lib/frames'
import { createClient } from '@supabase/supabase-js'

interface RegistrationAddons { pax?: number; max_photos?: number }

interface TodayBooking {
  id: string
  customer_name: string
  preferred_time: string | null
  session_id: string
  addons: RegistrationAddons | null
}

const getSupabase = () => createClient(
  import.meta.env.VITE_SUPABASE_URL  as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
)

function todayWIB() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10)
}

export function IdleScreen() {
  const setSession       = useKioskStore((s) => s.setSession)
  const setPhotos        = useKioskStore((s) => s.setPhotos)
  const setFrameProducts = useKioskStore((s) => s.setFrameProducts)

  const [tapCount,          setTapCount]          = useState(0)
  const [showModal,         setShowModal]         = useState(false)
  const [sessionInput,      setSessionInput]      = useState('')
  const [loading,           setLoading]           = useState(false)
  const [error,             setError]             = useState('')
  const [bookings,          setBookings]          = useState<TodayBooking[]>([])
  const [loadingBookings,   setLoadingBookings]   = useState(false)
  const [openingBookingId,  setOpeningBookingId]  = useState<string | null>(null)
  const [autoLoading,       setAutoLoading]       = useState(false)
  const [autoError,         setAutoError]         = useState('')
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-open session from URL param ?sid= (customer opens via ticket link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sid = params.get('sid')?.trim().toUpperCase()
    if (!sid) return

    window.history.replaceState({}, '', window.location.pathname)
    setAutoLoading(true)
    setAutoError('');

    (async () => {
      try {
        await api.getSession(sid)
        const photosRes = await api.getPhotos(sid)
        const fps = await fetchFrameProducts().catch(() => [])

        let pax = 1
        let maxPhotos = photosRes.photos.length
        try {
          const { data } = await getSupabase()
            .from('registrations')
            .select('addons')
            .eq('session_id', sid)
            .maybeSingle()
          if (data) {
            const addons = (data.addons as RegistrationAddons) ?? {}
            if (addons.pax)        pax       = addons.pax
            if (addons.max_photos) maxPhotos = addons.max_photos
          }
        } catch { /* best-effort */ }

        setPhotos(photosRes.photos)
        setFrameProducts(fps)
        setSession(sid, pax, maxPhotos)
      } catch (err: unknown) {
        setAutoError(err instanceof Error ? err.message : 'Koneksi ke Capture Engine gagal. Pastikan perangkat terhubung ke WiFi studio.')
      } finally {
        setAutoLoading(false)
      }
    })()
  }, [setSession, setPhotos, setFrameProducts])

  // Fetch today's scheduled bookings whenever the modal opens
  useEffect(() => {
    if (!showModal) return
    let cancelled = false
    const fetch = async () => {
      setLoadingBookings(true)
      try {
        const { data } = await getSupabase()
          .from('registrations')
          .select('id, customer_name, preferred_time, session_id, addons')
          .eq('preferred_date', todayWIB())
          .in('status', ['VERIFIED', 'PROCESSED'])
          .not('session_id', 'is', null)
          .order('preferred_time', { ascending: true })
        if (!cancelled) setBookings((data as TodayBooking[]) ?? [])
      } catch { /* silent — manual input still works */ }
      finally { if (!cancelled) setLoadingBookings(false) }
    }
    fetch()
    return () => { cancelled = true }
  }, [showModal])

  const handleHiddenTap = useCallback(() => {
    setTapCount((prev) => {
      const next = prev + 1
      if (next >= 3) { setShowModal(true); return 0 }
      if (tapTimer.current) clearTimeout(tapTimer.current)
      tapTimer.current = setTimeout(() => setTapCount(0), 2000)
      return next
    })
  }, [])

  const closeModal = () => {
    setShowModal(false)
    setError('')
    setSessionInput('')
    setBookings([])
    setOpeningBookingId(null)
  }

  // Shared session-open logic for both booking tap and manual input
  const openSession = async (
    id: string,
    paxHint = 1,
    maxPhotosHint?: number,
  ) => {
    setLoading(true)
    setError('')
    try {
      await api.getSession(id)
      const photosRes = await api.getPhotos(id)
      const fps = await fetchFrameProducts().catch(() => [])
      const maxPhotos = maxPhotosHint ?? photosRes.photos.length
      setPhotos(photosRes.photos)
      setFrameProducts(fps)
      setSession(id, paxHint, maxPhotos)
      setShowModal(false)
      setSessionInput('')
      setOpeningBookingId(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Koneksi ke server gagal')
      setOpeningBookingId(null)
    } finally {
      setLoading(false)
    }
  }

  // Tap a booking row → open that session directly
  const handleBookingTap = (booking: TodayBooking) => {
    if (loading) return
    const addons = booking.addons ?? {}
    setOpeningBookingId(booking.id)
    openSession(booking.session_id, addons.pax ?? 1, addons.max_photos)
  }

  // Manual session ID input
  const handleUnlock = () => {
    const id = sessionInput.trim().toUpperCase()
    if (!id) return
    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
      setError('ID hanya boleh huruf, angka, dash, atau underscore')
      return
    }
    openSession(id)
  }

  // ── Full-screen auto-loading overlay (triggered by ?sid= URL param) ─────────
  if (autoLoading) {
    return (
      <div style={{ ...s.container, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={s.spinner} />
        <p style={{ fontSize: 16, fontWeight: 600, color: '#4a3438', letterSpacing: '0.02em' }}>Membuka sesi…</p>
        <p style={{ fontSize: 13, color: 'rgba(74,52,56,0.45)' }}>Menghubungkan ke Capture Engine</p>
      </div>
    )
  }

  if (autoError) {
    return (
      <div style={{ ...s.container, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
        <p style={{ fontSize: 36, lineHeight: 1 }}>⚠️</p>
        <p style={{ fontSize: 17, fontWeight: 700, color: '#2e1b1f', textAlign: 'center' }}>Gagal Membuka Sesi</p>
        <p style={{ fontSize: 14, color: 'rgba(74,52,56,0.6)', textAlign: 'center', lineHeight: 1.6 }}>{autoError}</p>
        <button
          onClick={() => setAutoError('')}
          style={{ marginTop: 8, padding: '14px 28px', borderRadius: 999, background: MAROON, color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}
        >
          Kembali ke Layar Utama
        </button>
      </div>
    )
  }

  return (
    <div style={s.container}>
      {/* Cream hero */}
      <div style={s.hero}>
        <img src="/mera-logo-maroon.png" alt="Méra Self Studio" style={s.logo} />
        <p style={s.tagline}>Finest Self Photo Studio in Town</p>
        <p style={s.sub}>Give You a Space to Be Real You!</p>
      </div>

      {/* Maroon footer strip */}
      <div style={s.strip}>
        <p style={s.prompt}>Minta bantuan staff untuk memulai sesi</p>
      </div>

      {/* Hidden staff zone — top-left 80×80 */}
      <div style={s.hiddenZone} onClick={handleHiddenTap} />

      {/* Staff modal */}
      {showModal && (
        <div style={s.overlay} onClick={closeModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <img src="/mera-logo-maroon.png" alt="Méra" style={s.modalLogo} />
            <p style={s.modalLabel}>STAFF · BUKA SESI</p>

            {/* ── Today's bookings ── */}
            <div style={s.bookingSection}>
              <p style={s.bookingSectionTitle}>Sesi Hari Ini</p>

              {loadingBookings ? (
                <div style={s.bookingLoading}>
                  <div style={s.spinner} />
                  <span style={s.bookingLoadingText}>Memuat jadwal…</span>
                </div>
              ) : bookings.length === 0 ? (
                <p style={s.bookingEmpty}>Tidak ada sesi terjadwal hari ini</p>
              ) : (
                <div style={s.bookingList}>
                  {bookings.map((b) => {
                    const isOpening = openingBookingId === b.id
                    return (
                      <button
                        key={b.id}
                        style={{
                          ...s.bookingRow,
                          ...(loading ? s.bookingRowDisabled : {}),
                          ...(isOpening ? s.bookingRowOpening : {}),
                        }}
                        onClick={() => handleBookingTap(b)}
                        disabled={loading}
                      >
                        <span style={s.bookingTime}>
                          {b.preferred_time ?? '—'}
                        </span>
                        <span style={s.bookingName}>{b.customer_name}</span>
                        <span style={s.bookingSessionId}>{b.session_id}</span>
                        {isOpening ? (
                          <div style={s.bookingSpinner} />
                        ) : (
                          <span style={s.bookingArrow}>›</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Divider ── */}
            <div style={s.divider}>
              <div style={s.dividerLine} />
              <span style={s.dividerText}>atau ketik Session ID</span>
              <div style={s.dividerLine} />
            </div>

            {/* ── Manual input ── */}
            <input
              style={s.input}
              type="text"
              placeholder="Contoh: 14-DIVA-MR"
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />

            {error && <p style={s.error}>{error}</p>}

            <div style={s.actions}>
              <button
                style={{ ...s.btnPrimary, opacity: loading || !sessionInput.trim() ? 0.45 : 1 }}
                onClick={handleUnlock}
                disabled={loading || !sessionInput.trim()}
              >
                {loading && !openingBookingId ? 'Memuat…' : 'Buka Sesi'}
              </button>
              <button style={s.btnGhost} onClick={closeModal}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const MAROON = '#622128'
const BG     = 'hsl(33, 24%, 93%)'

const s: Record<string, CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: BG,
    position: 'relative',
    overflow: 'hidden',
  },

  hero: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '24px 32px',
  },

  logo: {
    width: 180,
    height: 'auto',
    display: 'block',
    marginBottom: 8,
  },

  tagline: {
    fontSize: 15,
    fontWeight: 600,
    color: '#4a3438',
    letterSpacing: '0.04em',
    textAlign: 'center',
  },

  sub: {
    fontSize: 13,
    color: 'rgba(74,52,56,0.6)',
    letterSpacing: '0.03em',
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'Times New Roman, Times, serif',
  },

  strip: {
    flexShrink: 0,
    background: MAROON,
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  prompt: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: '0.04em',
    textAlign: 'center',
  },

  hiddenZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 80,
    height: 80,
    zIndex: 10,
  },

  // ── Modal ─────────────────────────────────────────────────────────────────

  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(46,27,31,0.55)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    padding: '20px 16px',
  },

  modal: {
    background: BG,
    borderRadius: 24,
    padding: '28px 24px 24px',
    width: 'min(92vw, 440px)',
    maxHeight: '90dvh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    boxShadow: '0 24px 64px rgba(46,27,31,0.35)',
  },

  modalLogo: {
    width: 88,
    height: 'auto',
    display: 'block',
    margin: '0 auto 2px',
  },

  modalLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.2em',
    color: 'rgba(98,33,40,0.55)',
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // ── Booking list ──────────────────────────────────────────────────────────

  bookingSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  bookingSectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(98,33,40,0.5)',
  },

  bookingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 220,
    overflowY: 'auto',
  },

  bookingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 14,
    background: '#fff',
    border: `1.5px solid rgba(98,33,40,0.12)`,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.15s, background 0.15s',
    width: '100%',
  },

  bookingRowDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },

  bookingRowOpening: {
    borderColor: MAROON,
    background: 'rgba(98,33,40,0.04)',
  },

  bookingTime: {
    fontSize: 12,
    fontWeight: 700,
    color: 'rgba(74,52,56,0.5)',
    flexShrink: 0,
    width: 40,
    letterSpacing: '0.02em',
  },

  bookingName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#2e1b1f',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  bookingSessionId: {
    fontSize: 11,
    fontWeight: 600,
    color: MAROON,
    letterSpacing: '0.06em',
    flexShrink: 0,
    background: 'rgba(98,33,40,0.07)',
    padding: '3px 8px',
    borderRadius: 6,
  },

  bookingArrow: {
    fontSize: 20,
    color: 'rgba(98,33,40,0.35)',
    flexShrink: 0,
    lineHeight: 1,
  },

  bookingLoading: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 0',
  },

  bookingLoadingText: {
    fontSize: 13,
    color: 'rgba(74,52,56,0.5)',
  },

  bookingEmpty: {
    fontSize: 13,
    color: 'rgba(74,52,56,0.4)',
    padding: '10px 0',
    fontStyle: 'italic',
  },

  spinner: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: '2.5px solid rgba(98,33,40,0.15)',
    borderTopColor: MAROON,
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },

  bookingSpinner: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: '2px solid rgba(98,33,40,0.15)',
    borderTopColor: MAROON,
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },

  // ── Divider ───────────────────────────────────────────────────────────────

  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    background: 'rgba(98,33,40,0.1)',
  },

  dividerText: {
    fontSize: 11,
    color: 'rgba(74,52,56,0.4)',
    letterSpacing: '0.04em',
    flexShrink: 0,
  },

  // ── Manual input ──────────────────────────────────────────────────────────

  input: {
    padding: '14px 16px',
    borderRadius: 12,
    border: `1.5px solid rgba(98,33,40,0.2)`,
    background: '#fff',
    color: '#2e1b1f',
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: '0.08em',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  },

  error: {
    color: '#c0392b',
    fontSize: 13,
    letterSpacing: '0.02em',
    marginTop: -4,
  },

  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  btnPrimary: {
    padding: '14px',
    borderRadius: 999,
    background: MAROON,
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '0.03em',
    width: '100%',
    boxShadow: '0 8px 24px rgba(98,33,40,0.30)',
    transition: 'opacity 0.15s',
  },

  btnGhost: {
    padding: '12px',
    borderRadius: 999,
    background: 'transparent',
    border: `1px solid rgba(98,33,40,0.18)`,
    color: '#4a3438',
    fontSize: 13,
    fontWeight: 500,
    width: '100%',
  },
}
