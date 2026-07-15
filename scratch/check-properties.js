import pg from 'pg'

const { Client } = pg
const connectionString = 'postgresql://postgres.vlkasfskndcmbrbbdvzd:Estateline2026!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'

async function check() {
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })

  await client.connect()
  console.log('Connected.')

  const res = await client.query(`
    SELECT id, title, created_at 
    FROM public.properties 
    ORDER BY created_at DESC;
  `)
  
  console.table(res.rows)

  await client.end()
}

check().catch(err => {
  console.error('Check failed:', err)
  process.exit(1)
})
