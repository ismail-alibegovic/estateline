#!/usr/bin/env node
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    // Setup mock Supabase environment first
    await setupMockSupabase(client);

    // Read migrations directory
    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Lexical sorting

    console.log(`Found ${files.length} migrations to run.`);

    for (const file of files) {
      console.log(`Applying migration: ${file}...`);
      const filepath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filepath, 'utf8');
      
      // Run the migration SQL
      await client.query(sql);
      console.log(`Successfully applied: ${file}`);
    }

    console.log('All migrations applied successfully! Smoke test passed.');
  } catch (error) {
    console.error('Migration smoke test failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
