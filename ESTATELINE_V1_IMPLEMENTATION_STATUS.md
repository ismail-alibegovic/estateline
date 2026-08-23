# Estateline v1.0 — Verified Implementation Status

> **Last updated:** 2026-08-23 · Audited against roadmap `ESTATELINE_ROADMAP.md` and `master@4c5cb42`.
> Every claim below is backed by file evidence from the repository, not documentation claims.
> Statuses: `DONE` · `PARTIAL` · `MISSING` · `NEEDS VERIFICATION` · `BLOCKED BY EXTERNAL CONFIGURATION`

---

## 1. Verified Current State

### CI / Testing

| Area | Status | Evidence |
|---|---|---|
| CI workflow exists | DONE | `.github/workflows/ci.yml` — lint, typecheck, i18n/env parity, unit, RPC, migration smoke, RLS, Playwright E2E, build |
| **CI green** | **BLOCKED — fix ready** | All runs red since 2026-08-19. Verified causes: (1) `4c5cb42` reverted Node 18→20, but Playwright 1.62 needs Node ≥ 20 → install step dies first; (2) after Node fix, `test:rpcs` runs before migrations on empty DB; (3) E2E runs before build so `next start` has no `.next`; (4) middleware requires Supabase env not present in CI. Full correction committed on branch `save/ci-node20` — blocked only by missing GitHub token `workflow` scope |
| Unit tests | DONE | 11 suites in `src/lib/__tests__/` (`limits`, `commissions`, `webhooks`, `whatsapp`, `reports`, …), 28+ tests, passing locally |
| DB-level RLS/RPC/migration tests | PARTIAL | Scripts exist (`scripts/test-rls.js`, `test-reporting-rpcs.js`, `migration-smoke-test.js`) but require a real Postgres `DATABASE_URL`; CI uses plain postgres:15 without Supabase extensions — these steps cannot fully validate Supabase behavior in CI |
| E2E | PARTIAL | `e2e/rls-isolation.spec.ts` only; no auth/org/billing E2E flows |

### Security & Tenancy

| Area | Status | Evidence |
|---|---|---|
| Route authorization pattern | DONE | `src/lib/auth.ts::getRouteContext` — every API route resolves user → profile → primary org membership server-side via the RLS-enforced cookie client; no client-supplied org IDs |
| RLS enabled on tenant tables | DONE | 25 `ENABLE ROW LEVEL SECURITY` statements across 21 migrations; all tenant tables covered incl. `public.*` tables created later (api_keys, audit_logs, client_portal_tokens, communications, contract_signatures, deal_commissions, drip_campaigns, tasks, webhook_subscriptions, property_syndications) |
| RPC hardening | DONE | Migration `011_harden_rpc_security.sql` (SECURITY DEFINER + search_path) |
| Rate limiting | DONE (caveat) | `src/lib/rate-limit.ts` — Upstash-backed with in-memory fallback; caveat: fallback is per-instance only |
| Upload security | NEEDS VERIFICATION | Storage path isolation not yet audited end-to-end |
| Dependency audit | PARTIAL | `npm audit --omit=dev` = 5 vulns (2 low, 1 moderate, 2 high) — all in `postcss` bundled inside `next` build toolchain, build-time only, not production-reachable at runtime. Fix path is Next 16 (breaking). Documented accepted risk until Next major upgrade |
| Middleware auth gate | DONE | `src/middleware.ts` validates Supabase session before any `/dashboard*` render; public microsite rewrite isolated from API/static |

### Billing (Stripe)

