-- =====================================================
-- MIGRATION 004: Restoring the approved 14-table schema
-- Estateline Multi-Tenant Real Estate CRM
--
-- This migration restores the tables that were omitted from
-- migrations 001–003. Per the approved schema (ARCHITECTURE.md),
-- the CRM requires these core tables for commission tracking,
-- audit trails, custom fields, team invites, and the
-- many-to-many relationship between leads and contacts.
--
-- Schema deviation note:
-- 002_properties_leads.sql renamed `pipeline_stages` to
-- `lead_stages`. This migration keeps `lead_stages` as the
-- canonical name to avoid breaking existing application code
-- (api/leads/stages, dashboard pipeline). If a strict revert
-- to `pipeline_stages` is required, run a separate rename
-- migration and update the application layer accordingly.
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE deal_stage AS ENUM (
  'new', 'qualified', 'viewing', 'offer', 'negotiation',
  'under_contract', 'closed_won', 'closed_lost', 'withdrawn'
);
CREATE TYPE deal_type AS ENUM ('sale', 'rental');
CREATE TYPE activity_type AS ENUM (
  'call', 'email', 'meeting', 'viewing', 'note', 'task',
  'document_sent', 'document_signed', 'stage_change', 'system'
);
CREATE TYPE custom_field_entity AS ENUM (
  'lead', 'contact', 'property', 'deal'
);
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- =====================================================
-- DEALS
--   Transactions linking contacts, properties, and pipeline
--   stages. Core to commission tracking.
-- =====================================================
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  type deal_type NOT NULL DEFAULT 'sale',
  stage deal_stage NOT NULL DEFAULT 'new',

  -- Linked entities
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Money (commission tracking)
  price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BAM',
  commission_pct NUMERIC(5, 2),           -- agent commission percentage
  commission_amount NUMERIC(14, 2),       -- computed commission amount
  commission_paid BOOLEAN NOT NULL DEFAULT false,

  -- Probability + timeline
  probability INTEGER NOT NULL DEFAULT 0
    CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  closed_at TIMESTAMPTZ,
  lost_reason TEXT,

  -- Assignment
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Tracking
  tags JSONB DEFAULT '[]',
  notes TEXT,
  last_activity_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ACTIVITY LOG
--   Append-only audit trail per entity. Core audit surface.
--   ARCHITECTURE.md calls this `deal_activities`; this
--   migration uses `activity_log` as the broader, brief-
--   approved name (covers leads/contacts/properties too).
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  type activity_type NOT NULL DEFAULT 'note',
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  -- Polymorphic target (exactly one of these is set per row)
  deal_id    UUID REFERENCES deals(id)    ON DELETE CASCADE,
  lead_id    UUID REFERENCES leads(id)    ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,

  -- Actor
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CUSTOM FIELD DEFINITIONS
--   ARCHITECTURE.md refers to these as `custom_fields` +
--   `custom_field_values`. This migration uses the
--   brief-approved name `custom_field_definitions` and
--   stores values as JSONB on the owning entity's row
--   (`custom_fields` JSONB column added to each business
--   table where needed) — per design decision #6 in
--   ARCHITECTURE.md ("Custom fields via JSONB").
-- =====================================================
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Which entity this field applies to
  entity custom_field_entity NOT NULL,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text'
    CHECK (field_type IN ('text', 'number', 'date', 'select', 'multiselect', 'boolean', 'url')),

  -- Options for select/multiselect
  options JSONB DEFAULT '[]',
  required BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, entity, name)
);

-- =====================================================
-- INVITATIONS
--   Pending team invites to an organization. Per the brief.
-- =====================================================
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent'
    CHECK (role IN ('owner', 'admin', 'agent', 'viewer')),
  status invitation_status NOT NULL DEFAULT 'pending',

  -- Single-use token (Supabase edge function or server signs it)
  token UNIQUE TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, email)
);

-- =====================================================
-- LEAD_CONTACTS (many-to-many)
--   A lead may be linked to multiple contacts (e.g., couple
--   buying together; first contact vs decision-maker).
--   Per the brief.
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role TEXT,  -- 'decision_maker', 'spouse', 'partner', 'advisor', ...
  is_primary BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, contact_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_contacts_primary
  ON lead_contacts(lead_id) WHERE is_primary = true;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_contacts ENABLE ROW LEVEL SECURITY;

-- Deals: members can read; writes require RLS org membership (any agent+).
CREATE POLICY "Members can view deals in their org" ON deals FOR SELECT
  USING (is_org_member(organization_id));
CREATE POLICY "Members can manage deals in their org" ON deals FOR ALL
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

-- Activity log: read for members; inserts from members.
CREATE POLICY "Members can view activity in their org" ON activity_log FOR SELECT
  USING (is_org_member(organization_id));
