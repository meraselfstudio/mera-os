import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://zobpbwuszabzngxxtkcj.supabase.co',
    'sb_publishable_Q9WnAZI3-iXfhX3b7IV5cA_psvE9tRa',
    {
        global: {
            headers: {
                'x-mera-pos-key': '9514fefb4ba4f05cc81ab45311adf1226ff64fac309c5636c352b74e89b2d8f0'
            }
        }
    }
)

async function run() {
    const { data, error } = await supabase.from('crew').insert([
        { nama: 'Naya', role: 'Intern', status_gaji: 'INTERN', is_active: true },
        { nama: 'Farisa', role: 'Intern', status_gaji: 'INTERN', is_active: true }
    ])
    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Success! Added Naya and Farisa.')
    }
}
run()
