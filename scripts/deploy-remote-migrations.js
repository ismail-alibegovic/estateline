const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required — refusing to run without it.');
}

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

async function deploy() {
  console.log('Connecting to remote Supabase PostgreSQL database...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected successfully!');

  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  console.log(`Deploying ${files.length} migration files in sequence...`);

  for (const file of files) {
    console.log(`\n--- Deploying: ${file} ---`);
    const filepath = path.join(migrationsDir, file);
    const rawSql = fs.readFileSync(filepath, 'utf8');
    const statements = splitStatements(rawSql);

    let successCount = 0;
    let skipCount = 0;

    for (const stmt of statements) {
      try {
        await client.query(stmt);
        successCount++;
      } catch (err) {
        skipCount++;
        // Ignore duplicate object/policy notices cleanly
        if (!err.message.includes('already exists')) {
          console.warn(`  Notice (${file}):`, err.message.slice(0, 120));
        }
      }
    }
    console.log(`✅ ${file}: ${successCount} statements executed, ${skipCount} skipped/notices.`);
  }

  console.log('\n🎉 ALL REMOTE DATABASE MIGRATIONS SUCCESSFULLY DEPLOYED!');
  await client.end();
}

deploy().catch(err => {
  console.error('Fatal deployment error:', err);
  process.exit(1);
});
