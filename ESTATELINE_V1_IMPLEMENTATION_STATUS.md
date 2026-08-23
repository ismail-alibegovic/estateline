# Estateline v1.0 Final Status

_Final status date: 2026-08-23 · HEAD: `15e4f21` (`fix(security): prevent admin owner-role invitation escalation`) · Based on completed audit, verification, and production-configuration review._

## 1. Final readiness

| Dimension | Readiness | Decision |
|---|---:|---|
| Feature completeness | 96% | Core v1.0 CRM lifecycle is implemented: signup, organization, billing hooks, team invitations, import, properties, contacts, leads, pipeline, viewings, deals, documents, commissions, reporting, export, deletion lifecycle, notifications, global search, and bulk actions. |
| Technical readiness | 98% | Typecheck: 0 errors; unit tests: 85/85 passing; migration smoke: PASS; RLS: PASS; production build: PASS; Playwright critical tests: PASS. |
| Production readiness | 82% | Code is launch-ready. Production launch still depends on provider credentials, backups/restore setup, purge scheduling, and the manual CI Node 20 change. |
| Commercial readiness | 88% | Product flow is sufficient for first paying agencies after Stripe, email, WhatsApp/SMS, monitoring, backups, and portal onboarding are configured. |

## 2. Code-level launch blockers

No remaining code-level launch blockers.

## 3. Manual repository task

- Update `.github/workflows/ci.yml` manually:
  - Change `node-version: 18`
  - To `node-version: 20`
- Reason: Playwright requires Node 20+. Current credentials cannot modify GitHub workflow files because they lack the `workflow` scope.

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
  - Confirm automated database backups are enabled in Supabase.
  - Decide whether daily backups are enough or PITR is required.
  - Define restore owner, restore procedure, and expected recovery window.
  - Perform one restore drill before onboarding paid customers.

- **Storage backup strategy**
  - Create a separate backup/sync plan for Supabase Storage objects.
  - Include property images, documents, generated PDFs, signatures, avatars, and any uploaded files.
  - Verify that restored database rows still point to recoverable files.

- **Organization purge cron**
  - Schedule `node scripts/purge-deleted-orgs.js --confirm`.
  - Required env: `ESTATELINE_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`, plus `SUPABASE_SERVICE_ROLE_KEY`.
  - Run a dry-run first without `--confirm`.
  - Add monitoring/alerting for failures.

- **Portal feed onboarding/configuration**
  - Provide production feed URLs to each enabled portal/account manager.
  - Configure ingestion manually for OLX, Njuškalo, and Nekretnine.rs where the portal supports external feeds.
  - For OLX pull-import, configure the agency OLX profile/shop URL in the app.
  - Treat official portal partnerships/API access as provider-side onboarding, not a code blocker.

### Optional / can be enabled later

- **Twilio SMS**
  - Required only if SMS sending is enabled for customers.
  - Configure `ESTATELINE_TWILIO_ACCOUNT_SID`, `ESTATELINE_TWILIO_AUTH_TOKEN`, `ESTATELINE_TWILIO_FROM_NUMBER`.

- **Upstash**
  - Configure `ESTATELINE_UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_URL`.
  - Configure `ESTATELINE_UPSTASH_REDIS_REST_TOKEN` or `UPSTASH_REDIS_REST_TOKEN`.
  - Without Upstash, the app falls back to in-memory rate limiting, acceptable for single-instance launch but not ideal for multi-instance or high-traffic production.

- **Sentry source maps / release tracking**
  - Useful for debugging production errors, not a launch blocker if DSN capture is already configured.

- **PITR**
  - Recommended for stronger recovery objectives; daily backups may be acceptable for first launch if the owner accepts the risk.

## 5. Post-v1.0 improvements

1. Consolidate stale planning/checklist docs into `/docs` and keep this file as the launch-status source of truth.
2. Add deeper E2E coverage for billing portal, invitation acceptance, notifications, bulk actions, and document generation.
3. Add production restore runbook with screenshots/steps after the first Supabase restore drill.
4. Add stronger operational dashboards for portal feed health and failed outbound communications.
5. Replace in-memory rate limiting with Upstash before scaling beyond one production instance.

## 6. Final launch decision

READY AFTER EXTERNAL CONFIGURATION
