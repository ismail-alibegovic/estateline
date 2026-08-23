-- 022_stripe_webhook_idempotency.sql
-- Idempotent Stripe webhook processing: every delivered event is claimed by
-- its unique Stripe event ID before side effects are applied, so duplicate
-- deliveries (Stripe retries until 200) never double-apply billing changes.

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- RLS with no policies = deny all for anon/authenticated roles.
-- Only the service-role key (webhook route) touches this table.
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id
  ON public.stripe_webhook_events(event_id);
