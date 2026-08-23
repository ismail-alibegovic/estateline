# Estateline v1.0 Final Status

_Audit date: 2026-08-23 · HEAD: `a742079` (master, pushed) · Evidence-based audit of actual code against ESTATELINE_ROADMAP.md. Documentation was not trusted over implementation._

## Overall Status

**v1.0 is close but not launch-complete.** Core CRM lifecycle (signup → org → properties/leads/viewings/pipeline/deals → documents/commissions → reports/export), multi-tenant RLS isolation, import, and the deletion lifecycle are implemented and tested. The remaining gap is concentrated in: real invitations flow, notifications, bulk actions, WhatsApp webhook signature validation, and external configuration (Stripe live/test keys, Resend, Twilio/WhatsApp app secret, Sentry DSN, purge cron, CI Node bump).

Legend: VERIFIED / IMPLEMENTED — NEEDS VERIFICATION / EXTERNAL CONFIG REQUIRED / PARTIAL / MISSING / NOT REQUIRED FOR V1.0

| Area | Status |
|---|---|
| Authentication | VERIFIED |
| Organizations & multi-tenancy | VERIFIED |
| RLS tenant isolation | VERIFIED |
| RBAC (roles & permissions) | IMPLEMENTED — NEEDS VERIFICATION |
| Properties CRUD | VERIFIED |
| Contacts CRUD | VERIFIED |
| Leads + pipeline + stages | VERIFIED |
| Viewings | VERIFIED |
| Deals / lead conversion | VERIFIED |
| Tasks | VERIFIED |
| Communications (call/WhatsApp quick-send) | IMPLEMENTED — NEEDS VERIFICATION |
| Documents (generate/contract/sign) | IMPLEMENTED — NEEDS VERIFICATION |
| Commissions | VERIFIED |
| Reporting (5 RPC-backed reports) | VERIFIED |
| Stripe billing | IMPLEMENTED — NEEDS VERIFICATION (+ EXTERNAL CONFIG) |
| Email (Resend + email_log) | EXTERNAL CONFIG REQUIRED |
| SMS (Twilio) | EXTERNAL CONFIG REQUIRED |
| WhatsApp inbound webhook | PARTIAL |
| Import (CSV/XLSX) | VERIFIED |
| Export | VERIFIED |
| Organization deletion lifecycle | VERIFIED (+ purge cron = EXTERNAL CONFIG) |
| Portal feeds & sync observability | IMPLEMENTED — NEEDS VERIFICATION |
| Notifications | MISSING |
| Global search (Ctrl+K, tenant-scoped) | VERIFIED |
| Bulk operations | MISSING |
| Monitoring (Sentry) | EXTERNAL CONFIG REQUIRED |
| Rate limiting | PARTIAL |
| Audit logs / activity log | VERIFIED |
| Onboarding | VERIFIED |
| CI/CD | PARTIAL (manual fix pending) |
| Tests (unit 44/44, RLS e2e) | VERIFIED |
| Mobile-critical flows | IMPLEMENTED — NEEDS VERIFICATION |
| Public website copy cleanup | NOT REQUIRED FOR V1.0 (P2 polish) |
| Docs consolidation (/docs) | P1 remaining work |
| AI valuation/matchmaking | NOT REQUIRED FOR V1.0 |

## Launch Blockers

None found that are code-only and unaddressed. The single process blocker: `.github/workflows/ci.yml` still pins Node 18 (`node-version: 18`) while the toolchain requires Node 20 — **assigned to Ismail for manual change**, not bypassed.

## External Configuration Required

| Item | Files | What remains |
|---|---|---|
| Stripe keys + price IDs + webhook secret | env (`integration-env.ts`, checkout route) | Live/test-mode `STRIPE_SECRET_KEY`, per-plan price IDs mapped server-side already, `STRIPE_WEBHOOK_SECRET`; then a test-mode end-to-end subscription run. Status after config: **IMPLEMENTATION COMPLETE — EXTERNAL CONFIGURATION REQUIRED** |
| Resend API key + verified domain | `/api/email/send` | Key only; logging into `email_log` (migration 023) is code-complete with tests |
| Twilio SID/token + from number | `/api/sms/send` | Credentials only |
| WhatsApp app secret | `/api/whatsapp/webhook` | See security item W-1 below — also needs signature validation enabled |
| Sentry DSNs | `sentry.{server,edge,client}.config.ts`, `instrumentation-client.ts` | Project DSNs; PII scrubbing already unit-tested |
| Purge cron for deleted orgs | `scripts/purge-deleted-orgs.js` | Schedule the script (any scheduler); verified runnable — outputs "no organizations due for deletion" on empty set |
| Portal feed credentials (OLX etc.) | `src/lib/olx-helpers.ts`, `/api/sync/olx` | Real portal accounts/tokens |

## P0 Status

All P0 roadmap items are code-complete: production env safety (`check:env` parity gate passes), Stripe lifecycle + webhook idempotency (migration `022_stripe_webhook_events`, unique `event_id`, service-role-only via RLS-deny-all), transactional email with delivery log, comms infrastructure, CI workflow present (Node bump manual), security audit done (below), RLS validated by `test:rls` + `e2e/rls-isolation.spec.ts`, backups/recovery prep documented, observability wired (Sentry + audit logs), data export live, deletion lifecycle complete through soft-delete/grace/read-only-gate/purge script. Remaining P0 items are the external configurations above plus the CI Node bump.

## P1 Status

