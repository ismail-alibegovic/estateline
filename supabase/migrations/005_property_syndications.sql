-- Enum for syndication portals
CREATE TYPE syndication_portal AS ENUM ('olx', 'njuskalo', 'nekretnine_rs');

-- Property Syndications Table
CREATE TABLE public.property_syndications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    portal_name syndication_portal NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
    external_id TEXT, -- ID returned by the portal's API (e.g. OLX)
    last_synced_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(property_id, portal_name)
);

-- RLS
ALTER TABLE public.property_syndications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view syndications in their org"
    ON public.property_syndications FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Users can insert syndications in their org"
    ON public.property_syndications FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Users can update syndications in their org"
    ON public.property_syndications FOR UPDATE
    USING (public.is_org_member(organization_id));

CREATE POLICY "Users can delete syndications in their org"
    ON public.property_syndications FOR DELETE
    USING (public.is_org_member(organization_id));

-- Trigger for updated_at
CREATE TRIGGER update_property_syndications_modtime
    BEFORE UPDATE ON public.property_syndications
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
