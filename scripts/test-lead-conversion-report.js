#!/usr/bin/env node
const { Client } = require('pg')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

async function run() {
  const connectionString = process.env.ESTATELINE_DATABASE_URL || process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('ESTATELINE_DATABASE_URL or DATABASE_URL environment variable is required — refusing to run without it.')
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()

  console.log('Testing get_lead_conversion_report RPC...')

  const orgRes = await client.query('SELECT id FROM organizations LIMIT 1;')
  if (orgRes.rows.length === 0) {
    console.log('⚠️ No organization found, skipping RPC execution test.')
    await client.end()
    return
  }

  const orgId = orgRes.rows[0].id
  const rpcRes = await client.query('SELECT get_lead_conversion_report($1) AS report;', [orgId])
  const report = rpcRes.rows[0].report

  if (!report || typeof report !== 'object') {
    throw new Error('get_lead_conversion_report did not return a valid JSON object!')
  }

  console.log('✅ Lead Conversion RPC test passed successfully!')
  console.log(JSON.stringify(report, null, 2))

  await client.end()
}

run().catch((err) => {
  console.error('❌ Lead conversion report test failed:', err)
  process.exit(1)
})
