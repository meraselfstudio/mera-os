'use client'

import { useEffect, useState, useCallback } from 'react'
import { use } from 'react'
import Link from 'next/link'
import QRCode from 'react-qr-code'
import { supabase } from '@mera/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Registration {
  id: string
  customer_name: string
  instagram_handle: string
  booking_type: 'ONLINE_QRIS' | 'ONLINE_KEEPSLOT'
  status: 'PENDING' | 'VERIFIED' | 'PROCESSED' | 'COMPLETED' | 'EXPIRED'
  session_id: string | null
  preferred_date: string | null
  preferred_time: string | null
  expires_at: string | null
  checked_in_at: string | null
  addons: {
    room?: string | null
    pax?: number
    computed_price?: number
    selected_addons?: string[]
  } | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

function crc16(str: string) {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
  }
  return ((crc & 0xffff) >>> 0).toString(16).toUpperCase().padStart(4, '0')
}

function generateDynamicQRIS(amount: number) {
  const STATIC = '00020101021126690021ID.CO.BANKMANDIRI.WWW01189360000801777298280211717772982880303UMI51440014ID.CO.QRIS.WWW0215ID10253901525400303UMI5204274153033605802ID5915Mera Selfstudio6015Mojokerto (Kab)61056136362070703A0163042FA3'
  let base = STATIC.slice(0, -8).replace('010211', '010212')
  const amountStr = amount.toString()
  const amountField = `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`
  const idx = base.indexOf('5802ID')
  base = idx !== -1 ? base.slice(0, idx) + amountField + base.slice(idx) : base + amountField
  base += '6304'
  return base + crc16(base)
}

const STATUS_MAP = {
  PENDING:   { label: 'Menunggu Verifikasi', color: '#B8860B', bg: 'rgba(184,134,11,0.12)',  border: 'rgba(184,134,11,0.25)' },
  VERIFIED:  { label: 'Terverifikasi ✓',     color: '#1565C0', bg: 'rgba(21,101,192,0.12)',  border: 'rgba(21,101,192,0.25)' },
  PROCESSED: { label: 'Sesi Aktif 📸',       color: '#2E7D32', bg: 'rgba(46,125,50,0.12)',   border: 'rgba(46,125,50,0.25)'  },
  COMPLETED: { label: 'Selesai ✓',           color: '#2E7D32', bg: 'rgba(46,125,50,0.08)',   border: 'rgba(46,125,50,0.2)'   },
  EXPIRED:   { label: 'Expired',             color: '#c62828', bg: 'rgba(198,40,40,0.10)',   border: 'rgba(198,40,40,0.22)'  },
}

const IG_DM = 'mera.selfstudio'

