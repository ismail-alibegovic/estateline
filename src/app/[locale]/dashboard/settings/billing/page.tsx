'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createBrowserClient } from '@/lib/supabase'

export default function BillingPage() {
  const t = useTranslations('billing')
  const [plan, setPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setLoading(false); return }

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
        if (org) setPlan(org.subscription_tier)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin h-7 w-7 border-b-2 border-primary rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <header className="mb-12">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">{t('title')}</p>
        <h1 className="font-display text-4xl tracking-tight">{t('heading')}</h1>
      </header>

      <section className="rounded-lg border border-border bg-card px-6 py-7">
        <dl className="grid grid-cols-2 gap-px">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t('currentPlan')}</dt>
            <dd className="font-medium mt-1.5 capitalize">{plan || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t('status')}</dt>
            <dd className="font-medium mt-1.5 capitalize">active</dd>
          </div>
        </dl>
        <p className="mt-6 text-sm text-muted-foreground">{t('comingSoon')}</p>
      </section>
    </div>
  )
}