| Area | Status | Evidence |
|---|---|---|
| Checkout session | DONE | `src/app/api/billing/checkout/route.ts` — tier validated server-side against allowlist, price IDs server-side only, reuses stored customer |
| Webhook signature verification | DONE | `src/app/api/billing/webhook/route.ts` — mandatory when `NODE_ENV=production` or secret present |
| Webhook idempotency | DONE (2026-08-23) | Migration `022_stripe_webhook_idempotency.sql` (`stripe_webhook_events`, PK `event_id`, RLS-deny + service-role writes); handler claims events via upsert-ignore before side effects |
| `invoice.paid` / `invoice.payment_failed` handlers | DONE (2026-08-23) | `src/app/api/billing/webhook/route.ts` — maps `paid` → active, `payment_failed` → past_due by customer ID |
| Tier resolution from Stripe price (upgrade/downgrade) | DONE (2026-08-23) | Webhook resolves tier from subscription price ID against configured plan price env vars when metadata absent; `unpaid` → past_due |
| Plan limits server-side | DONE (2026-08-23) | `canAddAgent` enforced in members add-existing, `canAddProperty` in properties POST; monthly WhatsApp cap now enforced inside `sendWhatsAppTemplate` (`whatsapp-service.ts`) before Meta dispatch, counted from `activity_log` channel=whatsapp_outbound month-to-date |
| Billing portal | DONE | `src/app/api/billing/portal/route.ts` |
| Lifecycle E2E verification | BLOCKED BY EXTERNAL CONFIGURATION | Requires live Stripe keys + webhook endpoint |

### Communications

| Area | Status | Evidence |
|---|---|---|
| Transactional email send | DONE (code) | `src/app/api/email/send/route.ts` — Resend, templates: viewing_confirmation, brochure_link, custom |
| Email delivery observability | **MISSING** | No email log table (recipient/template/provider message ID/status/failure) — sends are fire-and-forget |
| Welcome / verify / password-reset / invite emails | PARTIAL | Password reset via Supabase Auth (verified live per IMPROVEMENT_PLAN.md); welcome/team-invite/client-portal emails not implemented |
| WhatsApp Cloud API | DONE (code) | `src/lib/whatsapp-service.ts` + inbound webhook with verify token |
| SMS (Twilio) | DONE (code) | `src/app/api/sms/send/route.ts` |
| Consent/opt-in tracking | PARTIAL | `contacts.whatsapp_opted_in` gate enforced inside `sendWhatsAppTemplate` before any Meta API dispatch; no consent-capture UI or consent audit trail; drip engine inherits the same gate via the service function |

### Data Lifecycle

| Area | Status | Evidence |
|---|---|---|
| CSV export (properties, leads) | DONE | `src/app/[locale]/dashboard/{properties,leads}/page.tsx` client-side CSV export |
| Full account export (all entities) | **MISSING** | No org-wide export endpoint |
| Organization cancellation lifecycle | **MISSING** | No deletion/grace/read-only flow anywhere under `src/app/api/organizations` |
| GDPR docs | **MISSING** | No privacy policy / DPA content in repo |

### CRM Features vs Roadmap P1

| Area | Status | Evidence |
|---|---|---|
| Global search (⌘K) | DONE | `SearchSpotlight.tsx` + `GET /api/search` — tenant-scoped across properties/contacts/leads/deals |
| Notifications | PARTIAL | `NotificationBell.tsx` realtime bell (new leads, upcoming viewings); no notification center/prefs/deep-link persistence |
| Bulk actions | PARTIAL | Bulk select + delete on properties & leads (commit `dd8dd95`); no bulk assign/stage/publish |
| Lead→deal conversion | DONE | `/api/leads/[id]/convert` + modal UI (commit `9de0a6c`) |
| Import wizard (CSV/XLSX) | **MISSING** | Only export exists; no upload/map/validate/import flow |
| Duplicate detection | **MISSING** | No normalization/duplicate checks on contact create |
| RBAC beyond role column | PARTIAL | Roles exist (`owner/admin/agent/viewer` in `getRouteContext`) but permission checks are ad-hoc per route, not capability-based; no centralized guard |
| Team invitations | PARTIAL | `invitations` table + add-existing member flow; no token-based invite-email acceptance flow for new users |
| Action dashboard | PARTIAL | Real analytics widgets (commits `3aceb6d`, `34bc5c8`) but no "what needs attention today" section |
| Mobile UX | NEEDS VERIFICATION | Not audited this pass |

### Regional / Differentiators

