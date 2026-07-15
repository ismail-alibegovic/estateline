'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { useCurrency } from '@/components/CurrencyContext'
import { Plus, X, Search, Filter, Mail, Trash2 } from 'lucide-react'

type Lead = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  stage: string
  status: string
  source: string
  budget_min: number | null
  budget_max: number | null
  created_at: string
}

const STAGES = ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost']

const STAGE_COLORS: Record<string, string> = {
  new: 'badge-gold',
  contacted: 'badge-indigo',
  qualified: 'badge-sage',
  unqualified: 'badge-rose opacity-60',
  converted: 'badge-sage',
  lost: 'badge-rose',
}

const STAGE_HEADER_COLORS: Record<string, string> = {
  new: 'bg-[#5fa1e0]',
  contacted: 'bg-[#8b5cf6]',
  qualified: 'bg-[#10b981]',
  unqualified: 'bg-neutral-400',
  converted: 'bg-[#12533F]',
  lost: 'bg-rose-500',
}

type Toast = { id: string; message: string; type: 'success' | 'error' }

export default function LeadsPage() {
  const t = useTranslations('leads')
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const { formatPrice } = useCurrency()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])

  // New Lead Modal
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    source: 'website', stage: 'new',
    budget_min: '', budget_max: '',
  })

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  const loadLeads = useCallback(async () => {
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
        .from('leads')
        .select('id, first_name, last_name, email, phone, stage, status, source, budget_min, budget_max, created_at')
        .eq('organization_id', (member as any).organization_id)
        .order('created_at', { ascending: false })
      if (data) setLeads(data as Lead[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadLeads() }, [loadLeads])

  const updateStage = async (id: string, stage: string) => {
    const supabase = createBrowserClient()
    await supabase.from('leads').update({ stage, status: stage }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage, status: stage } : l))
  }

  const deleteLead = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return
    const supabase = createBrowserClient()
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Lead deleted!')
      setLeads(prev => prev.filter(l => l.id !== id))
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId || !form.first_name.trim()) return
    setSaving(true)

    const supabase = createBrowserClient()
    const { error } = await supabase.from('leads').insert({
      organization_id: orgId,
      first_name: form.first_name,
      last_name: form.last_name || null,
      email: form.email || null,
      phone: form.phone || null,
      source: form.source,
      stage: form.stage,
      status: form.stage,
      budget_min: form.budget_min ? parseFloat(form.budget_min) : null,
      budget_max: form.budget_max ? parseFloat(form.budget_max) : null,
    })

    setSaving(false)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Lead added successfully!')
      setIsOpen(false)
      setForm({ first_name: '', last_name: '', email: '', phone: '', source: 'website', stage: 'new', budget_min: '', budget_max: '' })
      loadLeads()
    }
  }

  const filteredLeads = search
    ? leads.filter(l =>
      `${l.first_name} ${l.last_name} ${l.email} ${l.phone}`.toLowerCase().includes(search.toLowerCase())
    )
    : leads

  const leadsByStage = Object.fromEntries(
    STAGES.map(s => [s, filteredLeads.filter(l => (l.stage || l.status) === s)])
  )

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
      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border animate-in slide-in-from-bottom-2 ${t.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
              }`}
          >
            {t.type === 'success' ? '✓' : '✗'} {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">CRM</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{leads.length} leads total</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search leads…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none w-48"
            />
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus size={16} />
            Add Lead
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      {leads.length === 0 && !search ? (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border rounded-2xl bg-card">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Filter size={24} className="text-muted-foreground" />
          </div>
          <h3 className="font-display font-semibold text-foreground mb-1">No leads yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Add your first lead to start tracking your pipeline.</p>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all"
          >
            <Plus size={16} /> Add First Lead
          </button>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-6">
          {STAGES.map((stage) => {
            const items = leadsByStage[stage] || []
            return (
              <section key={stage} className="min-w-[240px] flex-shrink-0 flex flex-col">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STAGE_HEADER_COLORS[stage]}`} />
                  <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/70 capitalize">{stage}</h2>
                  <span className={`ml-auto text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white ${STAGE_HEADER_COLORS[stage]}`}>{items.length}</span>
                </div>
                <div className="flex-1 space-y-2 min-h-[80px]">
                  {items.map((lead) => {
                    const initials = `${lead.first_name?.[0] ?? ''}${lead.last_name?.[0] ?? ''}`.toUpperCase() || '?'
                    return (
                      <article
                        key={lead.id}
                        className="bg-card border border-border/80 rounded-xl px-4 py-3.5 hover:border-primary/20 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-amber-500/10 border border-amber-500/20 text-[#C9963B] shadow-sm">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-xs text-neutral-800 leading-tight truncate">
                              {lead.first_name} {lead.last_name || ''}
                            </p>
                          </div>
                        </div>
                        {lead.email && <p className="text-xs text-muted-foreground mt-0.5 truncate">{lead.email}</p>}
                        {lead.phone && (
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">{lead.phone}</p>
                            <WhatsAppButton phone={lead.phone} entityType="lead" entityId={lead.id} />
                          </div>
                        )}
                        {(lead.budget_min || lead.budget_max) && (
                          <div className="mt-2 px-2 py-1 rounded-md bg-background/60 border border-border/60">
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Budget</p>
                            <p className="text-xs font-bold text-foreground">
                              {lead.budget_min ? formatPrice(lead.budget_min) : '?'}
                              {' — '}
                              {lead.budget_max ? formatPrice(lead.budget_max) : '?'}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-2">
                          <select
                            value={lead.stage || lead.status}
                            onChange={(e) => updateStage(lead.id, e.target.value)}
                            className="flex-1 text-xs border border-border/50 bg-background/80 rounded-lg px-2 py-1 text-muted-foreground focus:ring-1 focus:ring-primary/20 outline-none"
                          >
                            {STAGES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => deleteLead(lead.id)}
                            className="p-1 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                            title="Delete Lead"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </article>
                    )
                  })}
                  {items.length === 0 && (
                    <div className="text-xs text-muted-foreground/40 text-center py-8 border border-dashed border-border rounded-xl">
                      Drop leads here
                    </div>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* New Lead Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold font-display">New Lead</h2>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">First Name *</label>
                  <input type="text" required placeholder="John" className={inputClass} value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Last Name</label>
                  <input type="text" placeholder="Smith" className={inputClass} value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Email</label>
                <input type="email" placeholder="john@example.com" className={inputClass} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Phone</label>
                <input type="tel" placeholder="+387 61 123 456" className={inputClass} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Stage</label>
                  <select className={inputClass} value={form.stage} onChange={e => setForm(p => ({ ...p, stage: e.target.value }))}>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Source</label>
                  <select className={inputClass} value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="social">Social Media</option>
                    <option value="portal">Property Portal</option>
                    <option value="cold_call">Cold Call</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Budget Min (€)</label>
                  <input type="number" placeholder="50000" min="0" className={inputClass} value={form.budget_min} onChange={e => setForm(p => ({ ...p, budget_min: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Budget Max (€)</label>
                  <input type="number" placeholder="200000" min="0" className={inputClass} value={form.budget_max} onChange={e => setForm(p => ({ ...p, budget_max: e.target.value }))} />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all text-sm mt-2"
              >
                {saving ? 'Saving…' : 'Add Lead'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
