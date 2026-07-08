-- =====================================================
-- PHASE 2: Properties + Listings + Leads Pipeline
-- Estateline Multi-Tenant Real Estate CRM
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE property_status AS ENUM ('active', 'inactive', 'sold', 'rented', 'draft');
CREATE TYPE property_type AS ENUM ('apartment', 'house', 'land', 'commercial', 'office', 'warehouse', 'garage', 'other');
CREATE TYPE lead_source AS ENUM ('website', 'referral', 'portal', 'social', 'email', 'phone', 'walk-in', 'other');

-- =====================================================
-- PROPERTIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Core listing info
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  reference_number TEXT,
  
  -- Type & status
  type property_type NOT NULL DEFAULT 'apartment',
  status property_status NOT NULL DEFAULT 'draft',
  
  -- Pricing
  price NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BAM',
  price_period TEXT, -- 'monthly', 'yearly', null for sale
  
  -- Location
  address TEXT,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'BA',
  postal_code TEXT,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  
  -- Property details
  area_size NUMERIC(10, 2), -- m²
  land_size NUMERIC(10, 2), -- m² for land/houses
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  floors INTEGER DEFAULT 1,
  year_built INTEGER,
  parking_spaces INTEGER DEFAULT 0,
  garage_spaces INTEGER DEFAULT 0,
  
  -- Features (JSON array for flexibility)
  features JSONB DEFAULT '[]', -- ["balcony", "elevator", "pool", ...]
  
  -- Media
  cover_image_url TEXT,
  images JSONB DEFAULT '[]', -- Array of {url, caption, order}
  video_url TEXT,
  virtual_tour_url TEXT,
  
  -- Energy
  energy_rating TEXT,
  
  -- Publishing
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Metadata
  views_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, slug)
);

-- =====================================================
-- LEADS TABLE (Pipeline)
-- =====================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Lead info
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  
  -- Pipeline
  stage TEXT NOT NULL DEFAULT 'New',
  source lead_source DEFAULT 'website',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost', 'junk')),
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  
  -- Linked property interest
  property_id UUID REFERENCES properties(id),
  budget_min NUMERIC(12, 2),
  budget_max NUMERIC(12, 2),
  requirements TEXT,
  
  -- Tracking
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  tags JSONB DEFAULT '[]',
  
  -- Last activity
  last_contacted_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  
  -- Conversion
  converted_property_id UUID REFERENCES properties(id),
  converted_at TIMESTAMPTZ,
  lost_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- LEAD STAGES (custom per org, seeded from org.pipeline_stages)
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Seed default stages for existing orgs
INSERT INTO lead_stages (organization_id, name, order_index, color)
SELECT 
  id,
  stage,
  idx,
  CASE idx 
    WHEN 0 THEN '#3b82f6'
    WHEN 1 THEN '#8b5cf6'
    WHEN 2 THEN '#06b6d4'
    WHEN 3 THEN '#f59e0b'
    WHEN 4 THEN '#ec4899'
    WHEN 5 THEN '#10b981'
    WHEN 6 THEN '#6b7280'
    ELSE '#9ca3af'
  END
FROM organizations,
LATERAL jsonb_array_elements_text(pipeline_stages) WITH ORDINALITY AS t(stage, idx);

-- =====================================================
-- CONTACTS (separate from leads — existing clients)
-- =====================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Personal info
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  
  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'BA',
  postal_code TEXT,
  
  -- Classification
  type TEXT NOT NULL DEFAULT 'client' CHECK (type IN ('client', 'owner', 'tenant', 'vendor', 'other')),
  
  -- Notes
  notes TEXT,
  tags JSONB DEFAULT '[]',
  
  -- Linked entities
  property_id UUID REFERENCES properties(id),
  lead_id UUID REFERENCES leads(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- VIEWINGS (property appointments)
-- =====================================================
CREATE TABLE IF NOT EXISTS viewings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  lead_id UUID REFERENCES leads(id),
  assigned_agent UUID REFERENCES users(id),
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show')),
  
  -- Details
  notes TEXT,
  feedback TEXT,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewings ENABLE ROW LEVEL SECURITY;

-- Properties policies
CREATE POLICY "Users can view properties in their org"
ON properties FOR SELECT
USING (is_org_member(organization_id));

CREATE POLICY "Users can manage properties in their org"
ON properties FOR ALL
USING (is_org_member(organization_id))
WITH CHECK (is_org_member(organization_id));

-- Leads policies
CREATE POLICY "Users can view leads in their org"
ON leads FOR SELECT
USING (is_org_member(organization_id));

CREATE POLICY "Users can manage leads in their org"
ON leads FOR ALL
USING (is_org_member(organization_id))
WITH CHECK (is_org_member(organization_id));

-- Lead stages policies
CREATE POLICY "Users can view lead stages in their org"
ON lead_stages FOR SELECT
USING (is_org_member(organization_id));

CREATE POLICY "Admins can manage lead stages"
ON lead_stages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN users u ON u.id = om.user_id
    WHERE om.organization_id = organization_id
      AND u.auth_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  )
);

