# Estateline Security Model

## Multi-Tenant Data Isolation

### The Problem
In a multi-tenant SaaS, the single biggest risk is tenant data leakage — one organization seeing another's data. This can happen through:
- Missing WHERE clauses in queries
- Bugs in authorization logic
- Direct database access bypassing the API
- Compromised API keys

### Our Solution: Row Level Security (RLS)

PostgreSQL's RLS feature enforces access control at the database row level. Every business table has RLS enabled, and policies ensure users can only access data belonging to their organization.

#### How It Works

1. **Every business table has an `organization_id` column** — this is the tenant key.

2. **RLS policies are defined on every table** — for SELECT, INSERT, UPDATE, DELETE operations.

3. **The policy checks the user's organization membership**:
   ```sql
   organization_id IN (
     SELECT organization_id 
     FROM organization_members 
     WHERE user_id = auth.uid()
   )
   ```

4. **This check is enforced by PostgreSQL itself** — not by application code. Even if the API has a bug, the database won't return unauthorized rows.

### Example Policy

```sql
-- Properties table: users can only see properties from their org
CREATE POLICY "Tenant isolation - select" ON properties
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Properties table: users can only insert into their org
CREATE POLICY "Tenant isolation - insert" ON properties
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Same pattern for UPDATE and DELETE
```

### Service Role Exceptions

The Supabase service role key bypasses RLS. This is used only for:
- Creating organizations (during signup)
- System administration tasks
- Background jobs

Service role operations are never exposed to client-side code.

## Authentication & Authorization

### Authentication
- Supabase Auth handles user authentication (email/password, OAuth)
- JWT tokens are validated by middleware
- Session cookies are HttpOnly and Secure

### Authorization
- **Organization membership** determines which data a user can access
- **Role within organization** (owner/admin/agent) determines what actions they can perform
- RLS handles data-level access; application code handles action-level access

### The `auth.uid()` Function
Within RLS policies, `auth.uid()` returns the authenticated user's ID from the JWT. This is set by Supabase Auth and cannot be spoofed.

## Audit Logging

Every data change is recorded in the `audit_logs` table via database triggers:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,  -- INSERT, UPDATE, DELETE
  old_data JSONB,        -- Previous state (NULL for INSERT)
  new_data JSONB,        -- New state (NULL for DELETE)
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

This is append-only and provides a forensic trail for compliance and debugging.

## Secure Signup Flow

### The Atomic Signup Problem
A naive signup flow might:
1. Create auth user
2. Create organization
3. Create user profile
4. Create membership

If step 3 or 4 fails, you're left with an orphaned auth user who can't log in properly and can't sign up again (email is taken).

### Our Solution
Steps 2-4 are wrapped in a single Postgres function called via service-role RPC:

```sql
CREATE OR REPLACE FUNCTION create_organization(
  p_org_name TEXT,
  p_org_slug TEXT,
  p_full_name TEXT,
  p_auth_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Validate auth user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_auth_user_id) THEN
    RAISE EXCEPTION 'Auth user not found';
  END IF;

  -- Check slug availability
  IF EXISTS (SELECT 1 FROM organizations WHERE slug = p_org_slug) THEN
    RAISE EXCEPTION 'Organization slug already taken';
  END IF;

  -- Create user profile
  INSERT INTO users (auth_id, full_name, email)
  SELECT id, p_full_name, email FROM auth.users WHERE id = p_auth_user_id
  RETURNING id INTO v_user_id;

  -- Create organization
  INSERT INTO organizations (name, slug)
  VALUES (p_org_name, p_org_slug)
  RETURNING id INTO v_org_id;

  -- Create membership
  INSERT INTO organization_members (user_id, organization_id, role, is_primary)
  VALUES (v_user_id, v_org_id, 'owner', true);

  RETURN json_build_object('user_id', v_user_id, 'org_id', v_org_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Since this is a single function call, it's atomic — either all steps succeed or none do.

### Server-Side Cleanup
If the RPC fails (e.g., slug taken), the API route calls `supabaseAdmin.auth.admin.deleteUser()` to clean up the orphaned auth user before returning an error.

## Stripe Security

- **Webhook signature verification**: All Stripe webhook events are verified using the signing secret
- **Customer isolation**: Each organization has its own Stripe Customer ID
- **No card data on our servers**: Stripe Checkout handles payment input; we only receive tokens

## Infrastructure Security

- **Environment variables**: Secrets are never committed to version control
- **Database backups**: Supabase provides automated daily backups
- **SSL/TLS**: All connections use encryption
- **Rate limiting**: API routes should implement rate limiting (to be added)

## Compliance Considerations

### GDPR
- Users can request data export (all their data from all tables)
- Users can request account deletion (cascading delete from all tables)
- Data processing agreement with Supabase

### Data Residency
- Supabase stores data in the EU region by default (Frankfurt)
- This satisfies Balkan data residency requirements

## Security Checklist

- [x] RLS enabled on all business tables
- [x] RLS policies tested with different user roles
- [x] Service role key never exposed to client
- [x] Audit logging via triggers
- [x] Atomic signup flow
- [x] Stripe webhook signature verification
- [x] Environment variable validation
- [ ] Rate limiting on API routes
- [ ] SQL injection prevention (parameterized queries only)
- [ ] XSS prevention (React escapes by default)
- [ ] CSRF protection (Supabase handles this)
- [ ] Regular security audits
- [ ] Penetration testing