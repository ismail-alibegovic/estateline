-- Migration 029: role-based policies on sensitive tables + close the portal token leak
--
-- Why
--   1. Policies from 020/021 only checked "same organization", so any member
--      (including viewers and agents) could create API keys, webhooks and drip
--      campaigns, change commissions, or read audit logs.
--   2. Those policies resolve membership through public.profiles, which no
--      migration creates. Membership everywhere else uses organization_members
--      via is_org_member() / is_admin(); this migration switches to those so
--      the policies match the rest of the schema and work on a fresh database.
--   3. "Public clients can view portal token data by valid token" let ANY
--      caller with the public anon key list every unexpired client_portal_tokens
--      row (the policy only checked expiry, not the token). The portal route
--      reads tokens with the service-role client, so no public policy is needed.
--
-- Apply with the usual workflow after reviewing. Safe to re-run.

BEGIN;

-- ---------------------------------------------------------------------------
-- Portal tokens: remove public read; members of the org manage them.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public clients can view portal token data by valid token"
  ON public.client_portal_tokens;
DROP POLICY IF EXISTS "Users can manage organization client portal tokens"
  ON public.client_portal_tokens;

CREATE POLICY "Members manage organization client portal tokens"
  ON public.client_portal_tokens
  FOR ALL
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Admin-only: API keys, webhooks, drip campaigns
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage organization API keys" ON public.api_keys;
CREATE POLICY "Admins manage organization API keys"
  ON public.api_keys
  FOR ALL
  USING (is_admin(organization_id))
  WITH CHECK (is_admin(organization_id));

DROP POLICY IF EXISTS "Users can manage organization webhook subscriptions"
  ON public.webhook_subscriptions;
CREATE POLICY "Admins manage organization webhook subscriptions"
  ON public.webhook_subscriptions
  FOR ALL
  USING (is_admin(organization_id))
  WITH CHECK (is_admin(organization_id));

DROP POLICY IF EXISTS "Users can manage organization drip campaigns"
  ON public.drip_campaigns;
CREATE POLICY "Admins manage organization drip campaigns"
  ON public.drip_campaigns
  FOR ALL
  USING (is_admin(organization_id))
  WITH CHECK (is_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Commissions: members read, admins write
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage organization deal commissions"
  ON public.deal_commissions;

CREATE POLICY "Members view organization deal commissions"
  ON public.deal_commissions
  FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Admins manage organization deal commissions"
  ON public.deal_commissions
  FOR ALL
  USING (is_admin(organization_id))
  WITH CHECK (is_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Audit logs: only owners/admins can read. Inserts stay open to members so
-- the app and triggers can keep recording activity.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view organization audit logs" ON public.audit_logs;
CREATE POLICY "Admins view organization audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (is_admin(organization_id));

DROP POLICY IF EXISTS "System and users can insert organization audit logs"
  ON public.audit_logs;
CREATE POLICY "Members insert organization audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Contract signatures: members only (previously via profiles)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage organization contract signatures"
  ON public.contract_signatures;
CREATE POLICY "Members manage organization contract signatures"
  ON public.contract_signatures
  FOR ALL
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

COMMIT;
