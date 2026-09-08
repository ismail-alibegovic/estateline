'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createBrowserClient } from '@/lib/supabase'
import { CheckCircle2, ShieldCheck, Zap, CreditCard, ArrowUpRight, Sparkles, Loader2 } from 'lucide-react'

/** Canonical plan ids — match organizations.subscription_tier and api/billing/checkout. */
const PLAN_IDS = ['starter', 'pro', 'agency'] as const
type PlanId = (typeof PLAN_IDS)[number]

const SUCCESS = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('success')
const CANCELED = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('canceled')
const MOCK_TIER = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mock_tier')

export default function BillingPage() {
  const t = useTranslations('billing')
  const locale = useLocale()
  const [plan, setPlan] = useState<string>('pro')
  const [loading, setLoading] = useState(true)
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null)
  const [usage, setUsage] = useState<{ properties: { used: number; cap: number }; agents: { used: number; cap: number }; storage: { used: number; cap: number } } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const loadBilling = async () => {
      const supabase = createBrowserClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: u } = await supabase.from('users').select('id').eq('auth_id', authUser.id).single()
        if (u) {
          const { data: member } = await supabase
            .from('organization_members')
            .select('organizations(subscription_tier)')
            .eq('user_id', (u as any).id)
            .eq('is_primary', true)
            .single()
          if ((member as any)?.organizations?.subscription_tier) {
            setPlan((member as any).organizations.subscription_tier)
          }

          // Real usage counts indexed by org_id (joined through org membership)
          const { data: activeMemberships } = await supabase
            .from('organization_members')
            .select('organization_id, organizations(id, subscription_tier)')
            .eq('user_id', (u as any).id)
            .eq('is_primary', true)

          const orgId = (activeMemberships?.[0] as any)?.organization_id
          if (orgId) {
            const tier = ((activeMemberships?.[0] as any)?.organizations?.subscription_tier || 'pro') as PlanId
            const caps = TIER_CAPS[tier] || TIER_CAPS.pro

            const [{ count: propertyCount }, { count: agentCount }] = await Promise.all([
              supabase.from('properties').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
              supabase.from('organization_members').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
            ])

            setUsage({
              properties: { used: propertyCount || 0, cap: caps.properties },
              agents: { used: agentCount || 0, cap: caps.agents },
              storage: { used: 1.2, cap: 50 }, // Storage not yet tracked per-row; static estimate shown
            })
          }
        }
      }
      setLoading(false)
    }
    loadBilling()
  }, [])

  // Surface Stripe redirect outcomes
  useEffect(() => {
    if (SUCCESS) {
      setToast(MOCK_TIER ? t('mockToast', { tier: MOCK_TIER }) : t('activatedToast'))
      // Clear the query string so a refresh doesn't re-fire the toast
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      url.searchParams.delete('canceled')
      url.searchParams.delete('mock_tier')
      window.history.replaceState({}, '', url.toString())
    } else if (CANCELED) {
      setToast(t('canceledToast'))
      const url = new URL(window.location.href)
      url.searchParams.delete('canceled')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  const handleUpgrade = async (tierKey: string) => {
    if (!tierKey || tierKey === plan) return
    setUpgradingTier(tierKey)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ tier: tierKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Checkout failed')
      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err: any) {
      setToast(t('upgradeFailed', { error: err.message }))
      setUpgradingTier(null)
    }
  }

  if (loading) {
    return (
      <div className="w-full space-y-6 py-12">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="skeleton h-48 rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4 font-sans animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${SUCCESS ? 'bg-emerald-600' : 'bg-red-600'} transition-opacity`} role="status">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-gray-200/70 pb-6">
        <p className="page-eyebrow mb-1">{t('agencySubscription')}</p>
        <h1
          className="text-3xl font-bold text-gray-900"
          style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
        >
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('subtitle')}
        </p>
      </header>

      {/* Active Plan Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#C9963B]" />
            <span className="text-xs font-bold text-[#C9963B] uppercase tracking-wider">{t('activePlanLabel')}</span>
          </div>
          <h2 className="text-3xl font-bold">{t(`plan_${(PLAN_IDS as readonly string[]).includes(plan as PlanId) ? (plan as PlanId) : 'pro'}`)}</h2>
          <p className="text-xs text-gray-300">
            {t('modulesLine')}
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 shrink-0">
          <button
            onClick={() => handleUpgrade('pro')}
            disabled={upgradingTier === 'pro'}
            className="px-5 py-3 bg-[#C9963B] hover:bg-[#b88328] text-white font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-wait"
          >
            {upgradingTier === 'pro' ? <Loader2 className="w-3 h-3 animate-spin" /> : t('manageSubscription')}
          </button>
        </div>
      </div>

      {/* Resource Usage Meters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(() => {
          const props = usage?.properties || { used: 4, cap: 100 }
          const agents = usage?.agents || { used: 2, cap: 10 }
          const storage = usage?.storage || { used: 1.2, cap: 50 }
          const propPct = Math.min(100, (props.used / Math.max(1, props.cap)) * 100)
          const agentPct = Math.min(100, (agents.used / Math.max(1, agents.cap)) * 100)
          const storagePct = Math.min(100, (storage.used / storage.cap) * 100)
          return (
            <>
              <div className="bg-white border border-gray-200/70 rounded-3xl p-6 shadow-sm space-y-3">
                <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                  <span>{t('activeProperties')}</span>
                  <span className="font-bold text-gray-900">{props.used} / {props.cap}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#C9963B] rounded-full transition-all duration-500" style={{ width: `${propPct}%` }} />
                </div>
                <p className="text-[11px] text-gray-400">{t('listingsLeft', { count: Math.max(0, props.cap - props.used) })}</p>
              </div>

              <div className="bg-white border border-gray-200/70 rounded-3xl p-6 shadow-sm space-y-3">
                <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                  <span>{t('agentLicenses')}</span>
                  <span className="font-bold text-gray-900">{agents.used} / {agents.cap}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#2563EB] rounded-full transition-all duration-500" style={{ width: `${agentPct}%` }} />
                </div>
                <p className="text-[11px] text-gray-400">{t('agentsLeft', { count: Math.max(0, agents.cap - agents.used) })}</p>
              </div>

              <div className="bg-white border border-gray-200/70 rounded-3xl p-6 shadow-sm space-y-3">
                <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                  <span>{t('documentStorage')}</span>
                  <span className="font-bold text-gray-900">{storage.used} GB / {storage.cap} GB</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#059669] rounded-full transition-all duration-500" style={{ width: `${storagePct}%` }} />
                </div>
                <p className="text-[11px] text-gray-400">{t('storageHint')}</p>
              </div>
            </>
          )
        })()}
      </div>

      {/* Pricing Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {PLAN_IDS.map((id, idx) => {
          const isActive = id === plan
          const isUpgrading = upgradingTier === id
          const isCurrent = id === plan
          return (
            <div
              key={idx}
              className={`bg-white rounded-3xl p-6 border shadow-sm flex flex-col justify-between space-y-6 ${
                isActive ? 'border-[#C9963B] ring-2 ring-[#C9963B]/20' : 'border-gray-200/70'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-gray-900">{t(`plan_${id}`)}</h3>
                  {isActive && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-[#C9963B] border border-amber-200">
                      {t('activeBadge')}
                    </span>
                  )}
                </div>

                <div className="text-2xl font-bold text-gray-900">{t(`price_${id}`)}</div>

                <div className="space-y-2 text-xs text-gray-600">
                  {[1, 2, 3, 4].map(n => {
                    const key = `feat_${id}_${n}`
                    const label = t.has(key) ? t(key) : null
                    return label ? (
                      <div key={n} className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-[#C9963B]" />
                        <span>{label}</span>
                      </div>
                    ) : null
                  })}
                </div>
              </div>

              <button
                onClick={() => handleUpgrade(id)}
                disabled={isCurrent || isUpgrading}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-default'
                    : 'bg-[#C9963B] text-white hover:bg-[#b88328]'
                }`}
              >
                {isUpgrading && <Loader2 className="w-3 h-3 animate-spin" />}
                {isCurrent ? 'Trenutni Paket' : 'Nadogradi Paket'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const TIER_CAPS: Record<string, { properties: number; agents: number }> = {
  'Starter Agencija': { properties: 25, agents: 2 },
  'EstateLine Pro': { properties: 100, agents: 10 },
  'Enterprise Premium': { properties: 100000, agents: 100000 }, // Unlimited
  starter: { properties: 25, agents: 2 },
  pro: { properties: 100, agents: 10 },
  agency: { properties: 100000, agents: 100000 },
}
