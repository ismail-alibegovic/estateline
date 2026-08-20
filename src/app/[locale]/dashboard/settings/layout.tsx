'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  User,
  Users,
  Briefcase,
  CreditCard,
  Tags,
  Plug,
  ArrowLeft,
} from 'lucide-react'

const TABS = [
  { href: 'profile', label: 'Profile', icon: <User size={15} /> },
  { href: 'team', label: 'Team', icon: <Users size={15} /> },
  { href: 'pipeline', label: 'Pipeline', icon: <Briefcase size={15} /> },
  { href: 'billing', label: 'Billing', icon: <CreditCard size={15} /> },
  { href: 'custom-fields', label: 'Custom Fields', icon: <Tags size={15} /> },
  { href: 'integrations', label: 'Integrations', icon: <Plug size={15} /> },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const segments = pathname.split('/')
  const locale = segments[1] || 'en'
  const activeTab = TABS.find(t => pathname.includes(`/settings/${t.href}`))?.href || 'profile'

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${locale}/dashboard`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm font-semibold text-foreground">Settings</span>
      </div>

      <nav className="flex gap-0.5 mb-8 overflow-x-auto">
        {TABS.map(tab => {
          const isActive = activeTab === tab.href
          return (
            <Link
              key={tab.href}
              href={`/${locale}/dashboard/settings/${tab.href}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 whitespace-nowrap"
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, #C9963B, #d4a248)'
                  : 'transparent',
                color: isActive ? '#FFFFFF' : '#6B7280',
                boxShadow: isActive ? '0 2px 8px rgba(201,150,59,0.25)' : 'none',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.color = '#374151'
                  e.currentTarget.style.background = 'rgba(201,150,59,0.06)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.color = '#6B7280'
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.6 }}>{tab.icon}</span>
              {tab.label}
            </Link>
          )
        })}
      </nav>

      {children}
    </div>
  )
}
