'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createBrowserClient } from '@/lib/supabase'

interface Counts {
  properties: number
  leads: number
  active_deals: number
  team_members: number
}

export default function DashboardHome() {
  const t = useTranslations('dashboard')
  const tc = useTranslations('common')
  const [user, setUser] = useState<any>(null)
  const [org, setOrg] = useState<any>(null)
  const [counts, setCounts] = useState<Counts>({ properties: 0, leads: 0, active_deals: 0, team_members: 1 })
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setLoading(false); return }

      const { data: u } = await supabase.from('users').select('id, full_name').eq('auth_id', authUser.id).single()
      if (u) {
        setUser(u as any)
        const { data: member } = await supabase
          .from('organization_members')
          .select('organizations(id, name, subscription_tier, currency_default, locale_default)')
          .eq('user_id', (u as any).id)
          .eq('is_primary', true)
          .single()
        const orgData = (member as any)?.organizations
        if (orgData) {
          setOrg(orgData)
          const [{ count: pc }, { count: lc }, { count: dc }, { count: tc }, { data: act }] = await Promise.all([
            supabase.from('properties').select('*', { count: 'exact', head: true }).eq('organization_id', orgData.id),
            supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', orgData.id),
            supabase.from('deals').select('*', { count: 'exact', head: true }).eq('organization_id', orgData.id).in('stage', ['qualified', 'proposal', 'negotiation']),
            supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', orgData.id),
            supabase.from('activity_log').select('*, users(full_name)').eq('organization_id', orgData.id).order('created_at', { ascending: false }).limit(5)
          ])
          setCounts({ properties: pc || 0, leads: lc || 0, active_deals: dc || 0, team_members: tc || 1 })
          if (act) setActivities(act)
        }
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

  const cards = [
    { label: t('properties'), value: counts.properties, hint: 'Listings live' },
    { label: t('leads'), value: counts.leads, hint: 'Across all stages' },
    { label: t('activeDeals'), value: counts.active_deals, hint: 'Qualified → Negotiation' },
    { label: t('teamMembers'), value: counts.team_members, hint: 'In this organization' },
  ]

  return (
    <div className="max-w-5xl">
      <header className="mb-12">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Overview</p>
        <h1 className="font-display text-4xl tracking-tight">
          {t('welcome')}{user?.full_name ? `, ${user.full_name}` : ''}.
        </h1>
        <p className="mt-2 text-muted-foreground">
          {org?.name} <span className="text-foreground/30 mx-1.5">&middot;</span> {org?.subscription_tier} {t('plan')}
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded-lg overflow-hidden">
        {cards.map((card) => (
          <div key={card.label} className="bg-card px-6 py-7">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
            <p className="font-display text-4xl mt-3 text-foreground">{card.value}</p>
            <p className="text-[11px] text-muted-foreground mt-2">{card.hint}</p>
          </div>
        ))}
      </section>

      {org && (
        <section className="mt-10">
          <h2 className="font-display text-xl mb-4">Organization</h2>
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded-lg overflow-hidden">
            <Field label="Name" value={org.name} />
            <Field label="Plan" value={org.subscription_tier} />
            <Field label="Currency" value={org.currency_default} />
            <Field label="Locale" value={org.locale_default} />
          </dl>
        </section>
      )}

      {activities.length > 0 && (
        <section className="mt-10 mb-10">
          <h2 className="font-display text-xl mb-4">Recent Activity</h2>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="space-y-6">
              {activities.map((act) => (
                <div key={act.id} className="flex gap-4">
                  <div className="mt-0.5 flex-shrink-0">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-xs font-medium uppercase">
                      {act.activity_type.substring(0, 1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-[hsl(var(--foreground))]">
                      <span className="font-medium">{act.users?.full_name || 'System'}</span> 
                      <span className="text-[hsl(var(--muted-foreground))]"> logged a </span>
                      {act.activity_type}
                    </p>
                    {act.notes && (
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))] italic">"{act.notes}"</p>
                    )}
                    <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      {new Date(act.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-6 py-5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium mt-1.5 capitalize">{value}</dd>
    </div>
  )
}
