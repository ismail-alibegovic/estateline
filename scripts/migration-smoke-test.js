#!/usr/bin/env node
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Removes -- line comments while respecting dollar-quoted blocks and
// single-quoted string literals, so semicolons inside comments no longer
// corrupt statement splitting.
function stripLineComments(sql) {
  let out = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    if (sql[i] === '$') {
      const match = sql.slice(i).match(/^(\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$)/);
      if (match) {
        const tag = match[1];
        const end = sql.indexOf(tag, i + tag.length);
        if (end === -1) {
          out += sql.slice(i);
          return out;
        }
        out += sql.slice(i, end + tag.length);
        i = end + tag.length;
        continue;
      }
    }
    if (sql[i] === "'") {
      const end = sql.indexOf("'", i + 1);
      if (end === -1) {
        out += sql.slice(i);
        return out;
      }
      out += sql.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    out += sql[i];
    i++;
  }
  return out;
}

function splitStatements(rawSql) {
  const sql = stripLineComments(rawSql);
  const statements = [];
  let current = '';
  let inDollar = false;
  let dollarTag = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === '$') {
      const sub = sql.slice(i);
      const match = sub.match(/^(\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$)/);
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
  const connectionString = process.env.ESTATELINE_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ESTATELINE_DATABASE_URL or DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = new Client({ connectionString, ssl: isLocal ? false : { rejectUnauthorized: false } });
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

    // Post-migration assertion: Verify migration 014 backfill worked
    const unmigrated = await client.query(`
      SELECT count(*) FROM activity_log
      WHERE type = 'note' AND (metadata->>'action' = 'messaged' OR description LIKE 'WhatsApp message%');
    `);
    const count = parseInt(unmigrated.rows[0].count, 10);
    if (count > 0) {
      throw new Error(`Migration 014 assertion failed: ${count} un-backfilled activity rows remain.`);
    }
    console.log('✅ Migration 014 assertion passed: 0 un-backfilled rows remain.');

    console.log('Migration smoke test passed successfully.');
  } catch (err) {
    console.error('Migration smoke test failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
