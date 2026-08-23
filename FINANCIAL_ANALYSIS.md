# Estateline — Financial Analysis & Valuation
**Date**: 2026-08-19  
**Live**: https://estateline-sprypine.zocomputer.io  
**Repo**: github.com/ismail-alibegovic/estateline  

---

## 1. Project Summary

Multi-tenant SaaS CRM for real estate agencies across Bosnia & Herzegovina, Croatia, Serbia, and Montenegro. Built on Next.js 14 + Supabase (RLS multi-tenancy) with Stripe billing, WhatsApp Cloud API, Twilio SMS, Resend email, PDF generation, i18n (BS/EN), and full CI/E2E test infrastructure.

### Codebase Stats
| Metric | Value |
|--------|-------|
| Source files (TS/TSX/CSS) | 144 |
| Lines of code | ~24,400 |
| SQL migrations | 21 (~1,900 lines) |
| API routes | 48 |
| Unit test files | 11 |
| Directory tree depth | 131 directories |
| E2E test suite | Playwright (tenant isolation) |

### Feature Matrix
| Module | Status |
|--------|--------|
| Property CRUD + image uploads + Leaflet map picker | Production |
| Lead kanban pipeline with source attribution | Production |
| Contact management + viewing calendar | Production |
| Deal tracking + stage transitions | Production |
| Agent performance reports + leaderboards | Production |
| Financial/commission forecasting | Production |
| WhatsApp inbound webhook + automated replies | Production |
| PDF document generation (Unicode) | Production |
| Stripe Checkout + Customer Portal | Code-complete, needs keys |
| Multi-org support (user belongs to N orgs) | Production |
| Custom fields (JSONB) | Production |
| Immutable audit logs | Production |
| Public lead embed form | Production |
| Bilingual marketing landing page | Production |
| Onboarding wizard | Production |
| OLX/Njuškalo/Nekretnine.rs feed sync | Production |
| Rate limiting (in-memory + Upstash Redis) | Production |
| Sentry PII-redacted observability | Production |

### Tier Plan Limits

| Tier | Price/mo | Agents | Properties | WhatsApp/mo |
|------|----------|--------|------------|-------------|
| Beta (free trial) | €0 | 1 | 10 | 50 |
| Starter | €29 | 3 | Unlimited | 200 |
| Pro | €79 | 15 | Unlimited | 1,000 |
| Agency | €199 | Unlimited | Unlimited | Unlimited |

---

## 2. Development Cost Estimate

### What it would cost to rebuild from scratch

**Balkan market rates** (senior full-stack: €40–60/hr):

| Phase | Hours | Cost (€) |
|-------|-------|----------|
| Architecture + DB schema (RLS multi-tenancy, migrations) | 120–160 | 6,000–9,600 |
| Auth + org onboarding + multi-org | 80–100 | 4,000–6,000 |
| Property CRUD + images + map picker | 100–140 | 5,000–8,400 |
| Lead kanban + pipeline + source attribution | 80–120 | 4,000–7,200 |
| Contacts + viewing calendar | 60–80 | 3,000–4,800 |
| Deal tracking + stage transitions | 60–80 | 3,000–4,800 |
| Reporting suite (4 RPC reports + UI) | 80–100 | 4,000–6,000 |
| Stripe billing + tier enforcement + Customer Portal | 60–80 | 3,000–4,800 |
| WhatsApp webhook + Twilio + Resend integrations | 60–80 | 3,000–4,800 |
| PDF generation (Unicode, templates) | 40–60 | 2,000–3,600 |
| i18n (BS/EN full parity) | 40–50 | 2,000–3,000 |
| OLX/feed sync + public forms | 40–60 | 2,000–3,600 |
| CI pipeline + unit/E2E tests | 40–60 | 2,000–3,600 |
| Landing page + onboarding + polish | 40–60 | 2,000–3,600 |
| **Total** | **860–1,160** | **€43,000–69,600** |

**Western market rates** (senior full-stack: $100–150/hr):
- Same scope: **$86,000–$174,000**

### Actual costs incurred

| Item | Cost |
|------|------|
| Supabase Pro (while building) | ~$25/mo × ~4 months = ~$100 |
| Domain (estateline.app or similar) | ~$15 |
| Development time | In-house (0 external cost) |
| AI tooling (Zo, ChatGPT, etc.) | Subscription costs (nominal) |
| **Total out-of-pocket** | **~$200–300** |

