-- Migration 030: close cross-tenant report access and unprotected invoice tables
--
--   1. get_dashboard_metrics / get_agent_performance_report /
--      get_lead_conversion_report are SECURITY DEFINER and took any p_org_id,
--      callable with the public anon key. They now require the caller to be a
--      member of that organization (service role is still allowed) and anon
--      loses EXECUTE.
--   2. invoice_items and quote_installments had RLS disabled. Enable it and
--      scope access through the parent invoice / quote organization.

BEGIN;

-- 1. Reports -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  result JSONB;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'not a member of this organization' USING ERRCODE = '42501';
  END IF;

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
$function$;

-- The other two keep their bodies; add the guard by wrapping.
ALTER FUNCTION public.get_agent_performance_report(uuid, timestamptz, timestamptz, uuid)
  RENAME TO _get_agent_performance_report_impl;
ALTER FUNCTION public.get_lead_conversion_report(uuid, timestamptz, timestamptz)
  RENAME TO _get_lead_conversion_report_impl;

REVOKE ALL ON FUNCTION public._get_agent_performance_report_impl(uuid, timestamptz, timestamptz, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._get_lead_conversion_report_impl(uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.get_agent_performance_report(
  p_org_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_agent_id uuid DEFAULT NULL
) RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'not a member of this organization' USING ERRCODE = '42501';
  END IF;
  RETURN public._get_agent_performance_report_impl(p_org_id, p_start_date, p_end_date, p_agent_id);
END;
$function$;

CREATE FUNCTION public.get_lead_conversion_report(
  p_org_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
) RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'not a member of this organization' USING ERRCODE = '42501';
  END IF;
  RETURN public._get_lead_conversion_report_impl(p_org_id, p_start_date, p_end_date);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_dashboard_metrics(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_agent_performance_report(uuid, timestamptz, timestamptz, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_lead_conversion_report(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_agent_performance_report(uuid, timestamptz, timestamptz, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_lead_conversion_report(uuid, timestamptz, timestamptz) TO authenticated, service_role;

-- 2. Invoice items / quote installments ---------------------------------------
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members manage invoice items" ON public.invoice_items;
CREATE POLICY "Members manage invoice items"
  ON public.invoice_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.invoices i
                 WHERE i.id = invoice_items.invoice_id AND public.is_org_member(i.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i
                      WHERE i.id = invoice_items.invoice_id AND public.is_org_member(i.organization_id)));

ALTER TABLE public.quote_installments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members manage quote installments" ON public.quote_installments;
CREATE POLICY "Members manage quote installments"
  ON public.quote_installments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.quotes q
                 WHERE q.id = quote_installments.quote_id AND public.is_org_member(q.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.quotes q
                      WHERE q.id = quote_installments.quote_id AND public.is_org_member(q.organization_id)));

COMMIT;
