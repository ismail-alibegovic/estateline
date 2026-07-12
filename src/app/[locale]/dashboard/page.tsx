'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createBrowserClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import {
  Building2, Users, TrendingUp, UserCheck,
  Plus, ArrowRight, Clock, CheckSquare, Phone, FileText
} from 'lucide-react'
import Link from 'next/link'

interface Counts {
  properties: number
  leads: number
  active_deals: number
  team_members: number
}

interface ActivityItem {
  id: string
  type: string
  description: string
  created_at: string
  users?: { full_name: string | null }
}

export default function DashboardHome() {
  const t = useTranslations('dashboard')
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [org, setOrg] = useState<any>(null)
  const [counts, setCounts] = useState<Counts>({ properties: 0, leads: 0, active_deals: 0, team_members: 1 })
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setLoading(false); return }

      const { data: u } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('auth_id', authUser.id)
        .single()

      if (u) {
        setUser(u)
        const { data: member } = await supabase
          .from('organization_members')
          .select('organizations(id, name, subscription_tier, currency_default, locale_default)')
          .eq('user_id', (u as any).id)
          .eq('is_primary', true)
          .single()
        const orgData = (member as any)?.organizations
        if (orgData) {
          setOrg(orgData)
          const [{ count: pc }, { count: lc }, { count: dc }, { count: mc }, { data: act }] = await Promise.all([
            supabase.from('properties').select('*', { count: 'exact', head: true }).eq('organization_id', orgData.id),
            supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', orgData.id),
            supabase.from('deals').select('*', { count: 'exact', head: true }).eq('organization_id', orgData.id).in('stage', ['qualified', 'proposal', 'negotiation']),
            supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', orgData.id),
            supabase.from('activity_log').select('id, type, description, created_at, users(full_name)').eq('organization_id', orgData.id).order('created_at', { ascending: false }).limit(6)
          ])
          setCounts({ properties: pc || 0, leads: lc || 0, active_deals: dc || 0, team_members: mc || 1 })
          if (act) setActivities(act as ActivityItem[])
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full" />
          <p className="text-sm text-muted-foreground">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  const statsCards = [
    {
      label: t('properties'),
      value: counts.properties,
      hint: 'Listings live',
      icon: Building2,
      color: 'text-blue-500 bg-blue-50',
      href: `/${locale}/dashboard/properties`,
    },
    {
      label: t('leads'),
      value: counts.leads,
      hint: 'Across all stages',
      icon: Users,
      color: 'text-violet-500 bg-violet-50',
      href: `/${locale}/dashboard/leads`,
    },
    {
      label: t('activeDeals'),
      value: counts.active_deals,
      hint: 'Qualified → Negotiation',
      icon: TrendingUp,
      color: 'text-emerald-500 bg-emerald-50',
      href: `/${locale}/dashboard/pipeline`,
    },
    {
      label: t('teamMembers'),
      value: counts.team_members,
      hint: 'In this organization',
      icon: UserCheck,
      color: 'text-amber-500 bg-amber-50',
      href: `/${locale}/dashboard/settings/billing`,
    },
  ]

  const quickActions = [
    { label: 'Add Property', icon: Building2, href: `/${locale}/dashboard/properties/new`, color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' },
    { label: 'Add Lead', icon: Users, href: `/${locale}/dashboard/leads`, color: 'bg-violet-500/10 text-violet-600 hover:bg-violet-500/20' },
    { label: 'Log Communication', icon: Phone, href: `/${locale}/dashboard/communications`, color: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' },
    { label: 'Create Task', icon: CheckSquare, href: `/${locale}/dashboard/tasks`, color: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20' },
  ]

  const typeIcon: Record<string, string> = {
    property: '🏠', lead: '👤', contact: '📋', viewing: '📅',
    deal: '💼', call: '📞', meeting: '🤝', email: '✉️',
  }

  return (
    <div className="max-w-5xl space-y-10">
      {/* Header */}
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Overview</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">
          {t('welcome')}{user?.full_name ? `, ${user.full_name}` : ''}.
        </h1>
        {org && (
          <p className="mt-2 text-muted-foreground">
            {org.name}
            <span className="mx-2 text-foreground/20">·</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary capitalize">
              {org.subscription_tier}
            </span>
          </p>
        )}
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <Icon size={18} />
                </div>
                <ArrowRight size={14} className="text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <p className="font-display text-3xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">{card.label}</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">{card.hint}</p>
            </Link>
          )
        })}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="font-display text-lg font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.label}
                href={action.href}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl font-medium text-sm transition-all border border-transparent hover:border-border ${action.color}`}
              >
                <Icon size={20} />
                {action.label}
              </Link>
            )
          })}
        </div>
      </section>

      {/* Organization Details */}
      {org && (
        <section>
          <h2 className="font-display text-lg font-bold mb-4">Organization</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border">
              {[
                { label: 'Name', value: org.name },
                { label: 'Plan', value: org.subscription_tier },
                { label: 'Currency', value: org.currency_default },
                { label: 'Locale', value: org.locale_default },
              ].map(f => (
                <div key={f.label} className="px-5 py-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{f.label}</p>
                  <p className="font-semibold mt-1.5 capitalize text-foreground">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent Activity */}
      {activities.length > 0 && (
        <section className="pb-10">
          <h2 className="font-display text-lg font-bold mb-4">Recent Activity</h2>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {activities.map((act) => (
              <div key={act.id} className="flex gap-3 px-5 py-4 items-start hover:bg-muted/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0 mt-0.5">
                  {typeIcon[act.type] || '📌'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{act.users?.full_name || 'System'}</span>
                    <span className="text-muted-foreground"> — </span>
                    {act.description}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(act.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state when no activity */}
      {activities.length === 0 && (
        <section className="pb-10">
          <h2 className="font-display text-lg font-bold mb-4">Recent Activity</h2>
          <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center">
            <FileText size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm font-medium">No activity yet. Start by adding a property or lead.</p>
          </div>
        </section>
      )}
    </div>
  )
}
