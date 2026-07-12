'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutGrid,
  Users,
  Phone,
  Briefcase,
  Building2,
  CalendarDays,
  Settings,
  LogOut,
} from 'lucide-react'

interface Session {
  user: { id: string; full_name: string | null; email: string } | null
  org: { id: string; name: string; slug: string; subscription_tier: string } | null
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>({ user: null, org: null })
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const t = useTranslations('nav')
  const tc = useTranslations('common')

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: u } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('auth_id', authUser.id)
        .single()

      if (!u) return
      const user = u as Session['user']
      setSession((s) => ({ ...s, user }))

      const { data: member } = await supabase
        .from('organization_members')
        .select('organizations(id, name, slug, subscription_tier)')
        .eq('user_id', u.id)
        .eq('is_primary', true)
        .single()
      const org = (member as any)?.organizations
      if (org) setSession((s) => ({ ...s, org }))
    }
    load()
  }, [])

  const toRelative = (href: string) => href.replace(`/${locale}`, '')
  const isActive = (href: string) => {
    const rel = toRelative(href)
    return rel === '/dashboard' ? pathname.endsWith('/dashboard') : pathname.includes(rel)
  }

  const NAV = [
    {
      group: 'Workspace',
      items: [{ href: `/${locale}/dashboard`, label: t('overview'), icon: <LayoutGrid size={16} /> }],
    },
    {
      group: 'CRM',
      items: [
        { href: `/${locale}/dashboard/leads`, label: t('leads'), icon: <Users size={16} /> },
        { href: `/${locale}/dashboard/contacts`, label: t('contacts'), icon: <Phone size={16} /> },
        { href: `/${locale}/dashboard/pipeline`, label: t('pipeline'), icon: <Briefcase size={16} /> },
      ],
    },
    {
      group: 'Inventory',
      items: [
        { href: `/${locale}/dashboard/properties`, label: t('properties'), icon: <Building2 size={16} /> },
        { href: `/${locale}/dashboard/viewings`, label: t('viewings'), icon: <CalendarDays size={16} /> },
      ],
    },
    {
      group: 'Settings',
      items: [
        { href: `/${locale}/dashboard/settings/billing`, label: t('billing'), icon: <Settings size={16} /> },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex">
      {/* Sidebar — RealEstateCRM: white, 248px, indigo active */}
      <aside
        className={`flex flex-col bg-white border-r border-[#e8e8e8] transition-all duration-200 ${
          collapsed ? 'w-14' : 'w-[248px]'
        }`}
      >
        {/* Logo area */}
        <div className="flex items-center px-4 h-12 border-b border-[#e8e8e8]">
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-md bg-[#3520D5] flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="text-[15px] font-semibold text-[#302e4c] truncate">Estateline</span>
                <span className="block text-[11px] text-[#697077] -mt-0.5">Real Estate CRM</span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-[#697077] hover:text-[#302e4c] transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {NAV.map((section) => (
            <div key={section.group}>
              {!collapsed && (
                <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#697077]">
                  {section.group}
                </p>
              )}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 h-9 px-3 rounded-md text-[14px] font-medium transition-colors ${
                          active
                            ? 'bg-[#3520D5] text-white shadow-[0_4px_8px_rgba(53,32,213,.2)]'
                            : 'text-[#302e4c] hover:bg-[#ebeefc]'
                        }`}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-[#e8e8e8]">
          {collapsed ? (
            <div className="flex justify-center">
              <div className="w-7 h-7 rounded-full bg-[#ebeefc] flex items-center justify-center text-xs font-semibold text-[#3520D5]">
                {session.user?.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-[#ebeefc] flex items-center justify-center text-xs font-semibold text-[#3520D5] shrink-0">
                  {session.user?.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[#302e4c] truncate">{session.user?.full_name || session.user?.email}</p>
                  <p className="text-[11px] text-[#697077] truncate">{session.org?.name}</p>
                </div>
              </div>
              <form action="/api/auth/signout" method="POST" className="px-2">
                <button type="submit" className="flex items-center gap-2 text-[13px] text-[#697077] hover:text-[#3520D5] transition-colors">
                  <LogOut size={14} />
                  <span>{tc('signOut')}</span>
                </button>
              </form>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="px-6 lg:px-10 py-8">{children}</div>
      </main>
    </div>
  )
}
