'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './calendar-overrides.css'
import { CalendarDays, Clock, CheckCircle2, Phone, Mail, Users, ClipboardList, Plus, MapPin, X, Filter } from 'lucide-react'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  type: 'task' | 'call' | 'email' | 'meeting' | 'viewing'
  status?: string
  client_name?: string
  location?: string
  notes?: string
}

const DEMO_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'e-1',
    title: 'Obilazak Stana na Skenderiji',
    start: new Date(new Date().setHours(14, 0, 0, 0)),
    end: new Date(new Date().setHours(15, 0, 0, 0)),
    type: 'viewing',
    client_name: 'Emir Hadžić',
    location: 'Podgaj 14, Sarajevo',
    notes: 'Kupac traži trosoban stan sa garažom.',
  },
  {
    id: 'e-2',
    title: 'Potpisivanje Predugovora kod Notara',
    start: new Date(new Date().setHours(16, 30, 0, 0)),
    end: new Date(new Date().setHours(17, 30, 0, 0)),
    type: 'meeting',
    client_name: 'Belma Čolić & Denis Kovačević',
    location: 'Notarska Kancelarija Kovačević',
    notes: 'Uplata kapare 10%.',
  },
  {
    id: 'e-3',
    title: 'Telefonski Poziv - Produženje Zakupa',
    start: new Date(Date.now() + 86400000),
    end: new Date(Date.now() + 86400000 + 1800000),
    type: 'call',
    client_name: 'Lejla Muminović',
  },
  {
    id: 'e-4',
    title: 'Uvoz novih oglasa sa OLX.ba',
    start: new Date(Date.now() + 86400000 * 2),
    end: new Date(Date.now() + 86400000 * 2 + 3600000),
    type: 'task',
  },
]

