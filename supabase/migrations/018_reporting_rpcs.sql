-- Migration 018: Advanced Reporting RPCs (Time-to-Close & Financial Forecasting)

-- 1. Report 3: Time-to-Close & Velocity by Property/Deal Type
CREATE OR REPLACE FUNCTION get_time_to_close_report(
  p_org_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  deal_type TEXT,
  total_closed BIGINT,
  avg_days_to_close NUMERIC,
  min_days_to_close NUMERIC,
  max_days_to_close NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Access denied: not an active member of organization %', p_org_id;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(d.type::text, 'other') AS deal_type,
    COUNT(*) AS total_closed,
    ROUND(AVG(EXTRACT(EPOCH FROM (d.closed_at - d.created_at)) / 86400)::numeric, 1) AS avg_days_to_close,
    ROUND(MIN(EXTRACT(EPOCH FROM (d.closed_at - d.created_at)) / 86400)::numeric, 1) AS min_days_to_close,
    ROUND(MAX(EXTRACT(EPOCH FROM (d.closed_at - d.created_at)) / 86400)::numeric, 1) AS max_days_to_close
  FROM deals d
  WHERE d.organization_id = p_org_id
    AND d.stage = 'closed_won'
    AND d.closed_at IS NOT NULL
    AND (p_start_date IS NULL OR d.closed_at >= p_start_date)
    AND (p_end_date IS NULL OR d.closed_at <= p_end_date)
  GROUP BY COALESCE(d.type::text, 'other')
  ORDER BY total_closed DESC;
END;
$$;

-- 2. Report 4: Financial & Commission Forecasting vs. Actuals
CREATE OR REPLACE FUNCTION get_financial_forecasting_report(
  p_org_id UUID
)
RETURNS TABLE (
  total_pipeline_value NUMERIC,
  weighted_forecast_revenue NUMERIC,
  total_closed_won_revenue NUMERIC,
  earned_commission_paid NUMERIC,
  earned_commission_unpaid NUMERIC,
  active_deals_count BIGINT,
  closed_won_deals_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Access denied: not an active member of organization %', p_org_id;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN d.stage NOT IN ('closed_won', 'closed_lost') THEN d.price ELSE 0 END), 0) AS total_pipeline_value,
    COALESCE(SUM(CASE WHEN d.stage NOT IN ('closed_won', 'closed_lost') THEN d.price * (COALESCE(d.probability, 50)::numeric / 100.0) ELSE 0 END), 0) AS weighted_forecast_revenue,
    COALESCE(SUM(CASE WHEN d.stage = 'closed_won' THEN d.price ELSE 0 END), 0) AS total_closed_won_revenue,
    COALESCE(SUM(CASE WHEN d.stage = 'closed_won' AND d.commission_paid = true THEN d.commission_amount ELSE 0 END), 0) AS earned_commission_paid,
    COALESCE(SUM(CASE WHEN d.stage = 'closed_won' AND (d.commission_paid = false OR d.commission_paid IS NULL) THEN d.commission_amount ELSE 0 END), 0) AS earned_commission_unpaid,
    COUNT(CASE WHEN d.stage NOT IN ('closed_won', 'closed_lost') THEN 1 END) AS active_deals_count,
    COUNT(CASE WHEN d.stage = 'closed_won' THEN 1 END) AS closed_won_deals_count
  FROM deals d
  WHERE d.organization_id = p_org_id;
END;
$$;
