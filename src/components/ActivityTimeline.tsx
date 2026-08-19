'use client'

import { Activity, Phone, Mail, Calendar, FileText, CheckCircle2, UserPlus, Home, Briefcase, MessageSquare, TrendingUp } from 'lucide-react'

export interface ActivityEntry {
  id: string
  type: string
  description: string
  created_at: string
  users?: { full_name: string | null } | { full_name: string | null }[] | null
  metadata?: any
}

interface Props {
  activities: ActivityEntry[]
  locale?: string
  compact?: boolean
  maxItems?: number
}

const ICON_MAP: Record<string, { icon: typeof Activity; color: string; bg: string }> = {
  call: { icon: Phone, color: 'text-blue-600', bg: 'bg-blue-50' },
  email: { icon: Mail, color: 'text-amber-600', bg: 'bg-amber-50' },
  meeting: { icon: Calendar, color: 'text-green-600', bg: 'bg-green-50' },
  viewing: { icon: Home, color: 'text-purple-600', bg: 'bg-purple-50' },
  note: { icon: MessageSquare, color: 'text-gray-600', bg: 'bg-gray-100' },
  task: { icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  document_sent: { icon: FileText, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  document_signed: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  stage_change: { icon: TrendingUp, color: 'text-[#C9963B]', bg: 'bg-[#C9963B]/10' },
  system: { icon: Activity, color: 'text-gray-400', bg: 'bg-gray-100' },
  lead_created: { icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50' },
  deal_created: { icon: Briefcase, color: 'text-[#C9963B]', bg: 'bg-[#C9963B]/10' },
}

export function ActivityTimeline({ activities, locale = 'en', compact = false, maxItems = 10 }: Props) {
  const items = activities.slice(0, maxItems)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Activity size={28} className="text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground/60">
          {locale === 'bs' ? 'Nema aktivnosti' : 'No activity yet'}
        </p>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHr / 24)

    if (diffMin < 1) return locale === 'bs' ? 'Upravo' : 'Just now'
    if (diffMin < 60) return locale === 'bs' ? `Prije ${diffMin} min` : `${diffMin}m ago`
    if (diffHr < 24) return locale === 'bs' ? `Prije ${diffHr} h` : `${diffHr}h ago`
    if (diffDay < 7) return locale === 'bs' ? `Prije ${diffDay} dana` : `${diffDay}d ago`
    return d.toLocaleDateString(locale === 'bs' ? 'bs-BA' : 'en-US', { day: 'numeric', month: 'short' })
  }

  const getUser = (a: ActivityEntry): string | null => {
    if (!a.users) return null
    if (Array.isArray(a.users)) return a.users[0]?.full_name || null
    return (a.users as { full_name: string | null }).full_name
  }

  return (
    <div className={`relative space-y-${compact ? '3' : '4'} before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-border`}>
      {items.map(a => {
        const config = ICON_MAP[a.type] || ICON_MAP.system
        const Icon = config.icon
        const user = getUser(a)

        return (
          <div key={a.id} className="relative flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full ${config.bg} border-2 border-card flex items-center justify-center shrink-0 z-10`}>
              <Icon size={14} className={config.color} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className={`text-sm text-foreground ${compact ? 'line-clamp-1' : ''}`}>{a.description}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground/60">{formatDate(a.created_at)}</span>
                {user && (
                  <>
                    <span className="text-[10px] text-muted-foreground/30">·</span>
                    <span className="text-[10px] text-muted-foreground/60">{user}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