type Toast = { id: string; message: string; type: 'success' | 'error' }

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [view, setView] = useState<any>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const [filters, setFilters] = useState({
    viewings: true,
    meetings: true,
    calls: true,
    tasks: true,
  })

  const [newEvent, setNewEvent] = useState({
    title: '',
    client_name: '',
    type: 'viewing' as CalendarEvent['type'],
    date: '',
    time: '12:00',
    location: '',
    notes: '',
  })

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

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
      const [tasksResp, commsResp, viewingsResp] = await Promise.all([
        supabase.from('tasks').select('*').eq('organization_id', oid),
        supabase.from('communications').select('*').eq('organization_id', oid),
        supabase.from('viewings').select('*, properties(title)').eq('organization_id', oid),
      ])

      const aggregated: CalendarEvent[] = []

      if (viewingsResp.data && viewingsResp.data.length > 0) {
        viewingsResp.data.forEach((v: any) => {
          if (!v.scheduled_at) return
          const d = new Date(v.scheduled_at)
          aggregated.push({
            id: v.id,
            title: `Obilazak: ${v.properties?.title || 'Nekretnina'}`,
            start: d,
            end: new Date(d.getTime() + 3600000),
            type: 'viewing',
            notes: v.notes,
          })
        })
      }

      if (aggregated.length > 0) {
        setEvents(aggregated)
      } else {
        setEvents(DEMO_CALENDAR_EVENTS)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredEvents = events.filter(e => {
    if (e.type === 'viewing' && !filters.viewings) return false
    if (e.type === 'meeting' && !filters.meetings) return false
    if (e.type === 'call' && !filters.calls) return false
    if (e.type === 'task' && !filters.tasks) return false
    return true
  })

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#C9963B'
    if (event.type === 'viewing') backgroundColor = '#C9963B'
    else if (event.type === 'meeting') backgroundColor = '#9333EA'
    else if (event.type === 'call') backgroundColor = '#2563EB'
    else if (event.type === 'task') backgroundColor = '#059669'

    return {
      style: {
        backgroundColor,
        borderRadius: '8px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '11px',
        fontWeight: '600',
        padding: '3px 8px',
      }
    }
  }

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEvent.title || !newEvent.date) return

    const startDate = new Date(`${newEvent.date}T${newEvent.time}`)
    const item: CalendarEvent = {
      id: `ev-${Date.now()}`,
      title: newEvent.title,
      start: startDate,
      end: new Date(startDate.getTime() + 3600000),
      type: newEvent.type,
      client_name: newEvent.client_name,
      location: newEvent.location,
      notes: newEvent.notes,
    }

    setEvents(prev => [...prev, item])
    toast('Događaj je dodan u kalendar!')
    setShowModal(false)
    setNewEvent({ title: '', client_name: '', type: 'viewing', date: '', time: '12:00', location: '', notes: '' })
  }

  if (loading) {
    return (
      <div className="w-full space-y-6 py-12">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="skeleton h-[600px] rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-4 font-sans animate-fade-in">
      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold border ${
              t.type === 'success' ? 'bg-gray-900 text-white border-gray-800' : 'bg-red-600 text-white border-red-500'
            }`}
          >
            {t.type === 'success' ? <CheckCircle2 size={16} className="text-[#C9963B]" /> : <X size={16} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/70 pb-6">
        <div>
          <p className="page-eyebrow mb-1">KALENDAR & RASPORED AGENCIJE</p>
          <h1
            className="text-3xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
          >
            Interaktivni Kalendar
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pregled svih agencijskih obilazaka, notarskih ugovora, poziva i obaveza.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white shadow-md transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #C9963B 0%, #b88328 100%)',
            boxShadow: '0 4px 16px rgba(201,150,59,0.25)',
          }}
        >
          <Plus size={16} />
          <span>Zakazi Događaj</span>
        </button>
      </header>

      {/* Filters Bar */}
      <div className="bg-white rounded-3xl border border-gray-200/70 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
          <Filter size={16} className="text-[#C9963B]" />
          <span>Filter Događaja:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.viewings}
              onChange={e => setFilters(p => ({ ...p, viewings: e.target.checked }))}
              className="accent-[#C9963B]"
            />
            <span>Obilasci</span>
          </label>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.meetings}
              onChange={e => setFilters(p => ({ ...p, meetings: e.target.checked }))}
              className="accent-purple-600"
            />
            <span>Sastanci / Ugovori</span>
          </label>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.calls}
              onChange={e => setFilters(p => ({ ...p, calls: e.target.checked }))}
              className="accent-blue-600"
            />
            <span>Pozivi</span>
          </label>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.tasks}
              onChange={e => setFilters(p => ({ ...p, tasks: e.target.checked }))}
              className="accent-emerald-600"
            />
            <span>Zadatci</span>
          </label>
        </div>
      </div>

      {/* Big Calendar Container */}
      <div className="bg-white rounded-3xl border border-gray-200/70 p-6 shadow-sm min-h-[650px]">
        <Calendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          view={view}
          onView={(v: any) => setView(v)}
          date={currentDate}
          onNavigate={(d: Date) => setCurrentDate(d)}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={(event: any) => setSelectedEvent(event as CalendarEvent)}
        />
      </div>

      {/* Modal Add Event */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>

            <div>
              <h3 className="text-xl font-bold text-gray-900">Zakazi Događaj u Kalendaru</h3>
              <p className="text-xs text-gray-500 mt-1">Unesite naslov, vrstu i satnicu sastanka ili obilaska.</p>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Naslov *</label>
                <input
                  type="text"
                  required
                  placeholder="Sastanak sa kupcem / Obilazak stana..."
                  value={newEvent.title}
                  onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Vrsta</label>
                  <select
                    value={newEvent.type}
                    onChange={e => setNewEvent(p => ({ ...p, type: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  >
                    <option value="viewing">Obilazak</option>
                    <option value="meeting">Sastanak / Ugovor</option>
                    <option value="call">Poziv</option>
                    <option value="task">Zadatak</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Kupac / Klijent</label>
                  <input
                    type="text"
                    placeholder="Emir Hadžić"
                    value={newEvent.client_name}
                    onChange={e => setNewEvent(p => ({ ...p, client_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Datum *</label>
                  <input
                    type="date"
                    required
                    value={newEvent.date}
                    onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Vrijeme</label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={e => setNewEvent(p => ({ ...p, time: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">
                  Odustani
                </button>
                <button type="submit" className="px-6 py-2.5 bg-[#C9963B] text-white font-semibold text-xs rounded-xl shadow-md hover:bg-[#b88328] transition-colors">
                  Zakazi Događaj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal View Event Details */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4 relative">
            <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>

            <div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-amber-50 text-[#C9963B] border border-amber-200">
                {selectedEvent.type}
              </span>
              <h3 className="text-xl font-bold text-gray-900 mt-2">{selectedEvent.title}</h3>
              <p className="text-xs text-gray-500 mt-1">
                Termin: {selectedEvent.start.toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })} - {selectedEvent.end.toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {selectedEvent.client_name && (
              <p className="text-xs text-gray-700">Kupac / Klijent: <b>{selectedEvent.client_name}</b></p>
            )}

            {selectedEvent.location && (
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <MapPin size={13} className="text-[#C9963B]" /> {selectedEvent.location}
              </p>
            )}

            {selectedEvent.notes && (
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-xs text-gray-600 italic">
                „{selectedEvent.notes}”
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
