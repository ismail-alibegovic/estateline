-- Organization deletion lifecycle (roadmap §12):
-- request -> 30-day grace -> read-only after grace ends -> export window -> purge.
-- Purge itself is executed by scripts/purge-deleted-orgs.js (external scheduler).

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMPTZ;
