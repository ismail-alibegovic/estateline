'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import {
  Phone, Users, Mail, Plus, Search,
  Calendar, Clock, MessageSquare, Trash2, X, MapPin, User, Building2
} from 'lucide-react'

interface Communication {
  id: string
  type: 'call' | 'meeting' | 'email'
  title: string
  summary: string | null
  duration_minutes: number | null
  scheduled_at: string
  created_at: string
  location: string | null
  contact_id: string | null
  lead_id: string | null
  attendee_contact_ids: string[] | null
  attendee_lead_ids: string[] | null
  contacts?: { first_name: string; last_name: string | null } | null
  leads?: { first_name: string; last_name: string | null } | null
}

interface ContactOption { id: string; first_name: string; last_name: string | null }
interface LeadOption { id: string; first_name: string; last_name: string | null }

type Toast = { id: string; message: string; type: 'success' | 'error' }

export default function CommunicationsPage() {
  const [comms, setComms] = useState<Communication[]>([])
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'call' | 'meeting' | 'email'>('all')
  const [toasts, setToasts] = useState<Toast[]>([])

  // Modal State
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<'call' | 'meeting' | 'email'>('call')
  const [newSummary, setNewSummary] = useState('')
  const [newDuration, setNewDuration] = useState(10)
  const [newDate, setNewDate] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newContactId, setNewContactId] = useState('')
  const [newLeadId, setNewLeadId] = useState('')
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])

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
      setOrgId(oid)

      const [commsResp, contactsResp, leadsResp] = await Promise.all([
        supabase
          .from('communications')
          .select('*, contacts(first_name, last_name), leads(first_name, last_name)')
          .eq('organization_id', oid)
          .order('created_at', { ascending: false }),
        supabase.from('contacts').select('id, first_name, last_name').eq('organization_id', oid).order('first_name'),
        supabase.from('leads').select('id, first_name, last_name').eq('organization_id', oid).order('first_name'),
      ])

      if (commsResp.data) setComms(commsResp.data as Communication[])
      if (contactsResp.data) setContacts(contactsResp.data as ContactOption[])
      if (leadsResp.data) setLeads(leadsResp.data as LeadOption[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !orgId) return
    setSaving(true)

    const supabase = createBrowserClient()
    const { error } = await supabase.from('communications').insert({
      organization_id: orgId,
      type: newType,
      title: newTitle,
      summary: newSummary || null,
      duration_minutes: Number(newDuration) || null,
      scheduled_at: newDate ? new Date(newDate).toISOString() : new Date().toISOString(),
      location: newType === 'meeting' ? (newLocation || null) : null,
      contact_id: newType !== 'meeting' ? (newContactId || null) : null,
      lead_id: newType !== 'meeting' ? (newLeadId || null) : null,
      attendee_contact_ids: newType === 'meeting' ? selectedContacts : [],
      attendee_lead_ids: newType === 'meeting' ? selectedLeads : [],
    })

    setSaving(false)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Communication logged!')
      setNewTitle(''); setNewType('call'); setNewSummary(''); setNewDuration(10); setNewDate('')
      setNewLocation(''); setNewContactId(''); setNewLeadId('')
      setSelectedContacts([]); setSelectedLeads([])
      setIsOpen(false)
      loadData()
    }
  }

  const deleteComm = async (id: string) => {
    const supabase = createBrowserClient()
    await supabase.from('communications').delete().eq('id', id)
    setComms(prev => prev.filter(c => c.id !== id))
    toast('Log deleted')
  }

  const filteredComms = comms.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
                         (c.summary || '').toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || c.type === typeFilter
    return matchesSearch && matchesType
  })

  const totalCalls = comms.filter(c => c.type === 'call').length
  const totalMeetings = comms.filter(c => c.type === 'meeting').length
  const totalEmails = comms.filter(c => c.type === 'email').length

  const typeIcon = {
    call: <Phone size={16} className="text-[#5fa1e0]" />,
    meeting: <Users size={16} className="text-[#C9963B]" />,
    email: <Mail size={16} className="text-[#10b981]" />,
  }

  const typeBg = {
    call: 'bg-[#5fa1e0]/10 border-[#5fa1e0]/20',
    meeting: 'bg-[#C9963B]/10 border-[#C9963B]/20',
    email: 'bg-[#10b981]/10 border-[#10b981]/20',
  }

  const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full" />
      </div>
    )
  }

  const metricsCards = [
    {
      label: 'Calls',
      value: totalCalls,
      icon: Phone,
      gradient: 'linear-gradient(135deg, #101c2b 0%, #070e17 100%)',
      accentColor: '#5fa1e0',
      lightBg: 'rgba(95, 161, 224, 0.15)',
    },
    {
      label: 'Meetings',
      value: totalMeetings,
      icon: Users,
      gradient: 'linear-gradient(135deg, #1e160a 0%, #0c0803 100%)',
      accentColor: '#C9963B',
      lightBg: 'rgba(201, 150, 59, 0.15)',
    },
    {
      label: 'Emails',
      value: totalEmails,
      icon: Mail,
      gradient: 'linear-gradient(135deg, #091a14 0%, #030a07 100%)',
      accentColor: '#10b981',
      lightBg: 'rgba(16, 185, 129, 0.15)',
    },
  ]

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
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">CRM</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Communications</h1>
          <p className="text-sm text-muted-foreground mt-1">Log calls, meetings, and emails with clients.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-sm"
        >
          <Plus size={16} /> Log Communication
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-3 gap-4">
        {metricsCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="rounded-2xl overflow-hidden shadow-sm"
              style={{
                background: card.gradient,
                boxShadow: `0 4px 24px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.06) inset`,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = `0 8px 36px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.06) inset`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = `0 4px 24px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.06) inset`
              }}
            >
              <div className="p-4 flex items-center gap-4">
                <div
                  className="p-2.5 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: card.lightBg }}
                >
                  <Icon size={18} style={{ color: card.accentColor }} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider leading-none" style={{ color: 'rgba(245,240,232,0.5)' }}>{card.label}</p>
                  <p
                    className="leading-none mt-1.5"
                    style={{
                      fontFamily: 'var(--font-display), Georgia, serif',
                      fontSize: 24,
                      fontWeight: 600,
                      color: '#f5f0e8',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card border border-border rounded-xl">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search communications…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none w-full"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'call', 'meeting', 'email'] as const).map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all capitalize flex items-center gap-1.5 ${
                typeFilter === type ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {type === 'call' && <Phone size={11} />}
              {type === 'meeting' && <Users size={11} />}
              {type === 'email' && <Mail size={11} />}
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {filteredComms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-2xl bg-card">
          <MessageSquare size={40} className="text-muted-foreground/30 mb-3" />
          <h3 className="font-display font-semibold text-foreground mb-1">No communications yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Start logging your calls, meetings, and emails.</p>
          {!search && typeFilter === 'all' && (
            <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90">
              <Plus size={16} /> Log First Communication
            </button>
          )}
        </div>
      ) : (
        <div className="relative space-y-4 before:absolute before:left-[22px] before:top-6 before:bottom-6 before:w-px before:bg-border">
          {filteredComms.map((log) => (
            <div key={log.id} className="relative pl-12 flex items-start gap-4">
              <div className={`absolute left-3 p-2 rounded-full border bg-card z-10 -translate-x-1/2 ${typeBg[log.type]}`}>
                {typeIcon[log.type]}
              </div>
              <div className="flex-1 p-4 bg-card border border-border rounded-xl hover:shadow-sm transition-all flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground text-sm leading-tight">{log.title}</h3>
                    <span className={`badge ${
                      log.type === 'call' ? 'badge-indigo' :
                      log.type === 'meeting' ? 'badge-gold' :
                      'badge-sage'
                    }`}>
                      {log.type}
                    </span>
                  </div>

                  {log.summary && <p className="text-muted-foreground text-xs leading-relaxed">{log.summary}</p>}

                  {/* Relations and Details */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 items-center text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(log.scheduled_at).toLocaleDateString()}
                    </span>
                    {log.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {log.duration_minutes} min
                      </span>
                    )}
                    {log.location && (
                      <span className="flex items-center gap-1 text-amber-700">
                        <MapPin size={11} />
                        {log.location}
                      </span>
                    )}
                    
                    {/* Related entity for calls and emails */}
                    {log.type !== 'meeting' && (log.contacts || log.leads) && (
                      <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider badge badge-indigo">
                        <User size={10} />
                        {log.contacts ? `Contact: ${log.contacts.first_name} ${log.contacts.last_name || ''}` : `Lead: ${log.leads?.first_name} ${log.leads?.last_name || ''}`}
                      </span>
                    )}

                    {/* Attendees count for meetings */}
                    {log.type === 'meeting' && (
                      <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider badge badge-gold">
                        <Users size={10} />
                        Attendees: {(log.attendee_contact_ids?.length || 0) + (log.attendee_lead_ids?.length || 0)} people
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteComm(log.id)}
                  className="text-muted-foreground hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log Comm Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold font-display">Log Communication</h2>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(['call', 'meeting', 'email'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewType(type)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs font-semibold capitalize ${
                      newType === type ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {type === 'call' && <Phone size={16} />}
                    {type === 'meeting' && <Users size={16} />}
                    {type === 'email' && <Mail size={16} />}
                    {type}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Title / Agenda *</label>
                <input type="text" required placeholder="e.g. Intro call about penthouse listing" className={inputClass} value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              </div>

              {/* Location Input for Meetings */}
              {newType === 'meeting' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Location / Meeting URL</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-3 text-muted-foreground" />
                    <input type="text" placeholder="e.g. Meeting Room A, Zoom link, or Cafe" className={`${inputClass} pl-9`} value={newLocation} onChange={e => setNewLocation(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Single contact/lead dropdown for calls & emails */}
              {newType !== 'meeting' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Related Contact</label>
                    <select className={inputClass} value={newContactId} onChange={e => { setNewContactId(e.target.value); if (e.target.value) setNewLeadId('') }}>
                      <option value="">— Select contact —</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.id}>{c.first_name} {c.last_name || ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Related Lead</label>
                    <select className={inputClass} value={newLeadId} onChange={e => { setNewLeadId(e.target.value); if (e.target.value) setNewContactId('') }}>
                      <option value="">— Select lead —</option>
                      {leads.map(l => (
                        <option key={l.id} value={l.id}>{l.first_name} {l.last_name || ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Multiple attendees selectors for Meetings */}
              {newType === 'meeting' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Contact Attendees</label>
                    <div className="border rounded-lg p-2 max-h-32 overflow-y-auto space-y-1 bg-neutral-50/50">
                      {contacts.map(c => (
                        <label key={c.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedContacts.includes(c.id)}
                            onChange={e => {
                              if (e.target.checked) setSelectedContacts(prev => [...prev, c.id])
                              else setSelectedContacts(prev => prev.filter(id => id !== c.id))
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          {c.first_name} {c.last_name || ''}
                        </label>
                      ))}
                      {contacts.length === 0 && <span className="text-muted-foreground text-xs p-1 block">No contacts found</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Lead Attendees</label>
                    <div className="border rounded-lg p-2 max-h-32 overflow-y-auto space-y-1 bg-neutral-50/50">
                      {leads.map(l => (
                        <label key={l.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(l.id)}
                            onChange={e => {
                              if (e.target.checked) setSelectedLeads(prev => [...prev, l.id])
                              else setSelectedLeads(prev => prev.filter(id => id !== l.id))
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          {l.first_name} {l.last_name || ''}
                        </label>
                      ))}
                      {leads.length === 0 && <span className="text-muted-foreground text-xs p-1 block">No leads found</span>}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Duration (min)</label>
                  <input type="number" min={1} className={inputClass} value={newDuration} onChange={e => setNewDuration(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Date & Time</label>
                  <input type="datetime-local" className={inputClass} value={newDate} onChange={e => setNewDate(e.target.value)} />
                </div>
              </div>

              <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all text-sm">
                {saving ? 'Saving…' : 'Save Log'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