CREATE POLICY "Members can log activity in their org" ON activity_log FOR INSERT
  WITH CHECK (is_org_member(organization_id));

-- Custom field definitions: read for members; admin+ manages.
CREATE POLICY "Members can view custom field definitions" ON custom_field_definitions FOR SELECT
  USING (is_org_member(organization_id));
CREATE POLICY "Admins can manage custom field definitions" ON custom_field_definitions FOR ALL
  USING (is_admin(organization_id));

-- Invitations: members can see pending invites to their org; admins manage.
CREATE POLICY "Members can view invitations to their org" ON invitations FOR SELECT
  USING (is_org_member(organization_id));
CREATE POLICY "Admins can manage invitations" ON invitations FOR ALL
  USING (is_admin(organization_id));

-- lead_contacts: members can read + manage (joins are org-scoped via the
-- parent lead/contact, but we enforce directly via RLS membership too).
CREATE POLICY "Members can view lead_contacts" ON lead_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_id AND is_org_member(l.organization_id)
    )
  );
CREATE POLICY "Members can manage lead_contacts" ON lead_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_id AND is_org_member(l.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_id AND is_org_member(l.organization_id)
    )
  );

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_deals_org ON deals(organization_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_property ON deals(property_id);
CREATE INDEX idx_deals_contact ON deals(contact_id);
CREATE INDEX idx_deals_assigned ON deals(assigned_to);
CREATE INDEX idx_deals_expected_close ON deals(expected_close_date) WHERE stage NOT IN ('closed_won', 'closed_lost', 'withdrawn');

CREATE INDEX idx_activity_org ON activity_log(organization_id);
CREATE INDEX idx_activity_type ON activity_log(type);
CREATE INDEX idx_activity_deal ON activity_log(deal_id);
CREATE INDEX idx_activity_lead ON activity_log(lead_id);
CREATE INDEX idx_activity_contact ON activity_log(contact_id);
CREATE INDEX idx_activity_property ON activity_log(property_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

CREATE INDEX idx_custom_fields_org_entity ON custom_field_definitions(organization_id, entity);

CREATE INDEX idx_invitations_org ON invitations(organization_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_status ON invitations(status) WHERE status = 'pending';
CREATE INDEX idx_invitations_token ON invitations(token) WHERE status = 'pending';

CREATE INDEX idx_lead_contacts_lead ON lead_contacts(lead_id);
CREATE INDEX idx_lead_contacts_contact ON lead_contacts(contact_id);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER custom_field_definitions_updated_at BEFORE UPDATE ON custom_field_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER invitations_updated_at BEFORE UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RPC: Get deals grouped by stage (for pipeline view)
-- =====================================================
CREATE OR REPLACE FUNCTION get_deals_by_stage(p_org_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_object_agg(stage, deals) INTO result
  FROM (
    SELECT stage, jsonb_agg(
      jsonb_build_object(
        'id', id,
        'title', title,
        'type', type,
        'price', price,
        'currency', currency,
        'commission_pct', commission_pct,
        'commission_amount', commission_amount,
        'commission_paid', commission_paid,
        'probability', probability,
        'expected_close_date', expected_close_date,
        'closed_at', closed_at,
        'assigned_to', assigned_to,
        'property_id', property_id,
        'contact_id', contact_id,
        'lead_id', lead_id,
        'last_activity_at', last_activity_at,
        'created_at', created_at
      )
    ) AS deals
    FROM deals
    WHERE organization_id = p_org_id
    GROUP BY stage
  ) s;

  RETURN COALESCE(result, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC: Append activity + bump parent's last_activity_at
-- =====================================================
CREATE OR REPLACE FUNCTION log_activity(
  p_org_id UUID,
  p_type TEXT,
  p_description TEXT,
  p_user_id UUID DEFAULT NULL,
  p_deal_id UUID DEFAULT NULL,
  p_lead_id UUID DEFAULT NULL,
  p_contact_id UUID DEFAULT NULL,
  p_property_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO activity_log (
    organization_id, type, description, metadata,
    user_id, deal_id, lead_id, contact_id, property_id
  )
  VALUES (
    p_org_id, p_type::activity_type, p_description, p_metadata,
    p_user_id, p_deal_id, p_lead_id, p_contact_id, p_property_id
  )
  RETURNING id INTO v_activity_id;

  -- Bump parent timestamps so lists sort by last touch
  IF p_deal_id IS NOT NULL THEN
    UPDATE deals SET last_activity_at = NOW() WHERE id = p_deal_id;
  END IF;
  IF p_lead_id IS NOT NULL THEN
    UPDATE leads SET last_activity_at = NOW() WHERE id = p_lead_id;
  END IF;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
