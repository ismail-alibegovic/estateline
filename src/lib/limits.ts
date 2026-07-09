/**
 * Plan limit checks — billing groundwork.
 *
 * Today every plan is unlimited: both functions always return { allowed: true }.
 * They exist so that, when Stripe tiers land, the ONLY place that needs to
 * change is inside these functions — every call site (invite-agent flow,
 * create-property flow) already calls them and already handles a denied result.
 *
 * The `org` argument deliberately only needs `subscription_tier` so call sites
 * can pass the org row they already have without extra lookups.
 */

export interface PlanLimitResult {
  allowed: boolean
  /** Human-readable reason when denied (for later UI surfacing). */
  reason?: string
  /** The cap that was hit, when denied. */
  limit?: number
}

export function canAddAgent(
  org: { subscription_tier?: string | null },
  _currentAgentCount: number,
): PlanLimitResult {
  // Groundwork only: all plans unlimited until tiers are enforced.
  return { allowed: true }
}

export function canAddProperty(
  org: { subscription_tier?: string | null },
  _currentCount: number,
): PlanLimitResult {
  // Groundwork only: all plans unlimited until tiers are enforced.
  return { allowed: true }
}
