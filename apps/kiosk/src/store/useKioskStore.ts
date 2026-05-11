// Zustand store — Kiosk state management
// Supports per-photo editing, frame add-ons, and PRD §6.9 inactivity timer

import { create } from 'zustand'
import type { Photo } from '../lib/api'
import type { FrameProduct } from '../lib/frames'
import { hitungHargaFrame } from '../lib/frames'

export type Screen = 'idle' | 'gallery' | 'editor' | 'printing'

// Per-photo pan/zoom/frame state — persists while session is active
export interface PhotoEdit {
  frameProductId: number | null  // null = Basic Frame (no overlay, included in pkg)
  zoom: number
  panX: number
  panY: number
}

const DEFAULT_EDIT: PhotoEdit = { frameProductId: null, zoom: 1, panX: 0, panY: 0 }

// ─── State shape ──────────────────────────────────────────────────────────────

interface KioskState {
  // Session
  currentSession: string | null
  pax: number          // influences inactivity timeout (PRD §6.9)
  maxPhotos: number    // max selectable photos from registration addons

  // Navigation
  screen: Screen

  // Data
  photos: Photo[]
  frameProducts: FrameProduct[]

  // Gallery selection
  selectedPhotoIds: string[]   // ordered; max = maxPhotos

  // Per-photo editing
  photoEdits: Record<string, PhotoEdit>  // keyed by Photo.id
  activePhotoIndex: number               // index into selectedPhotoIds

  // Inactivity (PRD §6.9)
  lastTouchTs: number
  timeLeft: number      // seconds remaining; resets on touch
  showTimeoutModal: boolean

  // Print
  printJobId: string | null
  printError: string | null

  // ─── Actions ────────────────────────────────────────────────────────────────

  /** Called by IdleScreen after successful session validation */
  setSession: (id: string, pax: number, maxPhotos: number) => void

  setPhotos: (photos: Photo[]) => void
  setFrameProducts: (fps: FrameProduct[]) => void

  /** Toggle photo selection in gallery (respects maxPhotos) */
  togglePhotoSelection: (photoId: string) => void

  /** Proceed from gallery → editor with the selected photos */
  proceedToEdit: () => void

  /** Go back from editor → gallery */
  backToGallery: () => void

  /** Proceed from editor → printing */
  proceedToPrint: () => void

  /** Navigate between selected photos in editor */
  setActivePhotoIndex: (i: number) => void

  /** Update pan/zoom/frame for the given photo */
  updatePhotoEdit: (photoId: string, partial: Partial<PhotoEdit>) => void

  /** Select a frame product for the active photo */
  selectFrame: (photoId: string, frameProductId: number | null) => void

  /** Called by App.tsx every second while not idle */
  tickTimer: () => void

  /** Reset inactivity timer (on any touch/pointer event) */
  touch: () => void

  /** PRD §6.9: show timeout modal when timeLeft hits 0 */
  triggerTimeout: () => void

  /**
   * PRD §6.9: dismiss modal — apply Basic Frame to unedited photos,
   * navigate to printing.
   */
  applyTimeoutAndPrint: () => void

  /** Cancel timeout modal — restart the inactivity timer */
  cancelTimeout: () => void

  setPrintResult: (jobId: string | null, error: string | null) => void

