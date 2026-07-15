import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const { Client } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const connectionString = 'postgresql://postgres.vlkasfskndcmbrbbdvzd:Estateline2026!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'

async function migrate() {
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })

  console.log('Connecting to database for tasks table migration...')
  await client.connect()
  console.log('Connected successfully.')

  const sql = `
    ALTER TABLE public.tasks 
    ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE;
  `

  console.log('Running tasks schema updates...')
  await client.query(sql)
  console.log('Migration completed successfully!')

  await client.end()
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
