import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types/index.js'

// ── Environment detection helper ───────────────────────────
function getEnv(nextVar: string, viteVar: string): string {
    // @ts-ignore
    const next = typeof process !== 'undefined' && process.env?.[nextVar]
    if (next) return next
    // @ts-expect-error — Vite injects import.meta.env at build time
    const vite = typeof import.meta !== 'undefined' && (import.meta as Record<string, Record<string, string>>).env?.[viteVar]
    return vite || ''
}

// ── Singleton POS client factory ───────────────────────────
// Klien ini digunakan HANYA oleh pos-dashboard.
// Perbedaan dari client.ts standar:
//   - Menambahkan header `x-mera-pos-key` di setiap request
//   - Header ini diverifikasi oleh RLS policy di Supabase
//     untuk mengizinkan operasi DELETE dan akses tabel sensitif
//     (transactions, attendance, crew, expenses)
//
// ⚠️  JANGAN gunakan klien ini di customer-portal atau kiosk.
//     Gunakan `@mera/supabase/client` (anon biasa) untuk portal.

let _posClient: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function createPOSClient() {
    if (_posClient) return _posClient

    const url = getEnv('NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL')
    const key = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY')
    const posSecret = getEnv('', 'VITE_POS_SECRET')

    if (!url || !key) {
        console.warn(
            '[mera/supabase] POS Client: Missing SUPABASE_URL or SUPABASE_ANON_KEY. ' +
            'Ensure environment variables are set in .env.local'
        )
    }

    if (!posSecret) {
        console.warn(
            '[mera/supabase] POS Client: Missing VITE_POS_SECRET. ' +
            'DELETE operations and sensitive table access will be blocked by RLS. ' +
            'Set VITE_POS_SECRET in apps/pos-dashboard/.env.local'
        )
    }

    _posClient = createSupabaseClient<Database>(url, key, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        },
        realtime: {
            params: {
                eventsPerSecond: 10,
            },
        },
        global: {
            headers: {
                // Header ini diverifikasi oleh fungsi auth.is_pos_client() di RLS
                // Memungkinkan POS melakukan DELETE dan akses tabel sensitif
                ...(posSecret ? { 'x-mera-pos-key': posSecret } : {}),
            },
        },
    })

    return _posClient
}

