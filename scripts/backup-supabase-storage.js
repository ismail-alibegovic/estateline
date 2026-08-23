#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const args = new Set(process.argv.slice(2))
const confirm = args.has('--confirm')
const backupRoot = process.env.ESTATELINE_STORAGE_BACKUP_DIR || path.join(process.cwd(), 'backups', 'supabase-storage')
const retentionDays = Number(process.env.ESTATELINE_STORAGE_BACKUP_RETENTION_DAYS || '30')

const supabaseUrl = process.env.ESTATELINE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.ESTATELINE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

function log(message) {
  console.log(`${new Date().toISOString()} - ${message}`)
}

function fail(message) {
  console.error(`${new Date().toISOString()} - ${message}`)
  process.exit(1)
}

if (!supabaseUrl || !serviceKey) {
  fail('missing Supabase URL or service role key')
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`${response.status} ${response.statusText}${text ? `: ${text.slice(0, 200)}` : ''}`)
  }

  return response.json()
}

async function listBuckets() {
  return requestJson(`${supabaseUrl}/storage/v1/bucket`)
}

async function listObjects(bucketId, prefix = '') {
  const rows = await requestJson(`${supabaseUrl}/storage/v1/object/list/${encodeURIComponent(bucketId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prefix,
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    }),
  })

  const objects = []

  for (const row of rows) {
    const key = prefix ? `${prefix}/${row.name}` : row.name
    if (!row.id && !row.metadata) {
      objects.push(...await listObjects(bucketId, key))
    } else {
      objects.push({
        bucket: bucketId,
        key,
        size: row.metadata?.size || 0,
        updated_at: row.updated_at || null,
      })
    }
  }

  return objects
}

async function downloadObject(bucketId, key, destination) {
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucketId)}/${key.split('/').map(encodeURIComponent).join('/')}`, {
    headers,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`download failed for ${bucketId}/${key}: ${response.status} ${response.statusText}${text ? `: ${text.slice(0, 200)}` : ''}`)
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true })
  const buffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(destination, buffer)
}

function pruneOldBackups() {
  if (!fs.existsSync(backupRoot) || !Number.isFinite(retentionDays) || retentionDays <= 0) return

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  for (const entry of fs.readdirSync(backupRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const fullPath = path.join(backupRoot, entry.name)
    const stat = fs.statSync(fullPath)
    if (stat.mtimeMs < cutoff) {
      fs.rmSync(fullPath, { recursive: true, force: true })
      log(`pruned old backup ${entry.name}`)
    }
  }
}

async function main() {
  const buckets = await listBuckets()
  if (!Array.isArray(buckets) || buckets.length === 0) {
    log('no storage buckets found')
    return
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const targetDir = path.join(backupRoot, timestamp)
  const manifest = {
    created_at: new Date().toISOString(),
    mode: confirm ? 'backup' : 'dry-run',
    buckets: [],
  }

  let totalObjects = 0
  let totalBytes = 0

  for (const bucket of buckets) {
    const bucketId = bucket.id || bucket.name
    const objects = await listObjects(bucketId)
    totalObjects += objects.length
    totalBytes += objects.reduce((sum, item) => sum + Number(item.size || 0), 0)
    manifest.buckets.push({
      id: bucketId,
      name: bucket.name,
      public: Boolean(bucket.public),
      object_count: objects.length,
      bytes: objects.reduce((sum, item) => sum + Number(item.size || 0), 0),
      objects,
    })

    if (confirm) {
      for (const object of objects) {
        await downloadObject(bucketId, object.key, path.join(targetDir, bucketId, object.key))
      }
    }
  }

  if (confirm) {
    fs.mkdirSync(targetDir, { recursive: true })
    fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
    pruneOldBackups()
    log(`storage backup complete: ${targetDir}`)
  } else {
    log(`dry-run complete: ${totalObjects} objects, ${totalBytes} bytes across ${buckets.length} buckets`)
  }
}

main().catch((error) => fail(error.message))
