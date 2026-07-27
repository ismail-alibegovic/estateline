# Advanced Reporting & Analytics Specification (`REPORTING_SCOPE.md`)

This document outlines the proposed design, metrics extensions, and data requirements for Estateline's Advanced Reporting module, verified directly against the production Postgres schema migrations (`001` through `015`).

---

## 1. Current Baseline Metrics

Currently, `GET /api/dashboard/metrics` calls the RPC function `get_dashboard_metrics(p_org_id)` which returns high-level total counts:

```json
{
  "properties_total": 42,
  "properties_active": 35,
  "leads_total": 120,
  "leads_open": 85,
  "leads_won": 24,
  "contacts_total": 98,
  "viewings_upcoming": 12
}
```

---

## 2. Proposed Advanced Report Specifications

To turn the static dashboard into an actionable business intelligence engine, we propose extending `/api/dashboard/metrics` (or providing `/api/reports/...` sub-endpoints) with time-range parameters (`start_date`, `end_date`, `assigned_to`):

### Report 1: Agent Performance & Closed Sales Volume
* **Purpose**: Evaluate revenue and deal throughput per real estate agent.
* **Metrics**:
  * Total closed deals won per agent (`COUNT(deals)` where `stage = 'closed_won'`)
  * Total closed revenue per agent (`SUM(price)`)
  * Total commission earned (`SUM(commission_amount)`)
  * Total viewings conducted per agent (`COUNT(viewings)`)
* **Data Availability**: Fully supported by current schema (`deals.assigned_to`, `deals.price`, `deals.commission_amount`, `viewings.assigned_agent`).

### Report 2: Pipeline Stage & Lead Conversion Funnel
* **Purpose**: Identify bottlenecks in agency lead qualification and conversion.
* **Metrics**:
  * Inbound lead attribution breakdown by source (`leads.source`: `website`, `portal`, `whatsapp`, `referral`, `phone`, `walk_in`, `other`)
  * Conversion rate: Inbound leads $\rightarrow$ Qualified $\rightarrow$ Viewing $\rightarrow$ Closed Won
  * Lost reason distribution (`deals.lost_reason` and `leads.lost_reason` grouped by category)
* **Data Availability**: Fully supported by current schema (`leads.source`, `leads.stage`, `deals.stage`, `deals.lost_reason`, `leads.lost_reason`).

### Report 3: Average Time-to-Close by Property & Deal Type
* **Purpose**: Benchmark transaction velocity across property types (e.g. Apartment vs. House) and deal types (Sale vs. Rental).
* **Metrics**:
  * Average days from deal creation (`created_at`) to closed timestamp (`closed_at`)
  * Average days on market per property type (`properties.type`, `deals.type`)
* **Data Availability**: Fully supported by current schema (`deals.created_at`, `deals.closed_at`, `properties.type`, `deals.type`).

### Report 4: Financial & Commission Forecasting vs. Actuals
* **Purpose**: Provide revenue projection for management based on weighted pipeline probability.
* **Metrics**:
  * Expected Revenue (Sum of `price * (probability / 100.0)` for active deals)
  * Paid vs. Unpaid Commissions (`SUM(commission_amount)` grouped by `commission_paid`)
* **Data Availability**: Fully supported by current schema (`deals.price`, `deals.probability`, `deals.commission_pct`, `deals.commission_paid`, `deals.stage`).

---

## 3. Verified Schema Audit

All required columns for the 4 report types are already natively supported in the production PostgreSQL database:

| Feature / Metric | Target Column & Type | Source Migration | Schema Status |
|---|---|---|---|
| Lead Source Attribution | `leads.source` (`lead_source` enum) | `002_properties_leads.sql` | ✅ Native Support |
| Lost Reason Tracking | `deals.lost_reason` (`TEXT`), `leads.lost_reason` (`TEXT`) | `002` & `004_deals_and_activity.sql` | ✅ Native Support |
| Agent Deal Assignment | `deals.assigned_to` (`UUID` $\rightarrow$ `users.id`) | `004_deals_and_activity.sql` | ✅ Native Support |
| Agent Viewing Assignment | `viewings.assigned_agent` (`UUID` $\rightarrow$ `users.id`) | `002_properties_leads.sql` | ✅ Native Support |
| Agent Commissions | `deals.commission_amount` & `deals.commission_paid` | `004_deals_and_activity.sql` | ✅ Native Support |
| Viewing History & Status | `viewings.status` & `viewings.scheduled_at` | `002_properties_leads.sql` | ✅ Native Support |
