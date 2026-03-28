import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types/index.js'

// ── Environment detection helper ───────────────────────────
function getEnv(nextVar: string, viteVar: string): string {
    // Works in both Next.js (NEXT_PUBLIC_*) and Vite (VITE_*) environments
    const value =
        // @ts-ignore
        (typeof process !== 'undefined' && process.env?.[nextVar]) ||
        // @ts-expect-error — Vite injects import.meta.env at build time
        (typeof import.meta !== 'undefined' && (import.meta as Record<string, Record<string, string>>).env?.[viteVar]) ||
        ''
    return value
}

// ── Singleton client factory ───────────────────────────────
let _client: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function createClient() {
    if (_client) return _client

    // Next.js requires explicit process.env.NEXT_PUBLIC_ string replacement during build.
    // Dynamic lookups like `process.env[nextVar]` will evaluate to undefined in the browser.
    // @ts-ignore
    let url = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : ''
    // @ts-ignore
    let key = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : ''

    // Fallback for Vite
    if (!url) url = getEnv('', 'VITE_SUPABASE_URL')
    if (!key) key = getEnv('', 'VITE_SUPABASE_ANON_KEY')

    if (!url || !key) {
        console.warn(
            '[mera/supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY. ' +
            'Ensure environment variables are set in .env.local'
        )
    }

    _client = createSupabaseClient<Database>(url, key, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        },
        realtime: {
            params: {
                eventsPerSecond: 10,
            },
        },
    })

    return _client
}

// Named export for convenience
export const supabase = createClient()
