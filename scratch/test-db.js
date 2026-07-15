import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

async function queryTable(tableName) {
  const url = `${supabaseUrl}/rest/v1/${tableName}?select=*&limit=1`
  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    })
    console.log(`Table: ${tableName} | HTTP Status: ${resp.status}`)
    const text = await resp.text()
    if (resp.status >= 200 && resp.status < 300) {
      console.log(`Success! Table ${tableName} exists. Data:`, text)
    } else {
      console.log(`Error querying ${tableName}:`, text)
    }
  } catch (err) {
    console.error(`Fetch error for ${tableName}:`, err.message)
  }
}

async function test() {
  await queryTable('tasks')
  await queryTable('communications')
}

test().catch(console.error)
