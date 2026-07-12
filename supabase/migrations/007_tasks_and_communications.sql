-- Migration: Tasks and Communications tables for Estateline

-- 1. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo', -- 'todo', 'in_progress', 'completed'
    priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
    due_date TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_tenant_isolation ON public.tasks
    FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1));

-- 2. Communications Table (Calls, Meetings, Emails logs)
CREATE TABLE IF NOT EXISTS public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'call', 'meeting', 'email'
    title TEXT NOT NULL,
    summary TEXT,
    duration_minutes INTEGER,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Communications
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY communications_tenant_isolation ON public.communications
    FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1));
