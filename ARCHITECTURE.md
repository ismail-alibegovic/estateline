# Estateline Architecture

## Overview

Estateline is a multi-tenant SaaS CRM for real estate agencies in the Balkans. It is built on a strict tenant isolation model using Supabase Row Level Security (RLS) as the primary data boundary.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes + Supabase (PostgreSQL, Auth, Storage)
- **Database**: PostgreSQL with Supabase, using RLS for tenant isolation
- **Payments**: Stripe Checkout + Customer Portal
- **PDF Generation**: `pdfkit` for contract/quote generation
- **Deployment**: Vercel (frontend) + Supabase (backend)

## Multi-Tenancy Model

### Core Principle
Every piece of business data belongs to exactly one organization. There is no cross-tenant data sharing.

### Tenant Identification
- **Organization**: The top-level tenant entity. Each organization has:
  - `id` (UUID, primary key)
  - `name` (display name)
  - `slug` (unique, URL-safe identifier)
  - `subdomain` (unique, for future custom domain support)
  - `subscription_tier` (starter/pro/agency)
  - `stripe_customer_id` and `stripe_subscription_id`
  - `branding` (JSON blob for logo, colors)
  - `locale_default` and `currency_default`

- **Organization Members**: Users belong to organizations via the `organization_members` table. Each membership record has:
  - `user_id` (FK to users)
  - `organization_id` (FK to organizations)
  - `role` (owner/admin/agent)
  - `is_primary` (boolean — identifies the user's default org)

### Data Isolation via RLS

All business tables (`properties`, `contacts`, `deals`, `activities`, etc.) include an `organization_id` column. RLS policies enforce that users can only access rows where:

```sql
organization_id IN (
  SELECT organization_id 
  FROM organization_members 
  WHERE user_id = auth.uid()
)
```

This is the **only** data access pattern. There are no exceptions.

## Database Schema

### Auth & Identity
- `auth.users` (Supabase managed)
- `public.users` — User profile (one per auth user)
- `public.organizations` — Tenant entity
- `public.organization_members` — User-org membership + role

### Core Business Tables
- `properties` — Real estate listings (sale/rent, residential/commercial)
- `property_images` — Images for properties
- `contacts` — People/companies (buyers, sellers, landlords, tenants)
- `deals` — Transactions linking contacts, properties, and pipeline stages
- `deal_activities` — Calls, emails, tasks, meetings, notes
- `pipeline_stages` — Customizable stages per organization
- `documents` — Generated PDFs (contracts, quotes)
- `custom_fields` — Per-org custom field definitions
- `custom_field_values` — Values for custom fields on any entity

### Subscription & Billing
- `subscriptions` — Tracks Stripe subscription status per org
- `invoices` — Billing history

### System
- `audit_logs` — Immutable record of all data changes (who, what, when, from_ip)

## API Routes

### Auth
- `POST /api/auth/signup` — Create user + organization (atomic RPC)
- `POST /api/auth/signin` — Supabase sign-in
- `POST /api/auth/signout` — Supabase sign-out
- `POST /api/auth/callback` — OAuth callback

### Organizations
- `POST /api/organizations/create` — Create new organization (service-role only)
- `GET /api/organizations` — List user's organizations

### Properties
- `GET /api/properties` — List (filtered by org via RLS)
- `POST /api/properties` — Create
- `PUT /api/properties/:id` — Update
- `DELETE /api/properties/:id` — Delete
- `POST /api/properties/:id/images` — Upload images

### Contacts
- `GET /api/contacts` — List
- `POST /api/contacts` — Create
- `PUT /api/contacts/:id` — Update
- `DELETE /api/contacts/:id` — Delete

### Deals
- `GET /api/deals` — List (with pipeline grouping)
- `POST /api/deals` — Create
- `PUT /api/deals/:id` — Update (including stage movement)
- `DELETE /api/deals/:id` — Delete
- `POST /api/deals/:id/activities` — Log activity

### Documents
- `POST /api/documents/generate` — Generate PDF from template
- `GET /api/documents/:id` — Download

## Security

### Row Level Security (RLS)
Every business table has RLS enabled. Policies follow this pattern:

```sql
-- Select policy
CREATE POLICY "Tenant isolation" ON properties
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Insert policy (similar, with organization_id check)
-- Update policy (similar)
-- Delete policy (similar)
```

### Authorization Checks
- API routes verify the user is authenticated via middleware
- RLS handles data-level access control (no need for manual checks in API code)
- Service-role calls (e.g., `create_organization`) are only made server-side

### Audit Logging
An `audit_logs` table captures every INSERT, UPDATE, DELETE on business tables via triggers. This is non-bypassable and provides a forensic trail.

## Deployment

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # Server-only
STRIPE_SECRET_KEY=           # Server-only
STRIPE_WEBHOOK_SECRET=       # Server-only
```

### Database Migrations
All schema changes go through Supabase migrations in `supabase/migrations/`. The initial migration (`001_initial_schema.sql`) creates:
1. Enum types
2. Extension (uuid-ossp)
3. All tables
4. RLS policies
5. Indexes
6. Triggers (audit log, updated_at)
7. Functions (create_organization, create_user_profile)

### Stripe Integration
- Each organization gets a Stripe Customer record
- Subscription tiers: Starter ($29/mo), Pro ($79/mo), Agency ($199/mo)
- Stripe Checkout for initial signup
- Stripe Customer Portal for billing management
- Webhooks update `subscriptions` table on payment events

## Development

```bash
# Install
npm install

# Run dev
npm run dev

# Build
npm run build

# Database migrations
npx supabase migration up
```

## Key Design Decisions

1. **RLS over application-level filtering**: Data isolation is enforced at the database layer, not in API code. This eliminates entire classes of security bugs.

2. **Atomic signup**: User creation + organization creation + membership creation happen in a single transaction (via Postgres function called as service-role RPC). No orphaned auth users.

3. **Single primary organization**: Each user has exactly one `is_primary = true` membership. This simplifies the dashboard experience — users always know which org they're acting in.

4. **Audit log as triggers**: Immutable audit trail is generated at the database level, not in application code. This can't be bypassed by a buggy API route.

5. **Stripe Customer per organization**: Billing is tied to the organization, not the user. This supports the multi-tenant model cleanly.

6. **Custom fields via JSONB**: Rather than dynamic columns, custom field values are stored as JSONB with a schema definition in `custom_fields`. This is flexible and queryable.