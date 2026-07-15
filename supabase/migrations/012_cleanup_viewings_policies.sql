-- Migration 012: Clean up viewings RLS policies and add WhatsApp consent columns to contacts

-- Drop duplicate policies
DROP POLICY IF EXISTS "Users can view viewings in their org" ON public.viewings;
DROP POLICY IF EXISTS "Users can manage viewings in their org" ON public.viewings;
DROP POLICY IF EXISTS "Users can view viewings of their org" ON public.viewings;
DROP POLICY IF EXISTS "Users can manage viewings of their org" ON public.viewings;

-- Create clean policies for viewings
CREATE POLICY viewings_select ON public.viewings
    FOR SELECT
    USING (is_org_member(organization_id));

CREATE POLICY viewings_insert ON public.viewings
    FOR INSERT
    WITH CHECK (is_org_member(organization_id));

CREATE POLICY viewings_update ON public.viewings
    FOR UPDATE
    USING (is_org_member(organization_id));

CREATE POLICY viewings_delete ON public.viewings
    FOR DELETE
    USING (is_admin(organization_id));

-- Add WhatsApp consent columns to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS whatsapp_opted_in BOOLEAN DEFAULT false;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS whatsapp_consent_at TIMESTAMP WITH TIME ZONE;
