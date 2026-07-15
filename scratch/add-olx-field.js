import pg from 'pg'

const { Client } = pg
const connectionString = 'postgresql://postgres.vlkasfskndcmbrbbdvzd:Estateline2026!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'

async function migrate() {
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })

  console.log('Connecting to database...')
  await client.connect()
  console.log('Connected.')

  const sql = `
    ALTER TABLE public.organizations 
    ADD COLUMN IF NOT EXISTS olx_profile_url TEXT;
  `

  console.log('Adding olx_profile_url column to organizations table...')
  await client.query(sql)
  console.log('Migration completed successfully!')

  await client.end()
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
