# Estateline SaaS CRM — Feature & Architecture Checklist

This document reflects the current production architecture and completed feature set of **Estateline**.

---

## ✅ Core Infrastructure & Security
- [x] **Next.js 14 App Router** — TypeScript, Server/Client components, dynamic locale routing (`[locale]`).
- [x] **Supabase RLS & Multi-Tenancy** — Strict tenant isolation by `organization_id` across all database tables.
- [x] **Postgres Schema & Migrations** — 13 migrations covering properties, leads, contacts, deals, tasks, communications, custom fields, viewings, syndications, and activity logging.
- [x] **RPC Security** — Hardened RPC functions (`create_organization`, `get_public_microsite_data`) with `SECURITY DEFINER` and search path constraints.
- [x] **Authentication** — Supabase Auth SSR middleware supporting multi-tenant user profile linking.

---

## ✅ CRM Modules & Dashboards
- [x] **Properties Module** — Listing management, cover images, image gallery arrays, location coordinates, currency switching (BAM / EUR), and custom fields.
- [x] **Leads & Contacts** — Lead stage pipeline tracking, contact relationships, and activity attribution.
- [x] **Deals & KanBan Pipeline** — Stage movement tracking, deal value calculations, and activity logs.
- [x] **Tasks & Communications** — Task scheduling, call/email logs, and activity timeline tracking.
- [x] **Custom Fields Engine** — Dynamic custom fields per organization with JSON schema enforcement.
- [x] **Invoices & Quotes** — Financial document generation and state tracking.
- [x] **Viewings & Calendar** — Viewing appointment scheduling and agent calendar integration.
- [x] **WhatsApp Cloud API** — Direct WhatsApp click-to-chat messaging integration with `messaged` activity logging.

---

## ✅ Portal Syndication & Microsites
- [x] **Multi-Portal Feeds** — Dynamic XML and JSON feed endpoints for regional Balkan portals:
  - OLX (`/api/feeds/olx/[org_id]`)
  - Njuškalo (`/api/feeds/njuskalo/[org_id]`)
  - Nekretnine.rs (`/api/feeds/nekretnine_rs/[org_id]`)
  - Generic JSON (`/api/feeds/json/[org_id]`)
- [x] **Public Agency Microsite** — Dynamic white-labeled agency portal (`/site/[subdomain]`) with dynamic SVG image placeholders.
- [x] **Lead Capture Widget** — Public embeddable lead capture form (`/embed`) with token validation.

---

## 🧪 Testing & Verification Commands
- **Run Type Check**: `npm run type-check`
- **Run Migration Smoke Test**: `npm run test:migrations`
- **Run RLS Security Test**: `npm run test:rls`
- **Deploy Remote Migrations**: `node scripts/deploy-remote-migrations.js`