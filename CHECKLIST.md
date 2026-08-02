# Estateline SaaS CRM — Feature & Architecture Checklist

This document reflects the current production architecture and completed feature set of **Estateline**.

---

## ✅ Core Infrastructure & Security
- [x] **Next.js 14 App Router** — TypeScript, Server/Client components, dynamic locale routing (`[locale]`).
- [x] **Supabase RLS & Multi-Tenancy** — Strict tenant isolation by `organization_id` across all database tables.
- [x] **Sentry Error Monitoring** — App Router integration with automated PII scrubbing (`beforeSendSentry`) for phone numbers, emails, and names.
- [x] **Rate Limiting Engine** — Token bucket rate limiting on public forms, microsites, and feed endpoints.
- [x] **Postgres Schema & Migrations** — 21 migrations covering properties, leads, contacts, deals, tasks, communications, custom fields, viewings, syndications, webhooks, API keys, e-signatures, audit logs, commissions, drip marketing, and client portals.
- [x] **RPC Security** — Hardened RPC functions (`create_organization`, `get_public_microsite_data`, reporting RPCs) with `SECURITY DEFINER` and search path constraints.
- [x] **Authentication** — Supabase Auth SSR middleware supporting multi-tenant user profile linking.

---

## ✅ CRM Modules & Dashboards
- [x] **Properties Module** — Listing management, cover images, image gallery arrays, location coordinates, currency switching (BAM / EUR), and custom fields.
- [x] **Automated Property Valuation Engine** — Instant comparative market valuation algorithm (`POST /api/properties/valuation`).
- [x] **Leads & Contacts** — Lead stage pipeline tracking, contact relationships, and activity attribution.
- [x] **Deals & KanBan Pipeline** — Stage movement tracking, deal value calculations, and activity logs.
- [x] **Business Intelligence & Advanced Reports** — Visual conversion funnels, agent performance leaderboards, time-to-close metrics, lost reason analysis, and financial forecasting.
- [x] **Tasks & Communications** — Task scheduling, call/email logs, and activity timeline tracking.
- [x] **Custom Fields Engine** — Dynamic custom fields per organization with JSON schema enforcement.
- [x] **Invoices & Quotes** — Financial document generation and state tracking.
- [x] **Viewings & Calendar** — Viewing appointment scheduling and agent calendar integration.
- [x] **WhatsApp Cloud API** — Direct WhatsApp click-to-chat messaging integration with `messaged` activity logging.

---

## ✅ Phase 4: Enterprise, AI & Automation
- [x] **AI Property Description Assistant** — Gemini API REST integration with rule engine fallback for SEO property descriptions (`POST /api/ai/generate-description`).
- [x] **AI Property-Lead Matchmaking Engine** — Match score calculation (0-100%) evaluating budget, city, property type, and rooms (`POST /api/ai/matchmaking`).
- [x] **Digital E-Sign & PDF Contracts Engine** — Visual signature stamp embedding and contract status tracking (`POST /api/documents/sign`).
- [x] **Outgoing Webhooks Engine** — Async event dispatcher with HMAC-SHA256 signature verification (`/api/webhooks/subscriptions`).
- [x] **Developer API Keys** — Secure SHA-256 hashed API key management (`/api/developer/api-keys`).
- [x] **Audit Security Log & Viewer Component** — Real-time security and agent activity tracking UI (`AuditLogViewer.tsx` & `/api/audit-logs`).

---

## ✅ Phase 5: Client Portal, Commission Engine & Drip Marketing
- [x] **Client Portal (Kupac & Prodavac Portal)** — Magic-link secure portal view for clients (`/portal/[token]` & `ClientPortalView.tsx`).
- [x] **Deal Commission Split Engine** — Agent percentage splits, commission payouts, and agency net margin calculator (`POST /api/commissions` & `commission-service.ts`).
- [x] **Automated Drip Marketing Engine** — Stage-triggered email/WhatsApp lead nurture campaigns (`POST /api/marketing/drip` & `drip-engine.ts`).

---

## ✅ Portal Syndication & Microsites
- [x] **Multi-Portal Feeds & OLX Sync** — Dynamic XML/JSON feed endpoints and two-way OLX portal sync (`/api/sync/olx`).
  - OLX (`/api/feeds/olx/[org_id]`)
  - Njuškalo (`/api/feeds/njuskalo/[org_id]`)
  - Nekretnine.rs (`/api/feeds/nekretnine_rs/[org_id]`)
  - Generic JSON (`/api/feeds/json/[org_id]`)
- [x] **Public Agency Microsite & Custom Domains** — Dynamic white-labeled agency portal (`/site/[subdomain]`) with custom domain mapping (`properties.agency.com`).
- [x] **Lead Capture Widget** — Public embeddable lead capture form (`/embed`) with token validation.

---

## 🧪 Testing & Verification Commands
- **Run Unit Tests**: `npm run test:unit`
- **Run Type Check**: `npm run type-check`
- **Run Linting**: `npm run lint`
- **Run i18n Key Parity Check**: `npm run check:i18n`
- **Run Environment Parity Check**: `npm run check:env`
- **Run Playwright E2E Tests**: `npm run test:e2e`
- **Run Migration Smoke Test**: `npm run test:migrations`
- **Run RLS Security Test**: `npm run test:rls`
- **Deploy Remote Migrations**: `node scripts/deploy-remote-migrations.js`