# Phase 3 — Item 4: Portal Sync Research Summary

> **Purpose:** Comparative research to decide the next Estateline build — **WhatsApp** leads integration vs. **Portal sync** (syndicating listings to BA real-estate portals). No code yet. Recommendation at the end.

---

## A. WhatsApp Lead Capture (Cloud API)

### What it is
WhatsApp Cloud API (Meta-hosted; the only path now — on-prem API was deprecated Oct 2025). Connects a verified WhatsApp Business number to Estateline so inbound inquiries / form replies become `leads` rows automatically, and the CRM can send templated brochures, viewing reminders, and drip nurtures.

### Pricing model (2026)
Per-**delivered template message**, billed by Meta by recipient country + category (marketing / utility / authentication). Replaces the old per-conversation model. Service messages (customer-initiated, within the 24h CSW window) remain **free**.

Indicative per-message ranges [^1]:
- Marketing: **$0.025–$0.137**
- Utility / Authentication: **$0.004–$0.046**
- Service (customer replies within 24h): **free**

Cost stack = Meta per-message + BSP platform fee (if you use Twilio/360dialog/Wati instead of direct Cloud API; BSP adds ~10–40% markup). Direct Cloud API has **no platform fee** — you build the integration.

Real-estate-relevant proven metrics [^2]:
- 87% open rate vs portal-only leads
- 4.2x higher site-visit conversion (0.8% → 3.4%) with WhatsApp-driven CRM
- ~19% lower CPL when paired with Meta's Conversions API

### What it would give Estateline
- Inbound `public_create_lead` already exists for the embed form — WhatsApp becomes a second acquisition channel that lands in the same `leads` pipeline.
- Instant acknowledgement, brochure/virtual-tour links, viewing scheduling reminders — all driven off `leads.stage` transitions.
- Maps cleanly to the existing pipeline stages (New → Contacted → Qualified …) — each template fired on a stage webhook.

### Build cost / risk
- **Effort:** Medium. Meta verification, WABA setup, template approval (~92% approval rate achievable with versioned templates [^2]), 1 webhook endpoint (`/api/whatsapp/webhook`), outbound template sender. ~1–2 weeks.
- **Risk:** Template approval latency + per-message spend if misclassified. Need disciplined categorisation (service vs marketing) to keep costs in the free window.
- **Key constraint:** Templates must be pre-approved per Meta policy; outbound broadcast to non-opted-in contacts is restricted.

---

## B. Portal Sync (listing syndication)

### The BA reality (researched)
| Portal | Public-documented feed/API for agencies? | Verdict |
|---|---|---|
| **Njuškalo.ba** | **Does not exist** — Njuškalo is a Croatian brand (njuskalo.hr). No .ba site with agency APIs. | Dead end |
| **OLX.ba** | No public XML/bulk agency feed found. Owned-by-Naspers classifieds; integration is relationship-based, not self-serve. | Requires bizdev outreach |
| **Oglas.ba / Oglasi.ba** | No documented agency XML feed. | Requires outreach |
| **Doma.ba** | AI-assisted portal with verified-agent programme + premium memberships; **no public API/XML feed** documented — emphasizes marketing/premium placement, not data sync. | Manual only |
| **Realitica.ba** | No public feed API surfaced. | Requires outreach |

**Comparison context:** In Croatia/HR markets, established real-estate CRMs (e.g. **Dimedia nekretnine**) advertise sync to **30+ portals worldwide** and explicit compliance across HR/RS/BA/ME [^3] — proof a portal-sync feature is a real *differentiator*, but it's built on **bespoke B2B contracts** with each portal, not public APIs.

### What portal sync would give Estateline
- Push published `properties` (status='active') to N portals from one dashboard.
- Pull inbound inquiries from portals back into `leads`.
- Strong "white-label agency" sell — matches the README Phase 2 roadmap line "White-label subdomain support".

### Build cost / risk
- **Effort:** High + **mostly non-engineering**. No BA portal offers a public self-serve feed. Every integration = signed partner contract + bespoke XML/CSV schema negotiation + per-org credentials. Engineering per portal: ~3–5 days each *after* the contract; the contract itself is the blocker (weeks–months, may never close).
- **Risk:** Highest. One portal's bizdev loop failing kills the feature's value. No BA portal currently advertises an API—this is a sales problem, not a build problem.

---

## C. Comparison at a glance

| Dimension | WhatsApp | Portal Sync |
|---|---|---|
| Time to value | ~1–2 wks | Weeks–months (blocked on contracts) |
| Engineering-only? | Yes | No — needs B2B sales per portal |
| Public API available? | Yes (Meta Cloud API) | **No** for any major BA portal found |
| Direct pipeline value | Inbound leads + nurture | Outbound distribution + inbound inquiries |
| Marginal cost | Per-message (low, controllable | Per-portal contract + maintenance |
| Differentiator vs BA competitors | Table-stakes (most don't have it) | Strong if landed (few have it) |
| Failure mode | Template rejection, spend creep | Contracts never materialise |

---

## Recommendation

**Build WhatsApp first.** It is the only option that is 1) engineering-complete (no external bizdev gate), 2) has a real public API with predictable per-message pricing, and 3) plugs directly into the `leads` pipeline you already have, including the `public_create_lead` path.

**Park portal sync** as a Phase 2+ marketing play with a specific precondition: only revisit once you have **one signed portal partnership** (likely Doma.ba's verified-agent programme or an OLX.ba bizdev contact) — because without that contract the engineering is moot. Track it as "needs external contract before build starts," not as an engineering backlog item.

### Suggested WhatsApp scope (if you greenlight)
1. Meta Cloud API direct integration (no BSP, no markup) — store credentials in [Settings → Advanced](/?t=settings&s=advanced) secrets.
2. `POST /api/whatsapp/webhook` → inbound → `leads` insert (reuse `public_create_lead` shape).
3. Outbound templates: view confirmation, brochure link, viewing reminder — fired on `leads.stage` transitions.
4. Opt-in tracking on `contacts` (a `whatsapp_opted_in` + `whatsapp_consent_at` column) before any marketing template send.

— Source research notes for §A–§C below.

[^1]: https://flowcall.co/blog/whatsapp-business-api-pricing — WhatsApp Business API Pricing 2026 (per-message model, marketing $0.025–$0.137, utility/auth $0.004–$0.046, service free within 24h CSW).
[^2]: https://itdgrowthlabs.com/case-studies/real-estate-crm-whatsapp-automation.php — ITD GrowthLabs real-estate CRM + WhatsApp Cloud API case study (4.2x site-visit conversion, 87% open rate, 92% template approval via versioning).
[^3]: https://dimedianekretnine.com/ — Dimedia nekretnine agency CRM advertising sync to 30+ portals with HR/RS/BA/ME compliance (proof of concept, not a BA public API).