// ── Row component ──────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TiketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [reg, setReg]         = useState<Registration | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    if (!id) return
    supabase
      .from('registrations')
      .select('id, customer_name, instagram_handle, booking_type, status, session_id, preferred_date, preferred_time, expires_at, checked_in_at, addons')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setReg(data as Registration | null)
        setLoading(false)
      })
  }, [id])

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }, [])

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Memuat tiket…</p>
      </div>
    )
  }

  if (!reg) {
    return (
      <div style={{ minHeight: '100dvh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <p style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>Tiket tidak ditemukan</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center' }}>Periksa link yang kamu gunakan, atau hubungi @mera.selfstudio via Instagram.</p>
        <Link href="/" style={{ marginTop: 8, padding: '12px 24px', background: '#622128', color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
          Kembali ke Beranda
        </Link>
      </div>
    )
  }

  const status      = STATUS_MAP[reg.status]
  const price       = reg.addons?.computed_price ?? 0
  const pax         = reg.addons?.pax ?? 1
  const room        = reg.addons?.room ?? '—'
  const addons      = reg.addons?.selected_addons ?? []
  const isQris      = reg.booking_type === 'ONLINE_QRIS'
  const isKeepSlot  = reg.booking_type === 'ONLINE_KEEPSLOT'
  const isActive    = ['PENDING', 'VERIFIED', 'PROCESSED'].includes(reg.status)
  const isExpired   = reg.status === 'EXPIRED'

  const ticketBg     = isQris ? '#ffccbc' : isKeepSlot ? '#fff3cd' : '#f5f5f7'
  const ticketBorder = isQris ? '#ffab91' : isKeepSlot ? '#ffeeba' : '#e0e0e0'
  const textDark     = 'rgba(0,0,0,0.75)'

  return (
    <div style={{ minHeight: '100dvh', background: '#000', paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mera-logo-white.png" alt="Méra" style={{ height: 22 }} />
        </Link>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Tiket Booking</span>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 0' }}>

        {/* Status badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <span style={{
            display: 'inline-block', padding: '8px 20px', borderRadius: 999,
            background: status.bg, border: `1px solid ${status.border}`,
            color: status.color, fontSize: 13, fontWeight: 700, letterSpacing: '0.03em',
          }}>
            {status.label}
          </span>
        </div>

        {/* Ticket card */}
        <div style={{ background: ticketBg, borderRadius: 20, border: `1px solid ${ticketBorder}`, overflow: 'hidden', marginBottom: 16 }}>

          {/* Header strip */}
          <div style={{ padding: '20px 20px 16px', borderBottom: `2px dashed ${ticketBorder}`, position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: -10, left: -10, width: 20, height: 20, borderRadius: '50%', background: '#000' }} />
            <div style={{ position: 'absolute', bottom: -10, right: -10, width: 20, height: 20, borderRadius: '50%', background: '#000' }} />
            <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Booking ID</p>
            <p style={{ fontSize: 22, fontFamily: 'monospace', fontWeight: 800, color: '#1C1C1E', letterSpacing: '0.05em' }}>{reg.session_id ?? id.slice(0, 8).toUpperCase()}</p>
            <p style={{ fontSize: 12, color: textDark, marginTop: 4 }}>a.n. {reg.customer_name} (@{reg.instagram_handle.replace('@', '')})</p>
          </div>

          {/* Body */}
          <div style={{ padding: '16px 20px 20px' }}>
            <Row label="Studio"       value={room} />
            <Row label="Jumlah Orang" value={`${pax} Orang`} />
            {addons.length > 0 && <Row label="Add-On" value={addons.map(a => a.replace(/_/g, ' ')).join(', ')} />}
            <Row label="Tanggal" value={reg.preferred_date ? fmtDate(reg.preferred_date) : '—'} />
            <Row label="Jam Sesi" value={reg.preferred_time ?? '—'} />
            <Row label="Tipe Bayar" value={isQris ? 'Online QRIS' : 'Keep Slot'} />
            {reg.checked_in_at && <Row label="Check-in" value={new Date(reg.checked_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} />}

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${ticketBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: textDark }}>Total Tagihan</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#1C1C1E' }}>{fmtRp(price)}</span>
            </div>

            {/* Keep Slot warning */}
            {isKeepSlot && isActive && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(0,0,0,0.05)', borderRadius: 10 }}>
                <p style={{ fontSize: 12, color: '#7A5C00', fontWeight: 600, lineHeight: 1.5 }}>
                  ⏰ Keep Slot hangus otomatis jika tidak dikonfirmasi dalam 6 jam.
                </p>
              </div>
            )}

            {/* Expired notice */}
            {isExpired && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(198,40,40,0.08)', borderRadius: 10, border: '1px solid rgba(198,40,40,0.15)' }}>
                <p style={{ fontSize: 12, color: '#c62828', fontWeight: 600, lineHeight: 1.5 }}>
                  Booking ini sudah expired. Silakan buat booking baru.
                </p>
              </div>
            )}

            {/* QRIS payment block */}
            {isQris && reg.status === 'PENDING' && price > 0 && (
              <div style={{ marginTop: 16, padding: '20px', background: '#fff', borderRadius: 14, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#000', marginBottom: 14 }}>Scan QRIS untuk Membayar</p>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                  <QRCode value={generateDynamicQRIS(price)} size={180} />
                </div>
                <p style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>
                  Nominal <strong>{fmtRp(price)}</strong> sudah terisi otomatis.<br />
                  Setelah bayar, kirimkan screenshot ke DM kami.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Mulai Sesi Edit — only for PROCESSED with a session_id */}
          {reg.status === 'PROCESSED' && reg.session_id && (
            <a
              href={`https://edit.meraselfstudio.com?sid=${encodeURIComponent(reg.session_id)}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '17px', borderRadius: 14, border: 'none',
                background: '#622128', color: '#fff',
                fontSize: 16, fontWeight: 800, textDecoration: 'none', letterSpacing: '0.02em',
                boxShadow: '0 8px 24px rgba(98,33,40,0.35)',
              }}
            >
              📷 Mulai Sesi Edit Foto
            </a>
          )}

          {/* Copy link */}
          <button
            onClick={copyLink}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)',
              background: copied ? 'rgba(46,125,50,0.2)' : 'rgba(255,255,255,0.07)', color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em',
              transition: 'background 0.2s',
            }}
          >
            {copied ? '✓ Link Tersalin!' : '🔗 Salin Link Tiket'}
          </button>

          {/* Instagram DM */}
          {isActive && (
            <a
              href={`https://ig.me/m/${IG_DM}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px', borderRadius: 14,
                background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)',
                color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none',
              }}
            >
              📩 Konfirmasi via Instagram DM
            </a>
          )}

          {/* Self check-in */}
          {reg.session_id && isActive && !reg.checked_in_at && (
            <a
              href={`/checkin?sid=${encodeURIComponent(reg.session_id)}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '14px', borderRadius: 14,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none',
              }}
            >
              📍 Self Check-in
            </a>
          )}

          {reg.checked_in_at && (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(46,125,50,0.12)', border: '1px solid rgba(46,125,50,0.2)', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#4CAF50', fontWeight: 600 }}>✓ Sudah check-in</p>
            </div>
          )}

          <Link
            href="/booking"
            style={{ textAlign: 'center', padding: '12px', fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
          >
            Buat Booking Baru
          </Link>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 24, lineHeight: 1.6, letterSpacing: '0.03em' }}>
          Simpan halaman ini atau salin linknya untuk melihat status booking kapan saja.
        </p>
      </div>
    </div>
  )
}
