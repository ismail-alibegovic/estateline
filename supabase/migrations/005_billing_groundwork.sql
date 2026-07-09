-- 1. Drop existing CHECK constraint on subscription_tier (auto-generated name, unknown)
DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'organizations'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%subscription_tier%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE organizations DROP CONSTRAINT ' || v_constraint;
  END IF;
END $$;

-- 2. Add corrected CHECK. Backfill (step 3) has already run, so every row
--    now conforms; the constraint is added fully VALIDATED (no NOT VALID).
ALTER TABLE organizations
  ADD CONSTRAINT organizations_subscription_tier_check
  CHECK (subscription_tier IN ('starter', 'pro', 'agency', 'beta'));

-- 3. Backfill legacy tier values -> 'starter'
UPDATE organizations SET subscription_tier = 'starter'
WHERE subscription_tier NOT IN ('starter', 'pro', 'agency', 'beta');

-- 4. Backfill NULL status -> 'active' (added per review)
UPDATE organizations SET subscription_status = 'active'
WHERE subscription_status IS NULL;

-- 5. Future inserts default to closed-beta access tier
ALTER TABLE organizations ALTER COLUMN subscription_tier SET DEFAULT 'beta';

-- 6. Future inserts start active
ALTER TABLE organizations ALTER COLUMN subscription_status SET DEFAULT 'active';
