-- Delivery log for outgoing webhooks. Written by the server (service role);
-- organization admins can read it.
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  event text NOT NULL,
  success boolean NOT NULL,
  status_code integer,
  attempts integer NOT NULL DEFAULT 1,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_deliveries_org_created_idx
  ON public.webhook_deliveries (organization_id, created_at DESC);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view webhook deliveries" ON public.webhook_deliveries;
CREATE POLICY "Admins view webhook deliveries"
  ON public.webhook_deliveries FOR SELECT
  USING (is_admin(organization_id));
