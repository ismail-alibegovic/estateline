# Estateline v1.0 Final Status

_Final status date: 2026-08-24 · Current launch state: READY AFTER PROVIDER ACCESS._

## Completed

- Core v1.0 code remains complete: authentication, tenancy, RLS, properties, contacts, leads, deals, viewings, tasks, commissions, reports, import/export, deletion lifecycle, invitations, notifications, bulk actions, global search, audit logs, rate limiting, and portal feeds.
- Security audit remains passed:
  - WhatsApp security: PASS.
  - Invitations security: PASS.
  - Notifications security: PASS.
  - Bulk actions security: PASS.
  - Tenant isolation: PASS.
- Launch operations completed:
  - Daily organization purge automation exists and is active.
  - Weekly Supabase Storage backup automation exists and is active.
  - Storage backup script exists at `scripts/backup-supabase-storage.js`.
  - Backup/restore runbook exists at `docs/OPERATIONS_BACKUP_RUNBOOK.md`.
  - Real agency pilot checklist exists at `docs/PILOT_CHECKLIST.md`.
- Portal feed readiness verified from the deployed service for an existing test organization:
  - OLX XML feed: HTTP 200.
  - Njuškalo XML feed: HTTP 200.
  - Nekretnine.rs XML feed: HTTP 200.
  - JSON feed: HTTP 200.
  - Invalid organization id returns an empty feed, not another tenant's data.

## Verified

- Repository state before this pass: clean at `4b89440`.
- GitHub workflow still contains `node-version: 18`.
- Connected GitHub app write attempt to `.github/workflows/ci.yml` failed with GitHub 404 and OAuth scopes excluding `workflow`.
- Supabase production project:
  - Status: `ACTIVE_HEALTHY`.
  - Region: `eu-central-1`.
  - Database version: Postgres 17.6.1.141.
  - WAL-G backups: enabled.
  - PITR: disabled.
  - Backup listing did not expose concrete restore artifacts during this verification pass.
- Storage backup dry-run:
  - Passed.
  - Current result: no Storage buckets found.
- Organization purge dry-run:
  - Passed.
  - Current result: no organizations due for deletion.
- Zo production service topology:
  - One `estateline` HTTP service is enabled.
  - Current single-instance deployment makes in-memory rate limiting acceptable for v1.0 pilot/initial launch.
  - Upstash becomes required before multi-instance scaling or high-traffic production.

## Remaining external blockers

### GitHub

- Missing permission/credential: GitHub token with `workflow` scope.
- Exact action required: change `.github/workflows/ci.yml` from `node-version: 18` to `node-version: 20`, push to `master`, and confirm GitHub Actions is green.
- Current status: BLOCKED — workflow write permission required.

### Stripe

- Missing permission/credential: Stripe account/API access and production/test credentials.
- Exact actions required:
  - Configure `ESTATELINE_STRIPE_SECRET_KEY` or `STRIPE_SECRET_KEY`.
  - Configure `ESTATELINE_STRIPE_PRICE_STARTER`, `ESTATELINE_STRIPE_PRICE_PRO`, `ESTATELINE_STRIPE_PRICE_AGENCY`.
  - Configure `ESTATELINE_STRIPE_WEBHOOK_SECRET` or `STRIPE_WEBHOOK_SECRET`.
  - Register webhook URL: `https://estateline-sprypine.zocomputer.io/api/billing/webhook` or final production domain equivalent.
  - Subscribe events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
  - Configure Stripe Billing Portal.
  - Run one test-mode subscribe → webhook → subscription verified → cancel → cancellation verified lifecycle.

### Resend / transactional email

- Missing permission/credential: Resend API key and sending-domain access.
- Exact actions required:
  - Configure `ESTATELINE_RESEND_API_KEY` or `RESEND_API_KEY`.
  - Configure `ESTATELINE_EMAIL_FROM` or `EMAIL_FROM`.
  - Verify sending domain.
  - Add SPF, DKIM, and DMARC DNS records.
  - Send one safe Estateline transactional email test.

### Supabase Auth email

- Missing permission/credential: provider-side Supabase Auth SMTP/template configuration access.
- Exact actions required:
  - Configure SMTP/sender.
  - Verify password reset template.
  - Verify reset redirect URL points to the production app domain.
  - Test forgot-password → reset-password end-to-end.

### Sentry

- Missing permission/credential: Sentry project DSN/account access.
- Exact actions required:
  - Configure `NEXT_PUBLIC_SENTRY_DSN` and/or `SENTRY_DSN`.
  - Verify client/server/edge capture with one safe test event.

### WhatsApp / Meta

- Missing permission/credential: Meta app/WhatsApp Business access and agency sender credentials.
- Exact actions required if WhatsApp is enabled for v1.0:
  - Configure `ESTATELINE_WHATSAPP_VERIFY_TOKEN` or `WHATSAPP_VERIFY_TOKEN`.
  - Configure `ESTATELINE_WHATSAPP_APP_SECRET` or `WHATSAPP_APP_SECRET`.
  - Register webhook URL: `https://estateline-sprypine.zocomputer.io/api/whatsapp/webhook` or final production domain equivalent.
  - Subscribe required inbound/status webhook fields.
  - Configure agency `access_token` and `phone_number_id`.
  - Confirm approved templates: `brochure_delivery`, `viewing_confirmation`, `onboarding_welcome`.

### Supabase backup restore

- Missing provider capability/access: concrete restorable backup artifact/restore target was not exposed by the Management API during this pass.
- Exact action required: perform a restore drill into a separate Supabase project before first paying customer data is relied on.

### Portal providers

- Missing permission/approval: provider/account-manager onboarding for OLX, Njuškalo, and Nekretnine.rs.
- Exact actions required:
  - Submit production feed URLs to each provider.
  - Configure provider ingestion schedule.
  - Confirm at least one safe test listing ingestion where provider account access permits it.

## Real pilot status

REAL USER PILOT REQUIRED

## Remaining v1.0 blockers

No remaining v1.0 engineering blockers.

## Final decision

READY AFTER PROVIDER ACCESS
