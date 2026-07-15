-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'incomplete', 'past_due', 'trialing', 'unpaid')),
  locale_default TEXT NOT NULL DEFAULT 'en',
  currency_default TEXT NOT NULL DEFAULT 'BAM',
  pipeline_stages JSONB DEFAULT '["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"]',
  branding JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (links to auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('owner', 'admin', 'agent', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members (many-to-many with role per org)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('owner', 'admin', 'agent', 'viewer')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Partial unique index: only one primary org per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_primary_org_per_user 
ON organization_members(user_id) 
WHERE is_primary = true;

-- Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Function to check if current user is member of org
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members om
    JOIN users u ON u.id = om.user_id
    WHERE om.organization_id = org_id AND u.auth_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is admin/owner of org
CREATE OR REPLACE FUNCTION is_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members om
    JOIN users u ON u.id = om.user_id
    WHERE om.organization_id = org_id AND u.auth_id = auth.uid() AND om.role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations policies
CREATE POLICY "Users can view their organizations"
ON organizations FOR SELECT
USING (is_org_member(id));

CREATE POLICY "Users can update their organizations"
ON organizations FOR UPDATE
USING (is_admin(id));

-- Users policies
CREATE POLICY "Users can view their own profile"
ON users FOR SELECT
USING (auth_id = auth.uid());

CREATE POLICY "Users can view profiles of org members"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = id AND is_org_member(om.organization_id)
  )
);

CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth_id = auth.uid())
WITH CHECK (auth_id = auth.uid());

-- Organization members policies
CREATE POLICY "Users can view members of their organizations"
ON organization_members FOR SELECT
USING (is_org_member(organization_id));

CREATE POLICY "Admins can manage organization members"
ON organization_members FOR ALL
USING (is_admin(organization_id));

-- Function to create organization (atomic: user profile + org + membership)
CREATE OR REPLACE FUNCTION create_organization(
  p_org_name TEXT,
  p_org_slug TEXT,
  p_full_name TEXT,
  p_auth_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Validate auth user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_auth_user_id) THEN
    RAISE EXCEPTION 'Auth user % not found', p_auth_user_id;
  END IF;

  -- Validate slug availability
  IF EXISTS (SELECT 1 FROM organizations WHERE slug = p_org_slug) THEN
    RAISE EXCEPTION 'Organization slug "% " is already taken', p_org_slug;
  END IF;

  -- Create user profile
  INSERT INTO users (auth_id, email, full_name)
  SELECT id, email, p_full_name
  FROM auth.users
  WHERE id = p_auth_user_id
  RETURNING id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create user profile for auth user %', p_auth_user_id;
  END IF;

  -- Create organization
  INSERT INTO organizations (name, slug)
  VALUES (p_org_name, p_org_slug)
  RETURNING id INTO v_org_id;

  -- Create primary membership
  INSERT INTO organization_members (user_id, organization_id, role, is_primary, accepted_at)
  VALUES (v_user_id, v_org_id, 'owner', true, NOW());

  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
