#!/usr/bin/env node
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function uuidv4() {
  return crypto.randomUUID();
}

async function setupMockSupabase(client) {
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY,
      email TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE OR REPLACE FUNCTION auth.uid()
    RETURNS UUID AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
    $$ LANGUAGE sql STABLE;
  `);
}

async function applyMigrations(client) {
  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filepath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filepath, 'utf8');
    await client.query(sql);
  }
}

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  // Use a schema prefix or clear schema to ensure clean state
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('Setting up clean test database...');
    // Drop existing public schema to ensure clean slate
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;');
    
    await setupMockSupabase(client);
    console.log('Applying migrations...');
    await applyMigrations(client);
    console.log('Migrations applied.');

    // Generate test IDs
    const org1 = uuidv4();
    const org2 = uuidv4();
    const auth1 = uuidv4();
    const auth2 = uuidv4();
    const user1 = uuidv4();
    const user2 = uuidv4();
    const lead1 = uuidv4();
    const lead2 = uuidv4();
    const task1 = uuidv4();
    const task2 = uuidv4();

    console.log('Seeding test data...');
    // Insert auth users
    await client.query(`INSERT INTO auth.users (id, email) VALUES ($1, 'user1@agency-a.com'), ($2, 'user2@agency-b.com')`, [auth1, auth2]);

    // Insert organizations
    await client.query(`INSERT INTO organizations (id, name, slug) VALUES ($1, 'Agency A', 'agency-a'), ($2, 'Agency B', 'agency-b')`, [org1, org2]);

    // Insert users
    await client.query(`INSERT INTO users (id, auth_id, email, role) VALUES ($1, $2, 'user1@agency-a.com', 'owner'), ($3, $4, 'user2@agency-b.com', 'owner')`, [user1, auth1, user2, auth2]);

    // Insert organization members
    await client.query(`INSERT INTO organization_members (user_id, organization_id, role, is_primary) VALUES ($1, $2, 'owner', true), ($3, $4, 'owner', true)`, [user1, org1, user2, org2]);

    // Insert leads
    await client.query(`INSERT INTO leads (id, organization_id, first_name) VALUES ($1, $2, 'Lead A'), ($3, $4, 'Lead B')`, [lead1, org1, lead2, org2]);

    // Insert tasks
    await client.query(`INSERT INTO tasks (id, organization_id, title, assigned_to) VALUES ($1, $2, 'Task A', $3), ($4, $5, 'Task B', $6)`, [task1, org1, auth1, task2, org2, auth2]);

    console.log('Running RLS Verification Tests...');

    // Test 1: Tenant A SELECT Leads
    {
      const testClient = new Client({ connectionString });
      await testClient.connect();
      await testClient.query('BEGIN');
      await testClient.query('SET LOCAL Role TO authenticated');
      await testClient.query(`SET LOCAL request.jwt.claim.sub = '${auth1}'`);
      
      const res = await testClient.query('SELECT id, first_name FROM leads');
      console.log(`Test 1 (SELECT Leads): Found ${res.rows.length} rows.`);
      if (res.rows.length !== 1 || res.rows[0].id !== lead1) {
        throw new Error('RLS Failure: Tenant A can see Tenant B leads or no leads at all.');
      }
      
      await testClient.query('ROLLBACK');
      await testClient.end();
    }

    // Test 2: Tenant A INSERT Leads into Tenant B Organization
    {
      const testClient = new Client({ connectionString });
      await testClient.connect();
      await testClient.query('BEGIN');
      await testClient.query('SET LOCAL Role TO authenticated');
      await testClient.query(`SET LOCAL request.jwt.claim.sub = '${auth1}'`);

      try {
        await testClient.query(`INSERT INTO leads (organization_id, first_name) VALUES ($1, 'Malicious Lead')`, [org2]);
        throw new Error('RLS Failure: Tenant A successfully inserted lead into Tenant B organization.');
      } catch (err) {
        if (err.message.includes('RLS Failure')) throw err;
        console.log('Test 2 (Prevent Cross-Tenant INSERT): Passed (correctly blocked by RLS).');
      }

      await testClient.query('ROLLBACK');
      await testClient.end();
    }

    // Test 3: Tasks RLS Policy Bridge Fix
    {
      const testClient = new Client({ connectionString });
      await testClient.connect();
      await testClient.query('BEGIN');
      await testClient.query('SET LOCAL Role TO authenticated');
      await testClient.query(`SET LOCAL request.jwt.claim.sub = '${auth1}'`);

      const res = await testClient.query('SELECT id, title FROM tasks');
      console.log(`Test 3 (SELECT Tasks for Tenant A): Found ${res.rows.length} rows.`);
      if (res.rows.length !== 1 || res.rows[0].id !== task1) {
        throw new Error('RLS Failure: Tenant A task isolation is broken.');
      }

      await testClient.query('ROLLBACK');
      await testClient.end();
    }

    // Test 4: Cross-tenant IDOR on update_lead_stage RPC
    {
      const testClient = new Client({ connectionString });
      await testClient.connect();
      await testClient.query('BEGIN');
      await testClient.query('SET LOCAL Role TO authenticated');
      await testClient.query(`SET LOCAL request.jwt.claim.sub = '${auth1}'`);

      try {
        await testClient.query(`SELECT update_lead_stage($1, 'contacted')`, [lead2]);
        throw new Error('Security Failure: Tenant A allowed to update Tenant B lead stage via RPC.');
      } catch (err) {
        if (err.message.includes('Security Failure')) throw err;
        console.log('Test 4 (RPC IDOR Prevention): Passed (correctly threw exception: ' + err.message + ').');
      }

      // Verify that it works for their own lead
      await testClient.query(`SELECT update_lead_stage($1, 'contacted')`, [lead1]);
      const res = await testClient.query('SELECT stage FROM leads WHERE id = $1', [lead1]);
      if (res.rows[0].stage !== 'contacted') {
        throw new Error('Security Failure: Tenant A could not update their own lead stage.');
      }
      console.log('Test 4b (RPC Execution for Owner): Passed.');

      await testClient.query('ROLLBACK');
      await testClient.end();
    }

    console.log('All integration tests passed successfully!');
  } catch (error) {
    console.error('Integration tests failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
