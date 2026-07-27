-- Migration 016: Agent Performance Report RPC
CREATE OR REPLACE FUNCTION get_agent_performance_report(
  p_org_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_agent_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'agent_id', u.id,
        'agent_name', u.full_name,
        'agent_email', u.email,
        'closed_deals_count', COALESCE(d.closed_deals_count, 0),
        'closed_revenue', COALESCE(d.closed_revenue, 0),
        'total_commission', COALESCE(d.total_commission, 0),
        'viewings_conducted', COALESCE(v.viewings_conducted, 0)
      )
      ORDER BY COALESCE(d.closed_revenue, 0) DESC, u.full_name ASC
    ),
    '[]'::jsonb
  ) INTO result
  FROM organization_members om
  JOIN users u ON u.id = om.user_id
  LEFT JOIN (
    SELECT
      assigned_to,
      COUNT(*) AS closed_deals_count,
      SUM(price) AS closed_revenue,
      SUM(COALESCE(commission_amount, 0)) AS total_commission
    FROM deals
    WHERE organization_id = p_org_id
      AND stage = 'closed_won'
      AND (p_start_date IS NULL OR closed_at >= p_start_date)
      AND (p_end_date IS NULL OR closed_at <= p_end_date)
    GROUP BY assigned_to
  ) d ON d.assigned_to = u.id
  LEFT JOIN (
    SELECT
      assigned_agent,
      COUNT(*) AS viewings_conducted
    FROM viewings
    WHERE organization_id = p_org_id
      AND status IN ('completed', 'confirmed')
      AND (p_start_date IS NULL OR scheduled_at >= p_start_date)
      AND (p_end_date IS NULL OR scheduled_at <= p_end_date)
    GROUP BY assigned_agent
  ) v ON v.assigned_agent = u.id
  WHERE om.organization_id = p_org_id
    AND (p_agent_id IS NULL OR u.id = p_agent_id);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
