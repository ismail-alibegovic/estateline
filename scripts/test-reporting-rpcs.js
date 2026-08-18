const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function run() {
  const connectionString = process.env.ESTATELINE_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ESTATELINE_DATABASE_URL or DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();

    console.log('Testing Report RPCs...');

    // Retrieve an existing org
    const orgRes = await client.query(`SELECT id FROM organizations LIMIT 1;`);
    if (orgRes.rows.length === 0) {
      console.log('No organization found to test RPCs against. Skipping.');
      return;
    }

    const orgId = orgRes.rows[0].id;

    // Test time-to-close report function syntax
    const ttcRes = await client.query(`SELECT * FROM get_time_to_close_report($1::uuid);`, [orgId]);
    console.log(`✅ get_time_to_close_report returned ${ttcRes.rows.length} rows.`);

    // Test financial forecasting report function syntax
    const ffRes = await client.query(`SELECT * FROM get_financial_forecasting_report($1::uuid);`, [orgId]);
    console.log(`✅ get_financial_forecasting_report returned ${ffRes.rows.length} rows.`);

  } catch (err) {
    console.error('❌ Report RPC test failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
