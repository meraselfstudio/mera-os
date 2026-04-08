// Screen 1: Idle / Lock Screen
// - Aesthetic dark background with studio branding
// - Hidden unlock button (top-left corner, tap 3x)
// - Modal for entering Session ID

import { useState, useRef, useCallback, type CSSProperties } from "react";
import { useKioskStore } from "../store/useKioskStore";
import { api } from "../lib/api";

export function IdleScreen() {
  const setSession = useKioskStore((s) => s.setSession);
  const setPhotos = useKioskStore((s) => s.setPhotos);
  const setFrames = useKioskStore((s) => s.setFrames);

  const [tapCount, setTapCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [sessionInput, setSessionInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHiddenTap = useCallback(() => {
    setTapCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setShowModal(true);
        return 0;
      }
      // Reset tap count after 2s of inactivity
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(() => setTapCount(0), 2000);
      return next;
    });
  }, []);

  const handleUnlock = async () => {
    const id = sessionInput.trim();
    if (!id) return;
    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
      setError("ID hanya boleh huruf, angka, dash, underscore");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create session if needed, then load photos & frames
      await api.createSession(id).catch(() => {});
      const [photosRes, framesRes] = await Promise.all([
        api.getPhotos(id),
        api.getFrames(),
      ]);
      setPhotos(photosRes.photos);
      setFrames(framesRes.frames);
      setSession(id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Koneksi ke server gagal";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Background Animation — subtle gradient pulse */}
      <div style={styles.bgOverlay} />

      {/* Branding */}
      <div style={styles.branding}>
        <h1 style={styles.logo}>MERA</h1>
        <p style={styles.tagline}>Self-Photo Studio</p>
      </div>

      {/* Hidden unlock zone (top-left 60x60px) */}
      <div style={styles.hiddenBtn} onClick={handleHiddenTap} />

      {/* Unlock Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => { setShowModal(false); setError(""); }}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Staff Unlock</h2>
            <p style={styles.modalDesc}>Masukkan Session ID untuk memulai sesi pelanggan</p>
            <input
              style={styles.input}
              type="text"
              placeholder="Contoh: MERA_001"
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              autoFocus
            />
            {error && <p style={styles.error}>{error}</p>}
            <button
              style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }}
              onClick={handleUnlock}
              disabled={loading}
            >
              {loading ? "Memuat..." : "Buka Sesi"}
            </button>
            <button
              style={styles.btnCancel}
              onClick={() => { setShowModal(false); setError(""); }}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    background: "radial-gradient(ellipse at center, #1a1510 0%, #0a0a0a 70%)",
  },
  bgOverlay: {
    position: "absolute",
    inset: 0,
    background: "radial-gradient(circle at 50% 50%, rgba(201,169,110,0.05) 0%, transparent 60%)",
    pointerEvents: "none",
  },
  branding: { textAlign: "center", zIndex: 1 },
  logo: {
    fontSize: "72px",
    fontWeight: 800,
    letterSpacing: "16px",
    color: "#c9a96e",
    marginBottom: "8px",
  },
  tagline: {
    fontSize: "16px",
    fontWeight: 300,
    color: "#888",
    letterSpacing: "4px",
    textTransform: "uppercase",
  },
  hiddenBtn: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "60px",
    height: "60px",
    zIndex: 10,
  },
  modalOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  modal: {
    background: "#1a1a1a",
    borderRadius: "16px",
    padding: "32px",
    width: "min(90vw, 400px)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  modalTitle: { fontSize: "24px", fontWeight: 700, color: "#c9a96e" },
  modalDesc: { fontSize: "14px", color: "#888" },
  input: {
    padding: "14px 16px",
    borderRadius: "10px",
    border: "1px solid #333",
    background: "#111",
    color: "#fff",
    fontSize: "18px",
    outline: "none",
    fontFamily: "inherit",
  },
  error: { color: "#e74c3c", fontSize: "13px" },
  btn: {
    padding: "14px",
    borderRadius: "10px",
    background: "#c9a96e",
    color: "#0a0a0a",
    fontSize: "16px",
    fontWeight: 700,
  },
  btnCancel: {
    padding: "10px",
    borderRadius: "10px",
    background: "transparent",
    color: "#888",
    fontSize: "14px",
    fontWeight: 500,
  },
};
