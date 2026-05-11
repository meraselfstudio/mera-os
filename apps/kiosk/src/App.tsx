// Méra Kiosk — App shell
// Handles screen routing, inactivity countdown, and PRD §6.9 timeout modal

import { useEffect, useCallback, type CSSProperties } from 'react'
import { useKioskStore } from './store/useKioskStore'
import { IdleScreen } from './screens/IdleScreen'
import { GalleryScreen } from './screens/GalleryScreen'
import { EditorScreen } from './screens/EditorScreen'
import { PrintScreen } from './screens/PrintScreen'

export function App() {
  const screen = useKioskStore((s) => s.screen)
  const timeLeft = useKioskStore((s) => s.timeLeft)
  const showTimeoutModal = useKioskStore((s) => s.showTimeoutModal)
  const tickTimer = useKioskStore((s) => s.tickTimer)
  const touch = useKioskStore((s) => s.touch)
  const triggerTimeout = useKioskStore((s) => s.triggerTimeout)
  const applyTimeoutAndPrint = useKioskStore((s) => s.applyTimeoutAndPrint)
  const cancelTimeout = useKioskStore((s) => s.cancelTimeout)

  // Global touch/pointer → reset inactivity timer
  useEffect(() => {
    const handler = () => touch()
    window.addEventListener('pointerdown', handler, { passive: true })
    window.addEventListener('touchstart', handler, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', handler)
      window.removeEventListener('touchstart', handler)
    }
  }, [touch])

  // Countdown tick — only while an active session is running
  useEffect(() => {
    if (screen === 'idle' || screen === 'printing') return
    const id = setInterval(() => tickTimer(), 1000)
    return () => clearInterval(id)
  }, [screen, tickTimer])

  // Trigger timeout modal when timer reaches 0
  const checkTimeout = useCallback(() => {
    const { timeLeft: tl, screen: s, showTimeoutModal: modal } = useKioskStore.getState()
    if (s === 'idle' || s === 'printing' || modal) return
    if (tl <= 0) triggerTimeout()
  }, [triggerTimeout])

  useEffect(() => {
    const id = setInterval(checkTimeout, 500)
    return () => clearInterval(id)
  }, [checkTimeout])

  // Auto-proceed after 8 seconds in timeout modal
  useEffect(() => {
    if (!showTimeoutModal) return
    const id = setTimeout(() => applyTimeoutAndPrint(), 8000)
    return () => clearTimeout(id)
  }, [showTimeoutModal, applyTimeoutAndPrint])

  return (
    <div style={styles.root}>
      {screen === 'idle' && <IdleScreen />}
      {screen === 'gallery' && <GalleryScreen />}
      {screen === 'editor' && <EditorScreen />}
      {screen === 'printing' && <PrintScreen />}

      {/* PRD §6.9 — Inactivity timeout modal */}
      {showTimeoutModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalIcon}>⏱</div>
            <h2 style={styles.modalTitle}>Waktu Editing Habis</h2>
            <p style={styles.modalBody}>
              Foto yang belum diedit akan dicetak dengan{' '}
              <span style={styles.gold}>Basic Frame</span>.
            </p>
            <p style={styles.modalSub}>Melanjutkan ke pencetakan dalam beberapa detik…</p>
            <div style={styles.modalActions}>
              <button style={styles.btnContinue} onClick={applyTimeoutAndPrint}>
                Lanjutkan Cetak
              </button>
              <button style={styles.btnCancel} onClick={cancelTimeout}>
                Kembali Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  root: {
    width: '100%',
    height: '100%',
    position: 'relative',
    background: 'hsl(33, 24%, 93%)',
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(46,27,31,0.55)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: 'hsl(33, 24%, 93%)',
    border: '1px solid rgba(98,33,40,0.14)',
    borderRadius: 24,
    padding: '40px 36px',
    maxWidth: 380,
    width: '90vw',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    textAlign: 'center',
    boxShadow: '0 24px 64px rgba(46,27,31,0.30)',
  },
  modalIcon: {
    fontSize: 40,
    lineHeight: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#2e1b1f',
    fontFamily: 'Times New Roman, Times, serif',
    fontStyle: 'italic',
    letterSpacing: '0.01em',
  },
  modalBody: {
    fontSize: 15,
    color: '#4a3438',
    lineHeight: 1.55,
  },
  gold: {
    color: '#622128',
    fontWeight: 600,
  },
  modalSub: {
    fontSize: 12,
    color: 'rgba(74,52,56,0.5)',
    letterSpacing: '0.03em',
  },
  modalActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  btnContinue: {
    padding: '15px 24px',
    borderRadius: 999,
    background: '#622128',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '0.02em',
    boxShadow: '0 8px 24px rgba(98,33,40,0.30)',
  },
  btnCancel: {
    padding: '13px 24px',
    borderRadius: 999,
    background: 'transparent',
    border: '1px solid rgba(98,33,40,0.18)',
    color: '#4a3438',
    fontSize: 14,
    fontWeight: 500,
  },
}
