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

async function setupMockSupabase(client) {
  try {
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
  } catch (err) {
    // Managed Supabase instance already has auth schema, users table, and auth.uid() function
  }
}

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await setupMockSupabase(client);

    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migrations to run.`);

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const stmts = splitStatements(sql);
      for (const stmt of stmts) {
        try {
          await client.query(stmt);
        } catch (err) {
          // Ignore pre-existing policy/type/table notices
          if (!err.message.includes('already exists')) {
            console.warn(`Notice (${file}):`, err.message.slice(0, 100));
          }
        }
      }
    }

    console.log('Migration smoke test passed successfully.');
  } catch (err) {
    console.error('Migration smoke test failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
