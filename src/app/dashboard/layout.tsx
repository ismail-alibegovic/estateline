'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Session {
  user: { id: string; full_name: string | null; email: string } | null
  org: { id: string; name: string; slug: string; subscription_tier: string } | null
}

const NAV = [
  {
    group: 'Workspace',
    items: [{ href: '/dashboard', label: 'Overview' }],
  },
  {
    group: 'CRM',
    items: [
      { href: '/dashboard/leads', label: 'Leads' },
      { href: '/dashboard/contacts', label: 'Contacts' },
      { href: '/dashboard/pipeline', label: 'Pipeline' },
    ],
  },
  {
    group: 'Inventory',
    items: [
      { href: '/dashboard/properties', label: 'Properties' },
      { href: '/dashboard/viewings', label: 'Viewings' },
    ],
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>({ user: null, org: null })
  const pathname = usePathname()

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

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:flex-col border-r border-border bg-card">
        <div className="px-6 py-6 border-b border-border">
          <Link href="/dashboard" className="block">
            <span className="font-display text-2xl tracking-tight text-foreground">
              Estateline
            </span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
              Real Estate CRM
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-7 overflow-y-auto">
          {NAV.map((section) => (
            <div key={section.group}>
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {section.group}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                        isActive(item.href)
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground/75 hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-border text-xs text-muted-foreground">
          {session.org?.name}
          <span className="block text-foreground/40">{session.user?.full_name || session.user?.email}</span>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-20 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-display text-xl">Estateline</Link>
        <select
          className="text-sm border border-border rounded-md bg-background px-2 py-1"
          defaultValue={pathname}
          onChange={(e) => (window.location.href = e.target.value)}
        >
          {NAV.flatMap((s) => s.items).map((i) => (
            <option key={i.href} value={i.href}>{i.label}</option>
          ))}
        </select>
      </header>

      {/* Main */}
      <main className="min-w-0">
        <div className="hidden lg:flex items-center justify-end gap-4 px-8 py-3 border-b border-border bg-card/60">
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="text-sm text-muted-foreground hover:text-destructive transition-colors">
              Sign out
            </button>
          </form>
        </div>
        <div className="px-6 lg:px-10 py-8">{children}</div>
      </main>
    </div>
  )
}