- Team invitations — **PARTIAL**: `invitations` table exists (types at `src/lib/supabase.ts:413`, migration 004) but no token-link invite flow. Working substitute: `POST /api/organizations/members/add-existing` (owner/admin gated, plan-limit checked via `canAddAgent`). Missing: token generation, invitation email, accept flow, expiry.
- Notifications — **MISSING**: no table, no API, no UI.
- Bulk actions — **MISSING**: no bulk endpoints or multi-select UI.
- Duplicate detection beyond import — import has it; lead-level dedupe on public capture not verified.
- Dashboard action-first layout — dashboard metrics route exists; "what needs attention today" grouping not audited in depth (non-blocking).
- Mobile/PWA refinement — flows are responsive; no device pass done yet.
- Docs consolidation — README strong and consistent; `/docs/*` split not yet created.

## Security Verification

- **Tenant isolation**: every authenticated route resolves org from session — `getRouteContext()` (`src/lib/auth.ts`) calls `auth.getUser()` and loads membership server-side; client-supplied `org_id` is never trusted (comment + implementation confirmed). 41 API routes use this pattern.
- **RLS**: all tenant-owned tables enable RLS with `is_org_member(organization_id)` policies (migrations 001–024). `organization_members`: SELECT scoped to members, writes gated by `is_admin` (`001_initial_schema.sql:108–115`). Note: an admin could insert another member as `'owner'`; acceptable for v1, tighten later if needed.
- **Service-role key**: only referenced in `src/lib/env.ts` (server) and the Stripe webhook route; never imported into client components; no `NEXT_PUBLIC_*SECRET*` leaks found.
- **Stripe webhook**: `constructEvent` signature verification (`webhook/route.ts:87`) + idempotent event claiming (migration 022) + `webhooks.test.ts`.
- **Plan limits enforced server-side**: `src/lib/limits.ts` used in `add-existing` (agent seats) and property limits; prices resolved from server env map, never from client body.
- **Public endpoints rate-limited**: memory token bucket (`src/lib/rate-limit.ts`) on `/api/leads/public`, `/api/integrations/status`, and all feed routes. Limitation: in-memory store resets on deploy and doesn't cluster; fine for single-instance v1, Upstash optional.
- **Export authorization**: auth-gated via `getRouteContext` but allowed for any role incl. viewer — intentional for data portability; flag if you want owner/admin-only.
- **Deletion safety**: lifecycle route gates writes for orgs scheduled for deletion (`allowScheduledForDeletion` opt-in per route); purge is script-driven, not a button.
- **W-1 (medium, should fix before launch)**: `/api/whatsapp/webhook` accepts Meta verification with fallback token `'default_verify_token'` (`whatsapp/webhook/route.ts:18`) and does not validate `X-Hub-Signature-256`. Fix: require configured verify token (no fallback) + HMAC-check payload against `WHATSAPP_APP_SECRET`.

## Billing Verification

Checkout creates customer + subscription with server-side price mapping; customer portal route; webhook verifies signatures, claims events idempotently, handles subscription lifecycle states. **Not yet exercised against live Stripe** — classification stands at IMPLEMENTED — NEEDS VERIFICATION until one test-mode subscribe/upgrade/cancel cycle runs with real keys.

## Data Lifecycle Verification

Deletion lifecycle: request (`deletion_requested_at`) → grace period → scheduled date → access gate flips read-only/blocked outside opted-in routes → `scripts/purge-deleted-orgs.js` performs permanent deletion (dry-run verified: exits cleanly when nothing is due). Export covers core entities to CSV pre-deletion. Cancel path exists (`organizations/lifecycle`).

## Integrations Verification

- Stripe — implementation complete, configuration required
- Resend email — implementation complete, configuration required
- Twilio SMS — implementation complete, configuration required
- WhatsApp Cloud API — **incomplete** (signature validation missing; see W-1)
- Upstash rate limiting — optional, not integrated (in-memory limiter ships instead)
- Supabase — production-ready (migrations additive, RLS everywhere)
- Sentry — implementation complete, configuration required
- OLX/Njuškalo/Nekretnine.rs feeds — outbound XML/JSON feeds + syndication status fields (`external_id`, `status active|paused|error`, `last_synced_at`, `error_message` in migration 008) + status endpoint; live portal verification pending credentials

## Test Coverage

- Unit: **13 files / 44 tests passing** (commissions, whatsapp, client-portal, reports, valuation, domains, webhooks, olx-sync, limits, import, sentry-pii, email-log, ai-matchmaking)
- Migration/RPC suites: `test:migrations`, `test:rls`, `test:rpcs`
- E2E: `e2e/rls-isolation.spec.ts` (2 cross-tenant tests)
- Gates: typecheck 0 errors, lint clean, `check:i18n` EN/BS parity, `check:env` parity, production build passes
- Gap: no automated tests for documents/sign flow or notifications (once built)

## Remaining Non-Blocking Work

1. Real invitations flow (token link + email + accept) replacing/augmenting add-existing
2. Notifications system (table, API, bell UI, deep links)
3. Bulk actions on leads/properties tables
4. W-1 WhatsApp webhook hardening
5. `/docs` consolidation (PRODUCT/ARCHITECTURE/DATABASE/SECURITY/DEPLOYMENT/BILLING/INTEGRATIONS/TESTING/OPERATIONS) + archive stale status claims
6. Dashboard "needs attention today" pass + mobile device walkthrough
7. Optional: Upstash-backed rate limiting for multi-instance safety
