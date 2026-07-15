'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './calendar-overrides.css'
import { CalendarDays, Clock, CheckCircle2, Phone, Mail, Users, ClipboardList } from 'lucide-react'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  type: 'task' | 'call' | 'email' | 'meeting' | 'viewing'
  status?: string
  priority?: string
  raw: any
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    tasks: true,
    calls: true,
    emails: true,
    meetings: true,
    viewings: true,
  })

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: u } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!u) { setLoading(false); return }

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', (u as any).id)
      .eq('is_primary', true)
      .single()

    if (member) {
      const oid = (member as any).organization_id

      // Fetch Tasks, Communications, and Viewings in parallel
      const [tasksResp, commsResp, viewingsResp] = await Promise.all([
        supabase.from('tasks').select('*').eq('organization_id', oid),
        supabase.from('communications').select('*').eq('organization_id', oid),
        supabase.from('viewings').select('*, properties(title)').eq('organization_id', oid),
      ])

      const aggregatedEvents: CalendarEvent[] = []

      // 1. Map Tasks
      if (tasksResp.data) {
        tasksResp.data.forEach((task: any) => {
          if (!task.due_date) return
          const date = new Date(task.due_date)
          aggregatedEvents.push({
            id: task.id,
            title: `[Task] ${task.title}`,
            start: date,
            end: new Date(date.getTime() + 60 * 60 * 1000), // 1 hour duration
            type: 'task',
            status: task.status,
            priority: task.priority,
            raw: task,
          })
        })
      }

      // 2. Map Communications (Calls, Emails, Meetings)
      if (commsResp.data) {
        commsResp.data.forEach((comm: any) => {
          if (!comm.scheduled_at) return
          const date = new Date(comm.scheduled_at)
          const duration = comm.duration_minutes || 30
          aggregatedEvents.push({
            id: comm.id,
            title: `[${comm.type.toUpperCase()}] ${comm.title}`,
            start: date,
            end: new Date(date.getTime() + duration * 60 * 1000),
            type: comm.type as any,
            raw: comm,
          })
        })
      }

      // 3. Map Viewings
      if (viewingsResp.data) {
        viewingsResp.data.forEach((viewing: any) => {
          if (!viewing.scheduled_at) return
          const date = new Date(viewing.scheduled_at)
          const duration = viewing.duration_minutes || 60
          aggregatedEvents.push({
            id: viewing.id,
            title: `[Viewing] ${viewing.properties?.title || 'Property Show'}`,
            start: date,
            end: new Date(date.getTime() + duration * 60 * 1000),
            type: 'viewing',
            status: viewing.status,
            raw: viewing,
          })
        })
      }

      setEvents(aggregatedEvents)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredEvents = events.filter(e => {
    if (e.type === 'task' && !filters.tasks) return false
    if (e.type === 'call' && !filters.calls) return false
    if (e.type === 'email' && !filters.emails) return false
    if (e.type === 'meeting' && !filters.meetings) return false
    if (e.type === 'viewing' && !filters.viewings) return false
    return true
  })

  // Color mappings for different calendar event categories
  const getEventStyle = (event: CalendarEvent) => {
    let backgroundColor = 'hsl(var(--primary))'
    let border = 'none'

    switch (event.type) {
      case 'task':
        backgroundColor = event.priority === 'high' ? 'rgba(239, 68, 68, 0.9)' : event.priority === 'medium' ? 'rgba(245, 158, 11, 0.9)' : 'rgba(16, 185, 129, 0.9)'
        break
      case 'call':
        backgroundColor = 'rgba(34, 197, 94, 0.9)' // green
        break
      case 'meeting':
        backgroundColor = 'rgba(239, 68, 68, 0.9)' // red
        break
      case 'email':
        backgroundColor = 'rgba(59, 130, 246, 0.9)' // blue
        break
      case 'viewing':
        backgroundColor = 'rgba(139, 92, 246, 0.9)' // purple
        break
    }

    if (event.status === 'completed' || event.raw.status === 'completed') {
      backgroundColor = 'rgba(107, 114, 128, 0.5)' // gray out completed
      border = '1px dashed rgba(107, 114, 128, 0.8)'
    }

    return {
      style: {
        backgroundColor,
        color: 'white',
        borderRadius: '6px',
        border,
        fontSize: '11px',
        padding: '2px 6px',
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Overview</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">Unified view of your tasks, logged client communications, and viewings.</p>
        </div>
      </div>

      {/* Filter strip */}
      <div className="flex flex-wrap gap-3 p-4 bg-card border border-border rounded-xl items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Tasks Filter */}
          <button
            onClick={() => setFilters(prev => ({ ...prev, tasks: !prev.tasks }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              filters.tasks ? 'bg-amber-500/10 text-amber-700 border-amber-500/20' : 'bg-background border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <ClipboardList size={14} /> Tasks
          </button>
          
          {/* Calls Filter */}
          <button
            onClick={() => setFilters(prev => ({ ...prev, calls: !prev.calls }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              filters.calls ? 'bg-green-500/10 text-green-700 border-green-500/20' : 'bg-background border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <Phone size={14} /> Calls
          </button>

          {/* Meetings Filter */}
          <button
            onClick={() => setFilters(prev => ({ ...prev, meetings: !prev.meetings }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              filters.meetings ? 'bg-red-500/10 text-red-700 border-red-500/20' : 'bg-background border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <Users size={14} /> Meetings
          </button>

          {/* Emails Filter */}
          <button
            onClick={() => setFilters(prev => ({ ...prev, emails: !prev.emails }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              filters.emails ? 'bg-blue-500/10 text-blue-700 border-blue-500/20' : 'bg-background border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <Mail size={14} /> Emails
          </button>

          {/* Viewings Filter */}
          <button
            onClick={() => setFilters(prev => ({ ...prev, viewings: !prev.viewings }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              filters.viewings ? 'bg-purple-500/10 text-purple-700 border-purple-500/20' : 'bg-background border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <CalendarDays size={14} /> Viewings
          </button>
        </div>

        <div className="text-xs text-muted-foreground font-medium">
          Showing {filteredEvents.length} events
        </div>
      </div>

      {/* Calendar container */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm p-4" style={{ height: 620 }}>
        <Calendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          views={['month', 'week', 'day']}
          defaultView="month"
          popup
          eventPropGetter={getEventStyle}
          onSelectEvent={(event) => setSelectedEvent(event)}
        />
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold font-display capitalize flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: getEventStyle(selectedEvent).style.backgroundColor }} />
                {selectedEvent.type} Details
              </h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-semibold"
              >
                Close
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</p>
                <p className="text-sm font-semibold text-foreground">{selectedEvent.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Start Time</p>
                  <p className="text-xs font-medium text-foreground">{selectedEvent.start.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">End Time</p>
                  <p className="text-xs font-medium text-foreground">{selectedEvent.end.toLocaleString()}</p>
                </div>
              </div>

              {selectedEvent.type === 'task' && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Priority</p>
                    <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 capitalize">
                      {selectedEvent.priority || 'normal'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                    <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700 capitalize">
                      {selectedEvent.status || 'pending'}
                    </span>
                  </div>
                </div>
              )}

              {selectedEvent.raw?.notes && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notes / Description</p>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{selectedEvent.raw.notes}</p>
                </div>
              )}

              {selectedEvent.raw?.summary && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Summary</p>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{selectedEvent.raw.summary}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
