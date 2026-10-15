-- Migration 032: remove anon access from SECURITY DEFINER RPCs that must only
-- be called by signed-in members (or, for create_organization, by the server).
-- Public RPCs (public_create_lead, get_public_*) and the is_* policy helpers keep anon access.
REVOKE EXECUTE ON FUNCTION public.get_deals_by_stage(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_financial_forecasting_report(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_time_to_close_report(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.estimate_property_valuation(uuid, text, text, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_lead_ai_score(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_lead_stage(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_activity(uuid, text, text, uuid, uuid, uuid, uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_deals_by_stage(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_financial_forecasting_report(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_time_to_close_report(uuid, timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.estimate_property_valuation(uuid, text, text, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_lead_ai_score(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_lead_stage(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_activity(uuid, text, text, uuid, uuid, uuid, uuid, uuid, jsonb) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.create_organization(text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization(text, text, text, uuid) TO service_role;

ALTER FUNCTION public.get_deals_by_stage(uuid) SET search_path = public;
ALTER FUNCTION public.get_financial_forecasting_report(uuid) SET search_path = public;
ALTER FUNCTION public.get_time_to_close_report(uuid, timestamptz, timestamptz) SET search_path = public;
ALTER FUNCTION public.estimate_property_valuation(uuid, text, text, numeric) SET search_path = public;
ALTER FUNCTION public.get_lead_ai_score(uuid) SET search_path = public;
ALTER FUNCTION public.update_lead_stage(uuid, text) SET search_path = public;
ALTER FUNCTION public.log_activity(uuid, text, text, uuid, uuid, uuid, uuid, uuid, jsonb) SET search_path = public;
ALTER FUNCTION public.create_organization(text, text, text, uuid) SET search_path = public;
ALTER FUNCTION public.is_org_member(uuid) SET search_path = public;
ALTER FUNCTION public.is_org_admin(uuid) SET search_path = public;
ALTER FUNCTION public.is_admin(uuid) SET search_path = public;
ALTER FUNCTION public.public_create_lead(text, text, text, text, text, text) SET search_path = public;
