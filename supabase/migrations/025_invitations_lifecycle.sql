-- ============================================================
-- 025: INVITATIONS LIFECYCLE
--
-- Migration 004 created `invitations` with a blanket
-- UNIQUE(organization_id, email). That blocks re-inviting an
-- address after its invitation was revoked/accepted/expired
-- (the old row still holds the constraint). Replace it with a
-- partial unique index on PENDING invitations only, so:
--   - at most one ACTIVE invitation exists per org+email
--     (duplicate active invitation protection), and
--   - revoked/accepted/expired rows never block a fresh invite.
-- ============================================================

ALTER TABLE invitations
  DROP CONSTRAINT IF EXISTS invitations_organization_id_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS invitations_org_email_pending_unique
  ON invitations (organization_id, lower(email))
  WHERE status = 'pending';

-- Token lookups happen on every public invite-page visit; the UNIQUE
-- constraint on token already backs that, but add an explicit index
-- guard for hot-path reads by status listing.
CREATE INDEX IF NOT EXISTS invitations_org_status_idx
  ON invitations (organization_id, status);
