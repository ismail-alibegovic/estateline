-- ============================================================
-- 026: NOTIFICATIONS
--
-- Per-user actionable notifications (lead assignment wired first).
-- Rows are addressed to a recipient user; access is enforced by
-- RLS against the authenticated auth_id -> users.id mapping.
-- `type` is intentionally an open TEXT column: new event kinds
-- ship as app-level constants in src/lib/notifications.ts without
-- a migration; the whitelist lives in code, not the schema.
-- ============================================================

-- Maps a Supabase auth UID to the internal users.id.
-- SECURITY DEFINER so policies can resolve identity without
-- recursive reads against the users table's own RLS.
CREATE OR REPLACE FUNCTION auth_internal_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_user_in_org(target_user UUID, org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = org_id AND om.user_id = target_user
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  type TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  link TEXT,

  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_recent_idx
  ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id) WHERE read = FALSE;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Recipient can read their own notifications. No org-wide read:
-- notifications are private to the recipient.
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth_internal_user_id());

-- Recipient can flip read state on their own rows; cannot
-- reassign ownership or move rows between orgs while doing so.
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth_internal_user_id())
  WITH CHECK (
    user_id = auth_internal_user_id()
    AND is_org_member(organization_id)
  );

-- Org members may create notifications for other members of the
-- SAME org (server routes do this after lead assignment). Both
-- halves must hold: actor is in the org AND target is in it, so
-- no cross-tenant insertion is possible.
CREATE POLICY "Members can create org notifications" ON notifications
  FOR INSERT WITH CHECK (
    is_org_member(organization_id)
    AND is_user_in_org(user_id, organization_id)
  );
