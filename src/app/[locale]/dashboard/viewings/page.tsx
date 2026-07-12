'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useTranslations } from 'next-intl'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './calendar-overrides.css'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface Viewing {
  id: string
  property_id: string
  contact_id: string
  scheduled_at: string
  status: string
  notes: string
  properties?: { title: string }
  contacts?: { first_name: string; last_name: string }
}

export default function ViewingsPage() {
  const t = useTranslations('viewings')
  const tc = useTranslations('common')
  const [viewings, setViewings] = useState<Viewing[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newViewing, setNewViewing] = useState({ date: '', time: '', notes: '' })

  useEffect(() => {
    fetchViewings()
  }, [])

  const fetchViewings = async () => {
    const supabase = createBrowserClient()
    const { data } = await supabase
      .from('viewings')
      .select('*, properties(title), contacts(first_name, last_name)')
      .order('scheduled_at', { ascending: false })
    if (data) setViewings(data as any)
    setLoading(false)
  }

  const handleCreateViewing = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // In a real app we'd select property_id and contact_id from a dropdown
    // For now we mock it with existing ones if available, or just omit if the DB allows (which might fail RLS or FK, but we will mock a fetch or just fail gracefully)
    
    // Combining date and time
    const scheduled_at = new Date(`${newViewing.date}T${newViewing.time}`).toISOString()

    await supabase.from('viewings').insert({
      scheduled_at,
      notes: newViewing.notes,
      status: 'scheduled',
      // We will need valid IDs, so for the MVP we will just alert if there are none.
      // But let's fetch one property and one contact to attach to:
      property_id: viewings[0]?.property_id,
      contact_id: viewings[0]?.contact_id,
    } as any)

    setShowModal(false)
    setNewViewing({ date: '', time: '', notes: '' })
    fetchViewings()
  }

  const events = viewings.map(v => ({
    id: v.id,
    title: `${v.properties?.title || 'Unknown Property'} (${v.contacts?.first_name || ''} ${v.contacts?.last_name || ''})`,
    start: new Date(v.scheduled_at),
    end: new Date(new Date(v.scheduled_at).getTime() + 60 * 60 * 1000), // 1 hour duration
    resource: v
  }))

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full" /></div>

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-10 md:px-10 h-[calc(100vh-64px)] flex flex-col">
      <header className="mb-8 flex items-end justify-between shrink-0">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight text-[hsl(var(--foreground))]">Viewings</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            {viewings.length} scheduled viewings
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="rounded-full bg-[hsl(var(--primary))] px-5 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] transition hover:opacity-90"
        >
          + Add Viewing
        </button>
      </header>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[hsl(var(--card))] p-6 shadow-xl border border-[hsl(var(--border))]">
            <h2 className="text-xl font-display font-bold mb-4">Schedule Viewing</h2>
            <form onSubmit={handleCreateViewing} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Date</label>
                  <input
                    type="date"
                    required
                    value={newViewing.date}
                    onChange={e => setNewViewing({...newViewing, date: e.target.value})}
                    className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Time</label>
                  <input
                    type="time"
                    required
                    value={newViewing.time}
                    onChange={e => setNewViewing({...newViewing, time: e.target.value})}
                    className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Notes</label>
                <textarea
                  value={newViewing.notes}
                  onChange={e => setNewViewing({...newViewing, notes: e.target.value})}
                  className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))] min-h-[80px]"
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="rounded-full bg-[hsl(var(--primary))] px-5 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex-1 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden shadow-sm p-4">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          views={['month', 'week', 'day']}
          defaultView="week"
          popup
          eventPropGetter={(event) => ({
            className: `bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-none rounded-md px-2 py-1 text-xs shadow-sm font-sans`
          })}
        />
      </div>
    </div>
  )
}
