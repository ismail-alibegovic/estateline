import pg from 'pg'
import fs from 'fs'
import path from 'path'

const { Client } = pg
const connectionString = 'postgresql://postgres.vlkasfskndcmbrbbdvzd:Estateline2026!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'

async function deploy() {
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })

  await client.connect()
  console.log('Connected.')

  // Check if table property_syndications already exists
  const checkTable = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'property_syndications'
    );
  `)
  const tableExists = checkTable.rows[0].exists

  if (tableExists) {
    console.log('Table property_syndications already exists. Skipping migration.')
  } else {
    console.log('Table property_syndications does not exist. Deploying migration 005...')
    const sqlPath = path.join(process.cwd(), 'supabase/migrations/005_property_syndications.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    // Execute the SQL. Wrap in transaction.
    await client.query('BEGIN')
    try {
      await client.query(sql)
      await client.query('COMMIT')
      console.log('Migration deployed successfully!')
    } catch (err) {
      await client.query('ROLLBACK')
      console.error('Migration failed, rolled back.', err)
      throw err
    }
  }

  // Reload PostgREST schema cache
  console.log('Reloading PostgREST schema cache...')
  await client.query("NOTIFY pgrst, 'reload schema';")
  console.log('PostgREST cache reloaded.')

  await client.end()
}

deploy().catch(err => {
  console.error('Deployment failed:', err)
  process.exit(1)
})
