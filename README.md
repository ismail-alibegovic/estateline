# Estateline

**A multi-tenant CRM for real-estate agencies in Bosnia & Herzegovina, Croatia, Serbia and Montenegro.** Agencies manage listings, contacts, leads, deals, viewings and commissions in one workspace, and syndicate listings to the region's property portals.

> **Status:** v1.0 feature set is implemented and the security audit items pass; launch is waiting on production provider access (payments, SMS/WhatsApp). Not yet launched with a customer agency. Details: [`ESTATELINE_V1_IMPLEMENTATION_STATUS.md`](ESTATELINE_V1_IMPLEMENTATION_STATUS.md).

---

## What it does

| Area | Capabilities |
| --- | --- |
| Inventory | Properties with media, map view (Leaflet), bulk actions, import/export (Excel) |
| Pipeline | Leads, contacts, drag-and-drop deal pipeline, viewings calendar, tasks |
| Money | Commissions, quotes, invoices (PDF generation), plan-based usage limits |
| Communication | Activity timeline, e-mail (Resend), SMS (Twilio), WhatsApp Cloud API webhooks with opt-in tracking |
| Distribution | XML/JSON listing feeds for OLX, Njuškalo and Nekretnine.rs; embeddable lead-capture form |
| Reporting | Agent performance, lead-source funnel, time-to-close and probability-weighted revenue forecasts |
| Admin | Organizations, invitations, roles, audit logs, global search, Stripe billing |

The UI ships in Bosnian and English with a CI check for translation parity.

## Architecture

```text
Next.js 14 (App Router, next-intl)
  ├─ Server components & route handlers  ─┐
  ├─ /api/feeds/*, /api/leads/public      │  rate-limited public endpoints
  └─ /api/whatsapp, /api/billing (webhooks)│
                                           ▼
                     Supabase PostgreSQL ── Row Level Security on every business table
                                         ── SECURITY DEFINER RPCs guarded by is_org_member() / is_admin()
```

- **Tenant isolation at the database layer.** Every business table carries an `organization_id`, and RLS policies — not application code alone — decide what a user can read or write.
- **Reporting in SQL.** Leaderboards, funnels and forecasts are Postgres RPCs, so aggregation happens next to the data and respects the same tenant rules.
- **Feeds that fail closed.** An unknown organization id returns an empty feed rather than another tenant's listings.
- **32 additive SQL migrations**, smoke-tested from scratch in CI.

## Quality and operations

- GitHub Actions: lint, typecheck, migration smoke test, RLS tenant-isolation tests, reporting-RPC tests, i18n and environment-variable parity checks.
- Vitest unit tests and a Playwright tenant-isolation suite.
- Sentry error monitoring, Lighthouse CI, Upstash/in-memory rate limiting.
- Scheduled storage backups and a documented [backup/restore runbook](docs/OPERATIONS_BACKUP_RUNBOOK.md).

## Tech stack

Next.js 14 · TypeScript · Tailwind CSS · shadcn/ui · next-intl · Supabase (PostgreSQL, Auth, Storage) · TanStack Table · Recharts · Leaflet · pdf-lib · ExcelJS · Stripe · Resend · Twilio · Sentry · Vitest · Playwright

## Running locally

```bash
npm install --legacy-peer-deps
cp .env.example .env.local     # Supabase URL/keys; payment and messaging keys are optional
npm run dev                    # http://localhost:3000
```

Checks:

```bash
npm run check:env && npm run check:i18n
npm run test:unit
npm run test:migrations && npm run test:rls && npm run test:rpcs   # need DATABASE_URL
```

All variables are documented in [`.env.example`](.env.example). Further reading: [`ARCHITECTURE.md`](ARCHITECTURE.md), [`SETUP.md`](SETUP.md), [`SECURITY.md`](SECURITY.md).

## Author

Built by [Ismail Alibegović](https://github.com/ismail-alibegovic) — Sarajevo, Bosnia and Herzegovina.
