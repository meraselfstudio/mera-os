// Screen 2: Gallery Selection (Grid View)
// - Header with session timer countdown
// - Grid of thumbnails loaded from /thumb/
// - Tap to select → navigate to editor

import { useEffect, type CSSProperties } from "react";
import { useKioskStore } from "../store/useKioskStore";
import { api } from "../lib/api";

export function GalleryScreen() {
  const {
    currentSession,
    timeLeft,
    photos,
    setPhotos,
    selectPhoto,
  } = useKioskStore();

  // Poll for new photos every 3 seconds
  useEffect(() => {
    if (!currentSession) return;
    let active = true;

    const poll = async () => {
      try {
        const res = await api.getPhotos(currentSession);
        if (active) setPhotos(res.photos);
      } catch {
        // silent retry
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [currentSession, setPhotos]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <span style={styles.sessionLabel}>Sesi: </span>
          <span style={styles.sessionId}>{currentSession}</span>
        </div>
        <div style={styles.timer}>
          ⏱ {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
      </div>

      {/* Instruction */}
      <p style={styles.instruction}>Pilih foto favorit Anda untuk dicetak</p>

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div style={styles.empty}>
          <div className="spinner" />
          <p style={{ marginTop: 16, color: "#888" }}>
            Menunggu foto dari kamera...
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {photos.map((photo) => (
            <button
              key={photo.id}
              style={styles.thumbBtn}
              onClick={() => selectPhoto(photo)}
            >
              <img
                src={photo.thumbUrl}
                alt={photo.id}
                style={styles.thumbImg}
                loading="lazy"
              />
              <span style={styles.thumbLabel}>{photo.id}</span>
            </button>
          ))}
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
    flexDirection: "column",
    background: "#0a0a0a",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    borderBottom: "1px solid #222",
    flexShrink: 0,
  },
  sessionLabel: { fontSize: "14px", color: "#888" },
  sessionId: { fontSize: "16px", fontWeight: 700, color: "#c9a96e" },
  timer: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#fff",
    fontVariantNumeric: "tabular-nums",
  },
  instruction: {
    textAlign: "center",
    padding: "12px",
    color: "#888",
    fontSize: "14px",
    flexShrink: 0,
  },
  empty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 16px 24px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: "12px",
    alignContent: "start",
  },
  thumbBtn: {
    background: "#1a1a1a",
    borderRadius: "12px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    border: "2px solid transparent",
    padding: 0,
  },
  thumbImg: {
    width: "100%",
    aspectRatio: "3/2",
    objectFit: "cover",
    display: "block",
  },
  thumbLabel: {
    padding: "8px",
    fontSize: "11px",
    color: "#888",
    textAlign: "center",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};
