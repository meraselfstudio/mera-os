// Mera Studio Kiosk — Main App
// Handles screen routing, countdown timer, and inactivity timeout

import { useEffect, useCallback } from "react";
import { useKioskStore } from "./store/useKioskStore";
import { IdleScreen } from "./screens/IdleScreen";
import { GalleryScreen } from "./screens/GalleryScreen";
import { EditorScreen } from "./screens/EditorScreen";
import { PrintScreen } from "./screens/PrintScreen";

const INACTIVITY_TIMEOUT_MS = 120_000; // 2 minutes → back to idle

export function App() {
  const screen = useKioskStore((s) => s.screen);
  const timeLeft = useKioskStore((s) => s.timeLeft);
  const lastTouchTs = useKioskStore((s) => s.lastTouchTs);
  const tickTimer = useKioskStore((s) => s.tickTimer);
  const touch = useKioskStore((s) => s.touch);
  const reset = useKioskStore((s) => s.reset);

  // Global touch listener to track activity
  useEffect(() => {
    const handler = () => touch();
    window.addEventListener("pointerdown", handler, { passive: true });
    window.addEventListener("pointermove", handler, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("pointermove", handler);
    };
  }, [touch]);

  // Countdown timer (ticks every second when session active)
  useEffect(() => {
    if (screen === "idle") return;
    const interval = setInterval(() => tickTimer(), 1000);
    return () => clearInterval(interval);
  }, [screen, tickTimer]);

  // If time runs out, reset
  useEffect(() => {
    if (timeLeft <= 0 && screen !== "idle") {
      reset();
    }
  }, [timeLeft, screen, reset]);

  // Inactivity timeout — if no touch for 2 minutes (and not idle/printing), reset
  const checkInactivity = useCallback(() => {
    const { screen: s, lastTouchTs: ts } = useKioskStore.getState();
    if (s === "idle" || s === "printing") return;
    if (Date.now() - ts > INACTIVITY_TIMEOUT_MS) {
      reset();
    }
  }, [reset]);

  useEffect(() => {
    const interval = setInterval(checkInactivity, 10_000);
    return () => clearInterval(interval);
  }, [checkInactivity]);

  // Render current screen
  switch (screen) {
    case "idle":
      return <IdleScreen />;
    case "gallery":
      return <GalleryScreen />;
    case "editor":
      return <EditorScreen />;
    case "printing":
      return <PrintScreen />;
    default:
      return <IdleScreen />;
  }
}
