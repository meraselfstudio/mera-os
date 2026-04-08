// Zustand store — Kiosk state management

import { create } from "zustand";
import type { Photo, Frame } from "../lib/api";

export type Screen = "idle" | "gallery" | "editor" | "printing";
export type FilterType = "normal" | "grayscale" | "vintage";

export interface EditorState {
  filter: FilterType;
  frameId: string | null;
  zoom: number;
  panX: number;
  panY: number;
}

interface KioskState {
  // Session
  currentSession: string | null;
  timeLeft: number; // seconds

  // Navigation
  screen: Screen;

  // Data
  photos: Photo[];
  frames: Frame[];
  selectedPhoto: Photo | null;

  // Editor
  editor: EditorState;

  // Frame selection
  selectedFrame: Frame | null;
  specialFrameSelected: boolean;
  specialFramePrice: number;

  // Print result
  printOutputUrl: string | null;
  printError: string | null;

  // Inactivity
  lastTouchTs: number;

  // Actions
  setSession: (id: string) => void;
  setScreen: (s: Screen) => void;
  setPhotos: (p: Photo[]) => void;
  setFrames: (f: Frame[]) => void;
  selectPhoto: (p: Photo) => void;
  selectFrame: (frame: Frame) => void;
  updateEditor: (partial: Partial<EditorState>) => void;
  setPrintResult: (url: string | null, error: string | null) => void;
  tickTimer: () => void;
  touch: () => void;
  reset: () => void;
}

const INITIAL_EDITOR: EditorState = {
  filter: "normal",
  frameId: null,
  zoom: 1,
  panX: 0,
  panY: 0,
};

export const useKioskStore = create<KioskState>((set) => ({
  currentSession: null,
  timeLeft: 600,
  screen: "idle",
  photos: [],
  frames: [],
  selectedPhoto: null,
  editor: { ...INITIAL_EDITOR },
  selectedFrame: null,
  specialFrameSelected: false,
  specialFramePrice: 0,
  printOutputUrl: null,
  printError: null,
  lastTouchTs: Date.now(),

  setSession: (id) =>
    set({ currentSession: id, timeLeft: 600, screen: "gallery", lastTouchTs: Date.now() }),

  setScreen: (s) => set({ screen: s, lastTouchTs: Date.now() }),

  setPhotos: (p) => set({ photos: p }),

  setFrames: (f) => set({ frames: f }),

  selectPhoto: (p) =>
    set({ selectedPhoto: p, editor: { ...INITIAL_EDITOR }, selectedFrame: null, specialFrameSelected: false, specialFramePrice: 0, screen: "editor", lastTouchTs: Date.now() }),

  selectFrame: (frame) =>
    set((state) => ({
      selectedFrame: frame,
      specialFrameSelected: frame.type === "special",
      specialFramePrice: frame.type === "special" ? frame.price || 0 : 0,
      editor: { ...state.editor, frameId: frame.id },
      lastTouchTs: Date.now(),
    })),

  updateEditor: (partial) =>
    set((s) => ({ editor: { ...s.editor, ...partial }, lastTouchTs: Date.now() })),

  setPrintResult: (url, error) => set({ printOutputUrl: url, printError: error }),

  tickTimer: () =>
    set((s) => ({ timeLeft: Math.max(0, s.timeLeft - 1) })),

  touch: () => set({ lastTouchTs: Date.now() }),

  reset: () =>
    set({
      currentSession: null,
      timeLeft: 600,
      screen: "idle",
      photos: [],
      frames: [],
      selectedPhoto: null,
      editor: { ...INITIAL_EDITOR },
      selectedFrame: null,
      specialFrameSelected: false,
      specialFramePrice: 0,
      printOutputUrl: null,
      printError: null,
      lastTouchTs: Date.now(),
    }),
}));
