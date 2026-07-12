'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useTranslations } from 'next-intl'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './calendar-overrides.css'
import { Plus, X, CalendarDays, Clock, User, Building2, CheckCircle, XCircle } from 'lucide-react'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

interface Viewing {
  id: string
  property_id: string
  contact_id: string | null
  lead_id: string | null
  scheduled_at: string
  status: string
  notes: string | null
  duration_minutes: number | null
  properties?: { title: string; city: string }
  contacts?: { first_name: string; last_name: string | null } | null
  leads?: { first_name: string; last_name: string | null } | null
}

interface PropertyOption { id: string; title: string; city: string }
interface ContactOption { id: string; first_name: string; last_name: string | null }
interface LeadOption { id: string; first_name: string; last_name: string | null }

type Toast = { id: string; message: string; type: 'success' | 'error' }

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-500',
  confirmed: 'bg-emerald-500',
  completed: 'bg-purple-500',
  cancelled: 'bg-red-400',
  'no-show': 'bg-gray-400',
}

export default function ViewingsPage() {
  const t = useTranslations('viewings')
  const [viewings, setViewings] = useState<Viewing[]>([])
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [calView, setCalView] = useState<'month' | 'week' | 'day' | 'list'>('week')
  const [toasts, setToasts] = useState<Toast[]>([])

  const [newViewing, setNewViewing] = useState({
    property_id: '',
    contact_id: '',
    lead_id: '',
    date: '',
    time: '10:00',
    duration: '60',
    notes: '',
    status: 'scheduled',
  })

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  const loadData = async () => {
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

    if (!member) { setLoading(false); return }
    const oid = (member as any).organization_id
    setOrgId(oid)

    const [{ data: vData }, { data: pData }, { data: cData }, { data: lData }] = await Promise.all([
      supabase
        .from('viewings')
        .select('*, properties(title, city), contacts(first_name, last_name), leads(first_name, last_name)')
        .eq('organization_id', oid)
        .order('scheduled_at', { ascending: true }),
      supabase.from('properties').select('id, title, city').eq('organization_id', oid).eq('status', 'active').order('title'),
      supabase.from('contacts').select('id, first_name, last_name').eq('organization_id', oid).order('first_name'),
      supabase.from('leads').select('id, first_name, last_name').eq('organization_id', oid).order('first_name'),
    ])

    if (vData) setViewings(vData as any)
    if (pData) setProperties(pData as any)
    if (cData) setContacts(cData as any)
    if (lData) setLeads(lData as any)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleCreateViewing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newViewing.property_id || !newViewing.date || !orgId) {
      toast('Please select a property and date', 'error')
      return
    }
    setSaving(true)

    const scheduled_at = new Date(`${newViewing.date}T${newViewing.time}`).toISOString()
    const supabase = createBrowserClient()

    const { error } = await supabase.from('viewings').insert({
      organization_id: orgId,
      property_id: newViewing.property_id,
      contact_id: newViewing.contact_id || null,
      lead_id: newViewing.lead_id || null,
      scheduled_at,
      duration_minutes: parseInt(newViewing.duration) || 60,
      notes: newViewing.notes || null,
      status: newViewing.status,
    })

    setSaving(false)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Viewing scheduled!')
      setShowModal(false)
      setNewViewing({ property_id: '', contact_id: '', lead_id: '', date: '', time: '10:00', duration: '60', notes: '', status: 'scheduled' })
      loadData()
    }
  }

  const updateStatus = async (id: string, status: string) => {
    const supabase = createBrowserClient()
    await supabase.from('viewings').update({ status }).eq('id', id)
    setViewings(prev => prev.map(v => v.id === id ? { ...v, status } : v))
    toast(`Status updated to ${status}`)
  }

  // Upcoming viewings (next 7 days)
  const now = new Date()
  const upcoming = viewings.filter(v => {
    const d = new Date(v.scheduled_at)
    return d >= now && v.status !== 'cancelled'
  }).slice(0, 5)

  const events = viewings.map(v => ({
    id: v.id,
    title: `${v.properties?.title || 'Property'} — ${v.contacts?.first_name || v.leads?.first_name || 'Guest'}`,
    start: new Date(v.scheduled_at),
    end: new Date(new Date(v.scheduled_at).getTime() + (v.duration_minutes || 60) * 60 * 1000),
    resource: v,
  }))

  const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border ${t.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {t.type === 'success' ? '✓' : '✗'} {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Schedule</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Viewings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {viewings.filter(v => v.status === 'scheduled' || v.status === 'confirmed').length} upcoming &middot; {viewings.length} total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-sm"
        >
          <Plus size={16} /> Schedule Viewing
        </button>
      </div>

      {/* Upcoming Strip */}
      {upcoming.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {upcoming.map(v => (
            <div key={v.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${STATUS_COLORS[v.status] || 'bg-gray-400'}`}>
                  {v.status}
                </span>
              </div>
              <p className="font-semibold text-sm text-foreground leading-snug mb-1 truncate">
                {v.properties?.title || 'Property'}
              </p>
              <p className="text-xs text-muted-foreground">
                {v.contacts?.first_name || v.leads?.first_name || 'Guest'} {v.contacts?.last_name || v.leads?.last_name || ''}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                <CalendarDays size={11} />
                {new Date(v.scheduled_at).toLocaleDateString()} &nbsp;
                <Clock size={11} />
                {new Date(v.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex gap-1.5 mt-3">
                <button
                  onClick={() => updateStatus(v.id, 'completed')}
                  className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  <CheckCircle size={10} /> Done
                </button>
                <button
                  onClick={() => updateStatus(v.id, 'cancelled')}
                  className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors"
                >
                  <XCircle size={10} /> Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm p-4" style={{ height: 580 }}>
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
            style: {
              backgroundColor: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              borderRadius: '6px',
              border: 'none',
              fontSize: '11px',
              padding: '2px 6px',
            }
          })}
        />
      </div>

      {/* Schedule Viewing Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-display font-bold">Schedule Viewing</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateViewing} className="space-y-4">
              {/* Property — required */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  <Building2 size={11} className="inline mr-1" />Property *
                </label>
                {properties.length === 0 ? (
                  <p className="text-xs text-amber-600 border border-amber-200 bg-amber-50 rounded-lg px-3 py-2">
                    No active properties found. Add a property first.
                  </p>
                ) : (
                  <select
                    required
                    className={inputClass}
                    value={newViewing.property_id}
                    onChange={e => setNewViewing(p => ({ ...p, property_id: e.target.value }))}
                  >
                    <option value="">— Select property —</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.title} ({p.city})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Contact */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  <User size={11} className="inline mr-1" />Contact
                </label>
                <select
                  className={inputClass}
                  value={newViewing.contact_id}
                  onChange={e => setNewViewing(p => ({ ...p, contact_id: e.target.value }))}
                >
                  <option value="">— No contact —</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name || ''}</option>
                  ))}
                </select>
              </div>

              {/* Lead */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  <User size={11} className="inline mr-1" />Lead (optional)
                </label>
                <select
                  className={inputClass}
                  value={newViewing.lead_id}
                  onChange={e => setNewViewing(p => ({ ...p, lead_id: e.target.value }))}
                >
                  <option value="">— No lead —</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.first_name} {l.last_name || ''}</option>
                  ))}
                </select>
              </div>

              {/* Date, Time, Duration */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Date *</label>
                  <input
                    type="date"
                    required
                    className={inputClass}
                    value={newViewing.date}
                    onChange={e => setNewViewing(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Time</label>
                  <input
                    type="time"
                    className={inputClass}
                    value={newViewing.time}
                    onChange={e => setNewViewing(p => ({ ...p, time: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Duration</label>
                  <select
                    className={inputClass}
                    value={newViewing.duration}
                    onChange={e => setNewViewing(p => ({ ...p, duration: e.target.value }))}
                  >
                    <option value="30">30 min</option>
                    <option value="60">1 hour</option>
                    <option value="90">90 min</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Status</label>
                <select
                  className={inputClass}
                  value={newViewing.status}
                  onChange={e => setNewViewing(p => ({ ...p, status: e.target.value }))}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Any notes for the agent or client…"
                  className={inputClass}
                  value={newViewing.notes}
                  onChange={e => setNewViewing(p => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !newViewing.property_id}
                  className="px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all"
                >
                  {saving ? 'Saving…' : 'Schedule Viewing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