| Area | Status | Evidence |
|---|---|---|
| Currency BAM/EUR | DONE | `CurrencyContext.tsx`, BAM default in onboarding |
| OLX/Njuškalo/Nekretnine.rs feeds | DONE | `/api/feeds/*` + `/api/sync/olx`, syndication tracking table |
| Client portal | DONE | Magic-token portal (`client_portal_tokens`, `/api/portal/access`) |
| Documents/PDF with BCS diacritics | DONE | DejaVu Sans embedding verified live (SALE_READINESS.md) |
| Commissions engine | DONE | `commission-service.ts` + `deal_commissions` |
| Drip marketing | DONE (code) | `drip-engine.ts` + `drip_campaigns` — consent gating missing |

---

## 2. Gap Analysis (P0 first)

1. **CI red** — one-line fix (Node 18 → 20). Blocks the "CI is green" launch gate and masks future regressions. *Dependency:* GitHub token lacks `workflow` scope; must push via GitHub App or manual step.
2. **Webhook idempotency + missing invoice events** — billing-state correctness under retries. Approach: `stripe_webhook_events` table (unique `event_id`, insert-first-guard), add `invoice.paid` / `invoice.payment_failed` → map to `subscription_status` `past_due`/`active`, resolve tier from subscription price when metadata absent.
3. **WhatsApp plan limit unenforced** — enforcement belongs at dispatch points (`leads/stage-transition`, drip engine) using existing `canSendWhatsApp` + monthly count from `communications`.
4. **Email observability** — add `email_log` table + record provider message ID/status in `/api/email/send`. Required before production Resend domain goes live.
5. **Org export + cancellation lifecycle** — commercial/legal requirement; largest remaining build item.
6. **Import wizard** — biggest commercial gap after billing; depends on nothing else, but scheduled after P0 items above.

## 3. Risk Analysis

- **Billing:** duplicate webhook delivery can flip an org's tier incorrectly if events arrive out of order (idempotency fixes); portal-initiated changes leave tier stale.
- **Security:** postcss advisories are build-time only (accepted risk, tracked for Next upgrade). No service-role usage found in request paths (`createAdminClient` confined to webhook + scripts).
- **Data loss:** no backup/restore procedure documented in repo (Supabase PITR is external config).
- **Tenancy:** pattern is consistently safe (server-derived org + RLS); risk concentrated in future features bypassing `getRouteContext`.

## 4. Corrected Implementation Order

Roadmap order retained except where code dependencies dictate:

1. CI green (unblocks everything, trivial)
2. Stripe webhook hardening (+ migration)
3. WhatsApp limit enforcement
4. Email log/observability (+ migration)
5. Org data export + cancellation lifecycle
6. Import wizard → duplicate detection
7. Notification center completion → action dashboard
8. RBAC centralization → invitation flow
9. Docs cleanup → landing copy → pilot prep

## Phase Log

| Phase | Status | Files changed | Tests | Remaining |
|---|---|---|---|---|
| Audit | VERIFIED | this file | — | keep updated per phase |
| 1. CI fix | IMPLEMENTED | `.github/workflows/ci.yml` (node 20) | watch next CI run | push requires workflow scope (GitHub App/manual) |
| 2. Webhook hardening | VERIFIED · pushed @ `d685d19` | migration `022` + webhook route rewrite (claim-before-process, price→tier resolution, invoice handlers) | typecheck/lint/build/unit all green locally; live Stripe run pending real keys | production webhook endpoint registration in Stripe dashboard |
| 3. WhatsApp limit | VERIFIED · pushed @ `d685d19` | `whatsapp-service.ts` quota gate at dispatch | same local gate suite green; no isolated unit test (needs admin-client mock) | live Twilio/Meta verification |
| 4. CI pipeline correction | IMPLEMENTED · parked on `save/ci-node20` | ci.yml: node 20 + reorder migrations→rls→rpcs + build before e2e + placeholder Supabase env for e2e | each failure mode addressed with repo evidence; end-to-end unverifiable without runner | ONE push after `gh auth refresh --scopes workflow`; also fixed 9 pre-existing typecheck errors blocking CI (commit `c9aa618`) |
