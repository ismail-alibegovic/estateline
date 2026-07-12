'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import {
  Phone, Users, Mail, Plus, Search,
  Calendar, Clock, MessageSquare, Trash2, X
} from 'lucide-react'

interface Communication {
  id: string
  type: 'call' | 'meeting' | 'email'
  title: string
  summary: string | null
  duration_minutes: number | null
  scheduled_at: string
  created_at: string
}

type Toast = { id: string; message: string; type: 'success' | 'error' }

export default function CommunicationsPage() {
  const [comms, setComms] = useState<Communication[]>([])
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

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  const loadComms = useCallback(async () => {
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
      setOrgId((member as any).organization_id)
      const { data } = await supabase
        .from('communications')
        .select('id, type, title, summary, duration_minutes, scheduled_at, created_at')
        .eq('organization_id', (member as any).organization_id)
        .order('created_at', { ascending: false })
      if (data) setComms(data as Communication[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadComms() }, [loadComms])

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
    })

    setSaving(false)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Communication logged!')
      setNewTitle(''); setNewType('call'); setNewSummary(''); setNewDuration(10); setNewDate('')
      setIsOpen(false)
      loadComms()
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
    call: <Phone size={16} className="text-primary" />,
    meeting: <Users size={16} className="text-amber-500" />,
    email: <Mail size={16} className="text-emerald-500" />,
  }

  const typeBg = {
    call: 'bg-primary/10 border-primary/20',
    meeting: 'bg-amber-500/10 border-amber-500/20',
    email: 'bg-emerald-500/10 border-emerald-500/20',
  }

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
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary"><Phone size={18} /></div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Calls</p>
            <p className="text-2xl font-bold font-display text-foreground">{totalCalls}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500"><Users size={18} /></div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Meetings</p>
            <p className="text-2xl font-bold font-display text-foreground">{totalMeetings}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500"><Mail size={18} /></div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Emails</p>
            <p className="text-2xl font-bold font-display text-foreground">{totalEmails}</p>
          </div>
        </div>
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
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeBg[log.type]} ${
                      log.type === 'call' ? 'text-primary' : log.type === 'meeting' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>{log.type}</span>
                  </div>
                  {log.summary && <p className="text-muted-foreground text-xs leading-relaxed">{log.summary}</p>}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl">
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Title *</label>
                <input type="text" required placeholder="e.g. Intro call about penthouse listing" className={inputClass} value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Summary & Notes</label>
                <textarea rows={3} placeholder="What was discussed? Client's response?" className={inputClass} value={newSummary} onChange={e => setNewSummary(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Duration (min)</label>
                  <input type="number" min={1} className={inputClass} value={newDuration} onChange={e => setNewDuration(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Date</label>
                  <input type="date" className={inputClass} value={newDate} onChange={e => setNewDate(e.target.value)} />
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
