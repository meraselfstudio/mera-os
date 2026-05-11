// Capture Engine API client
// Base URL configurable via VITE_API_BASE (default: Mac Mini local IP)

const API_BASE = import.meta.env.VITE_API_BASE || 'http://192.168.1.100:3100'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Photo {
  id: string
  thumbnail_url: string
  full_url: string
}

export interface SessionInfo {
  sessionId: string
  photoCount: number
}

export interface PrintPayload {
  sessionId: string
  image: string   // data:image/jpeg;base64,...  (rendered canvas)
  photoId: string
  copies?: number
}

export interface PrintResult {
  status: 'printing' | 'error'
  jobId?: string
  error?: string
  message?: string
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || data.message || `HTTP ${res.status}`)
  }
  return data as T
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const api = {
  /** Validate session and get photo count */
  getSession(sessionId: string) {
    return apiFetch<SessionInfo>(`/api/sessions/${encodeURIComponent(sessionId)}`)
  },

  /** Get photo list (thumbnail + full URLs) for a session */
  getPhotos(sessionId: string) {
    return apiFetch<{ sessionId: string; photos: Photo[] }>(
      `/api/sessions/${encodeURIComponent(sessionId)}/photos`
    )
  },

  /** Submit a rendered JPEG (base64) to the printer */
  print(payload: PrintPayload) {
    return apiFetch<PrintResult>('/api/print', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /** Health check — confirm Capture Engine is reachable */
  health() {
    return apiFetch<{ status: string }>('/health')
  },
}
