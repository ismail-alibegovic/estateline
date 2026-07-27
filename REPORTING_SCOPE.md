# Advanced Reporting & Analytics Specification (`REPORTING_SCOPE.md`)

This document outlines the proposed design, metrics extensions, and data requirements for Estateline's Advanced Reporting module.

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

To turn the static dashboard into an actionable business intelligence engine, we propose extending `/api/dashboard/metrics` (or providing `/api/reports/...` sub-endpoints) with time-range parameters (`start_date`, `end_date`, `agent_id`):

### Report 1: Agent Performance & Closed Sales Volume
* **Purpose**: Evaluate revenue and deal throughput per real estate agent.
* **Metrics**:
  * Total closed deals won per agent (`COUNT(deals)` where `stage = 'closed_won'`)
  * Total closed revenue per agent (`SUM(price)`)
  * Total commission earned (`SUM(commission_amount)`)
  * Total viewings conducted per agent (`COUNT(viewings)`)
* **Data Availability**: Fully supported by current schema (`deals.user_id`, `deals.price`, `deals.commission_amount`, `viewings.agent_id`).

### Report 2: Pipeline Stage & Lead Conversion Funnel
* **Purpose**: Identify bottlenecks in agency lead qualification and conversion.
* **Metrics**:
  * Conversion rate: Inbound leads $\rightarrow$ Qualified $\rightarrow$ Viewing $\rightarrow$ Closed Won
  * Stage duration average (how many days a deal spends in `negotiation` or `under_contract`)
  * Lost reason distribution (`closed_lost` deals grouped by metadata/reason)
* **Data Availability**: Supported by current schema (`leads.stage_id`, `deals.stage`, `activity_log`).

### Report 3: Average Time-to-Close by Property & Deal Type
* **Purpose**: Benchmark transaction velocity across property types (e.g. Apartment vs. House) and deal types (Sale vs. Rental).
* **Metrics**:
  * Average days from lead creation (`created_at`) to deal `closed_won` timestamp
  * Average days on market per property type
* **Data Availability**: Supported by current schema (`deals.created_at`, `deals.updated_at`, `properties.type`, `deals.type`).

### Report 4: Financial & Commission Forecasting vs. Actuals
* **Purpose**: Provide revenue projection for management based on weighted pipeline probability.
* **Metrics**:
  * Expected Revenue (Sum of `price * stage_probability` for active deals)
  * Paid vs. Unpaid Commissions (`SUM(commission_amount)` grouped by `commission_paid`)
* **Data Availability**: Fully supported by current schema (`deals.price`, `deals.commission_pct`, `deals.commission_paid`, `deals.stage`).

---

## 3. Schema Audit & Identified Gaps

| Report | Required Field | Schema Status | Action Required |
|---|---|---|---|
| Lead Attribution | `lead_source` (e.g. Web, WhatsApp, OLX, Referral) | ⚠️ Missing | Add `source` column to `leads` table in next migration pass |
| Lost Reason Tracking | `lost_reason` (e.g. Price too high, Competitor) | ⚠️ Missing | Add `lost_reason` column to `deals` table in next migration pass |
| Agent Commissions | `commission_amount` & `commission_paid` | ✅ Present | Native support in `deals` table |
| Viewing History | `viewings.status` & `viewings.scheduled_at` | ✅ Present | Native support in `viewings` table |