**Effective development cost (sweat equity)**: €43,000–69,600 at Balkan rates

---

## 3. Infrastructure Operating Costs

Monthly costs at low-to-moderate scale (0–50 paying organizations):

| Service | Tier | Monthly |
|--------|------|---------|
| Supabase | Pro ($25/mo) | $25 |
| Vercel deployment | Pro ($20/mo) or Hobby ($0) | $0–20 |
| Stripe fees | 2.9% + $0.30/txn (pass-through) | $0 |
| Resend email | Free up to 3,000/mo | $0 |
| Twilio (SMS + WhatsApp) | Pay-per-message | $5–20 |
| Upstash Redis | Free up to 10K commands/day | $0 |
| Sentry | Free developer tier | $0 |
| Domain | ~$15/year | $1.25 |
| Zo Computer hosting | Included in plan | $0 |
| **Total** | | **$31–66/mo** |

At moderate scale (50–200 agencies): ~$150–300/mo (Supabase scales, Resend paid tier, Upstash paid tier).

---

## 4. Revenue Projections

### Addressable Market (Balkans)

| Country | Est. Agencies | SaaS-Adoptable (est. 40%) |
|---------|---------------|---------------------------|
| Bosnia & Herzegovina | ~500 | 200 |
| Croatia | ~1,200 | 480 |
| Serbia | ~1,500 | 600 |
| Montenegro | ~200 | 80 |
| **Total** | **~3,400** | **~1,360** |

### Revenue Scenarios (Annual)

| Scenario | Agencies | Avg MRR/Agency | MRR | ARR | Capture Rate |
|----------|----------|----------------|-----|-----|-------------|
| Conservative (Year 1) | 20 | €40 | €800 | €9,600 | 0.6% |
| Moderate (Year 1) | 40 | €50 | €2,000 | €24,000 | 1.2% |
| Optimistic (Year 1) | 70 | €55 | €3,850 | €46,200 | 2.1% |
| Conservative (Year 2) | 60 | €50 | €3,000 | €36,000 | 1.8% |
| Moderate (Year 2) | 120 | €60 | €7,200 | €86,400 | 3.5% |
| Optimistic (Year 2) | 200 | €65 | €13,000 | €156,000 | 5.9% |

### Per-Tier Revenue Breakdown (Moderate Year 2: 120 agencies)

| Tier | % of base | Count | MRR |
|------|-----------|-------|-----|
| Starter (€29) | 50% | 60 | €1,740 |
| Pro (€79) | 35% | 42 | €3,318 |
| Agency (€199) | 15% | 18 | €3,582 |
| **Total** | | **120** | **€8,640/mo** |

---

## 5. Sale Valuation

### Valuation Methodologies

#### A. Asset Sale — Codebase + IP + Rights

Pre-revenue SaaS, code-complete, production-deployed.

| Method | Value | Reasoning |
|--------|-------|-----------|
| Replacement cost (Balkan) | €43,000–69,600 | What it costs to rebuild locally |
| Replacement cost (Western) | €86,000–174,000 | What it costs to rebuild with Western devs |
| Rule of thumb (0.5–1× dev cost) | €21,500–69,600 | Standard pre-revenue asset multiple |
| **Recommended asking price** | **€25,000–45,000** | Realistic for Balkan buyer |
| **Recommended asking price** | **€60,000–100,000** | If targeting Western/international buyer |

#### B. Revenue Multiple (if sold with existing customer base)

| Scenario | ARR | 3× multiple | 5× multiple |
|----------|-----|------------|------------|
| Moderate Year 1 (40 agencies) | €24,000 | €72,000 | €120,000 |
| Moderate Year 2 (120 agencies) | €103,680 | €311,040 | €518,400 |

Early-stage Balkan SaaS typically trades at **2–4× ARR** (not 5–10× like US SaaS). Apply a discount for market risk and small TAM.

#### C. Strategic Acquisition

If a larger prop-tech player (e.g., Nekretnine.rs, Njuškalo, or a regional CRM) wants the tech, codebase, and market entry:

- **€50,000–150,000** — tech + IP acquisition
- Higher end if they value the RLS multi-tenancy architecture, WhatsApp integration, and i18n framework

### What's NOT included in the codebase value

