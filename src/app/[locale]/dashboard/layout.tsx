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
  Phone,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarCheck,
  Settings,
  LogOut,
  CheckSquare,
  MessageSquare,
  FileText,
  Receipt,
  User,
  Shield,
  Globe,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from 'lucide-react'

interface Session {
  user: { id: string; full_name: string | null; email: string } | null
  org: { id: string; name: string; slug: string; subscription_tier: string } | null
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>({ user: null, org: null })
  const [collapsed, setCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Workspace: true,
    CRM: true,
    Inventory: true,
    Financials: false,
    Settings: false,
  })
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) || 'en'
  const t = useTranslations('nav')
  const tc = useTranslations('common')
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

  // Auto expand sections containing the active page
  useEffect(() => {
    const updated = { ...expandedSections }
    let changed = false
    NAV.forEach(sec => {
      const hasActive = sec.items.some(item => isActive(item.href))
      if (hasActive && !updated[sec.group]) {
        updated[sec.group] = true
        changed = true
      }
    })
    if (changed) {
      setExpandedSections(updated)
    }
  }, [pathname])

  const NAV = [
    {
      group: 'Workspace',
      items: [
        { href: `/${locale}/dashboard`, label: t('overview'), icon: <LayoutGrid size={14} /> },
        { href: `/${locale}/dashboard/documents`, label: t('documents'), icon: <FileText size={14} /> },
      ],
    },
    {
      group: 'CRM',
      items: [
        { href: `/${locale}/dashboard/leads`, label: t('leads'), icon: <Users size={14} /> },
        { href: `/${locale}/dashboard/contacts`, label: t('contacts'), icon: <Phone size={14} /> },
        { href: `/${locale}/dashboard/pipeline`, label: t('pipeline'), icon: <Briefcase size={14} /> },
        { href: `/${locale}/dashboard/tasks`, label: t('tasks'), icon: <CheckSquare size={14} /> },
        { href: `/${locale}/dashboard/communications`, label: t('communications'), icon: <MessageSquare size={14} /> },
      ],
    },
    {
      group: 'Inventory',
      items: [
        { href: `/${locale}/dashboard/properties`, label: t('properties'), icon: <Building2 size={14} /> },
        { href: `/${locale}/dashboard/viewings`, label: 'Viewings', icon: <CalendarCheck size={14} /> },
        { href: `/${locale}/dashboard/calendar`, label: t('calendar'), icon: <CalendarDays size={14} /> },
      ],
    },
    {
      group: 'Financials',
      items: [
        { href: `/${locale}/dashboard/financials`, label: t('overview'), icon: <LayoutGrid size={14} /> },
        { href: `/${locale}/dashboard/quotes`, label: t('quotes'), icon: <FileText size={14} /> },
        { href: `/${locale}/dashboard/invoices`, label: t('invoices'), icon: <Receipt size={14} /> },
      ],
    },
    {
      group: 'Settings',
      items: [
        { href: `/${locale}/dashboard/settings/profile`, label: 'Profile', icon: <User size={14} /> },
        { href: `/${locale}/dashboard/settings/team`, label: 'Team', icon: <Shield size={14} /> },
        { href: `/${locale}/dashboard/settings/integrations`, label: 'Integrations', icon: <Globe size={14} /> },
        { href: `/${locale}/dashboard/settings/billing`, label: t('billing'), icon: <Settings size={14} /> },
      ],
    },
  ]

  const initials = session.user?.full_name
    ? session.user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : session.user?.email?.[0]?.toUpperCase() || 'U'

  const W = collapsed ? 76 : 256

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: '#FAF8F5' }}>

      {/* ═══════════════════════════════════════════════════════════
          SIDEBAR — Obsidian Noir with Champagne Gold accents
      ═══════════════════════════════════════════════════════════ */}
      <aside
        className="flex flex-col h-full shrink-0 overflow-hidden"
        style={{
          width: W,
          minWidth: W,
          maxWidth: W,
          background: '#090e0c',
          borderRight: '1px solid rgba(201,150,59,0.12)',
          transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* ─── Logo ─── */}
        <div
          className="flex items-center shrink-0"
          style={{
            height: 52,
            padding: collapsed ? '0 12px' : '0 16px',
            borderBottom: '1px solid rgba(201,150,59,0.06)',
          }}
        >
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
            {/* Logo mark: gold gradient square */}
            <div
              className="shrink-0 flex items-center justify-center rounded-[8px]"
              style={{
                width: 34,
                height: 34,
                background: 'linear-gradient(135deg, #C9963B 0%, #f0c068 55%, #9a6c1a 100%)',
                boxShadow: '0 2px 12px rgba(201,150,59,0.35)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            {!collapsed && (
              <div className="min-w-0 overflow-hidden">
                <p
                  className="truncate leading-none"
                  style={{
                    fontFamily: 'var(--font-display), Georgia, serif',
                    fontSize: 18,
                    fontWeight: 600,
                    color: '#f5f0e8',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Estateline
                </p>
                <p className="text-[10px] mt-0.5 font-medium tracking-widest uppercase truncate" style={{ color: 'rgba(201,150,59,0.55)' }}>
                  Real Estate CRM
                </p>
              </div>
            )}
          </Link>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="shrink-0 flex items-center justify-center rounded-md transition-all duration-150"
            style={{
              width: 22,
              height: 22,
              color: 'rgba(255,255,255,0.2)',
              marginLeft: collapsed ? 0 : 4,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(201,150,59,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {/* ─── Navigation ─── */}
        <nav className="flex-1 overflow-hidden py-1.5 flex flex-col gap-0">
          {NAV.map((section) => {
            const isExpanded = collapsed || !!expandedSections[section.group]
            return (
              <div key={section.group} className="mb-1">
                {!collapsed && (
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, [section.group]: !prev[section.group] }))}
                    className="w-full flex items-center justify-between section-label mb-0.5 px-3 hover:text-[#C9963B] transition-colors"
                  >
                    <span>{section.group}</span>
                    <span className="opacity-45 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                      <ChevronRight size={9} />
                    </span>
                  </button>
                )}
                {isExpanded && (
                  <ul className="space-y-[1px] px-1.5">
                    {section.items.map((item) => {
                      const active = isActive(item.href)
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            title={collapsed ? item.label : undefined}
                            className="relative flex items-center gap-2 rounded-lg transition-all duration-150 group"
                            style={{
                              padding: collapsed ? '6px 0' : '4px 8px',
                              justifyContent: collapsed ? 'center' : 'flex-start',
                              color: active ? '#FAF8F5' : 'rgba(245,240,232,0.5)',
                              background: active
                                ? 'rgba(201,150,59,0.14)'
                                : 'transparent',
                              border: active ? '1px solid rgba(201,150,59,0.25)' : '1px solid transparent',
                            }}
                            onMouseEnter={e => {
                              if (!active) {
                                e.currentTarget.style.color = 'rgba(245,240,232,0.85)'
                                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                              }
                            }}
                            onMouseLeave={e => {
                              if (!active) {
                                e.currentTarget.style.color = 'rgba(245,240,232,0.5)'
                                e.currentTarget.style.background = 'transparent'
                              }
                            }}
                          >
                            <span className="shrink-0" style={{ opacity: active ? 1 : 0.75, color: active ? '#C9963B' : 'inherit' }}>{item.icon}</span>
                            {!collapsed && (
                              <span
                                className="truncate text-[13px] font-medium"
                                style={{ fontFamily: 'var(--font-body), sans-serif' }}
                              >
                                {item.label}
                              </span>
                            )}
                            {active && !collapsed && (
                              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#C9963B] shadow-[0_0_8px_#C9963B]" />
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </nav>

        {/* ─── Language + Currency ─── */}
        {!collapsed && (
          <div
            className="px-3 py-1.5 flex gap-2.5 shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            {/* Language */}
            <div className="flex-1">
              <p className="text-[8px] font-bold uppercase tracking-[0.14em] mb-0.5" style={{ color: 'rgba(201,150,59,0.4)' }}>Lang</p>
              <div className="flex rounded-[6px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                {(['en', 'bs'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className="flex-1 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all"
                    style={{
                      background: locale === lang ? '#C9963B' : 'transparent',
                      color: locale === lang ? '#0d1117' : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency */}
            <div className="flex-1">
              <p className="text-[8px] font-bold uppercase tracking-[0.14em] mb-0.5" style={{ color: 'rgba(201,150,59,0.4)' }}>Currency</p>
              <div className="flex rounded-[6px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                {(['BAM', 'EUR'] as const).map(cur => (
                  <button
                    key={cur}
                    onClick={() => setCurrency(cur as any)}
                    className="flex-1 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all"
                    style={{
                      background: currency === cur ? '#C9963B' : 'transparent',
                      color: currency === cur ? '#0d1117' : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {cur === 'BAM' ? 'KM' : '€'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── User footer ─── */}
        <div
          className="shrink-0 px-3 py-2"
          style={{ borderTop: '1px solid rgba(201,150,59,0.08)' }}
        >
          {collapsed ? (
            <div className="flex justify-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{
                  background: 'linear-gradient(135deg, #C9963B, #9a6c1a)',
                  color: '#0d1117',
                  fontFamily: 'var(--font-body), sans-serif',
                }}
              >
                {initials}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #C9963B, #9a6c1a)',
                  color: '#0d1117',
                  fontFamily: 'var(--font-body), sans-serif',
                }}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="text-[12.5px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.82)', fontFamily: 'var(--font-body), sans-serif' }}>
                  {session.user?.full_name || session.user?.email}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-[9.5px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {session.org?.name}
                  </p>
                  {session.org?.subscription_tier && (
                    <span
                      className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
                      style={{
                        background: 'rgba(201,150,59,0.2)',
                        color: '#C9963B',
                        border: '1px solid rgba(201,150,59,0.25)',
                      }}
                    >
                      {session.org.subscription_tier}
                    </span>
                  )}
                </div>
              </div>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  title="Sign out"
                  className="p-1.5 rounded-md transition-colors shrink-0"
                  style={{ color: 'rgba(255,255,255,0.2)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(201,150,59,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
                >
                  <LogOut size={12} />
                </button>
              </form>
            </div>
          )}
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════════════════════ */}
      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">

        {/* Top bar */}
        <div
          className="h-[60px] flex items-center px-8 shrink-0 gap-4"
          style={{
            background: 'rgba(250,248,245,0.85)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          {/* Breadcrumb / page hint */}
          <div className="flex-1">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'rgba(201,150,59,0.65)' }}
            >
              {session.org?.name || 'Dashboard'}
            </p>
          </div>

          {/* Search */}
          <SearchSpotlight />
        </div>

        {/* Page content */}
        <div className="flex-1 px-8 lg:px-10 py-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
