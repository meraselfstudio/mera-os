// API client for Capture Engine backend

const API_BASE = import.meta.env.VITE_API_BASE || "http://192.168.1.100:3100";

export interface Photo {
  id: string;
  thumbUrl: string;
  rawUrl: string;
}

export interface Frame {
  id: string;
  name: string;
  url: string;
}

export interface PrintPayload {
  sessionId: string;
  photoId: string;
  frameId: string | null;
  filter: string;
  crop: {
    zoom: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface PrintResult {
  status: "success" | "error";
  message: string;
  outputUrl?: string;
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok || data.status === "error") {
    throw new Error(data.message || `API error: ${res.status}`);
  }
  return data as T;
}

export const api = {
  /** Create a session on the backend */
  createSession(sessionId: string) {
    return apiFetch<{ status: string; sessionId: string }>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    });
  },

  /** Get photos for a session */
  getPhotos(sessionId: string) {
    return apiFetch<{ status: string; photos: Photo[] }>(
      `/api/sessions/${encodeURIComponent(sessionId)}/photos`,
    );
  },

  /** Get available frames */
  getFrames() {
    return apiFetch<{ status: string; frames: Frame[] }>("/api/frames");
  },

  /** Submit a print job */
  print(payload: PrintPayload) {
    return apiFetch<PrintResult>("/api/print", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** Alias for print job (for compatibility) */
  printPhoto(payload: PrintPayload) {
    return api.print(payload);
  },

  /** Render only (no print), returns download URL */
  render(payload: PrintPayload) {
    return apiFetch<PrintResult>("/api/render", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
