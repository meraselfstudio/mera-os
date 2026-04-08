#!/usr/bin/env node
/**
 * Méra OS — Full End-to-End Test Suite
 *
 * Tests:
 *   1. Booking flow     (insert → verify → process → pay → expire)
 *   2. Attendance flow   (clock-in → clock-out)
 *   3. Photobooth        (insert phonebooth_photos record)
 *   4. Products / Pricelist (query products)
 *   5. Check-in          (self check-in via checked_in_at)
 *   6. Realtime          (subscription test)
 *   7. Cleanup
 *
 * Usage: node scripts/e2e-full-test.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(
  resolve(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'pos-dashboard', 'node_modules')
)
const { createClient } = require('@supabase/supabase-js')

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ── Load env ────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(root, 'apps/pos-dashboard/.env.local')
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  const env = {}
  for (const line of lines) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    env[t.slice(0, eq)] = t.slice(eq + 1)
  }
  return env
}

const env = loadEnv()
const SUPABASE_URL = env.VITE_SUPABASE_URL
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY
const PORTAL_URL = env.VITE_PORTAL_URL || 'https://meraselfstudio.com'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── State ──────────────────────────────────────────────────
const TEST_PREFIX = 'E2ETEST'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let testRegId = null
let testTxId = null
let testAttendanceId = null
let testPhotoId = null
let testCrewId = null

let totalPassed = 0
let totalFailed = 0
let totalSkipped = 0

function wibToday() {
  const now = new Date(Date.now() + 7 * 3600 * 1000)
  return now.toISOString().slice(0, 10)
}

function pass(label) {
  totalPassed++
  console.log(`  ✅ ${label}`)
}
function fail(label, detail) {
  totalFailed++
  console.error(`  ❌ ${label}`)
  if (detail) console.error(`     ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`)
}
function skip(label, reason) {
  totalSkipped++
  console.log(`  ⏭  ${label} — ${reason}`)
}

// ═══════════════════════════════════════════════════════════
//  SUITE 1: BOOKING FLOW
// ═══════════════════════════════════════════════════════════
async function suiteBooking() {
  console.log('\n╔═══════════════════════════════════════════════╗')
  console.log('║  SUITE 1: BOOKING FLOW                        ║')
  console.log('╚═══════════════════════════════════════════════╝')

  // Step 1: Insert booking
  console.log('\n🔵 1.1 — Insert online booking')
  const day = wibToday()
  const code = Math.random().toString(36).slice(2, 6).toUpperCase()
  const sessionId = `${TEST_PREFIX}-${code}`

  const { data: reg, error: regErr } = await supabase
    .from('registrations')
    .insert({
      customer_name: `${TEST_PREFIX} User`,
      instagram_handle: '@e2e_test',
      booking_type: 'ONLINE_KEEPSLOT',
      preferred_date: day,
      preferred_time: '14:00',
      session_id: sessionId,
      jumlah_orang: 2,
      expires_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      addons: {
        room: 'Basic Studio',
        variant: 'LG',
        selected_addons: [],
        pax: 2,
        computed_price: 50000,
      },
    })
    .select('id, status, session_id')
    .single()

  if (regErr) {
    fail('INSERT registration', regErr.message)
    return false
  }

  testRegId = reg.id
  if (reg.status !== 'PENDING') {
    fail('Status should be PENDING', `got: ${reg.status}`)
    return false
  }
  pass(`Booking created: ${reg.session_id} (${reg.id.slice(0, 8)}…) — PENDING`)

  // Step 2: Query appears in today's registrations
  console.log('\n🔵 1.2 — Verify booking appears in today\'s registrations')
  const { data: found, error: findErr } = await supabase
    .from('registrations')
    .select('id, status, customer_name')
    .or(`preferred_date.eq.${day},created_at.gte.${day}T00:00:00`)
    .eq('id', testRegId)
    .single()

  if (findErr || !found) {
    fail('Query today registrations', findErr?.message ?? 'not found')
    return false
  }
  pass(`Found: ${found.customer_name} — ${found.status}`)

  // Step 3: PENDING → VERIFIED
  console.log('\n🔵 1.3 — Verify booking (PENDING → VERIFIED)')
  const { error: verErr } = await supabase
    .from('registrations')
    .update({ status: 'VERIFIED' })
    .eq('id', testRegId)

  if (verErr) {
    fail('UPDATE → VERIFIED', verErr.message)
    return false
  }

  const { data: v } = await supabase.from('registrations').select('status').eq('id', testRegId).single()
  if (v?.status !== 'VERIFIED') {
    fail('Status not VERIFIED', `got: ${v?.status}`)
    return false
  }
  pass('Registration → VERIFIED')

  // Step 4: VERIFIED → PROCESSED + create transaction
  console.log('\n🔵 1.4 — Process to studio (VERIFIED → PROCESSED + transaction)')
  const { error: procErr } = await supabase
    .from('registrations')
    .update({ status: 'PROCESSED' })
    .eq('id', testRegId)

  if (procErr) {
    fail('UPDATE → PROCESSED', procErr.message)
    return false
  }

  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .insert({
      session_id: sessionId,
      registration_id: testRegId,
      processed_by: null,
      selection_start_time: null,
      total_amount: 50000,
      discount_amount: 0,
      discount_reason: null,
      payment_method: null,
      status: 'ACTIVE',
    })
    .select('id, status, session_id, total_amount')
    .single()

  if (txErr) {
    fail('INSERT transaction', txErr.message)
    return false
  }

  testTxId = tx.id
  pass(`Registration → PROCESSED`)
  pass(`Transaction created: ${tx.session_id} — ACTIVE — Rp ${tx.total_amount.toLocaleString('id-ID')}`)

  // Step 5: Mark paid
  console.log('\n🔵 1.5 — Mark paid (ACTIVE → PAID)')
  const { error: payErr } = await supabase
    .from('transactions')
    .update({
      status: 'PAID',
      payment_method: 'CASH',
    })
    .eq('id', testTxId)

  if (payErr) {
    fail('UPDATE transaction → PAID', payErr.message)
    return false
  }

  const { error: expErr } = await supabase
    .from('registrations')
    .update({ status: 'EXPIRED' })
    .eq('id', testRegId)

  if (expErr) {
    fail('UPDATE registration → EXPIRED', expErr.message)
    return false
  }

  const { data: txF } = await supabase.from('transactions').select('status, payment_method').eq('id', testTxId).single()
  const { data: regF } = await supabase.from('registrations').select('status').eq('id', testRegId).single()

  if (txF?.status !== 'PAID') {
    fail(`Transaction should be PAID, got: ${txF?.status}`)
    return false
  }
  if (regF?.status !== 'EXPIRED') {
    fail(`Registration should be EXPIRED, got: ${regF?.status}`)
    return false
  }

  pass(`Transaction → PAID (${txF.payment_method})`)
  pass(`Registration → EXPIRED`)
  return true
}

// ═══════════════════════════════════════════════════════════
//  SUITE 2: ATTENDANCE FLOW
// ═══════════════════════════════════════════════════════════
async function suiteAttendance() {
  console.log('\n╔═══════════════════════════════════════════════╗')
  console.log('║  SUITE 2: ATTENDANCE FLOW                     ║')
  console.log('╚═══════════════════════════════════════════════╝')

  // Find an active crew member to use
  console.log('\n🔵 2.1 — Find active crew member')
  const { data: crewList, error: crewErr } = await supabase
    .from('crew')
    .select('id, nama, role, status_gaji')
    .eq('is_active', true)
    .limit(1)

  if (crewErr || !crewList?.length) {
    skip('Attendance suite', 'No active crew found in database')
    return true // not a failure, just no data
  }

  const crew = crewList[0]
  testCrewId = crew.id
  pass(`Found crew: ${crew.nama} (${crew.role}, ${crew.status_gaji})`)

  // Step 2: Clock in
  console.log('\n🔵 2.2 — Clock in')
  const clockInTime = new Date().toISOString()
  const { data: att, error: attErr } = await supabase
    .from('attendance')
    .insert({
      crew_id: crew.id,
      clock_in: clockInTime,
      shift_type: 'Weekday Full Time',
      base_rate: 75000,
      late_minutes: 0,
      penalty_amount: 0,
      bonus_amount: 0,
      photo_in_url: 'https://example.com/e2e-test-photo-in.jpg',
      status: 'ACTIVE',
    })
    .select('id, status, clock_in, shift_type')
    .single()

  if (attErr) {
    fail('INSERT attendance (clock-in)', attErr.message)
    return false
  }

  testAttendanceId = att.id
  if (att.status !== 'ACTIVE') {
    fail('Attendance status should be ACTIVE', `got: ${att.status}`)
    return false
  }
  pass(`Clock-in: ${att.shift_type} — ${att.status}`)

  // Step 3: Verify attendance appears in today's query
  console.log('\n🔵 2.3 — Verify attendance appears in query')
  const day = wibToday()
  const { data: attList, error: attListErr } = await supabase
    .from('attendance')
    .select('id, crew_id, status, clock_in')
    .gte('clock_in', `${day}T00:00:00`)
    .lte('clock_in', `${day}T23:59:59`)
    .eq('id', testAttendanceId)

  if (attListErr || !attList?.length) {
    fail('Query today attendance', attListErr?.message ?? 'not found')
    return false
  }
  pass(`Attendance record found in today's list`)

  // Step 4: Clock out
  console.log('\n🔵 2.4 — Clock out')
  const clockOutTime = new Date().toISOString()
  const { error: outErr } = await supabase
    .from('attendance')
    .update({
      clock_out: clockOutTime,
      status: 'COMPLETED',
      bonus_amount: 10000,
      photo_out_url: 'https://example.com/e2e-test-photo-out.jpg',
    })
    .eq('id', testAttendanceId)

  if (outErr) {
    fail('UPDATE attendance (clock-out)', outErr.message)
    return false
  }

  const { data: attF } = await supabase.from('attendance').select('status, bonus_amount, clock_out').eq('id', testAttendanceId).single()
  if (attF?.status !== 'COMPLETED') {
    fail(`Attendance should be COMPLETED, got: ${attF?.status}`)
    return false
  }

  pass(`Clock-out: COMPLETED — bonus Rp ${attF.bonus_amount.toLocaleString('id-ID')}`)
  return true
}

// ═══════════════════════════════════════════════════════════
//  SUITE 3: PHOTOBOOTH
// ═══════════════════════════════════════════════════════════
async function suitePhotobooth() {
  console.log('\n╔═══════════════════════════════════════════════╗')
  console.log('║  SUITE 3: PHOTOBOOTH                          ║')
  console.log('╚═══════════════════════════════════════════════╝')

  // Step 1: Insert a phonebooth_photos record
  console.log('\n🔵 3.1 — Insert photobooth record')
  const { data: photo, error: photoErr } = await supabase
    .from('phonebooth_photos')
    .insert({
      strip_url: 'https://example.com/e2e-test-strip.png',
      filter: 'bw',
      photo_count: 3,
      promo_consent: true,
    })
    .select('id, strip_url, filter, photo_count, promo_consent, created_at')
    .single()

  if (photoErr) {
    if (photoErr.message.includes('schema cache') || photoErr.message.includes('does not exist')) {
      skip('INSERT phonebooth_photos', 'Table not created yet — run migration 010_phonebooth.sql in Supabase SQL Editor')
      // Still test the upload API route
    } else {
      fail('INSERT phonebooth_photos', photoErr.message)
      return false
    }
  } else {
    testPhotoId = photo.id
    pass(`Photo record created: ${photo.id.slice(0, 8)}… — filter: ${photo.filter}, count: ${photo.photo_count}`)
  }

  // Step 2: Query it back
  if (testPhotoId) {
    console.log('\n🔵 3.2 — Query photobooth record')
    const { data: found, error: findErr } = await supabase
      .from('phonebooth_photos')
      .select('*')
      .eq('id', testPhotoId)
      .single()

    if (findErr || !found) {
      fail('SELECT phonebooth_photos', findErr?.message ?? 'not found')
      return false
    }

    if (found.promo_consent !== true) {
      fail('promo_consent should be true', `got: ${found.promo_consent}`)
      return false
    }

    pass(`Queried back: filter=${found.filter}, promo_consent=${found.promo_consent}`)
  } else {
    console.log('\n🔵 3.2 — Query photobooth record')
    skip('Query photobooth record', 'No record inserted (table missing)')
  }

  // Step 3: Test upload API route (server-side proxy)
  console.log('\n🔵 3.3 — Test upload-strip API route')
  try {
    const res = await fetch(`${PORTAL_URL}/api/upload-strip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        filename: 'e2e-test-strip.png',
        folder: 'phonebooth',
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (res.ok || res.status === 302 || res.status === 200) {
      pass(`Upload API responded: ${res.status} ${res.statusText}`)
    } else {
      const body = await res.text().catch(() => '')
      fail(`Upload API returned ${res.status}`, body.slice(0, 200))
    }
  } catch (err) {
    fail('Upload API fetch', err.message)
  }

  return true
}

// ═══════════════════════════════════════════════════════════
//  SUITE 4: PRODUCTS / PRICELIST
// ═══════════════════════════════════════════════════════════
async function suiteProducts() {
  console.log('\n╔═══════════════════════════════════════════════╗')
  console.log('║  SUITE 4: PRODUCTS / PRICELIST                ║')
  console.log('╚═══════════════════════════════════════════════╝')

  // Step 1: Query all active products
  console.log('\n🔵 4.1 — Query active products')
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, nama, kategori, tipe_harga, harga_dasar, is_active, is_addon')
    .eq('is_active', true)
    .order('id')

  if (prodErr) {
    fail('SELECT products', prodErr.message)
    return false
  }

  if (!products?.length) {
    fail('No active products found')
    return false
  }

  pass(`Found ${products.length} active products`)

  // Step 2: Check we have expected categories
  console.log('\n🔵 4.2 — Verify product categories')
  const categories = [...new Set(products.map(p => p.kategori))]
  const expectedCats = ['Basic Studio', 'package']

  for (const cat of expectedCats) {
    if (categories.includes(cat)) {
      pass(`Category present: ${cat}`)
    } else {
      fail(`Missing category: ${cat}`, `Found: ${categories.join(', ')}`)
    }
  }

  // Step 3: Print product summary
  console.log('\n🔵 4.3 — Product summary')
  for (const p of products) {
    const price = p.harga_dasar ? `Rp ${p.harga_dasar.toLocaleString('id-ID')}` : 'tiered'
    const tag = p.is_addon ? ' [ADD-ON]' : ''
    console.log(`     • ${p.nama} (${p.kategori}) — ${price}${tag}`)
  }
  pass(`Product catalog verified`)

  return true
}

// ═══════════════════════════════════════════════════════════
//  SUITE 5: CHECK-IN FLOW
// ═══════════════════════════════════════════════════════════
async function suiteCheckin() {
  console.log('\n╔═══════════════════════════════════════════════╗')
  console.log('║  SUITE 5: CHECK-IN FLOW                       ║')
  console.log('╚═══════════════════════════════════════════════╝')

  if (!testRegId) {
    skip('Check-in suite', 'No test registration (booking suite failed)')
    return true
  }

  // Check if checked_in_at column exists by trying a select
  console.log('\n🔵 5.1 — Check if checked_in_at column exists')
  const { error: colCheck } = await supabase
    .from('registrations')
    .select('checked_in_at')
    .eq('id', testRegId)
    .single()

  if (colCheck && (colCheck.message.includes('does not exist') || colCheck.message.includes('schema cache'))) {
    skip('Check-in flow', 'checked_in_at column missing — run migration 009_add_checkin.sql in Supabase SQL Editor')
    return true
  }

  // Reset registration to VERIFIED for checkin test
  console.log('\n🔵 5.2 — Reset registration for check-in test')
  const { error: resetErr } = await supabase
    .from('registrations')
    .update({ status: 'VERIFIED', checked_in_at: null })
    .eq('id', testRegId)

  if (resetErr) {
    fail('Reset registration for check-in', resetErr.message)
    return false
  }
  pass('Registration reset to VERIFIED, checked_in_at = null')

  // Step 3: Self check-in (simulates QR scan)
  console.log('\n🔵 5.3 — Self check-in (update checked_in_at)')
  const checkinTime = new Date().toISOString()
  const { error: ciErr } = await supabase
    .from('registrations')
    .update({ checked_in_at: checkinTime })
    .eq('id', testRegId)

  if (ciErr) {
    fail('UPDATE checked_in_at', ciErr.message)
    return false
  }

  // Step 4: Verify checked_in_at is set
  console.log('\n🔵 5.4 — Verify check-in timestamp')
  const { data: ciReg, error: ciRegErr } = await supabase
    .from('registrations')
    .select('checked_in_at, status')
    .eq('id', testRegId)
    .single()

  if (ciRegErr || !ciReg) {
    fail('SELECT checked_in_at', ciRegErr?.message ?? 'not found')
    return false
  }

  if (!ciReg.checked_in_at) {
    fail('checked_in_at should be set', `got: ${ciReg.checked_in_at}`)
    return false
  }

  pass(`Checked in at: ${ciReg.checked_in_at}`)
  pass(`Status still: ${ciReg.status}`)
  return true
}

// ═══════════════════════════════════════════════════════════
//  SUITE 6: REALTIME SUBSCRIPTION
// ═══════════════════════════════════════════════════════════
async function suiteRealtime() {
  console.log('\n╔═══════════════════════════════════════════════╗')
  console.log('║  SUITE 6: REALTIME SUBSCRIPTION               ║')
  console.log('╚═══════════════════════════════════════════════╝')

  if (!testRegId) {
    skip('Realtime suite', 'No test registration')
    return true
  }

  console.log('\n🔵 6.1 — Subscribe to registration changes')

  return new Promise((resolve) => {
    let received = false
    const timeout = setTimeout(() => {
      if (!received) {
        fail('No realtime event within 8s — check if realtime is enabled for registrations')
        channel.unsubscribe()
        resolve(false)
      }
    }, 8000)

    const channel = supabase
      .channel('e2e-rt-test')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'registrations', filter: `id=eq.${testRegId}` },
        (payload) => {
          received = true
          clearTimeout(timeout)
          pass(`Realtime event received: status → ${payload.new?.status ?? '(unknown)'}`)
          channel.unsubscribe()
          resolve(true)
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          pass('Subscribed to channel')
          await sleep(500)
          // Trigger update
          await supabase.from('registrations').update({ status: 'EXPIRED' }).eq('id', testRegId)
        }
      })
  })
}

// ═══════════════════════════════════════════════════════════
//  SUITE 7: CREW QUERY (bonus)
// ═══════════════════════════════════════════════════════════
async function suiteCrew() {
  console.log('\n╔═══════════════════════════════════════════════╗')
  console.log('║  SUITE 7: CREW / STAFF QUERY                  ║')
  console.log('╚═══════════════════════════════════════════════╝')

  console.log('\n🔵 7.1 — Query active crew')
  const { data: crew, error: crewErr } = await supabase
    .from('crew')
    .select('id, nama, role, status_gaji, is_active')
    .eq('is_active', true)
    .order('nama')

  if (crewErr) {
    fail('SELECT crew', crewErr.message)
    return false
  }

  if (!crew?.length) {
    skip('Crew query', 'No active crew in database')
    return true
  }

  pass(`Found ${crew.length} active crew members`)
  for (const c of crew) {
    console.log(`     • ${c.nama} — ${c.role} (${c.status_gaji})`)
  }

  // Check role distribution
  console.log('\n🔵 7.2 — Role distribution')
  const roles = crew.reduce((acc, c) => { acc[c.role] = (acc[c.role] || 0) + 1; return acc }, {})
  for (const [role, count] of Object.entries(roles)) {
    pass(`${role}: ${count} member(s)`)
  }

  return true
}

// ═══════════════════════════════════════════════════════════
//  CLEANUP
// ═══════════════════════════════════════════════════════════
async function cleanup() {
  console.log('\n🧹 CLEANUP: removing test data')
  const items = [
    testTxId && ['transactions', testTxId],
    testRegId && ['registrations', testRegId],
    testAttendanceId && ['attendance', testAttendanceId],
    testPhotoId && ['phonebooth_photos', testPhotoId],
  ].filter(Boolean)

  for (const [table, id] of items) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) fail(`Delete ${table}`, error.message)
    else pass(`${table} record deleted`)
  }
}

// ═══════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════════════')
  console.log(' Méra OS — Full End-to-End Test Suite')
  console.log('═══════════════════════════════════════════════')
  console.log(`📍 Supabase: ${SUPABASE_URL}`)
  console.log(`🌐 Portal:   ${PORTAL_URL}`)
  console.log(`📅 Date (WIB): ${wibToday()}`)
  console.log(`⏰ Time: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`)

  const suites = [
    ['Booking Flow', suiteBooking],
    ['Attendance', suiteAttendance],
    ['Photobooth', suitePhotobooth],
    ['Products/Pricelist', suiteProducts],
    ['Check-in', suiteCheckin],
    ['Realtime', suiteRealtime],
    ['Crew/Staff', suiteCrew],
  ]

  const results = []
  for (const [name, fn] of suites) {
    try {
      const ok = await fn()
      results.push([name, ok ? 'PASS' : 'FAIL'])
    } catch (err) {
      fail(`Suite "${name}" threw`, err.message)
      results.push([name, 'ERROR'])
    }
  }

  await cleanup()

  console.log('\n═══════════════════════════════════════════════')
  console.log(' RESULTS SUMMARY')
  console.log('═══════════════════════════════════════════════')
  for (const [name, status] of results) {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '💥'
    console.log(`  ${icon} ${name}: ${status}`)
  }
  console.log('───────────────────────────────────────────────')
  console.log(`  ✅ Passed:  ${totalPassed}`)
  console.log(`  ❌ Failed:  ${totalFailed}`)
  console.log(`  ⏭  Skipped: ${totalSkipped}`)
  console.log('═══════════════════════════════════════════════')
  process.exit(totalFailed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Fatal:', err)
  cleanup().then(() => process.exit(1))
})
