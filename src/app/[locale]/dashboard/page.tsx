'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { createBrowserClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { useCurrency } from '@/components/CurrencyContext'
import {
  Users, ArrowUpRight, DollarSign, BarChart3,
  ArrowRight, MessageCircle, Briefcase, CheckCircle
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
  users?: { full_name: string | null } | { full_name: string | null }[] | null
}

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
  
  const [leadCounts, setLeadCounts] = useState({ new: 0, contacted: 0, negotiation: 0, converted: 0 })
  const [recentLeads, setRecentLeads] = useState<any[]>([])
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
          actResp, rawLeads, rawQuotes, recentLeadsResp
        ] = await Promise.all([
          supabase.from('properties').select('*', { count: 'exact', head: true }).eq('organization_id', orgData.id),
          supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', orgData.id),
          supabase.from('deals').select('*', { count: 'exact', head: true }).eq('organization_id', orgData.id).in('stage', ['qualified', 'proposal', 'negotiation']),
          supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', orgData.id),
          supabase.from('activity_log').select('id, type, description, created_at, users(full_name)').eq('organization_id', orgData.id).order('created_at', { ascending: false }).limit(6),
          supabase.from('leads').select('stage').eq('organization_id', orgData.id),
          supabase.from('quotes').select('amount').eq('organization_id', orgData.id),
          supabase.from('leads').select('id, first_name, last_name, stage, budget, updated_at, created_at, properties(title)').eq('organization_id', orgData.id).order('created_at', { ascending: false }).limit(5),
        ])

        setCounts({ properties: pc || 0, leads: lc || 0, active_deals: dc || 0, team_members: mc || 1 })
        if (actResp.data) setActivities(actResp.data as ActivityItem[])

        if (rawLeads.data?.length) {
          const lCounts = { new: 0, contacted: 0, negotiation: 0, converted: 0 }
          rawLeads.data.forEach((l: any) => { 
            const s = l.stage || 'new'
            if (s === 'new') lCounts.new++
            else if (s === 'contacted') lCounts.contacted++
            else if (s === 'negotiation' || s === 'qualified' || s === 'proposal') lCounts.negotiation++
            else if (s === 'converted') lCounts.converted++
          })
          setLeadCounts(lCounts)
        }

        if (recentLeadsResp.data) {
          setRecentLeads(recentLeadsResp.data)
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

  if (loading) {
    return (
      <div className="w-full h-full space-y-6 pb-8">
        <div className="skeleton h-9 w-64 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl p-5 space-y-4 skeleton h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeleton h-[300px] rounded-2xl" />
          <div className="skeleton h-[300px] rounded-2xl" />
        </div>
      </div>
    )
  }

  // Activity Colors
  const avatarColors = [
    { bg: '#fef3c7', text: '#d97706' }, // Gold
    { bg: '#dcfce7', text: '#15803d' }, // Green
    { bg: '#dbeafe', text: '#1d4ed8' }, // Blue
    { bg: '#f3e8ff', text: '#7e22ce' }, // Purple
  ]

  return (
    <div className="w-full space-y-8 pb-10">
      {/* ─── Page Header ─── */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>
        {/* Add New Lead button removed as per instructions, it's in top layout */}
      </header>

      {/* ─── 5 Stat Cards ─── */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Revenue */}
        <div className="stat-card bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div className="stat-card-icon w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <DollarSign size={20} className="text-[#C9963B]" />
            </div>
            <div className="stat-card-trend flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-md text-xs font-medium">
              <ArrowUpRight size={14} className="mr-1" />
              +12%
            </div>
          </div>
          <div>
            <p className="stat-card-value text-2xl font-bold text-gray-900">{formatPrice(financials.totalQuotes)}</p>
            <p className="stat-card-label text-sm text-gray-500 font-medium">Total Revenue</p>
          </div>
        </div>

        {/* Card 2: New Leads */}
        <div className="stat-card bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div className="stat-card-icon w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <Users size={20} className="text-[#C9963B]" />
            </div>
            <div className="stat-card-trend flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-md text-xs font-medium">
              <ArrowUpRight size={14} className="mr-1" />
              +5%
            </div>
          </div>
          <div>
            <p className="stat-card-value text-2xl font-bold text-gray-900">{leadCounts.new}</p>
            <p className="stat-card-label text-sm text-gray-500 font-medium">New Leads</p>
          </div>
        </div>

        {/* Card 3: Contacted */}
        <div className="stat-card bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div className="stat-card-icon w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <MessageCircle size={20} className="text-[#C9963B]" />
            </div>
            <div className="stat-card-trend flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-md text-xs font-medium">
              <ArrowUpRight size={14} className="mr-1" />
              +8%
            </div>
          </div>
          <div>
            <p className="stat-card-value text-2xl font-bold text-gray-900">{leadCounts.contacted}</p>
            <p className="stat-card-label text-sm text-gray-500 font-medium">Contacted</p>
          </div>
        </div>

        {/* Card 4: Negotiation */}
        <div className="stat-card bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div className="stat-card-icon w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <Briefcase size={20} className="text-[#C9963B]" />
            </div>
            <div className="stat-card-trend flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-md text-xs font-medium">
              <ArrowUpRight size={14} className="mr-1" />
              +15%
            </div>
          </div>
          <div>
            <p className="stat-card-value text-2xl font-bold text-gray-900">{leadCounts.negotiation}</p>
            <p className="stat-card-label text-sm text-gray-500 font-medium">Negotiation</p>
          </div>
        </div>

        {/* Card 5: Closed Deals */}
        <div className="stat-card bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div className="stat-card-icon w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <CheckCircle size={20} className="text-[#C9963B]" />
            </div>
            <div className="stat-card-trend flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-md text-xs font-medium">
              <ArrowUpRight size={14} className="mr-1" />
              +22%
            </div>
          </div>
          <div>
            <p className="stat-card-value text-2xl font-bold text-gray-900">{leadCounts.converted}</p>
            <p className="stat-card-label text-sm text-gray-500 font-medium">Closed Deals</p>
          </div>
        </div>
      </section>

      {/* ─── Two Column Section ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Performance Analytics */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Performance Analytics</h2>
            <div className="flex items-center gap-4 text-sm font-medium">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#C9963B]" /> Revenue</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-gray-200" /> Leads</div>
            </div>
          </div>
          <div className="w-full h-64 relative">
            {/* Tooltip mockup */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-3 rounded shadow-lg pointer-events-none opacity-90 z-10">
              <div className="font-bold">$12,700.00</div>
              <div className="text-gray-300">Target: 15M</div>
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
            </div>
            <svg width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="none">
              {/* Grid Lines */}
              {[0, 1, 2, 3, 4].map(i => (
                <line key={i} x1="30" y1={i * 40} x2="600" y2={i * 40} stroke="#f3f4f6" strokeWidth="1" />
              ))}
              {/* Y-Axis Labels */}
              {['100%', '75%', '50%', '25%', '0%'].map((lbl, i) => (
                <text key={i} x="25" y={i * 40 + 4} fontSize="10" fill="#9ca3af" textAnchor="end">{lbl}</text>
              ))}
              {/* X-Axis Labels */}
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => (
                <text key={i} x={45 + i * (550 / 11)} y="195" fontSize="10" fill="#9ca3af" textAnchor="middle">{month}</text>
              ))}
              {/* Leads Line (Gray) */}
              <path d="M45 160 L95 140 L145 150 L195 110 L245 120 L295 90 L345 100 L395 70 L445 110 L495 60 L545 40 L595 50" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              {/* Revenue Line (Amber) */}
              <path d="M45 180 L95 170 L145 140 L195 130 L245 150 L295 110 L345 90 L395 60 L445 80 L495 30 L545 20 L595 10" fill="none" stroke="#C9963B" strokeWidth="3" />
              {/* Active Point */}
              <circle cx="295" cy="110" r="4" fill="#C9963B" stroke="white" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Right: Important News */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col h-full">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Important News</h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {activities.length > 0 ? activities.map((act, i) => {
              const color = avatarColors[i % avatarColors.length]
              const userObj = Array.isArray(act.users) ? act.users[0] : act.users
              const name = userObj?.full_name || 'System'
              const initials = name.substring(0, 2).toUpperCase()
              return (
                <div key={act.id} className="flex gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{name}</p>
                    <p className="text-sm text-gray-500 line-clamp-1">{act.description}</p>
                  </div>
                  <div className="text-xs text-gray-400 font-medium whitespace-nowrap">
                    {new Date(act.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                  </div>
                </div>
              )
            }) : (
              <div className="text-sm text-gray-400 text-center py-4">No recent news</div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Recent Leads Section ─── */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Recent Leads</h2>
          <Link href={`/${locale}/dashboard/leads`} className="text-sm font-medium text-[#C9963B] hover:text-[#b0802c] flex items-center">
            View all <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 font-medium">
                <th className="px-6 py-4 font-medium">Lead Name</th>
                <th className="px-6 py-4 font-medium">Property</th>
                <th className="px-6 py-4 font-medium">Stage</th>
                <th className="px-6 py-4 font-medium">Value</th>
                <th className="px-6 py-4 font-medium">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentLeads.length > 0 ? recentLeads.map((lead) => {
                const propertyTitle = Array.isArray(lead.properties) ? lead.properties[0]?.title : lead.properties?.title;
                return (
                  <tr key={lead.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">{lead.first_name} {lead.last_name}</td>
                    <td className="px-6 py-4 text-gray-500">{propertyTitle || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`badge-stage-${lead.stage || 'new'} inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold capitalize`}>
                        {lead.stage || 'New'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{lead.budget ? formatPrice(lead.budget) : '-'}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(lead.updated_at || lead.created_at).toLocaleDateString()}</td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No recent leads found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
