# Estateline Database Deployment Guide

## Step 1: Apply the Schema

1. Open your Supabase project dashboard: https://vlkasfskndcmbrbbdvzd.supabase.co
2. Go to **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy the entire contents of `001_initial_schema.sql` and paste it
5. Click **Run** to execute

The migration will create:
- `organizations` table (multi-tenant root)
- `users` table (linked to auth.users)
- `organization_members` table (many-to-many with roles)
- RLS policies for data isolation
- `create_organization()` function for atomic signup
- Indexes and triggers

## Step 2: Verify RLS is Active

After running the migration, verify in the Supabase dashboard:

1. Go to **Authentication** → **Policies**
2. You should see RLS enabled for all three tables
3. Under each table, you'll see the policies we defined

## Step 3: Test the Signup Flow

1. Start the dev server: `npm run dev`
2. Go to the homepage and click **Get Started**
3. Fill in the signup form with a test organization
4. The system will:
   - Create an auth user via Supabase Auth
   - Call `create_organization()` RPC to atomically create org + user profile + membership
   - Log the user in and redirect to dashboard

## Step 4: Add Service Role Key (for backend operations)

For operations that need to bypass RLS (like user management), add your service role key:

1. In Supabase dashboard: **Settings** → **API**
2. Copy the `service_role` key (starts with `eyJ...`)
3. In Zo Computer: Go to [Settings → Advanced](/?t=settings&s=advanced)
4. Add a new secret: `SUPABASE_SERVICE_ROLE_KEY` with the value

## Troubleshooting

### "relation already exists" error
If you re-run the migration, you may see this. The schema uses `IF NOT EXISTS` so it's safe — just ignore those errors or drop the tables first.

### "permission denied" on RPC
Make sure you're calling `create_organization()` with the service role key (not the anon key) from your API route.

### User can't see their org
Check that:
- The `is_primary` flag is set to `true` on the membership
- The partial unique index exists: `idx_one_primary_org_per_user`
- RLS policies are enabled

## Next Steps

After the database is deployed:

1. **Test the full signup flow** end-to-end
2. **Add more tables** for properties, leads, contacts, etc.
3. **Set up custom domains** for white-label deployments
4. **Configure Stripe** for subscription billing
5. **Deploy the Next.js app** to production (Vercel, Railway, etc.)

---

For detailed architecture and security design, see `ARCHITECTURE.md` and `SECURITY.md`.