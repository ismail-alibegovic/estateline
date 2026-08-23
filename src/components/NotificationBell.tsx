'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: string
  title: string
  subtitle: string | null
  created_at: string
  link: string | null
  read: boolean
}

const TYPE_COLORS: Record<string, string> = {
  lead_assigned: '#3b82f6',
  new_lead: '#3b82f6',
  viewing_upcoming: '#C9963B',
  viewing_reminder: '#C9963B',
  task_overdue: '#EF4444',
  document_signed: '#10B981',
  portal_sync_failed: '#EF4444',
  stage_change: '#8b5cf6',
}

const DEFAULT_COLOR = '#8b5cf6'

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const json = await res.json()
      setNotifications(json.data ?? [])
      setUnreadCount(json.unread ?? 0)
    } catch {
      // transient network failure — keep current list
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next) load()
  }

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    setUnreadCount((c) => Math.max(0, c - 1))
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch {
      // optimistic — server reconciles on next poll
    }
  }

  async function handleClick(n: Notification) {
    if (!n.read) markRead(n.id)
    if (n.link) {
      router.push(`/${n.link.replace(/^\//, '')}`)
    }
    setOpen(false)
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
    } catch {
      // optimistic — server reconciles on next poll
    }
  }

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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
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
                    style={{ background: TYPE_COLORS[n.type] ?? DEFAULT_COLOR }}
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
                onClick={handleMarkAllRead}
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
