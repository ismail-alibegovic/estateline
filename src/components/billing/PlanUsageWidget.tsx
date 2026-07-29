'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

export default function PlanUsageWidget() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{
    tier: string
    agentCount: number
    agentLimit: number | null
    propertyCount: number
    propertyLimit: number | null
  }>({
    tier: 'beta',
    agentCount: 0,
    agentLimit: 1,
    propertyCount: 0,
    propertyLimit: 10
  })

  useEffect(() => {
    async function loadUsage() {
      const supabase = createBrowserClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authUser.id)
        .single()

      if (!user) return

      const { data: member } = await supabase
        .from('organization_members')
        .select('organizations(id, subscription_tier)')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single()

      const org = (member as any)?.organizations
      if (!org) return

      const tier = (org.subscription_tier || 'beta').toLowerCase()

      const [{ count: agentCount }, { count: propertyCount }] = await Promise.all([
        supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
        supabase.from('properties').select('*', { count: 'exact', head: true }).eq('organization_id', org.id)
      ])

      let agentLimit: number | null = 1
      if (tier === 'starter') agentLimit = 3
      else if (tier === 'pro') agentLimit = 15
      else if (tier === 'agency') agentLimit = null

      let propertyLimit: number | null = 10
      if (tier === 'starter' || tier === 'pro' || tier === 'agency') propertyLimit = null

      setStats({
        tier,
        agentCount: agentCount || 0,
        agentLimit,
        propertyCount: propertyCount || 0,
        propertyLimit
      })
      setLoading(false)
    }

    loadUsage()
  }, [])

  if (loading) return null

  const agentPct = stats.agentLimit ? Math.min(100, Math.round((stats.agentCount / stats.agentLimit) * 100)) : 0
  const propertyPct = stats.propertyLimit ? Math.min(100, Math.round((stats.propertyCount / stats.propertyLimit) * 100)) : 0

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-10">
      <h3 className="text-base font-display font-bold mb-4">Plan Usage & Tier Caps</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Agent Usage */}
        <div>
          <div className="flex justify-between text-xs font-medium mb-1.5">
            <span className="text-muted-foreground">Active Agents</span>
            <span className="font-bold">
              {stats.agentCount} / {stats.agentLimit === null ? 'Unlimited' : stats.agentLimit}
            </span>
          </div>
          {stats.agentLimit !== null ? (
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${agentPct >= 100 ? 'bg-red-500' : 'bg-primary'}`}
                style={{ width: `${agentPct}%` }}
              />
            </div>
          ) : (
            <p className="text-xs text-emerald-600 font-semibold mt-1">✓ Unlimited on {stats.tier.toUpperCase()} plan</p>
          )}
        </div>

        {/* Property Usage */}
        <div>
          <div className="flex justify-between text-xs font-medium mb-1.5">
            <span className="text-muted-foreground">Property Listings</span>
            <span className="font-bold">
              {stats.propertyCount} / {stats.propertyLimit === null ? 'Unlimited' : stats.propertyLimit}
            </span>
          </div>
          {stats.propertyLimit !== null ? (
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${propertyPct >= 100 ? 'bg-red-500' : 'bg-primary'}`}
                style={{ width: `${propertyPct}%` }}
              />
            </div>
          ) : (
            <p className="text-xs text-emerald-600 font-semibold mt-1">✓ Unlimited on {stats.tier.toUpperCase()} plan</p>
          )}
        </div>
      </div>
    </div>
  )
}
