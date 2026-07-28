const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:postgres@host.docker.internal:54322/postgres'
});
client.connect()
  .then(() => {
    return client.query(`
      INSERT INTO crew (id, nama, role, is_active, status_gaji)
      VALUES 
        (gen_random_uuid(), 'Naya', 'Intern', true, 'INTERN'),
        (gen_random_uuid(), 'Farisa', 'Intern', true, 'INTERN')
      ON CONFLICT DO NOTHING;
    `);
  })
  .then(() => {
    console.log('Successfully inserted into local database!');
    return client.end();
  })
  .catch(e => {
    console.error(e);
    return client.end();
  });
