import React from 'react'
import { MessageSquare, Phone, Mail, Clock, Calendar, CheckCircle2 } from 'lucide-react'

export interface ActivityLogItem {
  id: string
  type: string
  description: string
  metadata?: any
  created_at: string
}

export default function CommunicationsTimeline({ activities }: { activities: ActivityLogItem[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
        No recorded activity or communications timeline.
      </div>
    )
  }

  const getChannelBadge = (item: ActivityLogItem) => {
    const channel = item.metadata?.channel || item.type
    if (channel.includes('whatsapp')) {
      return { label: 'WhatsApp', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: MessageSquare }
    } else if (channel.includes('sms')) {
      return { label: 'SMS', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Phone }
    } else if (channel.includes('email')) {
      return { label: 'Email', bg: 'bg-[#FAF8F5] text-[#C9963B] border-[#C9963B]/30', icon: Mail }
    }
    return { label: item.type, bg: 'bg-gray-50 text-gray-700 border-gray-200', icon: Clock }
  }

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Unified Activity & Messaging Timeline</h4>
      <div className="relative space-y-3 before:absolute before:left-[17px] before:top-3 before:bottom-3 before:w-px before:bg-border">
        {activities.map((act) => {
          const badge = getChannelBadge(act)
          const Icon = badge.icon

          return (
            <div key={act.id} className="relative pl-9 flex items-start gap-3">
              <div className="absolute left-2 top-1 p-1 rounded-full bg-background border border-border z-10 -translate-x-1/2">
                <Icon size={12} className="text-foreground" />
              </div>
              <div className="flex-1 p-3 bg-card border border-border rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${badge.bg}`}>
                    {badge.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(act.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-foreground font-medium">{act.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
