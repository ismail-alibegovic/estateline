-- Viewings table (Phase 3)
CREATE TABLE IF NOT EXISTS viewings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table (Phase 3)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'contract' CHECK (type IN ('contract', 'mou', 'agreement', 'other')),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'declined', 'expired')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Widget tokens table (Phase 3 - embeddable lead capture)
CREATE TABLE IF NOT EXISTS widget_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  property_id UUID REFERENCES properties(id),
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE viewings ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_tokens ENABLE ROW LEVEL SECURITY;

-- Viewings policies
CREATE POLICY "Users can view viewings of their org" ON viewings FOR SELECT
  USING (is_org_member(organization_id));
CREATE POLICY "Users can manage viewings of their org" ON viewings FOR ALL
  USING (is_org_member(organization_id) AND is_admin(organization_id));

-- Documents policies
CREATE POLICY "Users can view documents of their org" ON documents FOR SELECT
  USING (is_org_member(organization_id));
CREATE POLICY "Users can manage documents of their org" ON documents FOR ALL
  USING (is_org_member(organization_id) AND is_admin(organization_id));

-- Widget tokens policies
CREATE POLICY "Users can view widget tokens of their org" ON widget_tokens FOR SELECT
  USING (is_org_member(organization_id));
CREATE POLICY "Users can manage widget tokens of their org" ON widget_tokens FOR ALL
  USING (is_org_member(organization_id) AND is_admin(organization_id));

-- Updated_at triggers
CREATE TRIGGER viewings_updated_at BEFORE UPDATE ON viewings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER widget_tokens_updated_at BEFORE UPDATE ON widget_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
