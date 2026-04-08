#!/usr/bin/env node
/**
 * Méra OS — End-to-end booking→POS flow test
 *
 * Simulates the full lifecycle:
 *   1. Online booking (customer portal inserts registration)
 *   2. Realtime: verify registration appears
 *   3. POS: Verify booking (PENDING → VERIFIED)
 *   4. POS: Process → Studio (VERIFIED → PROCESSED, creates transaction)
 *   5. POS: Mark Paid (transaction ACTIVE → PAID, registration → EXPIRED)
 *   6. Cleanup: delete test data
 *
 * Usage: node scripts/e2e-booking-flow.mjs
 * Reads env from apps/pos-dashboard/.env.local
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'pos-dashboard', 'node_modules'))
const { createClient } = require('@supabase/supabase-js')

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ── Load env from pos-dashboard/.env.local ─────────────────
function loadEnv() {
  const envPath = resolve(root, 'apps/pos-dashboard/.env.local')
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  const env = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1)
  }
  return env
}

const env = loadEnv()
const SUPABASE_URL = env.VITE_SUPABASE_URL
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in apps/pos-dashboard/.env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Helpers ────────────────────────────────────────────────
const TEST_PREFIX = 'E2ETEST'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let testRegId = null
let testTxId = null

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function pass(label) { console.log(`  ✅ ${label}`) }
function fail(label, detail) {
  console.error(`  ❌ ${label}`)
  if (detail) console.error(`     ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`)
}

// ── Test Steps ─────────────────────────────────────────────
async function step1_insertBooking() {
  console.log('\n🔵 Step 1: Online Booking (insert registration)')
  const day = todayKey()
  const code = Math.random().toString(36).slice(2, 6).toUpperCase()
  const sessionId = `${TEST_PREFIX}-${code}`

  const payload = {
    customer_name: `${TEST_PREFIX} User`,
    instagram_handle: '@e2e_test_user',
    booking_type: 'ONLINE_KEEPSLOT',
    preferred_date: day,
    preferred_time: '14:00',
    session_id: sessionId,
    expires_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    addons: {
      room: 'Basic Studio',
      variant: 'LG',
      selected_addons: [],
      pax: 2,
      computed_price: 50000,
    },
  }

  const { data, error } = await supabase
    .from('registrations')
    .insert(payload)
    .select('id, status, session_id')
    .single()

  if (error) {
    fail('INSERT registration', error.message)
    return null
  }

  if (data.status !== 'PENDING') {
    fail('Status should be PENDING', `got: ${data.status}`)
    return null
  }

  testRegId = data.id
  pass(`Booking created: ${data.session_id} (${data.id.slice(0, 8)}…)`)
  return data
}

async function step2_verifyRealtimeAppears() {
  console.log('\n🔵 Step 2: Verify booking appears via SELECT (simulates POS load)')
  const day = todayKey()

  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('preferred_date', day)
    .eq('id', testRegId)
    .single()

  if (error || !data) {
    fail('SELECT registration by date + id', error?.message ?? 'no data')
    return false
  }
  pass(`Found in today's registrations: ${data.customer_name} — ${data.status}`)
  return true
}

async function step3_verifyBooking() {
  console.log('\n🔵 Step 3: POS Verify (PENDING → VERIFIED)')

  const { error } = await supabase
    .from('registrations')
    .update({ status: 'VERIFIED' })
    .eq('id', testRegId)

  if (error) {
    fail('UPDATE → VERIFIED', error.message)
    return false
  }

  // Confirm
  const { data } = await supabase.from('registrations').select('status').eq('id', testRegId).single()
  if (data?.status !== 'VERIFIED') {
    fail('Status not VERIFIED after update', `got: ${data?.status}`)
    return false
  }

  pass('Registration status → VERIFIED')
  return true
}

async function step4_processToStudio() {
  console.log('\n🔵 Step 4: POS Process → Studio (VERIFIED → PROCESSED + create transaction)')

  // Update registration
  const { error: regErr } = await supabase
    .from('registrations')
    .update({ status: 'PROCESSED' })
    .eq('id', testRegId)

  if (regErr) {
    fail('UPDATE → PROCESSED', regErr.message)
    return false
  }

  // Get session_id
  const { data: reg } = await supabase.from('registrations').select('session_id').eq('id', testRegId).single()
  const sessionId = reg?.session_id

  if (!sessionId) {
    fail('session_id missing from registration')
    return false
  }

  // Create transaction (mimics advanceBooking)
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
  pass(`Transaction created: ${tx.session_id} — ${tx.status} — Rp ${tx.total_amount.toLocaleString('id-ID')}`)
  return true
}

async function step5_markPaid() {
  console.log('\n🔵 Step 5: POS Mark Paid (transaction ACTIVE → PAID)')

  const { error: payErr } = await supabase
    .from('transactions')
    .update({
      status: 'PAID',
      payment_method: 'CASH',
      total_amount: 50000,
      discount_amount: 0,
      discount_reason: null,
    })
    .eq('id', testTxId)

  if (payErr) {
    fail('UPDATE transaction → PAID', payErr.message)
    return false
  }

  // Also expire registration
  const { error: expErr } = await supabase
    .from('registrations')
    .update({ status: 'EXPIRED' })
    .eq('id', testRegId)

  if (expErr) {
    fail('UPDATE registration → EXPIRED', expErr.message)
    return false
  }

  // Verify both
  const { data: tx } = await supabase.from('transactions').select('status, payment_method').eq('id', testTxId).single()
  const { data: reg } = await supabase.from('registrations').select('status').eq('id', testRegId).single()

  if (tx?.status !== 'PAID') {
    fail(`Transaction should be PAID, got: ${tx?.status}`)
    return false
  }
  if (reg?.status !== 'EXPIRED') {
    fail(`Registration should be EXPIRED, got: ${reg?.status}`)
    return false
  }

  pass(`Transaction → PAID (${tx.payment_method})`)
  pass(`Registration → EXPIRED`)
  return true
}

async function step6_realtimeTest() {
  console.log('\n🔵 Step 6: Realtime subscription test')

  return new Promise((resolve) => {
    let received = false
    const timeout = setTimeout(() => {
      if (!received) {
        fail('No realtime event received within 8s — check if realtime is enabled for registrations table')
        channel.unsubscribe()
        resolve(false)
      }
    }, 8000)

    const channel = supabase
      .channel('e2e-test-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'registrations', filter: `id=eq.${testRegId}` }, (payload) => {
        received = true
        clearTimeout(timeout)
        pass(`Realtime event received: ${JSON.stringify(payload.new?.status ?? payload)}`)
        channel.unsubscribe()
        resolve(true)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Trigger an update to fire the realtime event
          await sleep(500)
          await supabase.from('registrations').update({ status: 'EXPIRED' }).eq('id', testRegId)
        }
      })
  })
}

async function cleanup() {
  console.log('\n🧹 Cleanup: removing test data')
  if (testTxId) {
    const { error } = await supabase.from('transactions').delete().eq('id', testTxId)
    if (error) fail('Delete transaction', error.message)
    else pass('Transaction deleted')
  }
  if (testRegId) {
    const { error } = await supabase.from('registrations').delete().eq('id', testRegId)
    if (error) fail('Delete registration', error.message)
    else pass('Registration deleted')
  }
}

// ── Main ───────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════')
  console.log(' Méra OS — End-to-End Booking Flow Test')
  console.log(`═══════════════════════════════════════════════`)
  console.log(`📍 Supabase: ${SUPABASE_URL}`)
  console.log(`📅 Date: ${todayKey()}`)

  let passed = 0
  let failed = 0

  const steps = [
    step1_insertBooking,
    step2_verifyRealtimeAppears,
    step3_verifyBooking,
    step4_processToStudio,
    step5_markPaid,
    step6_realtimeTest,
  ]

  for (const step of steps) {
    const result = await step()
    if (result === null || result === false) {
      failed++
      console.log('\n⛔ Stopping — fix the above failure before continuing')
      break
    }
    passed++
  }

  await cleanup()

  console.log('\n═══════════════════════════════════════════════')
  console.log(` Results: ${passed} passed, ${failed} failed`)
  console.log('═══════════════════════════════════════════════')
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Fatal:', err)
  cleanup().then(() => process.exit(1))
})
