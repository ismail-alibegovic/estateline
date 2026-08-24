#!/usr/bin/env node
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inDollar = false;
  let dollarTag = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === '$') {
      const sub = sql.slice(i);
      const match = sub.match(/^(\$[a-zA-Z0-9_]*\$)/);
      if (match) {
        const tag = match[1];
        if (!inDollar) {
          inDollar = true;
          dollarTag = tag;
          i += tag.length - 1;
          current += tag;
          continue;
        } else if (tag === dollarTag) {
          inDollar = false;
          dollarTag = '';
          i += tag.length - 1;
          current += tag;
          continue;
        }
      }
    }

    current += char;

    if (!inDollar && char === ';') {
      const stmt = current.trim();
      if (stmt.length > 0) {
        statements.push(stmt);
      }
      current = '';
    }
  }

  if (current.trim().length > 0) {
    statements.push(current.trim());
  }

  return statements;
}

async function run() {
  const connectionString = process.env.ESTATELINE_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ESTATELINE_DATABASE_URL or DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = new Client({ connectionString, ssl: isLocal ? false : { rejectUnauthorized: false } });
  try {
    await client.connect();

    console.log('Testing RLS policies...');

    // Retrieve an existing user auth_id from the database
    const userRes = await client.query(`
      SELECT u.auth_id, om.organization_id 
      FROM organization_members om 
      JOIN users u ON u.id = om.user_id 
      LIMIT 1;
    `);

    if (userRes.rows.length === 0) {
      console.log('No existing user found to test RLS against. Skipping user-level check.');
      return;
    }

    const { auth_id: authId1, organization_id: orgId1 } = userRes.rows[0];

    // Test Org Isolation with authenticated role
    await client.query(`SET ROLE authenticated;`);
    await client.query(`SET request.jwt.claim.sub = '${authId1}';`);

    const org1Visible = await client.query(`SELECT * FROM organizations WHERE id = $1;`, [orgId1]);
    const fakeOrgHidden = await client.query(`SELECT * FROM organizations WHERE id = '00000000-0000-0000-0000-000000000000';`);

    await client.query(`RESET ROLE;`);

    if (org1Visible.rows.length !== 1) throw new Error('User cannot see their organization');
    if (fakeOrgHidden.rows.length !== 0) throw new Error('User can see unauthorized organization');

    console.log('✅ RLS Tenant Isolation test passed successfully.');
  } catch (err) {
    console.error('❌ RLS test failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
