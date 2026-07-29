-- Migration 019: AI Lead Scoring and Automated Property Valuation Helpers

-- 1. Function: Calculate AI Lead Score based on activity engagement and criteria
CREATE OR REPLACE FUNCTION get_lead_ai_score(
  p_lead_id UUID
)
RETURNS TABLE (
  lead_id UUID,
  score INT,
  grade TEXT,
  insights JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead RECORD;
  v_activity_count INT;
  v_score INT := 50; -- Base score
  v_grade TEXT;
  v_insights JSONB;
BEGIN
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  IF v_lead.id IS NULL THEN
    RETURN;
  END IF;

  IF NOT is_org_member(v_lead.organization_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Activity engagement boost
  SELECT COUNT(*) INTO v_activity_count FROM activity_log WHERE lead_id = p_lead_id;
  v_score := v_score + (v_activity_count * 5);

  -- Stage & contact info weighting
  IF v_lead.email IS NOT NULL AND v_lead.phone IS NOT NULL THEN
    v_score := v_score + 15;
  END IF;

  IF v_lead.stage = 'qualified' THEN
    v_score := v_score + 20;
  ELSIF v_lead.stage = 'converted' THEN
    v_score := 100;
  ELSIF v_lead.stage = 'lost' OR v_lead.stage = 'unqualified' THEN
    v_score := 10;
  END IF;

  v_score := LEAST(100, GREATEST(0, v_score));

  IF v_score >= 80 THEN v_grade := 'Hot';
  ELSIF v_score >= 50 THEN v_grade := 'Warm';
  ELSE v_grade := 'Cold';
  END IF;

  v_insights := jsonb_build_object(
    'activities_logged', v_activity_count,
    'has_full_contact', (v_lead.email IS NOT NULL AND v_lead.phone IS NOT NULL),
    'current_stage', v_lead.stage
  );

  RETURN QUERY SELECT p_lead_id, v_score, v_grade, v_insights;
END;
$$;

-- 2. Function: Property Valuation Estimate based on comparable closed deals in the same city/type
CREATE OR REPLACE FUNCTION estimate_property_valuation(
  p_org_id UUID,
  p_city TEXT,
  p_type TEXT,
  p_area_size NUMERIC
)
RETURNS TABLE (
  estimated_price NUMERIC,
  avg_price_per_sqm NUMERIC,
  comparables_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_sqm NUMERIC;
  v_count BIGINT;
BEGIN
  IF NOT is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT 
    AVG(p.price / NULLIF(p.area_size, 0)),
    COUNT(*)
  INTO v_avg_sqm, v_count
  FROM deals d
  JOIN properties p ON d.property_id = p.id
  WHERE d.organization_id = p_org_id
    AND d.stage = 'closed_won'
    AND LOWER(p.city) = LOWER(p_city)
    AND p.type = p_type
    AND p.area_size > 0;

  IF v_count = 0 OR v_avg_sqm IS NULL THEN
    -- Fallback to active property listings average in same city
    SELECT 
      AVG(price / NULLIF(area_size, 0)),
      COUNT(*)
    INTO v_avg_sqm, v_count
    FROM properties
    WHERE organization_id = p_org_id
      AND LOWER(city) = LOWER(p_city)
      AND type = p_type
      AND area_size > 0;
  END IF;

  v_avg_sqm := COALESCE(v_avg_sqm, 2000.0); -- Default market estimate fallback (KM/sqm)

  RETURN QUERY SELECT 
    ROUND(v_avg_sqm * COALESCE(p_area_size, 60), 2) AS estimated_price,
    ROUND(v_avg_sqm, 2) AS avg_price_per_sqm,
    COALESCE(v_count, 0) AS comparables_count;
END;
$$;
