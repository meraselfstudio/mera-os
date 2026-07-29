// Méra OS — Capture Engine v1.0
// Local HTTP server running on Mac Mini (Node.js + Express)
// Bridges Capture One sessions on MERADATA disk to the Kiosk tablet
//
// Setup:
//   cp .env.example .env   (fill in your paths/printer)
//   npm install
//   pm2 start ecosystem.config.js && pm2 save && pm2 startup

'use strict'
require('dotenv').config()

const express = require('express')
const fs = require('fs')
const path = require('path')
const { execFile } = require('child_process')

const app = express()
const PORT = process.env.PORT || 3100
const SESSIONS_PATH = process.env.SESSIONS_PATH || '/Volumes/MERADATA/Capture One Session'
const EXPORTS_PATH = process.env.EXPORTS_PATH || '/Volumes/MERADATA/Méra Exports Photo Database'
const PRINTER_NAME = process.env.PRINTER_NAME || 'Canon_SELPHY_CP1500'

// ─── CORS ────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  'https://edit.meraselfstudio.com',
  'http://localhost:5173',
  'http://localhost:5174',
]

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.use(express.json({ limit: '25mb' }))

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(level, msg, extra) {
  const ts = new Date().toISOString()
  const line = `[${ts}] [${level.toUpperCase()}] ${msg}`
  if (extra) console.log(line, extra)
  else console.log(line)
}

app.use((req, _res, next) => {
  log('info', `${req.method} ${req.path}`)
  next()
})

// ─── File system helpers ──────────────────────────────────────────────────────

const IMAGE_RE = /\.(jpe?g|png|tiff?)$/i

/**
 * Find the .cosessiondb directory for a given sessionId.
 * Capture One names the folder: "<sessionId>.cosessiondb"
 */
function findSessionDir(sessionId) {
  if (!fs.existsSync(SESSIONS_PATH)) {
    throw new Error(`Sessions volume not mounted: ${SESSIONS_PATH}`)
  }
  const entries = fs.readdirSync(SESSIONS_PATH)
  const match = entries.find(
    (e) => e === `${sessionId}.cosessiondb` || e === sessionId
  )
  if (!match) throw new Error(`Session "${sessionId}" not found on disk`)
  return path.join(SESSIONS_PATH, match)
}

/**
 * Capture One proxy thumbnails live at:
 * <session>.cosessiondb/CaptureOne/Cache/Proxies/
 */
function proxiesDir(sessionId) {
  const base = findSessionDir(sessionId)
  const p = path.join(base, 'CaptureOne', 'Cache', 'Proxies')
  if (!fs.existsSync(p)) throw new Error(`Proxies folder missing for "${sessionId}"`)
  return p
}

/**
 * Full-res exports live at:
 * Méra Exports Photo Database/<sessionId>/Color/  (or BW/)
 */
function exportsColorDir(sessionId) {
  const base = path.join(EXPORTS_PATH, sessionId)
  const colorDir = path.join(base, 'Color')
  const bwDir = path.join(base, 'BW')
  if (fs.existsSync(colorDir)) return colorDir
  if (fs.existsSync(bwDir)) return bwDir
  return base // fallback — root session export folder
}

function listImages(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => IMAGE_RE.test(f)).sort()
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/sessions/:sessionId — session metadata (P1)
app.get('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params
  try {
    const files = listImages(proxiesDir(sessionId))
    res.json({ sessionId, photoCount: files.length })
  } catch (err) {
    log('warn', `Session not found: ${sessionId}`, err.message)
    res.status(404).json({ error: err.message })
  }
})

// GET /api/sessions/:sessionId/photos — photo list with URLs (P0)
app.get('/api/sessions/:sessionId/photos', (req, res) => {
  const { sessionId } = req.params
  try {
    const files = listImages(proxiesDir(sessionId))
    const base = `http://${req.headers.host}`
    const sid = encodeURIComponent(sessionId)

    const photos = files.map((filename) => {
      const id = path.basename(filename, path.extname(filename))
      const enc = encodeURIComponent(filename)
      return {
        id,
        thumbnail_url: `${base}/api/images/session/${sid}/thumb/${enc}`,
        full_url: `${base}/api/images/export/${sid}/full/${enc}`,
      }
    })

    res.json({ sessionId, photos })
  } catch (err) {
    log('warn', `Photos list failed: ${sessionId}`, err.message)
    res.status(404).json({ error: err.message })
  }
})

// GET /api/images/:source/:sessionId/:quality/:filename — image serving (P0)
//   source=session  → Capture One Proxies thumbnail
//   source=export   → full-res Color/ export
app.get('/api/images/:source/:sessionId/:quality/:filename', (req, res) => {
  const { source, sessionId, filename } = req.params

  // Guard against path traversal
  if (!/^[\w\-. ]+\.(jpe?g|png|tiff?)$/i.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' })
  }

  let dir
  try {
    if (source === 'session') {
      dir = proxiesDir(sessionId)
    } else if (source === 'export') {
      dir = exportsColorDir(sessionId)
    } else {
      return res.status(400).json({ error: 'source must be "session" or "export"' })
    }
  } catch (err) {
    return res.status(404).json({ error: err.message })
  }

  const filePath = path.resolve(dir, filename)
  // Ensure resolved path stays inside the expected directory
  if (!filePath.startsWith(path.resolve(dir))) {
    return res.status(400).json({ error: 'Path traversal not allowed' })
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image not found' })
  }

  const ext = path.extname(filename).toLowerCase()
  const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.tif': 'image/tiff', '.tiff': 'image/tiff' }
  res.setHeader('Content-Type', mime[ext] || 'application/octet-stream')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.sendFile(filePath)
})

// POST /api/print — receive rendered base64 JPEG, spool to CUPS printer (P0)
app.post('/api/print', async (req, res) => {
  const { sessionId, image, photoId, copies = 1 } = req.body

  if (!sessionId || !image || !photoId) {
    return res.status(400).json({ error: 'Missing required fields: sessionId, image, photoId' })
  }

  const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
  const ts = Date.now()
  const tmpFile = `/tmp/mera-print-${ts}.jpg`

  try {
    fs.writeFileSync(tmpFile, Buffer.from(base64Data, 'base64'))

    await new Promise((resolve, reject) => {
      execFile(
        'lp',
        ['-d', PRINTER_NAME, '-n', String(copies), tmpFile],
        (err, _stdout, stderr) => {
          if (err) reject(new Error(stderr || err.message))
          else resolve()
        }
      )
    })

    const jobId = `mera-${sessionId}-${ts}`
    log('info', `Print job queued: ${jobId} (${copies}×)`)

    // Clean up temp file after 5 minutes
    setTimeout(() => { try { fs.unlinkSync(tmpFile) } catch { } }, 300_000)

    res.json({ status: 'printing', jobId })
  } catch (err) {
    try { fs.unlinkSync(tmpFile) } catch { }
    log('error', `Print failed for ${sessionId}/${photoId}`, err.message)
    res.status(500).json({ error: 'Print failed', message: err.message })
  }
})

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    sessions_path: SESSIONS_PATH,
    exports_path: EXPORTS_PATH,
    printer: PRINTER_NAME,
    sessions_mounted: fs.existsSync(SESSIONS_PATH),
    exports_mounted: fs.existsSync(EXPORTS_PATH),
  })
})

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  log('info', `━━━ Capture Engine listening on :${PORT} ━━━`)
  log('info', `Sessions : ${SESSIONS_PATH}`)
  log('info', `Exports  : ${EXPORTS_PATH}`)
  log('info', `Printer  : ${PRINTER_NAME}`)
})
