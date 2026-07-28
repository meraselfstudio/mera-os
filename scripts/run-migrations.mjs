/**
 * Méra OS — Migration Runner
 * Executes SQL files directly against Supabase using the JS client.
 * Run: node scripts/run-migrations.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://zobpbwuszabzngxxtkcj.supabase.co'
const SUPABASE_KEY = 'sb_publishable_Q9WnAZI3-iXfhX3b7IV5cA_psvE9tRa'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const MIGRATIONS = [
    join(__dir, '../supabase/migrations/019_update_products_from_pricelist.sql'),
]

// Split SQL into individual statements and execute each
function splitStatements(sql) {
    return sql
        .split(/;\s*\n/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\/\*/))
        .map(s => s + (s.endsWith(';') ? '' : ';'))
}

async function runMigrations() {
    console.log('🚀 Méra OS — Running Migrations\n')
    console.log(`📡 Supabase: ${SUPABASE_URL}\n`)

    for (const filepath of MIGRATIONS) {
        const filename = filepath.split('/').pop()
        console.log(`\n📄 Applying: ${filename}`)

        const sql = readFileSync(filepath, 'utf-8')

        // Execute the full file as one SQL block via rpc exec_sql if it exists,
        // otherwise try individual statements
        const { data, error } = await supabase.rpc('exec_sql', { sql_text: sql }).single()

        if (error) {
            // exec_sql might not exist — try individual statements
            console.log(`  ⚡ Trying statement-by-statement execution...`)
            const statements = splitStatements(sql)
            console.log(`  📝 Found ${statements.length} statements`)

            let ok = 0, fail = 0
            for (const stmt of statements) {
                const preview = stmt.substring(0, 60).replace(/\n/g, ' ')
                const { error: stmtErr } = await supabase.rpc('exec_sql', { sql_text: stmt }).single()
                if (stmtErr) {
                    // Try raw query directly
                    const { error: rawErr } = await supabase.from('_dummy_').select().limit(0)
                    console.log(`  ⚠️  [${++fail}] ${preview}... → ${stmtErr.message}`)
                } else {
                    ok++
                    console.log(`  ✅ ${preview}...`)
                }
            }
            console.log(`\n  Result: ${ok} OK, ${fail} failed`)
        } else {
            console.log(`  ✅ Migration applied successfully`)
        }
    }

    // Verify tables exist
    console.log('\n🔍 Verifying tables...')
    const tables = ['crew', 'attendance', 'products', 'registrations', 'transactions']
    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
        if (error) {
            console.log(`  ❌ ${table}: ${error.message}`)
        } else {
            console.log(`  ✅ ${table}: ${count ?? 0} rows`)
        }
    }

    console.log('\n✨ Done!\n')
}

runMigrations().catch(console.error)
