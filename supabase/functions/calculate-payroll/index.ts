import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Payroll Constants ────────────────────────────────────────
const PENALTY_RATE = 5000  // IDR
const PENALTY_PER_10M = PENALTY_RATE  // per 10-minute block late

// ── CORS ─────────────────────────────────────────────────────
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)
        const crew_id = url.searchParams.get('crew_id')
        const date = url.searchParams.get('date')  // YYYY-MM-DD

        if (!crew_id) {
            return new Response(JSON.stringify({ error: 'crew_id is required' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Admin client — bypasses RLS
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // ── 1. Fetch crew ────────────────────────────────────────
        const { data: crew, error: crewErr } = await supabase
            .from('crew')
            .select('id, nama, status_gaji, role')
            .eq('id', crew_id)
            .single()

        if (crewErr || !crew) {
            return new Response(JSON.stringify({ error: `Crew not found: ${crewErr?.message}` }), {
                status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // ── 2. INTERN BYPASS ─────────────────────────────────────
        // CRITICAL: INTERN hanya untuk log operasional.
        // Skip SEMUA kalkulasi penalti dan bonus.
        if (crew.status_gaji === 'INTERN') {
            return new Response(JSON.stringify({
                crew_id: crew.id,
                nama: crew.nama,
                status_gaji: 'INTERN',
                penalty_amount: 0,
                net_pay: 0,
                note: 'INTERN: semua kalkulasi penalti dan bonus dilewati',
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // ── 3. Fetch attendance records ──────────────────────────
        let query = supabase
            .from('attendance')
            .select('id, clock_in, clock_out, shift_type, base_rate, late_minutes, penalty_amount, status')
            .eq('crew_id', crew_id)
            .order('clock_in', { ascending: false })

        // Filter by date if provided
        if (date) {
            query = query
                .gte('clock_in', `${date}T00:00:00.000Z`)
                .lt('clock_in', `${date}T23:59:59.999Z`)
        }

        const { data: records, error: attErr } = await query

        if (attErr) {
            return new Response(JSON.stringify({ error: `Attendance fetch failed: ${attErr.message}` }), {
                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // ── 4. Aggregate payroll ─────────────────────────────────
        const totalLateMinutes = (records ?? []).reduce((s, r) => s + (r.late_minutes ?? 0), 0)
        const totalPenalty = (records ?? []).reduce((s, r) => s + (r.penalty_amount ?? 0), 0)
        const totalBaseRate = (records ?? []).reduce((s, r) => s + (r.base_rate ?? 0), 0)
        const netPay = Math.max(0, totalBaseRate - totalPenalty)

        return new Response(JSON.stringify({
            crew_id: crew.id,
            nama: crew.nama,
            status_gaji: crew.status_gaji,
            records_count: (records ?? []).length,
            total_base_rate: totalBaseRate,
            total_late_minutes: totalLateMinutes,
            total_penalty: totalPenalty,
            net_pay: netPay,
            breakdown: {
                formula: `${totalBaseRate} (base) - ${totalPenalty} (penalty) = ${netPay} IDR`,
                penalty_detail: `${totalLateMinutes} menit terlambat → ${Math.floor(totalLateMinutes / 10)} blok × ${PENALTY_PER_10M} IDR`,
            },
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (err) {
        return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
