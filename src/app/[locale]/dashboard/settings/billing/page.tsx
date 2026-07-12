'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createBrowserClient } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

export default function BillingPage() {
  const t = useTranslations('billing')
  const [plan, setPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    loadBilling()
  }, [])

  const loadBilling = async () => {
    const supabase = createBrowserClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      setLoading(false)
      return
    }

    const { data: u } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single()
      
    if (u) {
      const { data: member } = await supabase
        .from('organization_members')
        .select('organizations(id, name, subscription_tier)')
        .eq('user_id', (u as any).id)
        .eq('is_primary', true)
        .single()
      const org = (member as any)?.organizations
      
      if (org) {
        setPlan(org.subscription_tier)
        
        // Handle mock successful checkout
        const isSuccess = searchParams.get('success') === 'true'
        const mockTier = searchParams.get('mock_tier')
        if (isSuccess && mockTier) {
          await supabase
            .from('organizations')
            .update({ subscription_tier: mockTier })
            .eq('id', org.id)
          setPlan(mockTier)
        }
      }
    }
    setLoading(false)
  }

  const handleSubscribe = async (tier: 'starter' | 'pro') => {
    setActionLoading(tier)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier })
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Checkout initialization failed')
      }
    } catch (e) {
      alert('Error initiating checkout')
    } finally {
      setActionLoading(null)
    }
  }

  const handleManage = async () => {
    setActionLoading('manage')
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        // Mock fallback redirect back to refresh the status
        window.location.reload()
      }
    } catch (e) {
      alert('Error opening customer portal')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin h-7 w-7 border-b-2 border-primary rounded-full" />
      </div>
    )
  }

  const currentTier = plan ? plan.toLowerCase() : 'free'

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <header className="mb-12">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">{t('title')}</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">{t('heading')}</h1>
        <p className="mt-2 text-muted-foreground">Manage your subscription, plans, and invoices.</p>
      </header>

      {/* Current Plan Overview */}
      <section className="bg-card border border-border rounded-xl p-6 shadow-sm mb-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('currentPlan')}</p>
            <h2 className="text-2xl font-display font-bold mt-1 capitalize">{plan || 'Free Trial'}</h2>
            <p className="text-sm text-muted-foreground mt-1">Status: Active</p>
          </div>
          {currentTier !== 'free' && (
            <button
              onClick={handleManage}
              disabled={actionLoading !== null}
              className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              {actionLoading === 'manage' ? 'Opening Portal...' : 'Manage Invoices / Portal'}
            </button>
          )}
        </div>
      </section>

      {/* Tiers Pricing Grid */}
      <section>
        <h2 className="text-xl font-display font-bold mb-6">Available Tiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter */}
          <div className={`bg-card border rounded-2xl p-6 flex flex-col justify-between shadow-sm relative ${
            currentTier === 'starter' ? 'border-primary ring-1 ring-primary' : 'border-border'
          }`}>
            {currentTier === 'starter' && (
              <span className="absolute top-0 right-6 -translate-y-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-semibold text-primary-foreground uppercase tracking-wider">
                Current Plan
              </span>
            )}
            <div>
              <h3 className="font-display text-lg font-bold">Starter</h3>
              <p className="text-sm text-muted-foreground mt-1">Best for single agents & small teams.</p>
              <p className="mt-4 font-display text-3xl font-bold">€29 <span className="text-sm text-muted-foreground font-sans">/mo</span></p>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground border-t border-border pt-4">
                <li>✓ Up to 3 active agents</li>
                <li>✓ Unlimited property listings</li>
                <li>✓ Dynamic XML Feeds</li>
              </ul>
            </div>
            <button
              onClick={() => handleSubscribe('starter')}
              disabled={actionLoading !== null || currentTier === 'starter'}
              className="w-full mt-8 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {actionLoading === 'starter' ? 'Connecting...' : currentTier === 'starter' ? 'Active' : 'Upgrade to Starter'}
            </button>
          </div>

          {/* Pro */}
          <div className={`bg-card border rounded-2xl p-6 flex flex-col justify-between shadow-sm relative ${
            currentTier === 'pro' ? 'border-primary ring-1 ring-primary' : 'border-border'
          }`}>
            {currentTier === 'pro' && (
              <span className="absolute top-0 right-6 -translate-y-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-semibold text-primary-foreground uppercase tracking-wider">
                Current Plan
              </span>
            )}
            <div>
              <h3 className="font-display text-lg font-bold">Pro</h3>
              <p className="text-sm text-muted-foreground mt-1">For growing real estate agencies.</p>
              <p className="mt-4 font-display text-3xl font-bold">€79 <span className="text-sm text-muted-foreground font-sans">/mo</span></p>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground border-t border-border pt-4">
                <li>✓ Up to 15 active agents</li>
                <li>✓ Direct OLX API Syndication</li>
                <li>✓ Dynamic XML Feeds</li>
                <li>✓ Document Generator tool</li>
              </ul>
            </div>
            <button
              onClick={() => handleSubscribe('pro')}
              disabled={actionLoading !== null || currentTier === 'pro'}
              className="w-full mt-8 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {actionLoading === 'pro' ? 'Connecting...' : currentTier === 'pro' ? 'Active' : 'Upgrade to Pro'}
            </button>
          </div>

          {/* Agency */}
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="font-display text-lg font-bold">Agency</h3>
              <p className="text-sm text-muted-foreground mt-1">Unlimited scale & branding customization.</p>
              <p className="mt-4 font-display text-3xl font-bold">Custom</p>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground border-t border-border pt-4">
                <li>✓ Unlimited agents & listings</li>
                <li>✓ Custom subdomains & microsites</li>
                <li>✓ API/Feed syndication suites</li>
                <li>✓ Priority support</li>
              </ul>
            </div>
            <a
              href="mailto:support@estateline.ba?subject=Agency Plan Inquiry"
              className="w-full mt-8 text-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