  /** Full reset — back to idle screen */
  reset: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inactivitySeconds(pax: number): number {
  return pax >= 8 ? 600 : 300
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useKioskStore = create<KioskState>((set, get) => ({
  currentSession: null,
  pax: 1,
  maxPhotos: 999,
  screen: 'idle',
  photos: [],
  frameProducts: [],
  selectedPhotoIds: [],
  photoEdits: {},
  activePhotoIndex: 0,
  lastTouchTs: Date.now(),
  timeLeft: 300,
  showTimeoutModal: false,
  printJobId: null,
  printError: null,

  // ─── Session ───────────────────────────────────────────────────────────────

  setSession: (id, pax, maxPhotos) =>
    set({
      currentSession: id,
      pax,
      maxPhotos,
      screen: 'gallery',
      selectedPhotoIds: [],
      photoEdits: {},
      activePhotoIndex: 0,
      timeLeft: inactivitySeconds(pax),
      lastTouchTs: Date.now(),
      showTimeoutModal: false,
      printJobId: null,
      printError: null,
    }),

  // ─── Data ──────────────────────────────────────────────────────────────────

  setPhotos: (photos) => set({ photos }),

  setFrameProducts: (fps) => set({ frameProducts: fps }),

  // ─── Gallery selection ─────────────────────────────────────────────────────

  togglePhotoSelection: (photoId) =>
    set((s) => {
      const already = s.selectedPhotoIds.includes(photoId)
      if (already) {
        return {
          selectedPhotoIds: s.selectedPhotoIds.filter((id) => id !== photoId),
        }
      }
      if (s.selectedPhotoIds.length >= s.maxPhotos) return {}  // at limit
      return { selectedPhotoIds: [...s.selectedPhotoIds, photoId] }
    }),

  // ─── Editor navigation ─────────────────────────────────────────────────────

  proceedToEdit: () =>
    set({ screen: 'editor', activePhotoIndex: 0, lastTouchTs: Date.now() }),

  backToGallery: () =>
    set({ screen: 'gallery', lastTouchTs: Date.now() }),

  proceedToPrint: () =>
    set({ screen: 'printing', lastTouchTs: Date.now() }),

  setActivePhotoIndex: (i) =>
    set((s) => {
      const clamped = Math.max(0, Math.min(s.selectedPhotoIds.length - 1, i))
      return { activePhotoIndex: clamped, lastTouchTs: Date.now() }
    }),

  // ─── Photo editing ─────────────────────────────────────────────────────────

  updatePhotoEdit: (photoId, partial) =>
    set((s) => ({
      photoEdits: {
        ...s.photoEdits,
        [photoId]: { ...(s.photoEdits[photoId] ?? DEFAULT_EDIT), ...partial },
      },
      lastTouchTs: Date.now(),
    })),

  selectFrame: (photoId, frameProductId) =>
    set((s) => ({
      photoEdits: {
        ...s.photoEdits,
        [photoId]: { ...(s.photoEdits[photoId] ?? DEFAULT_EDIT), frameProductId },
      },
      lastTouchTs: Date.now(),
    })),

  // ─── Inactivity timer ──────────────────────────────────────────────────────

  tickTimer: () =>
    set((s) => ({ timeLeft: Math.max(0, s.timeLeft - 1) })),

  touch: () =>
    set((s) => ({
      lastTouchTs: Date.now(),
      timeLeft: inactivitySeconds(s.pax),
      showTimeoutModal: false,
    })),

  triggerTimeout: () => set({ showTimeoutModal: true }),

  applyTimeoutAndPrint: () => {
    const { selectedPhotoIds, photoEdits } = get()
    const updatedEdits = { ...photoEdits }
    for (const id of selectedPhotoIds) {
      if (!updatedEdits[id]) {
        // Unedited photo — apply Basic Frame (null = no overlay)
        updatedEdits[id] = { ...DEFAULT_EDIT, frameProductId: null }
      }
    }
    set({
      photoEdits: updatedEdits,
      showTimeoutModal: false,
      screen: 'printing',
    })
  },

  cancelTimeout: () =>
    set((s) => ({
      showTimeoutModal: false,
      timeLeft: inactivitySeconds(s.pax),
      lastTouchTs: Date.now(),
    })),

  // ─── Print ─────────────────────────────────────────────────────────────────

  setPrintResult: (jobId, error) => set({ printJobId: jobId, printError: error }),

  // ─── Full reset ────────────────────────────────────────────────────────────

  reset: () =>
    set({
      currentSession: null,
      pax: 1,
      maxPhotos: 999,
      screen: 'idle',
      photos: [],
      frameProducts: [],
      selectedPhotoIds: [],
      photoEdits: {},
      activePhotoIndex: 0,
      lastTouchTs: Date.now(),
      timeLeft: 300,
      showTimeoutModal: false,
      printJobId: null,
      printError: null,
    }),
}))

// ─── Computed selectors ───────────────────────────────────────────────────────

export function getFrameAddonTotal(
  frameProducts: FrameProduct[],
  selectedPhotoIds: string[],
  photoEdits: Record<string, PhotoEdit>,
  pax = 1,
): number {
  let total = 0
  for (const id of selectedPhotoIds) {
    const edit = photoEdits[id]
    if (!edit || edit.frameProductId === null) continue
    const fp = frameProducts.find((f) => f.id === edit.frameProductId)
    if (fp) total += hitungHargaFrame(fp, pax)
  }
  return total
}
