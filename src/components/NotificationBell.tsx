'use client'

import { useEffect, useState, useRef } from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

interface Notification {
  id: string
  type: 'new_lead' | 'viewing_reminder' | 'stage_change'
  title: string
  subtitle: string
  created_at: string
  link?: string
  read: boolean
}

export default function NotificationBell({ orgId }: { orgId: string | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  const supabase = createBrowserClient()

  useEffect(() => {
    if (!orgId) return
    loadNotifications()
  }, [orgId])

  useEffect(() => {
    if (!orgId) return

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          const entry = payload.new as any
          const notif: Notification = {
            id: entry.id,
            type: entry.type as Notification['type'],
            title: entry.type === 'lead_created' ? 'New Lead' : entry.type === 'stage_change' ? 'Pipeline Update' : 'Activity',
            subtitle: entry.description || '',
            created_at: entry.created_at,
            link: entry.lead_id ? `/dashboard/leads/${entry.lead_id}` : undefined,
            read: false,
          }
          setNotifications((prev) => [notif, ...prev].slice(0, 20))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'viewings',
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          setNotifications((prev) =>
            [
              {
                id: `viewing-${Date.now()}`,
                type: 'viewing_reminder' as const,
                title: 'New Viewing Scheduled',
                subtitle: 'A viewing was added to the calendar',
                created_at: new Date().toISOString(),
                link: '/dashboard/viewings',
                read: false,
              },
              ...prev,
            ].slice(0, 20)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orgId, supabase])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadNotifications() {
    if (!orgId) return
    setLoading(true)

    const [activityResp, viewingsResp] = await Promise.all([
      supabase
        .from('activity_log')
        .select('id, type, description, created_at, lead_id')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(15),
      supabase
        .from('viewings')
        .select('id, scheduled_at, lead_id')
        .eq('organization_id', orgId)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5),
    ])

    const items: Notification[] = []

    for (const a of activityResp.data || []) {
      const type =
        a.type === 'lead_created' ? 'new_lead' : a.type === 'stage_change' ? 'stage_change' : 'stage_change'
      items.push({
        id: a.id,
        type,
        title: a.type === 'lead_created' ? 'New Lead' : a.type === 'stage_change' ? 'Pipeline Update' : 'Activity',
        subtitle: a.description || '',
        created_at: a.created_at,
        link: a.lead_id ? `/dashboard/leads/${a.lead_id}` : undefined,
        read: false,
      })
    }

    for (const v of viewingsResp.data || []) {
      items.push({
        id: `viewing-${v.id}`,
        type: 'viewing_reminder',
        title: 'Upcoming Viewing',
        subtitle: new Date(v.scheduled_at).toLocaleString(),
        created_at: v.scheduled_at,
        link: '/dashboard/viewings',
        read: false,
      })
    }

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setNotifications(items.slice(0, 20))
    setLoading(false)
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  function formatTimeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 0) return 'Upcoming'
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  function handleClick(n: Notification) {
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
    if (n.link) {
      router.push(`/${n.link.replace(/^\//, '')}`)
    }
    setOpen(false)
  }

  const iconColor: Record<Notification['type'], string> = {
    new_lead: '#3b82f6',
    viewing_reminder: '#C9963B',
    stage_change: '#8b5cf6',
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-50"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-white"
            style={{ background: '#EF4444' }}
          />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 ${
                    !n.read ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ background: iconColor[n.type] }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                    <p className="text-xs text-gray-500 truncate">{n.subtitle}</p>
                    <p className="text-[11px] text-gray-300 mt-0.5">{formatTimeAgo(n.created_at)}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-gray-50 px-4 py-2">
              <button
                onClick={() => {
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
                }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors w-full text-center"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