-- Contacts policies
CREATE POLICY "Users can view contacts in their org"
ON contacts FOR SELECT
USING (is_org_member(organization_id));

CREATE POLICY "Users can manage contacts in their org"
ON contacts FOR ALL
USING (is_org_member(organization_id))
WITH CHECK (is_org_member(organization_id));

-- Viewings policies
CREATE POLICY "Users can view viewings in their org"
ON viewings FOR SELECT
USING (is_org_member(organization_id));

CREATE POLICY "Users can manage viewings in their org"
ON viewings FOR ALL
USING (is_org_member(organization_id))
WITH CHECK (is_org_member(organization_id));

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_properties_org ON properties(organization_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_type ON properties(type);
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_featured ON properties(featured) WHERE featured = true;

CREATE INDEX idx_leads_org ON leads(organization_id);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);

CREATE INDEX idx_contacts_org ON contacts(organization_id);
CREATE INDEX idx_contacts_type ON contacts(type);

CREATE INDEX idx_viewings_org ON viewings(organization_id);
CREATE INDEX idx_viewings_property ON viewings(property_id);
CREATE INDEX idx_viewings_scheduled ON viewings(scheduled_at);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER properties_updated_at BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER viewings_updated_at BEFORE UPDATE ON viewings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RPC: Create lead from public form (no auth required)
-- =====================================================
CREATE OR REPLACE FUNCTION public_create_lead(
  p_org_slug TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_message TEXT
)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
  v_lead_id UUID;
BEGIN
  -- Get org by slug
  SELECT id INTO v_org_id FROM organizations WHERE slug = p_org_slug LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  -- Create lead
  INSERT INTO leads (organization_id, first_name, last_name, email, phone, requirements, source)
  VALUES (v_org_id, p_first_name, p_last_name, p_email, p_phone, p_message, 'website')
  RETURNING id INTO v_lead_id;
  
  RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow public access to lead creation RPC
REVOKE ALL ON FUNCTION public_create_lead FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public_create_lead TO anon;
GRANT EXECUTE ON FUNCTION public_create_lead TO authenticated;

-- =====================================================
-- RPC: Update lead stage (for kanban drag-and-drop)
-- =====================================================
CREATE OR REPLACE FUNCTION update_lead_stage(
  p_lead_id UUID,
  p_new_stage TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE leads 
  SET stage = p_new_stage, last_activity_at = NOW()
  WHERE id = p_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC: Dashboard metrics
-- =====================================================
CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_org_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'properties_total', (SELECT COUNT(*) FROM properties WHERE organization_id = p_org_id),
    'properties_active', (SELECT COUNT(*) FROM properties WHERE organization_id = p_org_id AND status = 'active'),
    'leads_total', (SELECT COUNT(*) FROM leads WHERE organization_id = p_org_id),
    'leads_open', (SELECT COUNT(*) FROM leads WHERE organization_id = p_org_id AND status = 'open'),
    'leads_won', (SELECT COUNT(*) FROM leads WHERE organization_id = p_org_id AND status = 'won'),
    'contacts_total', (SELECT COUNT(*) FROM contacts WHERE organization_id = p_org_id),
    'viewings_upcoming', (SELECT COUNT(*) FROM viewings WHERE organization_id = p_org_id AND scheduled_at > NOW() AND status IN ('scheduled', 'confirmed'))
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;