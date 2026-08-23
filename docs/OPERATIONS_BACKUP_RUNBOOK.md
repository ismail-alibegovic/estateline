# Estateline Backup and Restore Runbook

## Database backups

Production Postgres backup configuration is provider-side in Supabase, not stored in this repository.

Required before the first paying customer:

- Enable/confirm automated Supabase database backups for the production project.
- Decide the recovery objective:
  - daily backups for basic recovery;
  - PITR if point-in-time recovery is required by the commercial risk profile.
- Perform one restore drill into a non-production project before launch.
- Record the restore target, timestamp, operator, and result in the operations log.

Minimum restore drill:

1. Pick the latest production backup.
2. Restore into a separate Supabase project.
3. Apply migrations if the restored snapshot predates current code.
4. Run migration smoke, RLS, RPC, and core application checks against the restored project.
5. Confirm tenant data, documents metadata, billing records, and organization lifecycle rows are present.

## Storage backups

Supabase database backups do not back up Storage object bytes. Use the storage backup script for business-critical objects such as property images, documents, generated PDFs, and uploads.

Dry run:

```bash
node scripts/backup-supabase-storage.js
```

Confirmed backup:

```bash
node scripts/backup-supabase-storage.js --confirm
```

Configuration:

- `ESTATELINE_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `ESTATELINE_SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `ESTATELINE_STORAGE_BACKUP_DIR` optional, defaults to `backups/supabase-storage`
- `ESTATELINE_STORAGE_BACKUP_RETENTION_DAYS` optional, defaults to `30`

The script writes a timestamped folder with downloaded objects and `manifest.json`. It prints counts and paths only; it must not print secrets.

Current production verification on 2026-08-24:

- Supabase project: active/healthy in `eu-central-1`.
- Database version: Postgres 17.6.1.141.
- WAL-G backups: enabled according to Supabase Management API.
- PITR: not enabled.
- Backup listing: Management API returned no concrete backup artifacts to restore from during this verification pass.
- Storage API: reachable; no Storage buckets currently present.

Restore drill status:

- Full provider restore drill was not completed because the Management API did not expose a concrete backup artifact/restore target for this project during verification.
- Safe local migration smoke remains passing, but that is not a substitute for restoring a production backup.
- Before the first paying customer, perform a provider restore into a separate Supabase project once a concrete backup artifact is available.

Keep the scheduled Storage backup in place so future buckets are covered once uploads are enabled.

## Organization purge

Deletion purge is scheduled on Zo to run daily at 03:15 Europe/Sarajevo:

```bash
node scripts/purge-deleted-orgs.js --confirm
```

The script is dry-run by default and only performs irreversible deletion when `--confirm` is provided. The scheduled automation should stay silent when no organizations are due and notify on purge/failure.

Manual dry run:

```bash
node scripts/purge-deleted-orgs.js
```

Manual confirmed run:

```bash
node scripts/purge-deleted-orgs.js --confirm
```