| Asset | In codebase? | Notes |
|-------|-------------|-------|
| Stripe production keys | No | Buyer provides own |
| Twilio/WhatsApp numbers | No | Buyer sets up |
| Customer base | No | Zero customers currently |
| Brand/trademark | Partial | "Estateline" name is free |
| Domain | No | Buyer registers |
| Team/ongoing support | No | Code-only transfer |
| Marketing/sales pipeline | No | None built |

### Recommended Sale Structure

**Option 1: Clean IP Transfer**
- One-time payment: €30,000–45,000
- Full source code, DB schema, migrations, documentation
- Rights to rebrand, resell, modify
- No ongoing obligation

**Option 2: Revenue Share (if kept operational)**
- 0 upfront
- 15–25% monthly revenue share for 24 months
- You retain ownership, they operate/sell
- Reduces buyer risk, builds monthly income

**Option 3: Per-License Reseller**
- €2,000–5,000 setup fee per agency
- White-label deployment with branding customization
- €50–100/mo maintenance fee per instance

---

## 6. Monthly Enterprise Pricing Proposals

### For Direct Agency Sales

#### Small Agency (1–3 agents)
| Plan | Monthly | Annual (2 mo free) |
|------|---------|---------------------|
| Starter | **€29/mo** | €290/yr |
| What's included: 3 agents, unlimited properties, 200 WhatsApp/mo, lead pipeline, calendar, reports |

#### Medium Agency (4–15 agents)
| Plan | Monthly | Annual (2 mo free) |
|------|---------|---------------------|
| Pro | **€79/mo** | €790/yr |
| What's included: 15 agents, unlimited properties, 1,000 WhatsApp/mo, all Starter features, custom fields, document generation, feed syndication |

#### Large Agency / Franchise (15+ agents)
| Plan | Monthly | Annual (2 mo free) |
|------|---------|---------------------|
| Agency | **€199/mo** | €1,990/yr |
| What's included: Unlimited agents, unlimited WhatsApp, priority support, white-label options, multi-branch management, API access |

### For White-Label / Enterprise Deals

| Tier | Setup | Monthly | Annual Contract |
|------|-------|---------|-----------------|
| Single Instance | €1,500 | €99 | €990/yr |
| Multi-Instance (3–5) | €3,500 | €249 | €2,490/yr |
| Enterprise (unlimited) | €8,000 | €499 | €4,990/yr |
| Source License (self-host) | €12,000–25,000 one-time | Optional €200/mo support | N/A |

---

## 7. Competitive Landscape (Balkans)

| Competitor | Price/mo | Estateline Advantage |
|------------|----------|---------------------|
| Spreadsheets/pen & paper | €0 | Everything |
| Basic listing portals (OLX, Njuškalo) | Free–€20 | Full pipeline, not just listings |
| Generic CRM (HubSpot, Pipedrive) | €14–90 | Real estate-specific, Balkan i18n |
| Regional RE CRMs (few exist) | €50–200 | Modern stack, lower cost, self-service |

**Key differentiator**: No real-estate-specific SaaS CRM currently serves the Balkan market with local language support, WhatsApp integration, and RLS-secured multi-tenancy at this price point.

---

## 8. Risk Factors

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Small TAM (3,400 agencies) | Limits ARR ceiling to ~€200K/yr | Expand to broader EU market with i18n |
| Low SaaS adoption in Balkans | Slower growth | Offer free tier, in-person onboarding |
| Stripe not fully available in BiH | Can't charge via Stripe locally | Use alternative payment gateway (Monri, CorvusPay) — requires dev work |
| Single developer dependency | Bus factor = 1 | Documented architecture, tests, CI |
| Competition from listing portals | They add CRM features | Niche differentiation, speed to market |

---

## 9. Verdict

**Pre-revenue asset value**: €25,000–45,000 (Balkan buyer), €60,000–100,000 (international buyer)  
**Sweat equity invested**: ~€43,000–69,600 in development time  
**Monthly run cost at launch**: ~€50  
**Breakeven point**: 2 paying Pro agencies covers infrastructure  
**Path to €5K MRR**: ~80–100 agencies at blended rate  

Estateline is code-complete and production-deployed. The gap to revenue is purely operational: Stripe keys, a domain, and go-to-market. At a conservative €50 blended ARPU, reaching 100 agencies generates €5,000/mo (€60,000/yr) — entirely feasible within 18–24 months in the Balkan market with dedicated sales effort.
