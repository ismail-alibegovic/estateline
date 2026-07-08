# Estateline

Multi-tenant SaaS CRM for real estate agencies in the Balkans (Bosnia & Herzegovina, Croatia, Serbia).

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase and Stripe credentials

# Run database migrations (via Supabase CLI)
npx supabase migration up

# Start development server
npm run dev
```

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes + Supabase (PostgreSQL, Auth, Storage)
- **Database**: PostgreSQL with Row Level Security (RLS) for tenant isolation
- **Payments**: Stripe Checkout + Customer Portal
- **PDF Generation**: `pdfkit`

## Key Features

### Phase 1 (MVP — This Repository)
- [x] Multi-tenant architecture with RLS
- [x] User authentication (email/password, OAuth ready)
- [x] Organization signup with atomic transaction
- [x] Property management (CRUD, images)
- [x] Contact management (buyers, sellers, landlords, tenants)
- [x] Deal pipeline (customizable stages, drag-and-drop)
- [x] Activity logging (calls, emails, tasks, meetings)
- [x] PDF generation (contracts, quotes from templates)
- [x] Basic calendar (contacts + viewings)
- [x] Lead capture forms (embeddable on any website)

### Phase 2 (Planned)
- [ ] Stripe subscription billing (Starter/Pro/Agency tiers)
- [ ] Custom fields per organization
- [ ] Email integration (send/receive from CRM)
- [ ] SMS integration
- [ ] Advanced reporting & analytics
- [ ] Mobile app (React Native)
- [ ] White-label subdomain support
- [ ] API for third-party integrations

## Project Structure

```
estateline/
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   │   ├── auth/      # Authentication endpoints
│   │   │   ├── properties/
│   │   │   ├── contacts/
│   │   │   ├── deals/
│   │   │   └── documents/
│   │   ├── dashboard/     # Main app (authenticated)
│   │   ├── login/         # Login page
│   │   ├── onboarding/    # First-time setup
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Landing page
│   ├── lib/
│   │   └── supabase.ts    # Supabase client + types
│   └── middleware.ts      # Auth middleware
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Complete database schema
├── public/                # Static assets
├── ARCHITECTURE.md        # Technical architecture details
├── SECURITY.md            # Security model (RLS, audit logging)
└── package.json
```

## Database Schema

### Core Tables
- `users` — User profiles (linked to auth.users)
- `organizations` — Tenant entities
- `organization_members` — User-org membership + role
- `properties` — Real estate listings
- `contacts` — People/companies
- `deals` — Transactions with pipeline stages
- `deal_activities` — Calls, emails, tasks, meetings, notes
- `documents` — Generated PDFs
- `audit_logs` — Immutable change history

### Key Design Decisions
1. **RLS for tenant isolation** — Every business table has an `organization_id` and RLS policies
2. **Atomic signup** — User + org + membership created in a single Postgres function
3. **Audit logging via triggers** — Cannot be bypassed by application bugs
4. **Custom fields via JSONB** — Flexible schema without dynamic columns

## Security

See [SECURITY.md](./SECURITY.md) for the complete security model.

### Key Points
- Row Level Security enforced on all business tables
- Service role key never exposed to client
- Atomic signup prevents orphaned users
- Audit trail for all data changes
- Stripe webhook signature verification

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (server-only)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Development

```bash
# Install
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Type check
npm run type-check

# Lint
npm run lint
```

## Deployment

### Vercel (Recommended)
1. Connect your GitHub repository
2. Add environment variables
3. Deploy

### Supabase Migration
```bash
# Apply migrations
npx supabase migration up

# Or via Supabase dashboard: SQL Editor → Run migration file
```

## Contributing

1. Create a feature branch
2. Make changes
3. Write tests (if applicable)
4. Submit a pull request

## License

Proprietary — All rights reserved.

---

**Built by Ismail Alibegović** — [LinkedIn](https://linkedin.com/in/ismail-alibegovic-5b89b438a) | [GitHub](https://github.com/ismail-alibegovic)