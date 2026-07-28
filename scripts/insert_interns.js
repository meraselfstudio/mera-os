const url = 'https://zobpbwuszabzngxxtkcj.supabase.co/rest/v1/crew';
const key = 'sb_publishable_Q9WnAZI3-iXfhX3b7IV5cA_psvE9tRa';
const posSecret = '9514fefb4ba4f05cc81ab45311adf1226ff64fac309c5636c352b74e89b2d8f0';

async function insertInterns() {
  const payload = [
    { nama: 'Naya', role: 'Intern', status_gaji: 'INTERN', is_active: true },
    { nama: 'Farisa', role: 'Intern', status_gaji: 'INTERN', is_active: true }
  ];

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
        'x-mera-pos-key': posSecret
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Failed to insert:', res.status, text);
    } else {
      console.log('Success! Naya and Farisa have been added to the database.');
    }
  } catch (err) {
    console.error('Network error:', err);
  }
}

insertInterns();
