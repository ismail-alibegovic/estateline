#!/usr/bin/env node
/**
 * Retention job for the organization deletion lifecycle.
 *
 * Finds organizations whose deletion grace period has ended
 * (organizations.deletion_scheduled_for <= now) and permanently deletes them.
 * `ON DELETE CASCADE` on every tenant table removes all org data in one step.
 *
 * DRY RUN BY DEFAULT: prints what would be deleted and exits.
 * Pass --confirm to actually delete.
 *
 * Required env:
 *   ESTATELINE_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (service role — bypasses RLS, never expose client-side)
 *
 * Scheduling is external (Supabase pg_cron / GitHub Actions cron / any scheduler), e.g.:
 *   node scripts/purge-deleted-orgs.js --confirm   # daily
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const { createClient } = require('@supabase/supabase-js')

const confirm = process.argv.includes('--confirm')
const url = process.env.ESTATELINE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing ESTATELINE_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  const { data: due, error } = await supabase
    .from('organizations')
    .select('id, name, slug, deletion_requested_at, deletion_scheduled_for')
    .lte('deletion_scheduled_for', new Date().toISOString())

  if (error) {
    console.error('Failed to list organizations due for deletion:', error.message)
    process.exit(1)
  }

  if (!due || due.length === 0) {
    console.log(new Date().toISOString(), '- no organizations due for deletion')
    return
  }

  for (const org of due) {
    console.log(
      `${confirm ? 'PURGING' : 'WOULD PURGE'} org=${org.id} "${org.name}" (${org.slug}) requested=${org.deletion_requested_at} scheduled=${org.deletion_scheduled_for}`
    )
  }

  if (!confirm) {
    console.log(`Dry run: ${due.length} organization(s) would be permanently deleted. Re-run with --confirm.`)
    return
  }

  let purged = 0
  for (const org of due) {
    const { error: delError } = await supabase.from('organizations').delete().eq('id', org.id)
    if (delError) {
      console.error(`Failed to purge ${org.id}:`, delError.message)
    } else {
      purged += 1
      console.log(`Purged ${org.id} ("${org.name}") and all cascade-owned data`)
    }
  }
  console.log(new Date().toISOString(), `- done: ${purged}/${due.length} purged`)
}

run().catch(err => {
  console.error('Purge job failed:', err.message)
  process.exit(1)
})
