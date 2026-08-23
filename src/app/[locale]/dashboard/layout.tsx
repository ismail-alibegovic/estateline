'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
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
  Plus,
  FileText,
  MessageSquare,
  DollarSign,
  ClipboardList,
  Eye,
  Receipt,
  Upload,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

interface Session {
  user: { id: string; full_name: string | null; email: string } | null
  org: { id: string; name: string; slug: string; subscription_tier: string } | null
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>({ user: null, org: null })
  const [orgId, setOrgId] = useState<string | null>(null)
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) || 'en'
  const t = useTranslations('nav')
  const tDash = useTranslations('dashboard')
  const tCommon = useTranslations('common')
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
      if (org) {
        setSession((s) => ({ ...s, org }))
        setOrgId(org.id)
      }
    }
    load()
  }, [locale, router])

  const toRelative = (href: string) => href.replace(`/${locale}`, '')
  const isActive = (href: string) => {
    const rel = toRelative(href)
    return rel === '/dashboard' ? pathname.endsWith('/dashboard') : pathname.includes(rel)
  }

  // Fully translated navigation groups
  const NAV_MAIN = [
    { href: `/${locale}/dashboard`, label: t('overview') || 'Overview', icon: <LayoutGrid size={18} /> },
    { href: `/${locale}/dashboard/pipeline`, label: t('pipeline') || 'Pipeline', icon: <Briefcase size={18} /> },
    { href: `/${locale}/dashboard/leads`, label: t('leads') || 'Leads', icon: <Users size={18} /> },
    { href: `/${locale}/dashboard/properties`, label: t('properties') || 'Properties', icon: <Building2 size={18} /> },
  ]

  const NAV_TOOLS = [
    { href: `/${locale}/dashboard/calendar`, label: t('calendar') || 'Calendar', icon: <CalendarDays size={18} /> },
    { href: `/${locale}/dashboard/tasks`, label: t('tasks') || 'Tasks', icon: <ClipboardList size={18} /> },
    { href: `/${locale}/dashboard/communications`, label: t('communications') || 'Messages', icon: <MessageSquare size={18} /> },
    { href: `/${locale}/dashboard/documents`, label: t('documents') || 'Documents', icon: <FileText size={18} /> },
    { href: `/${locale}/dashboard/import`, label: t('importData') || 'Import', icon: <Upload size={18} /> },
  ]

  const NAV_FINANCE = [
    { href: `/${locale}/dashboard/quotes`, label: t('quotes') || 'Quotes', icon: <Receipt size={18} /> },
    { href: `/${locale}/dashboard/invoices`, label: t('invoices') || 'Invoices', icon: <DollarSign size={18} /> },
    { href: `/${locale}/dashboard/financials`, label: t('billing') || 'Financials', icon: <BarChart3 size={18} /> },
    { href: `/${locale}/dashboard/viewings`, label: t('viewings') || 'Viewings', icon: <Eye size={18} /> },
    { href: `/${locale}/dashboard/reports`, label: t('reports') || 'Reports', icon: <BarChart3 size={18} /> },
  ]

  const initials = session.user?.full_name
    ? session.user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : session.user?.email?.[0]?.toUpperCase() || 'U'

  const renderNavItem = (item: { href: string; label: string; icon: React.ReactNode }) => {
    const active = isActive(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        className="sidebar-nav-item flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 font-medium text-[13px]"
        style={{
          color: active ? '#FFFFFF' : '#6B7280',
          background: active ? 'linear-gradient(135deg, #C9963B, #d4a248)' : 'transparent',
          boxShadow: active ? '0 2px 8px rgba(201,150,59,0.3)' : 'none',
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.color = '#374151'
            e.currentTarget.style.background = 'rgba(201,150,59,0.06)'
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.color = '#6B7280'
            e.currentTarget.style.background = 'transparent'
          }
        }}
      >
        <span className="sidebar-icon shrink-0" style={{ opacity: active ? 1 : 0.7 }}>
          {item.icon}
        </span>
        <span className="truncate">{item.label}</span>
      </Link>
    )
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-50">
      {/* ═══════════════════════════════════════════════════════════
          SIDEBAR — Clean Luxury Header + Grouped Navigation
      ═══════════════════════════════════════════════════════════ */}
      <aside
        className="flex flex-col h-full shrink-0 overflow-hidden"
        style={{
          width: 250,
          background: 'linear-gradient(180deg, #F5F1EB 0%, #F0EBE3 100%)',
          borderRight: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        {/* ─── Clean Logo Header ─── */}
        <div
          className="flex items-center shrink-0"
          style={{ height: 64, padding: '0 20px' }}
        >
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden group">
            <div className="shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logo-icon.png"
                alt="EstateLine"
                width={32}
                height={32}
                className="w-8 h-8 object-contain drop-shadow-[0_2px_6px_rgba(201,150,59,0.3)]"
                style={{ mixBlendMode: 'multiply' }}
              />
            </div>
            <div className="min-w-0 overflow-hidden">
              <span
                className="block truncate leading-none font-bold"
                style={{
                  fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif',
                  fontSize: 20,
                  color: '#1F2937',
                  letterSpacing: '-0.01em',
                }}
              >
                EstateLine
              </span>
              {session.org?.name && session.org.name.toLowerCase() !== 'estateline' && (
                <span className="block text-[10px] font-medium text-gray-400 truncate mt-0.5">{session.org.name}</span>
              )}
            </div>
          </Link>
        </div>

        {/* ─── Navigation ─── */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-0.5">
          {/* Main section */}
          <div className="section-label mb-2 mt-1">{t('main') || 'MAIN'}</div>
          {NAV_MAIN.map(renderNavItem)}

          {/* Tools section */}
          <div className="section-label mb-2 mt-5">{t('tools') || 'TOOLS'}</div>
          {NAV_TOOLS.map(renderNavItem)}

          {/* Finance section */}
          <div className="section-label mb-2 mt-5">{t('finance') || 'FINANCE & REPORTS'}</div>
          {NAV_FINANCE.map(renderNavItem)}

          {/* Settings */}
          <div className="mt-auto pt-2">
            {renderNavItem({
              href: `/${locale}/dashboard/settings`,
              label: t('settings') || 'Settings',
              icon: <Settings size={18} />
            })}
          </div>
        </nav>

        {/* ─── Bottom Actions ─── */}
        <div className="shrink-0 p-4 flex flex-col gap-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          {/* Toggles */}
          <div className="flex gap-2">
            {/* Language */}
            <div className="flex-1">
              <div className="flex rounded-lg overflow-hidden bg-white/70 border border-gray-200/60 shadow-sm">
                {(['en', 'bs'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className="flex-1 py-1.5 text-[10px] font-bold uppercase transition-all duration-200"
                    style={{
                      background: locale === lang ? 'linear-gradient(135deg, #C9963B, #d4a248)' : 'transparent',
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
              <div className="flex rounded-lg overflow-hidden bg-white/70 border border-gray-200/60 shadow-sm">
                {(['BAM', 'EUR'] as const).map(cur => (
                  <button
                    key={cur}
                    onClick={() => setCurrency(cur as any)}
                    className="flex-1 py-1.5 text-[10px] font-bold uppercase transition-all duration-200"
                    style={{
                      background: currency === cur ? 'linear-gradient(135deg, #C9963B, #d4a248)' : 'transparent',
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
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 font-medium text-[13px] text-red-400 hover:text-red-500 hover:bg-red-50/60"
            >
              <LogOut size={17} />
              <span>{tCommon('signOut') || 'Log Out'}</span>
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
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          {/* Search */}
          <div className="flex-1 flex items-center">
            <SearchSpotlight />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Add New Lead button */}
            <button
              onClick={() => router.push(`/${locale}/dashboard/leads`)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #C9963B 0%, #d4a248 100%)',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(201,150,59,0.25)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(201,150,59,0.35)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(201,150,59,0.25)'
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              {tDash('addNewLead') || 'Add New Lead'}
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Separator */}
            <div className="w-px h-8 bg-gray-100" />

            {/* User Profile */}
            <Link
              href={`/${locale}/dashboard/settings/profile`}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-transform duration-200 group-hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #F3E8D6, #E8D3B1)',
                  color: '#9A6C1A',
                  fontFamily: 'var(--font-body), sans-serif',
                  boxShadow: '0 2px 6px rgba(201,150,59,0.15)',
                }}
              >
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-800 leading-tight">
                  {session.user?.full_name || session.user?.email || 'User'}
                </p>
                {session.org && (
                  <p className="text-[10px] text-gray-400 leading-tight">{session.org.subscription_tier || 'Pro'}</p>
                )}
              </div>
              <ChevronDown size={14} className="text-gray-400 transition-transform duration-200 group-hover:rotate-180" />
            </Link>
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
