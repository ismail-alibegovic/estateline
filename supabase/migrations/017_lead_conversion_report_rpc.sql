-- Migration 017: Lead Conversion Report RPC
CREATE OR REPLACE FUNCTION get_lead_conversion_report(
  p_org_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_by_source JSONB;
  v_by_status JSONB;
  v_by_stage JSONB;
  v_lost_reasons JSONB;
  result JSONB;
BEGIN
  -- 1. Breakdown by leads.source
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'source', source,
        'count', count
      )
    ),
    '[]'::jsonb
  ) INTO v_by_source
  FROM (
    SELECT source, COUNT(*) AS count
    FROM leads
    WHERE organization_id = p_org_id
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    GROUP BY source
    ORDER BY count DESC
  ) s;

  -- 2. Breakdown by leads.status (open, won, lost, junk)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'status', status,
        'count', count
      )
    ),
    '[]'::jsonb
  ) INTO v_by_status
  FROM (
    SELECT status, COUNT(*) AS count
    FROM leads
    WHERE organization_id = p_org_id
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    GROUP BY status
    ORDER BY count DESC
  ) st;

  -- 3. Breakdown by leads.stage
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'stage', stage,
        'count', count
      )
    ),
    '[]'::jsonb
  ) INTO v_by_stage
  FROM (
    SELECT stage, COUNT(*) AS count
    FROM leads
    WHERE organization_id = p_org_id
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    GROUP BY stage
    ORDER BY count DESC
  ) sg;

  -- 4. Aggregated lost reasons from leads and deals
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'reason', reason,
        'count', count
      )
    ),
    '[]'::jsonb
  ) INTO v_lost_reasons
  FROM (
    SELECT lost_reason AS reason, COUNT(*) AS count
    FROM (
      SELECT lost_reason FROM leads WHERE organization_id = p_org_id AND lost_reason IS NOT NULL AND TRIM(lost_reason) != ''
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
      UNION ALL
      SELECT lost_reason FROM deals WHERE organization_id = p_org_id AND lost_reason IS NOT NULL AND TRIM(lost_reason) != ''
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
    ) un
    GROUP BY lost_reason
    ORDER BY count DESC
  ) lr;

  result := jsonb_build_object(
    'by_source', v_by_source,
    'by_status', v_by_status,
    'by_stage', v_by_stage,
    'lost_reasons', v_lost_reasons
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
