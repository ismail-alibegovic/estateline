# Estateline — Premier Real Estate CRM for the Balkan Market

Multi-tenant SaaS CRM built specifically for real-estate agencies across Bosnia & Herzegovina, Croatia, Serbia, and Montenegro (BA/HR/RS/ME).

---

## 1. Production Architecture Overview

- **Frontend & App Surface**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui components, `next-intl` (Bosnian `bs` & English `en` parity).
- **Database & Data Isolation**: Supabase (Postgres 15 with 18+ strictly additive SQL migrations). Multi-tenancy is enforced at the database layer via **Postgres Row Level Security (RLS)** — every business table requires an `organization_id` check.
- **Security & Privileged Operations**: All privileged RPCs use `SECURITY DEFINER` with explicit `is_org_member(org_id)` or `is_admin(org_id)` guards.
- **Integrations**: Stripe (Checkout, Customer Portal, Webhook), Resend Email, Twilio SMS, WhatsApp Cloud API (inbound webhooks + outbound stage transitions), and XML/JSON Outbound Feed Syndication (Njuškalo, Nekretnine.rs, OLX import).
- **Observability & Rate Limiting**: In-memory token bucket & Upstash Redis rate limiting on public endpoints (`/api/leads/public`, `/api/feeds/*`), with explicit CI env and i18n parity validation.

---

## 2. Core Modules & Production Features

### A. Business Intelligence & Reporting
- **Agent Performance & Leaderboard**: Deal volume, sales revenue, viewings conducted, and commissions earned per agent (`get_agent_performance_report` RPC).
- **Lead Funnel & Source Attribution**: Inbound lead breakdown by channel, stage status, and lost reasons (`get_lead_conversion_report` RPC).
- **Transaction Velocity (Time-to-Close)**: Average, minimum, and maximum days to close deals grouped by property/deal type (`get_time_to_close_report` RPC).
- **Financial & Commission Forecasting**: Probability-weighted pipeline revenue, total closed-won revenue, and earned vs paid commission tracking (`get_financial_forecasting_report` RPC).

### B. Communications & WhatsApp Loop
- Inbound WhatsApp webhook (`/api/whatsapp/webhook`) creates leads and contact records with explicit opt-in tracking (`whatsapp_opted_in`, `whatsapp_consent_at`).
- Stage-transition trigger sends automated WhatsApp template messages on lead stage changes.
- Unified Chronological Activity & Communications timeline for leads and contacts.

### C. Plan Limits & Billing Enforcement
- Enforced tier caps (`beta`, `starter`, `pro`, `agency`) for active agents, property listings, and monthly WhatsApp messages via `src/lib/limits.ts`.
- Real-time "Plan Usage & Tier Caps" widget rendered in Settings → Billing.

### D. Testing & QA Infrastructure
- **CI Workflows**: GitHub Actions (`.github/workflows/ci.yml`) runs linting, TypeScript type checks, migration smoke tests, RLS tenant isolation tests, i18n key parity checks, and env variable completeness checks.
- **Unit & E2E Testing**: Vitest for helper logic (`npm run test:unit`) and Playwright for E2E tenant isolation (`npm run test:e2e`).

---

## 3. Quick Start & Commands

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run environment and translation parity checks
npm run check:env
npm run check:i18n

# Run unit tests
npm run test:unit

# Run database migration & RLS integration tests
npm run test:migrations
npm run test:rls
npm run test:rpcs

# Start local development server
npm run dev
```

---

## 4. Environment Variables

Documented in [.env.example](file://./.env.example):
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_AGENCY`
- Email & Communications: `RESEND_API_KEY`, `EMAIL_FROM`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `WHATSAPP_VERIFY_TOKEN`
- Rate Limiting: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`