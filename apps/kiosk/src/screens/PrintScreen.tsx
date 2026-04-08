// Screen 4: Print Confirmation & Download Station
// - Loading spinner while rendering/printing
// - Error display for printer issues
// - QR Code for digital download
// - Auto-reset after 30 seconds

import { useEffect, useState, useRef, type CSSProperties } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useKioskStore } from "../store/useKioskStore";
import { api, type PrintPayload } from "../lib/api";


type Phase = "rendering" | "success" | "error";

export default function PrintScreen() {
  const {
    currentSession,
    selectedPhoto,
    editor,
    printOutputUrl,
    printError,
    setPrintResult,
    reset,
    setScreen,
    selectedFrame,
    specialFrameSelected,
    specialFramePrice,
  } = useKioskStore();

  const [phase, setPhase] = useState<Phase>("rendering");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitted = useRef(false);

  // Submit print job on mount
  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;

    if (!currentSession || !selectedPhoto || !selectedFrame) {
      setPhase("error");
      setPrintResult(null, "Data sesi tidak lengkap");
      return;
    }

    const payload: PrintPayload = {
      sessionId: currentSession,
      photoId: selectedPhoto.id,
      frameId: selectedFrame.id,
      filter: editor.filter,
      crop: {
        zoom: editor.zoom,
        offsetX: editor.panX,
        offsetY: editor.panY,
      },
    };

    api
      .print(payload)
      .then((res) => {
        setPrintResult(res.outputUrl ?? null, null);
        setPhase("success");
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
        setPrintResult(null, msg);
        setPhase("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-reset after 30 seconds on success or error
  useEffect(() => {
    if (phase === "success" || phase === "error") {
      resetTimer.current = setTimeout(() => {
        reset();
      }, 30000);
    } else if (resetTimer.current) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
    return () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
        resetTimer.current = null;
      }
    };
  }, [phase, reset]);

  // Retry print job
  const handleRetry = () => {
    submitted.current = false;
    setPhase("rendering");
    // re-trigger by setting back to rendering; but since submitted is now false
    // we need to manually re-submit
    const s = useKioskStore.getState();
    if (!s.currentSession || !s.selectedPhoto || !s.selectedFrame) return;
    api.print({
      sessionId: s.currentSession,
      photoId: s.selectedPhoto.id,
      frameId: s.selectedFrame.id,
      filter: s.editor.filter,
      crop: { zoom: s.editor.zoom, offsetX: s.editor.panX, offsetY: s.editor.panY },
    }).then((res) => {
      setPrintResult(res.outputUrl ?? null, null);
      setPhase("success");
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setPrintResult(null, msg);
      setPhase("error");
    });
  };

  return (
    <div style={styles.container}>
      {/* Order summary always visible at top */}
      <div style={{ margin: 16, padding: 16, background: '#f8f8f8', borderRadius: 8 }}>
        <h3>Ringkasan Pesanan</h3>
        <div>Foto: {selectedPhoto?.id}</div>
        <div>Bingkai: {selectedFrame?.name}</div>
        <div>Harga Frame: {specialFrameSelected ? `+Rp${specialFramePrice?.toLocaleString()}` : "Termasuk Paket"}</div>
        <div>Zoom: {editor.zoom.toFixed(2)}</div>
        <div>Geser: X={editor.panX}, Y={editor.panY}</div>
        <div>Filter: {editor.filter}</div>
      </div>

      {phase === "rendering" && (
        <div style={styles.center} className="fade-in">
          <div className="spinner" />
          <p style={styles.renderText}>Sedang merender mahakarya Anda...</p>
          <p style={styles.subText}>Mohon tunggu sebentar</p>
        </div>
      )}

      {phase === "success" && (
        <div style={styles.center} className="fade-in">
          <p style={styles.successIcon}>✓</p>
          <p style={styles.successText}>Foto Anda sedang dicetak!</p>

          {printOutputUrl && (
            <>
              <p style={styles.qrLabel}>
                Scan QR Code ini untuk download soft copy ke HP Anda
              </p>
              <div style={styles.qrWrap}>
                <QRCodeSVG
                  value={printOutputUrl}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#0a0a0a"
                  level="M"
                />
              </div>
            </>
          )}

          <p style={styles.autoReset}>
            Layar akan otomatis kembali dalam 30 detik
          </p>

          <button style={styles.btnDone} onClick={reset}>
            Selesai
          </button>
        </div>
      )}

      {phase === "error" && (
        <div style={styles.center} className="fade-in">
          <p style={styles.errorIcon}>⚠</p>
          <p style={styles.errorTitle}>
            Mesin cetak memerlukan perhatian staff
          </p>
          <p style={styles.errorMsg}>{printError}</p>
          <p style={styles.errorHint}>Mohon panggil operator</p>

          <div style={styles.errorActions}>
            <button style={styles.btnRetry} onClick={handleRetry}>
              Coba Lagi
            </button>
            <button style={styles.btnBackEditor} onClick={() => setScreen("editor")}>← Kembali ke Editor</button>
          </div>
        </div>
      )}
    </div>
  );
}
}

const styles: Record<string, CSSProperties> = {
  container: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0a0a0a",
    padding: "24px",
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
    textAlign: "center",
    maxWidth: "400px",
  },
  renderText: {
    fontSize: "20px",
    fontWeight: 600,
    color: "#c9a96e",
    marginTop: "12px",
  },
  subText: { fontSize: "14px", color: "#888" },
  successIcon: {
    fontSize: "56px",
    color: "#27ae60",
    fontWeight: 800,
  },
  successText: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#fff",
  },
  qrLabel: { fontSize: "14px", color: "#888", maxWidth: "280px" },
  qrWrap: {
    background: "#fff",
    borderRadius: "16px",
    padding: "20px",
  },
  autoReset: { fontSize: "12px", color: "#555", marginTop: "8px" },
  btnDone: {
    padding: "12px 48px",
    borderRadius: "12px",
    background: "#1a1a1a",
    color: "#ccc",
    fontSize: "15px",
    border: "1px solid #333",
    marginTop: "8px",
  },
  errorIcon: { fontSize: "56px" },
  errorTitle: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#e74c3c",
  },
  errorMsg: { fontSize: "13px", color: "#888", fontFamily: "monospace" },
  errorHint: { fontSize: "16px", color: "#fff", fontWeight: 600 },
  errorActions: { display: "flex", gap: "12px", marginTop: "12px" },
  btnRetry: {
    padding: "12px 24px",
    borderRadius: "12px",
    background: "#c9a96e",
    color: "#0a0a0a",
    fontSize: "15px",
    fontWeight: 700,
  },
  btnBackEditor: {
    padding: "12px 24px",
    borderRadius: "12px",
    background: "#1a1a1a",
    color: "#ccc",
    fontSize: "15px",
    border: "1px solid #333",
  },
};
