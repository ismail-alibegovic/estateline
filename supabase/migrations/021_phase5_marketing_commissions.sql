-- Migration 021: Deal Commissions, Drip Marketing Campaigns & Client Portal Access
-- Multi-Tenant isolated by organization_id with RLS enabled

-- 1. Deal Commissions Table
CREATE TABLE IF NOT EXISTS public.deal_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    split_percentage NUMERIC(5,2) NOT NULL DEFAULT 50.00,
    commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
    payout_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.deal_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage organization deal commissions"
    ON public.deal_commissions
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 2. Drip Marketing Campaigns Table
CREATE TABLE IF NOT EXISTS public.drip_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_stage TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp', 'sms')),
    template_body TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.drip_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage organization drip campaigns"
    ON public.drip_campaigns
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 3. Client Portal Tokens Table
CREATE TABLE IF NOT EXISTS public.client_portal_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.client_portal_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage organization client portal tokens"
    ON public.client_portal_tokens
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Public portal token resolution policy for unauthenticated clients
CREATE POLICY "Public clients can view portal token data by valid token"
    ON public.client_portal_tokens
    FOR SELECT
    USING (expires_at > timezone('utc'::text, now()));
