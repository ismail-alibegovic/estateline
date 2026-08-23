# Estateline v1.0 Final Status

_Final status date: 2026-08-24 · Based on completed audit, verification, production-configuration review, and available-provider setup._

## 1. Final readiness

| Dimension | Readiness | Decision |
|---|---:|---|
| Feature completeness | 96% | Core v1.0 CRM lifecycle is implemented: signup, organization, billing hooks, team invitations, import, properties, contacts, leads, pipeline, viewings, deals, documents, commissions, reporting, export, deletion lifecycle, notifications, global search, and bulk actions. |
| Technical readiness | 98% | Typecheck: 0 errors; unit tests: 85/85 passing; migration smoke: PASS; RLS: PASS; production build: PASS; Playwright critical tests: PASS. |
| Production readiness | 86% | Code is launch-ready. Purge scheduling and storage backup automation are configured. Production launch still depends on provider credentials, Supabase backup/PITR decisions, and GitHub workflow write permission for the CI Node 20 change. |
| Commercial readiness | 89% | Product flow is sufficient for first paying agencies after Stripe, email, WhatsApp/Meta, monitoring, Supabase backup policy, and portal onboarding are configured. |

## 2. Code-level launch blockers

No remaining code-level launch blockers.

## 3. Manual repository task

- BLOCKED — GitHub workflow write permission required.
- Required repository change in `.github/workflows/ci.yml`:
  - Change `node-version: 18`
  - To `node-version: 20`
- Verified attempted path: connected GitHub app Contents API returned 404 with OAuth scopes excluding `workflow`.
- Reason: Playwright requires Node 20+. Current available GitHub credentials cannot modify `.github/workflows/*`.

## 4. External configuration required before launch

### Required before first paying customer

- **Stripe**
  - Configure `ESTATELINE_STRIPE_SECRET_KEY` or `STRIPE_SECRET_KEY`.
  - Configure `ESTATELINE_STRIPE_PRICE_STARTER`, `ESTATELINE_STRIPE_PRICE_PRO`, `ESTATELINE_STRIPE_PRICE_AGENCY`.
  - Configure `ESTATELINE_STRIPE_WEBHOOK_SECRET` or `STRIPE_WEBHOOK_SECRET`.
  - Add Stripe webhook URL: `https://<production-domain>/api/billing/webhook`.
  - Subscribe webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
  - Configure Stripe Billing Portal in Stripe Dashboard.
  - Run one test-mode subscribe → update/cancel → failed-payment simulation before live customer billing.

- **Resend / email**
  - Configure `ESTATELINE_RESEND_API_KEY` or `RESEND_API_KEY`.
  - Configure `ESTATELINE_EMAIL_FROM` or `EMAIL_FROM`.
  - Verify the sending domain in Resend.
  - Add Resend DNS records: SPF, DKIM, DMARC.
  - Confirm invitation emails and transactional CRM emails send from the verified address.

- **Supabase Auth email**
  - Configure Supabase Auth SMTP/sender settings and email templates.
  - Confirm password reset redirect points to the production app domain.
  - Test forgot-password → reset-password flow in production/staging.

- **WhatsApp / Meta**
  - Configure `ESTATELINE_WHATSAPP_VERIFY_TOKEN` or `WHATSAPP_VERIFY_TOKEN`.
  - Configure `ESTATELINE_WHATSAPP_APP_SECRET` or `WHATSAPP_APP_SECRET`.
  - Add Meta webhook URL: `https://<production-domain>/api/whatsapp/webhook`.
  - Subscribe required WhatsApp webhook fields for inbound messages/statuses.
  - For each agency using WhatsApp, populate `organizations.whatsapp_config` with `access_token` and `phone_number_id`.
  - Approve outbound templates referenced by code: `brochure_delivery`, `viewing_confirmation`, `onboarding_welcome`.

- **Sentry**
  - Configure `NEXT_PUBLIC_SENTRY_DSN` and/or `SENTRY_DSN`.
  - Set production environment/release values in hosting if release tracking is needed.

- **Supabase backups / restore**
  - Supabase Management API confirms the project is `ACTIVE_HEALTHY` in `eu-central-1`.
  - Management API reports `walg_enabled: true`.
  - Management API reports `pitr_enabled: false`.
  - Backups endpoint returned no listed backups at verification time.
  - Decide whether daily/WAL-G backups are enough or PITR is required.
  - Perform one restore drill before onboarding paid customers.

- **Storage backup strategy**
  - Implemented `scripts/backup-supabase-storage.js`.
  - Added `npm run backup:storage`.
  - Added `docs/OPERATIONS_BACKUP_RUNBOOK.md`.
  - Dry-run passed and currently reports no Storage buckets.
  - Weekly Zo automation is scheduled for confirmed storage backups.
  - Before customer uploads go live, verify backup artifacts after the first real bucket/object exists.

- **Organization purge cron**
  - Dry-run completed successfully: no organizations due for deletion.
  - Daily Zo automation is scheduled at 03:15 Europe/Sarajevo:
    - `node scripts/purge-deleted-orgs.js --confirm`
  - Automation is configured to stay silent on clean no-op runs and email on purge/failure.

- **Portal feed onboarding/configuration**
  - Production feed endpoints verified against the deployed service for one existing organization:
    - `/api/feeds/olx/[org_id]` returns XML.
    - `/api/feeds/njuskalo/[org_id]` returns XML.
    - `/api/feeds/nekretnine_rs/[org_id]` returns XML.
    - `/api/feeds/json/[org_id]` returns JSON.
  - Invalid organization ids return empty feeds, not records from another tenant.
  - Provider-side onboarding remains required: submit the production feed URLs to each portal/account manager and configure ingestion schedules.
  - For OLX pull-import, configure the agency OLX profile/shop URL in the app.

### Optional / can be enabled later

- **Twilio SMS**
  - Required only if SMS sending is enabled for customers.
  - Configure `ESTATELINE_TWILIO_ACCOUNT_SID`, `ESTATELINE_TWILIO_AUTH_TOKEN`, `ESTATELINE_TWILIO_FROM_NUMBER`.

- **Upstash**
  - Configure `ESTATELINE_UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_URL`.
  - Configure `ESTATELINE_UPSTASH_REDIS_REST_TOKEN` or `UPSTASH_REDIS_REST_TOKEN`.
  - Without Upstash, the app falls back to in-memory rate limiting, acceptable for the current single-instance Zo service launch but not ideal for multi-instance or high-traffic production.

- **Sentry source maps / release tracking**
  - Useful for debugging production errors, not a launch blocker if DSN capture is already configured.

- **PITR**
  - Recommended for stronger recovery objectives; daily backups may be acceptable for first launch if the owner accepts the risk.

## 5. Post-v1.0 improvements

1. Consolidate stale planning/checklist docs into `/docs` and keep this file as the launch-status source of truth.
2. Add deeper E2E coverage for billing portal, invitation acceptance, notifications, bulk actions, and document generation.
3. Add screenshots/owner-specific steps to the production restore runbook after the first Supabase restore drill.
4. Add stronger operational dashboards for portal feed health and failed outbound communications.
5. Replace in-memory rate limiting with Upstash before scaling beyond one production instance.

## 6. Final launch decision

READY AFTER EXTERNAL CONFIGURATION
