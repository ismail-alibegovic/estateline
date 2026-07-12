#!/usr/bin/env node
/**
 * Applies pending migrations to Supabase using the Management API.
 * Run: node scripts/apply-migration.mjs
 */

const PROJECT_REF = 'vlkasfskndcmbrbbdvzd'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsa2FzZnNrbmRjbWJyYmJkdnpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQ1Nzk2MCwiZXhwIjoyMDk5MDMzOTYwfQ.zAjiGFydDPrefmKZYG3045gy6GDRBxXUk3G-oHoRE-A'

const SQL = `
-- 1. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_tenant_isolation'
  ) THEN
    CREATE POLICY tasks_tenant_isolation ON public.tasks
      FOR ALL
      USING (organization_id = (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1));
  END IF;
END $$;

-- 2. Communications Table
CREATE TABLE IF NOT EXISTS public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    duration_minutes INTEGER,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'communications' AND policyname = 'communications_tenant_isolation'
  ) THEN
    CREATE POLICY communications_tenant_isolation ON public.communications
      FOR ALL
      USING (organization_id = (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1));
  END IF;
END $$;
`

async function run() {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: SQL }),
  })
  const text = await resp.text()
  console.log('Status:', resp.status)
  console.log('Response:', text)
}

run().catch(console.error)
