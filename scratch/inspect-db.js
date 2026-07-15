import pg from 'pg'

const { Client } = pg
const connectionString = 'postgresql://postgres.vlkasfskndcmbrbbdvzd:Estateline2026!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'

async function inspect() {
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })

  await client.connect()
  console.log('Connected.')

  // 1. Reload PostgREST schema cache
  console.log('Notifying PostgREST to reload schema cache...')
  await client.query("NOTIFY pgrst, 'reload schema';")
  console.log('PostgREST notified.')

  // 2. Check if table property_syndications exists
  console.log('Listing all tables in public schema:')
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
  `)
  
  console.table(res.rows)

  await client.end()
}

inspect().catch(err => {
  console.error('Inspection failed:', err)
  process.exit(1)
})
