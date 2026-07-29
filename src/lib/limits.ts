/**
 * Plan limit checks and quota enforcement.
 */

export interface PlanLimitResult {
  allowed: boolean
  /** Human-readable reason when denied (for UI surfacing). */
  reason?: string
  /** The cap that was hit, when denied. */
  limit?: number
}

export interface PlanUsageStats {
  tier: string
  agents: { current: number; limit: number | null; allowed: boolean }
  properties: { current: number; limit: number | null; allowed: boolean }
  whatsappMonthly: { current: number; limit: number | null; allowed: boolean }
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

export function canSendWhatsApp(
  org: { subscription_tier?: string | null },
  currentMonthlySends: number,
): PlanLimitResult {
  const tier = (org?.subscription_tier || 'beta').toLowerCase()
  let limit = 50
  if (tier === 'starter') limit = 200
  else if (tier === 'pro') limit = 1000
  else if (tier === 'agency') return { allowed: true }

  if (currentMonthlySends >= limit) {
    return {
      allowed: false,
      reason: `Your organization has reached the monthly WhatsApp limit of ${limit} messages for the ${tier} plan. Upgrade to increase messaging capacity.`,
      limit,
    }
  }
  return { allowed: true }
}
