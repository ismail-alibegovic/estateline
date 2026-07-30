'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCurrency } from '@/components/CurrencyContext'
import SearchSpotlight from '@/components/SearchSpotlight'
import {
  LayoutGrid,
  Users,
  Briefcase,
  Building2,
  CalendarDays,
  Settings,
  LogOut,
  BarChart3,
  Bell,
  ChevronDown,
} from 'lucide-react'

interface Session {
  user: { id: string; full_name: string | null; email: string } | null
  org: { id: string; name: string; slug: string; subscription_tier: string } | null
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>({ user: null, org: null })
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) || 'en'
  const t = useTranslations('nav')
  const { currency, setCurrency } = useCurrency()

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return
    const pathParts = pathname.split('/')
    pathParts[1] = newLocale
    router.push(pathParts.join('/'))
  }

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.replace(`/${locale}/login`)
        return
      }

      const { data: u } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('auth_id', authUser.id)
        .single()

      if (!u) {
        await supabase.auth.signOut()
        router.replace(`/${locale}/login`)
        return
      }
      
      const user = u as Session['user']
      setSession((s) => ({ ...s, user }))

      const { data: member } = await supabase
        .from('organization_members')
        .select('organizations(id, name, slug, subscription_tier)')
        .eq('user_id', (u as any).id)
        .eq('is_primary', true)
        .single()
      const org = (member as any)?.organizations
      if (org) setSession((s) => ({ ...s, org }))
    }
    load()
  }, [locale, router])

  const toRelative = (href: string) => href.replace(`/${locale}`, '')
  const isActive = (href: string) => {
    const rel = toRelative(href)
    return rel === '/dashboard' ? pathname.endsWith('/dashboard') : pathname.includes(rel)
  }

  const NAV = [
    { href: `/${locale}/dashboard`, label: t('overview') || 'Dashboard', icon: <LayoutGrid size={18} /> },
    { href: `/${locale}/dashboard/pipeline`, label: t('pipeline') || 'Pipeline', icon: <Briefcase size={18} /> },
    { href: `/${locale}/dashboard/leads`, label: t('leads') || 'Leads', icon: <Users size={18} /> },
    { href: `/${locale}/dashboard/properties`, label: t('properties') || 'Properties', icon: <Building2 size={18} /> },
    { href: `/${locale}/dashboard/calendar`, label: t('calendar') || 'Calendar', icon: <CalendarDays size={18} /> },
    { href: `/${locale}/dashboard/reports`, label: t('reports') || 'Reports', icon: <BarChart3 size={18} /> },
    { href: `/${locale}/dashboard/settings/profile`, label: t('settings') || 'Settings', icon: <Settings size={18} /> },
  ]

  const initials = session.user?.full_name
    ? session.user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : session.user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-50">
      {/* ═══════════════════════════════════════════════════════════
          SIDEBAR — Light Cream/Beige
      ═══════════════════════════════════════════════════════════ */}
      <aside
        className="flex flex-col h-full shrink-0 overflow-hidden"
        style={{
          width: 240,
          background: '#F5F1EB',
          borderRight: '1px solid rgba(0,0,0,0.05)',
        }}
      >
        {/* ─── Logo ─── */}
        <div
          className="flex items-center shrink-0"
          style={{
            height: 64,
            padding: '0 20px',
          }}
        >
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
            {/* Logo mark: gold gradient square */}
            <div
              className="shrink-0 flex items-center justify-center rounded-[8px]"
              style={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, #C9963B 0%, #f0c068 55%, #9a6c1a 100%)',
                boxShadow: '0 2px 8px rgba(201,150,59,0.25)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div className="min-w-0 overflow-hidden">
              <p
                className="truncate leading-none"
                style={{
                  fontFamily: 'var(--font-display), Georgia, serif',
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#1F2937',
                  letterSpacing: '-0.01em',
                }}
              >
                Estateline
              </p>
            </div>
          </Link>
        </div>

        {/* ─── Navigation ─── */}
        <nav className="flex-1 overflow-y-auto py-4 px-4 flex flex-col gap-1.5">
          {NAV.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-[13.5px]"
                style={{
                  color: active ? '#FFFFFF' : '#6B7280',
                  background: active ? '#C9963B' : 'transparent',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.color = '#374151'
                    e.currentTarget.style.background = 'rgba(0,0,0,0.03)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.color = '#6B7280'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <span className="sidebar-icon shrink-0" style={{ opacity: active ? 1 : 0.75 }}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* ─── Bottom Actions ─── */}
        <div className="shrink-0 p-4 flex flex-col gap-4" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          {/* Toggles */}
          <div className="flex gap-2">
            {/* Language */}
            <div className="flex-1">
              <div className="flex rounded-md overflow-hidden bg-white/60 border border-gray-200">
                {(['en', 'bs'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className="flex-1 py-1.5 text-[10px] font-bold uppercase transition-all"
                    style={{
                      background: locale === lang ? '#C9963B' : 'transparent',
                      color: locale === lang ? '#FFFFFF' : '#6B7280',
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency */}
            <div className="flex-1">
              <div className="flex rounded-md overflow-hidden bg-white/60 border border-gray-200">
                {(['BAM', 'EUR'] as const).map(cur => (
                  <button
                    key={cur}
                    onClick={() => setCurrency(cur as any)}
                    className="flex-1 py-1.5 text-[10px] font-bold uppercase transition-all"
                    style={{
                      background: currency === cur ? '#C9963B' : 'transparent',
                      color: currency === cur ? '#FFFFFF' : '#6B7280',
                    }}
                  >
                    {cur === 'BAM' ? 'KM' : '€'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Logout */}
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-[13.5px] text-[#EF4444] hover:bg-red-50/50"
            >
              <LogOut size={18} />
              <span>Log Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════════════════════ */}
      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <div
          className="h-[64px] flex items-center px-6 shrink-0 gap-4"
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          {/* Search */}
          <div className="flex-1 flex items-center">
            <SearchSpotlight />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-5">
            {/* Add New Lead button */}
            <button
              className="px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm"
              style={{
                background: '#C9963B',
                color: '#FFFFFF',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#b88631')}
              onMouseLeave={e => (e.currentTarget.style.background = '#C9963B')}
            >
              Add New Lead
            </button>

            {/* Notification Bell */}
            <button className="text-gray-400 hover:text-gray-600 transition-colors relative">
              <Bell size={20} />
              {/* Optional notification dot */}
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-3 cursor-pointer pl-5 border-l border-gray-100">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #F3E8D6, #E8D3B1)',
                  color: '#9A6C1A',
                  fontFamily: 'var(--font-body), sans-serif',
                }}
              >
                {initials}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">
                {session.user?.full_name || session.user?.email || 'User'}
              </span>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 px-8 lg:px-10 py-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
