// Screen 3: Canvas Editor & Preview
// - Real-time preview with pinch-to-zoom and pan
// - Filter selection (Normal, B&W, Vintage)
// - Frame overlay selection
// - Back / Print buttons

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useKioskStore, type FilterType } from "../store/useKioskStore";

const CANVAS_ASPECT = 3 / 2; // 1800x1200 = 3:2

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "grayscale", label: "B&W" },
  { id: "vintage", label: "Vintage" },
];

export function EditorScreen() {
  const {
    selectedPhoto,
    editor,
    frames,
    updateEditor,
    setScreen,
    selectedFrame,
  } = useKioskStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const frameImgRef = useRef<HTMLImageElement | null>(null);

  // Pointer tracking for pan
  const pointerCache = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDist = useRef<number | null>(null);
  const lastPan = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [imgLoaded, setImgLoaded] = useState(false);

  // Load raw photo
  useEffect(() => {
    if (!selectedPhoto) return;
    setImgLoaded(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = selectedPhoto.rawUrl;
  }, [selectedPhoto]);


  // Canvas drawing
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, cw, ch);

    // Calculate draw params with zoom & pan
    const { zoom, panX, panY } = editor;
    const imgAspect = img.width / img.height;
    const canvasAspect = cw / ch;

    let drawW: number, drawH: number;
    if (imgAspect > canvasAspect) {
      drawH = ch * zoom;
      drawW = drawH * imgAspect;
    } else {
      drawW = cw * zoom;
      drawH = drawW / imgAspect;
    }

    const drawX = (cw - drawW) / 2 + panX;
    const drawY = (ch - drawH) / 2 + panY;

    // Clamp pan so image always covers canvas
    const clampedX = clampPan(drawX, drawW, cw);
    const clampedY = clampPan(drawY, drawH, ch);

    // Update store if clamped
    if (clampedX !== drawX || clampedY !== drawY) {
      const dx = clampedX - ((cw - drawW) / 2);
      const dy = clampedY - ((ch - drawH) / 2);
      updateEditor({ panX: dx, panY: dy });
    }

    // Apply filter via canvas
    if (editor.filter === "grayscale") {
      ctx.filter = "grayscale(1)";
    } else if (editor.filter === "vintage") {
      ctx.filter = "sepia(0.4) saturate(0.7) brightness(1.05)";
    } else {
      ctx.filter = "none";
    }

    ctx.drawImage(img, clampedX, clampedY, drawW, drawH);
    ctx.filter = "none";

    // Draw frame overlay
    if (frameImgRef.current) {
      ctx.globalAlpha = selectedFrame?.type === 'special' ? 0.7 : 1;
      ctx.drawImage(frameImgRef.current, 0, 0, cw, ch);
      ctx.globalAlpha = 1;
    }
    // Draw watermark for special frame
    if (selectedFrame?.type === 'special') {
      ctx.save();
      ctx.font = 'bold 32px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'right';
      ctx.fillText('PREVIEW', cw - 24, ch - 24);
      ctx.restore();
    }
  }, [editor, updateEditor, selectedFrame?.type]);

  // Load frame overlay
  useEffect(() => {
    if (!selectedFrame) {
      frameImgRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { frameImgRef.current = img; draw(); };
    img.src = selectedFrame.url;
  }, [selectedFrame, draw]);

  // Redraw when editor state or image changes
  useEffect(() => {
    if (imgLoaded) draw();
  }, [imgLoaded, editor, draw]);

  // Resize canvas to fill container
  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const maxW = container.clientWidth;
      const maxH = container.clientHeight;

      let w = maxW;
      let h = w / CANVAS_ASPECT;
      if (h > maxH) {
        h = maxH;
        w = h * CANVAS_ASPECT;
      }

      canvas.width = Math.round(w * 2); // 2x for retina
      canvas.height = Math.round(h * 2);
      canvas.style.width = `${Math.round(w)}px`;
      canvas.style.height = `${Math.round(h)}px`;
      draw();
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  // --- Touch/Pointer handlers for pan & pinch-to-zoom ---

  const handlePointerDown = (e: ReactPointerEvent) => {
    pointerCache.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastPan.current = { x: editor.panX, y: editor.panY };
  };

  const handlePointerMove = (e: ReactPointerEvent) => {
    if (!pointerCache.current.has(e.pointerId)) return;

    pointerCache.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pointers = Array.from(pointerCache.current.values());

    if (pointers.length === 2) {
      // Pinch to zoom
      const dist = Math.hypot(
        pointers[0].x - pointers[1].x,
        pointers[0].y - pointers[1].y,
      );
      if (lastPinchDist.current !== null) {
        const scale = dist / lastPinchDist.current;
        const newZoom = Math.max(1, Math.min(5, editor.zoom * scale));
        updateEditor({ zoom: newZoom });
      }
      lastPinchDist.current = dist;
    } else if (pointers.length === 1) {
      // Single finger pan
      const prev = pointerCache.current.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      pointerCache.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      updateEditor({ panX: editor.panX + dx, panY: editor.panY + dy });
    }
  };

  const handlePointerUp = (e: ReactPointerEvent) => {
    pointerCache.current.delete(e.pointerId);
    if (pointerCache.current.size < 2) {
      lastPinchDist.current = null;
    }
  };

  const handleProceedPrint = () => {
    useKioskStore.getState().touch();
    setScreen("printing");
  };

  return (
    <div style={styles.container}>
      {/* Canvas area */}
      <div
        ref={containerRef}
        style={styles.canvasWrap}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {!imgLoaded && (
          <div style={styles.loading}>
            <div className="spinner" />
          </div>
        )}
        <canvas ref={canvasRef} style={styles.canvas} />
      </div>

      {/* Controls panel */}
      <div style={styles.controls}>
        {/* Filters */}
        <div style={styles.section}>
          <p style={styles.sectionLabel}>Filter</p>
          <div style={styles.row}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                style={{
                  ...styles.chip,
                  ...(editor.filter === f.id ? styles.chipActive : {}),
                }}
                onClick={() => updateEditor({ filter: f.id })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Frames */}
        <div style={styles.section}>
          <p style={styles.sectionLabel}>Frame</p>
          <div style={styles.row}>
            <button
              style={{
                ...styles.frameThumb,
                ...(editor.frameId === null ? styles.frameActive : {}),
              }}
              onClick={() => updateEditor({ frameId: null })}
            >
              <span style={{ fontSize: 20 }}>✕</span>
              <span style={{ fontSize: 10 }}>Tanpa</span>
            </button>
            {frames.map((f) => (
              <button
                key={f.id}
                style={{
                  ...styles.frameThumb,
                  ...(editor.frameId === f.id ? styles.frameActive : {}),
                }}
                onClick={() => updateEditor({ frameId: f.id })}
              >
                <img src={f.url} alt={f.name} style={styles.frameImg} />
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.btnBack} onClick={() => setScreen("gallery")}>
            ← Kembali
          </button>
          <button style={styles.btnPrint} onClick={handleProceedPrint}>
            Lanjut Cetak →
          </button>
        </div>
      </div>
    </div>
  );
}

/** Clamp draw position so image always covers the canvas */
function clampPan(pos: number, imgSize: number, canvasSize: number): number {
  if (imgSize <= canvasSize) return (canvasSize - imgSize) / 2;
  const min = canvasSize - imgSize;
  const max = 0;
  return Math.max(min, Math.min(max, pos));
}

const styles: Record<string, CSSProperties> = {
  container: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "#0a0a0a",
  },
  canvasWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    touchAction: "none",
    position: "relative",
  },
  canvas: {
    borderRadius: "8px",
    background: "#111",
  },
  loading: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  controls: {
    flexShrink: 0,
    borderTop: "1px solid #222",
    padding: "12px 16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxHeight: "40vh",
    overflowY: "auto",
  },
  section: { display: "flex", flexDirection: "column", gap: "6px" },
  sectionLabel: { fontSize: "12px", color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 },
  row: { display: "flex", gap: "8px", flexWrap: "wrap" },
  chip: {
    padding: "8px 18px",
    borderRadius: "20px",
    background: "#1a1a1a",
    color: "#ccc",
    fontSize: "13px",
    fontWeight: 600,
    border: "1px solid #333",
  },
  chipActive: {
    background: "#c9a96e",
    color: "#0a0a0a",
    borderColor: "#c9a96e",
  },
  frameThumb: {
    width: "56px",
    height: "40px",
    borderRadius: "8px",
    background: "#1a1a1a",
    border: "2px solid #333",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#888",
    overflow: "hidden",
    padding: 0,
  },
  frameActive: {
    borderColor: "#c9a96e",
  },
  frameImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  actions: {
    display: "flex",
    gap: "12px",
    paddingTop: "4px",
  },
  btnBack: {
    flex: 1,
    padding: "14px",
    borderRadius: "12px",
    background: "#1a1a1a",
    color: "#ccc",
    fontSize: "15px",
    border: "1px solid #333",
  },
  btnPrint: {
    flex: 2,
    padding: "14px",
    borderRadius: "12px",
    background: "#27ae60",
    color: "#fff",
    fontSize: "16px",
    fontWeight: 700,
  },
};
