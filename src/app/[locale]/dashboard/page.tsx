'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { createBrowserClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { useCurrency } from '@/components/CurrencyContext'
import {
  Building2, Users, TrendingUp, UserCheck,
  ArrowUpRight, Clock, CheckSquare, Phone,
  FileText, DollarSign, BarChart3, CheckCircle2,
  Sparkles, Activity
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

interface LeadStageStat { stage: string; count: number; percentage: number }
interface PropertyTypeStat { type: string; count: number; percentage: number }

// ─── Color palette for stat cards ───
const CARD_CONFIGS = [
  {
    key: 'properties',
    gradient: 'linear-gradient(135deg, #1a1f3a 0%, #2d3561 100%)',
    accentColor: '#7c8dff',
    lightBg: 'rgba(124,141,255,0.12)',
  },
  {
    key: 'leads',
    gradient: 'linear-gradient(135deg, #1a2e1f 0%, #1f4a2c 100%)',
    accentColor: '#52c97f',
    lightBg: 'rgba(82,201,127,0.12)',
  },
  {
    key: 'active_deals',
    gradient: 'linear-gradient(135deg, #2e1a0e 0%, #4a2d13 100%)',
    accentColor: '#C9963B',
    lightBg: 'rgba(201,150,59,0.14)',
  },
  {
    key: 'team_members',
    gradient: 'linear-gradient(135deg, #1f1428 0%, #361f4a 100%)',
    accentColor: '#c47cff',
    lightBg: 'rgba(196,124,255,0.12)',
  },
]

export default function DashboardHome() {
  const t = useTranslations('dashboard')
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const [user, setUser] = useState<any>(null)
  const [org, setOrg] = useState<any>(null)
  const [counts, setCounts] = useState<Counts>({ properties: 0, leads: 0, active_deals: 0, team_members: 1 })
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [leadStats, setLeadStats] = useState<LeadStageStat[]>([])
  const [propStats, setPropStats] = useState<PropertyTypeStat[]>([])
  const [taskMetrics, setTaskMetrics] = useState({ completed: 0, total: 0, percentage: 0 })
  const [financials, setFinancials] = useState({ totalQuotes: 0, avgQuote: 0 })
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
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

        const [
          { count: pc }, { count: lc }, { count: dc }, { count: mc },
          actResp, rawLeads, rawProps, rawTasks, rawQuotes
        ] = await Promise.all([
          supabase.from('properties').select('*', { count: 'exact', head: true }).eq('organization_id', orgData.id),
          supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', orgData.id),
          supabase.from('deals').select('*', { count: 'exact', head: true }).eq('organization_id', orgData.id).in('stage', ['qualified', 'proposal', 'negotiation']),
          supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', orgData.id),
          supabase.from('activity_log').select('id, type, description, created_at, users(full_name)').eq('organization_id', orgData.id).order('created_at', { ascending: false }).limit(6),
          supabase.from('leads').select('stage').eq('organization_id', orgData.id),
          supabase.from('properties').select('type').eq('organization_id', orgData.id),
          supabase.from('tasks').select('status').eq('organization_id', orgData.id),
          supabase.from('quotes').select('amount').eq('organization_id', orgData.id),
        ])

        setCounts({ properties: pc || 0, leads: lc || 0, active_deals: dc || 0, team_members: mc || 1 })
        if (actResp.data) setActivities(actResp.data as ActivityItem[])

        if (rawLeads.data?.length) {
          const stageCounts: Record<string, number> = {}
          rawLeads.data.forEach((l: any) => { const s = l.stage || 'new'; stageCounts[s] = (stageCounts[s] || 0) + 1 })
          setLeadStats(Object.entries(stageCounts).map(([stage, count]) => ({ stage, count, percentage: Math.round((count / rawLeads.data!.length) * 100) })).sort((a, b) => b.count - a.count))
        }

        if (rawProps.data?.length) {
          const typeCounts: Record<string, number> = {}
          rawProps.data.forEach((p: any) => { const tp = p.type || 'apartment'; typeCounts[tp] = (typeCounts[tp] || 0) + 1 })
          setPropStats(Object.entries(typeCounts).map(([type, count]) => ({ type, count, percentage: Math.round((count / rawProps.data!.length) * 100) })).sort((a, b) => b.count - a.count))
        }

        if (rawTasks.data?.length) {
          const total = rawTasks.data.length
          const completed = rawTasks.data.filter((t: any) => t.status === 'completed').length
          setTaskMetrics({ completed, total, percentage: Math.round((completed / total) * 100) })
        }

        if (rawQuotes.data?.length) {
          const totalVal = rawQuotes.data.reduce((s: number, q: any) => s + (Number(q.amount) || 0), 0)
          setFinancials({ totalQuotes: totalVal, avgQuote: Math.round(totalVal / rawQuotes.data.length) })
        }
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Loading skeleton
  if (loading) {
    return (
      <div className="w-full h-full space-y-6 pb-8">
        <div className="skeleton h-9 w-64 rounded-xl" />
        <div className="skeleton h-4 w-36 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl p-5 space-y-4 skeleton h-28" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-52 rounded-2xl" />
          <div className="skeleton h-52 rounded-2xl" />
        </div>
      </div>
    )
  }

  const statsCards = [
    { label: t('properties'), value: counts.properties, hint: 'Active listings', icon: Building2, href: `/${locale}/dashboard/properties`, cfg: CARD_CONFIGS[0] },
    { label: t('leads'), value: counts.leads, hint: 'Across all stages', icon: Users, href: `/${locale}/dashboard/leads`, cfg: CARD_CONFIGS[1] },
    { label: t('activeDeals'), value: counts.active_deals, hint: 'In pipeline', icon: TrendingUp, href: `/${locale}/dashboard/pipeline`, cfg: CARD_CONFIGS[2] },
    { label: t('teamMembers'), value: counts.team_members, hint: 'Organisation', icon: UserCheck, href: `/${locale}/dashboard/settings/billing`, cfg: CARD_CONFIGS[3] },
  ]

  const quickActions = [
    { label: 'Add Property', icon: Building2, href: `/${locale}/dashboard/properties/new` },
    { label: 'Add Lead', icon: Users, href: `/${locale}/dashboard/leads` },
    { label: 'Log Call', icon: Phone, href: `/${locale}/dashboard/communications` },
    { label: 'Create Task', icon: CheckSquare, href: `/${locale}/dashboard/tasks` },
  ]

  const typeEmoji: Record<string, string> = {
    property: '🏛', lead: '👤', contact: '📋', viewing: '📅',
    deal: '💼', call: '📞', meeting: '🤝', email: '✉️',
    quote: '📄', invoice: '🧾',
  }

  const radius = 34
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (taskMetrics.percentage / 100) * circumference

  // Stage colors
  const stageColors = ['#C9963B', '#7c8dff', '#52c97f', '#c47cff', '#ff8c6b', '#52c9c9']

  return (
    <div className="w-full space-y-6 pb-10">

      {/* ─── Page Header ─── */}
      <header className="flex items-start justify-between">
        <div>
          <p className="page-eyebrow mb-2">Overview</p>
          <h1
            className="leading-none"
            style={{
              fontFamily: 'var(--font-display), Georgia, serif',
              fontSize: 'clamp(2rem, 3vw, 2.75rem)',
              fontWeight: 600,
              color: '#171c26',
              letterSpacing: '-0.025em',
            }}
          >
            {t('welcome')}{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}.
          </h1>
          {org && (
            <div className="flex items-center gap-3 mt-3">
              <p className="text-sm font-medium" style={{ color: 'rgba(23,28,38,0.5)' }}>{org.name}</p>
              <span
                className="badge badge-gold"
                style={{ textTransform: 'capitalize' }}
              >
                {org.subscription_tier}
              </span>
            </div>
          )}
        </div>

        {/* Date / greeting badge */}
        <div
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl"
          style={{
            background: 'white',
            border: '1px solid rgba(201,150,59,0.18)',
            boxShadow: '0 2px 12px rgba(201,150,59,0.06)',
          }}
        >
          <Sparkles size={13} style={{ color: '#C9963B' }} />
          <p className="text-xs font-semibold" style={{ color: '#C9963B' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </header>

      {/* ─── KPI Stat Cards ─── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group block rounded-2xl overflow-hidden"
              style={{
                background: card.cfg.gradient,
                boxShadow: `0 4px 24px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.06) inset`,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = `0 8px 36px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.06) inset`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = `0 4px 24px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.06) inset`
              }}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: card.cfg.lightBg }}
                  >
                    <Icon size={16} style={{ color: card.cfg.accentColor }} />
                  </div>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: card.cfg.lightBg }}
                  >
                    <ArrowUpRight size={12} style={{ color: card.cfg.accentColor }} />
                  </div>
                </div>

                <p
                  className="leading-none mb-1"
                  style={{
                    fontFamily: 'var(--font-display), Georgia, serif',
                    fontSize: 36,
                    fontWeight: 600,
                    color: '#f5f0e8',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {card.value}
                </p>
                <p className="text-[12px] font-semibold" style={{ color: 'rgba(245,240,232,0.7)' }}>
                  {card.label}
                </p>
                <p className="text-[10px] mt-0.5 font-medium" style={{ color: card.cfg.accentColor, opacity: 0.8 }}>
                  {card.hint}
                </p>
              </div>

              {/* bottom accent bar */}
              <div
                className="h-[3px] w-full"
                style={{ background: `linear-gradient(90deg, ${card.cfg.accentColor}60, ${card.cfg.accentColor})` }}
              />
            </Link>
          )
        })}
      </section>

      {/* ─── Analytics Row ─── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Leads Pipeline */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'white',
            border: '1px solid hsl(38 16% 90%)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,150,59,0.1)' }}>
              <BarChart3 size={14} style={{ color: '#C9963B' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#171c26', fontFamily: 'var(--font-body), sans-serif' }}>
                Leads Pipeline
              </h3>
              <p className="text-[10px] font-medium" style={{ color: 'rgba(23,28,38,0.4)' }}>Stage distribution</p>
            </div>
          </div>

          {leadStats.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs font-medium" style={{ color: 'rgba(23,28,38,0.35)' }}>No leads data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leadStats.map((stat, i) => (
                <div key={stat.stage}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[12px] font-semibold capitalize" style={{ color: '#171c26' }}>{stat.stage}</span>
                    <span className="text-[11px] font-medium" style={{ color: 'rgba(23,28,38,0.45)' }}>{stat.count} · {stat.percentage}%</span>
                  </div>
                  <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(23,28,38,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${stat.percentage}%`,
                        background: stageColors[i % stageColors.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Property Types */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'white',
            border: '1px solid hsl(38 16% 90%)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(82,201,127,0.1)' }}>
              <Building2 size={14} style={{ color: '#52c97f' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#171c26', fontFamily: 'var(--font-body), sans-serif' }}>
                Inventory Breakdown
              </h3>
              <p className="text-[10px] font-medium" style={{ color: 'rgba(23,28,38,0.4)' }}>By property category</p>
            </div>
          </div>

          {propStats.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs font-medium" style={{ color: 'rgba(23,28,38,0.35)' }}>No listings yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {propStats.map((stat, i) => (
                <div key={stat.type} className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: stageColors[i % stageColors.length] }}
                  />
                  <div className="w-20 text-[12px] font-semibold capitalize truncate" style={{ color: '#171c26' }}>
                    {stat.type}
                  </div>
                  <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(23,28,38,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${stat.percentage}%`,
                        background: stageColors[i % stageColors.length],
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-bold w-6 text-right" style={{ color: 'rgba(23,28,38,0.5)' }}>
                    {stat.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Metrics Row ─── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Task Ratio */}
        <div
          className="rounded-2xl p-5 flex items-center gap-5"
          style={{
            background: 'white',
            border: '1px solid hsl(38 16% 90%)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}
        >
          {/* Circular progress */}
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="6" stroke="rgba(23,28,38,0.06)" />
              <circle
                cx="40" cy="40" r={radius}
                fill="none" strokeWidth="6"
                stroke="#C9963B"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center text-xs font-bold"
              style={{ color: '#171c26', fontFamily: 'var(--font-body), sans-serif' }}
            >
              {taskMetrics.percentage}%
            </span>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#C9963B' }}>Tasks</p>
            <p
              className="text-2xl font-semibold leading-none"
              style={{ fontFamily: 'var(--font-display), serif', color: '#171c26' }}
            >
              {taskMetrics.completed}
              <span className="text-base font-normal ml-1" style={{ color: 'rgba(23,28,38,0.35)' }}>
                / {taskMetrics.total}
              </span>
            </p>
            <p className="text-[11px] mt-1 font-medium" style={{ color: 'rgba(23,28,38,0.45)' }}>
              Completed this period
            </p>
          </div>
        </div>

        {/* Financials */}
        <div
          className="rounded-2xl p-5 col-span-2"
          style={{
            background: 'white',
            border: '1px solid hsl(38 16% 90%)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}
        >
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(82,201,127,0.1)' }}>
                  <DollarSign size={12} style={{ color: '#52c97f' }} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(23,28,38,0.4)' }}>
                  Pipeline Value
                </p>
              </div>
              <p
                className="leading-none"
                style={{
                  fontFamily: 'var(--font-display), serif',
                  fontSize: 26,
                  fontWeight: 600,
                  color: '#171c26',
                  letterSpacing: '-0.02em',
                }}
              >
                {formatPrice(financials.totalQuotes)}
              </p>
              <p className="text-[11px] font-medium" style={{ color: 'rgba(23,28,38,0.4)' }}>
                Total active deal size
              </p>
            </div>

            <div className="space-y-1 border-l pl-4" style={{ borderColor: 'hsl(38 16% 90%)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,141,255,0.1)' }}>
                  <CheckCircle2 size={12} style={{ color: '#7c8dff' }} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(23,28,38,0.4)' }}>
                  Avg. Deal
                </p>
              </div>
              <p
                className="leading-none"
                style={{
                  fontFamily: 'var(--font-display), serif',
                  fontSize: 26,
                  fontWeight: 600,
                  color: '#171c26',
                  letterSpacing: '-0.02em',
                }}
              >
                {formatPrice(financials.avgQuote)}
              </p>
              <p className="text-[11px] font-medium" style={{ color: 'rgba(23,28,38,0.4)' }}>
                Average per transaction
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Quick Actions ─── */}
      <section>
        <h2
          className="text-base font-bold mb-3"
          style={{
            fontFamily: 'var(--font-body), sans-serif',
            color: '#171c26',
            letterSpacing: '-0.01em',
          }}
        >
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.label}
                href={action.href}
                className="group flex flex-col items-center gap-3 p-5 rounded-2xl transition-all"
                style={{
                  background: 'white',
                  border: '1px solid hsl(38 16% 90%)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.border = '1px solid rgba(201,150,59,0.35)'
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(201,150,59,0.1), 0 2px 8px rgba(0,0,0,0.04)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.border = '1px solid hsl(38 16% 90%)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    background: 'rgba(201,150,59,0.08)',
                    border: '1px solid rgba(201,150,59,0.16)',
                  }}
                >
                  <Icon size={16} style={{ color: '#C9963B' }} />
                </div>
                <span className="text-[12px] font-semibold text-center" style={{ color: 'rgba(23,28,38,0.65)' }}>
                  {action.label}
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ─── Recent Activity ─── */}
      <section>
        <div className="flex items-center gap-2.5 mb-3">
          <Activity size={15} style={{ color: '#C9963B' }} />
          <h2
            className="text-base font-bold"
            style={{ fontFamily: 'var(--font-body), sans-serif', color: '#171c26', letterSpacing: '-0.01em' }}
          >
            Recent Activity
          </h2>
        </div>

        {activities.length > 0 ? (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'white',
              border: '1px solid hsl(38 16% 90%)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            }}
          >
            {activities.map((act, i) => (
              <div
                key={act.id}
                className="flex gap-4 px-5 py-3.5 items-start transition-colors"
                style={{
                  borderBottom: i < activities.length - 1 ? '1px solid hsl(38 16% 93%)' : 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'hsl(38 20% 97%)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
                  style={{ background: 'rgba(201,150,59,0.08)', border: '1px solid rgba(201,150,59,0.14)' }}
                >
                  {typeEmoji[act.type] || '📌'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px]" style={{ color: '#171c26' }}>
                    <span className="font-semibold">{act.users?.full_name || 'System'}</span>
                    <span style={{ color: 'rgba(23,28,38,0.45)' }}> — </span>
                    <span style={{ color: 'rgba(23,28,38,0.7)' }}>{act.description}</span>
                  </p>
                  <p className="text-[11px] mt-0.5 flex items-center gap-1 font-medium" style={{ color: 'rgba(23,28,38,0.38)' }}>
                    <Clock size={10} />
                    {new Date(act.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl p-12 text-center"
            style={{
              background: 'white',
              border: '1px dashed rgba(201,150,59,0.2)',
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'rgba(201,150,59,0.06)', border: '1px solid rgba(201,150,59,0.14)' }}
            >
              <FileText size={20} style={{ color: 'rgba(201,150,59,0.4)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'rgba(23,28,38,0.4)' }}>
              No activity yet. Start by adding a property or lead.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
