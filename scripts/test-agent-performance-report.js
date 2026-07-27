#!/usr/bin/env node
const { Client } = require('pg')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

async function run() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://postgres.vlkasfskndcmbrbbdvzd:REDACTED_DB_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()

  console.log('Testing get_agent_performance_report RPC...')

  const orgRes = await client.query('SELECT id FROM organizations LIMIT 1;')
  if (orgRes.rows.length === 0) {
    console.log('⚠️ No organization found, skipping RPC execution test.')
    await client.end()
    return
  }

  const orgId = orgRes.rows[0].id
  const rpcRes = await client.query('SELECT get_agent_performance_report($1) AS report;', [orgId])
  const report = rpcRes.rows[0].report

  if (!Array.isArray(report)) {
    throw new Error('get_agent_performance_report did not return a JSON array!')
  }

  console.log(`✅ RPC test passed successfully! Returned ${report.length} agent metrics rows:`)
  console.log(JSON.stringify(report, null, 2))

  await client.end()
}

run().catch((err) => {
  console.error('❌ Agent performance report test failed:', err)
  process.exit(1)
})
