-- Migration 011: Harden RPC functions with organization membership checks

-- 1. Harden update_lead_stage
CREATE OR REPLACE FUNCTION update_lead_stage(
  p_lead_id UUID,
  p_new_stage TEXT
)
RETURNS VOID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id FROM leads WHERE id = p_lead_id;
  IF v_org_id IS NULL OR NOT is_org_member(v_org_id) THEN
    RAISE EXCEPTION 'Not authorized for this lead';
  END IF;

  UPDATE leads 
  SET stage = p_new_stage, last_activity_at = NOW()
  WHERE id = p_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Harden get_deals_by_stage
CREATE OR REPLACE FUNCTION get_deals_by_stage(p_org_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

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

-- 3. Harden log_activity
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
  IF NOT is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

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
