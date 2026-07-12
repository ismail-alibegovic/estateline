-- =====================================================
-- PHASE 5 (part 2): Public microsite read path
-- Estateline Multi-Tenant Real Estate CRM
-- =====================================================
--
-- Problem: the microsite page previously read organizations/properties with
-- the anon Supabase client via .from().select('*'). Two issues:
--   1) RLS blocks anon entirely (no anon SELECT policy), so the microsite
--      renders 0 listings for public visitors — broken.
--   2) If an anon SELECT policy *were* added (the naive fix), anyone with the
--      public anon key could hit the REST API directly and pull every column
--      (stripe_customer_id, stripe_subscription_id, custom_fields, documents…).
--
-- Fix: SECURITY DEFINER RPCs that return ONLY explicitly whitelisted public
-- columns. The microsite calls these via .rpc(); no table-level anon SELECT is
-- granted, so the REST API cannot expose non-whitelisted columns.
--
-- Column mapping notes (differs slightly from the verbal spec):
--   * "area_sqm"  -> the schema column is `area_size` (002_properties_leads.sql)
--   * "category"  -> does not exist; rent/sale is derived from `price_period`
--   * `slug`, `price_period`, `address`, `cover_image_url`, `featured` are added
--     because the listing card/detail actually renders them.
--   * `deleted_at` does not exist on properties, so the filter is just
--     status = 'active' AND published_at IS NOT NULL.

-- 1. Public org lookup by slug (never returns stripe_* / internal columns)
CREATE OR REPLACE FUNCTION get_public_org_by_slug(p_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  branding jsonb,
  locale_default text,
  currency_default text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.name,
    o.slug,
    o.logo_url,
    o.branding,
    o.locale_default,
    o.currency_default
  FROM organizations o
  WHERE o.slug = p_slug
$$;

-- 2. Public active listings for an org (whitelisted columns only)
CREATE OR REPLACE FUNCTION get_public_properties(p_org_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  slug text,
  price numeric,
  currency text,
  price_period text,
  city text,
  address text,
  area_size numeric,
  bedrooms integer,
  bathrooms integer,
  year_built integer,
  cover_image_url text,
  images jsonb,
  type public.property_type,
  featured boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.title,
    p.description,
    p.slug,
    p.price,
    p.currency,
    p.price_period,
    p.city,
    p.address,
    p.area_size,
    p.bedrooms,
    p.bathrooms,
    p.year_built,
    p.cover_image_url,
    p.images,
    p.type,
    p.featured
  FROM properties p
  WHERE p.organization_id = p_org_id
    AND p.status = 'active'
    AND p.published_at IS NOT NULL
  ORDER BY p.featured DESC, p.created_at DESC
$$;

-- 3. Grant execution to anon + authenticated so the public microsite can read.
--    No GRANT SELECT on the underlying tables — the RPC is the only public path.
GRANT EXECUTE ON FUNCTION get_public_org_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_properties(uuid) TO anon, authenticated;
