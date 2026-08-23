-- Email delivery observability: one row per transactional send attempt.
-- Roadmap §10: organization, recipient, template, provider message ID, state, timestamps, failure reason.

CREATE TABLE IF NOT EXISTS public.email_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    recipient TEXT NOT NULL,
    subject TEXT,
    template TEXT NOT NULL DEFAULT 'custom',
    entity_type TEXT CHECK (entity_type IN ('lead', 'contact', 'property', 'deal')),
    entity_id UUID,
    provider TEXT NOT NULL DEFAULT 'resend',
    provider_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_email_log_org_created
    ON public.email_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_status
    ON public.email_log(organization_id, status);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_log_tenant_isolation ON public.email_log
    FOR ALL TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1))
    WITH CHECK (organization_id = (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1));
