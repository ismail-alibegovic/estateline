-- Migration 010: Fix tasks and communications RLS policies

-- Drop broken policies
DROP POLICY IF EXISTS tasks_tenant_isolation ON public.tasks;
DROP POLICY IF EXISTS communications_tenant_isolation ON public.communications;

-- Recreate tasks policies
CREATE POLICY tasks_tenant_isolation ON public.tasks
    FOR ALL
    USING (is_org_member(organization_id))
    WITH CHECK (is_org_member(organization_id));

-- Recreate communications policies
CREATE POLICY communications_tenant_isolation ON public.communications
    FOR ALL
    USING (is_org_member(organization_id))
    WITH CHECK (is_org_member(organization_id));
