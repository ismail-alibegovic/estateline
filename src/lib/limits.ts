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
  currentAgentCount: number,
): PlanLimitResult {
  const tier = (org?.subscription_tier || 'beta').toLowerCase()
  let limit = 1
  if (tier === 'starter') limit = 3
  else if (tier === 'pro') limit = 15
  else if (tier === 'agency') return { allowed: true }

  if (currentAgentCount >= limit) {
    return {
      allowed: false,
      reason: `Your organization has reached the active agent limit of ${limit} for the ${tier} plan. Please upgrade your subscription to add more agents.`,
      limit,
    }
  }
  return { allowed: true }
}

export function canAddProperty(
  org: { subscription_tier?: string | null },
  currentCount: number,
): PlanLimitResult {
  const tier = (org?.subscription_tier || 'beta').toLowerCase()
  let limit = 10
  if (tier === 'starter' || tier === 'pro' || tier === 'agency') {
    return { allowed: true }
  }

  if (currentCount >= limit) {
    return {
      allowed: false,
      reason: `Your organization has reached the property listing limit of ${limit} for the ${tier} plan. Please upgrade your subscription to add more properties.`,
      limit,
    }
  }
  return { allowed: true }
}
