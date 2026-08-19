'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { useCurrency } from '@/components/CurrencyContext'
import {
  Plus, X, Search, Filter, Mail, Trash2, Phone, User,
  Building2, LayoutGrid, List, CheckCircle2, DollarSign, Download
} from 'lucide-react'

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

const STAGES = ['new', 'contacted', 'qualified', 'negotiation', 'converted']

const STAGE_LABELS: Record<string, { bs: string; en: string; color: string; bg: string }> = {
  new: { bs: '1. Novi Upiti', en: '1. New Leads', color: '#C9963B', bg: '#FAF8F5' },
  contacted: { bs: '2. Kontaktirani', en: '2. Contacted', color: '#2563EB', bg: '#EFF6FF' },
  qualified: { bs: '3. Obilazak', en: '3. Viewing / Qualified', color: '#9333EA', bg: '#F3E8FF' },
  negotiation: { bs: '4. Pregovori', en: '4. Negotiation', color: '#D97706', bg: '#FEF3C7' },
  converted: { bs: '5. Prodano ✓', en: '5. Closed Won ✓', color: '#059669', bg: '#ECFDF5' },
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
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board')
  const [toasts, setToasts] = useState<Toast[]>([])

  // New Lead Modal
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    source: 'olx',
    stage: 'new',
    budget_min: '',
    budget_max: '',
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

      if (data && data.length > 0) {
        setLeads(data as Lead[])
      } else {
        setLeads([])
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadLeads() }, [loadLeads])

  const updateStage = async (id: string, stage: string) => {
    const supabase = createBrowserClient()
    await supabase.from('leads').update({ stage, status: stage }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage, status: stage } : l))
    toast(locale === 'bs' ? `Faza je promijenjena u "${STAGE_LABELS[stage]?.bs || stage}"` : `Stage updated to "${stage}"`)
  }

  const deleteLead = async (id: string) => {
    if (!confirm(locale === 'bs' ? 'Da li ste sigurni da želite obrisati ovog klijenta?' : 'Are you sure you want to delete this lead?')) return
    const supabase = createBrowserClient()
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Klijent je obrisan!')
      setLeads(prev => prev.filter(l => l.id !== id))
    }
  }

  const exportLeadsCSV = () => {
    if (leads.length === 0) return
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Stage', 'Status', 'Source', 'Budget Min', 'Budget Max', 'Requirements', 'Rating', 'Tags', 'Created At']
    const rows = leads.map(l => [
      l.first_name || '',
      l.last_name || '',
      l.email || '',
      l.phone || '',
      l.company || '',
      l.stage || '',
      l.status || '',
      l.source || '',
      l.budget_min || '',
      l.budget_max || '',
      (l.requirements || '').replace(/"/g, '""'),
      l.rating || '',
      Array.isArray(l.tags) ? l.tags.join('; ') : '',
      l.created_at ? new Date(l.created_at).toLocaleDateString() : ''
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `estateline-leads-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name.trim()) return
    setSaving(true)

    if (orgId) {
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
      if (error) {
        toast(error.message, 'error')
      } else {
        toast('Novi klijent je dodan!')
        setIsOpen(false)
        setForm({ first_name: '', last_name: '', email: '', phone: '', source: 'olx', stage: 'new', budget_min: '', budget_max: '' })
        loadLeads()
      }
    } else {
      const newLead: Lead = {
        id: crypto.randomUUID(),
        first_name: form.first_name,
        last_name: form.last_name || null,
        email: form.email || null,
        phone: form.phone || null,
        stage: form.stage,
        status: form.stage,
        source: form.source,
        budget_min: form.budget_min ? parseFloat(form.budget_min) : null,
        budget_max: form.budget_max ? parseFloat(form.budget_max) : null,
        created_at: new Date().toISOString(),
      }
      setLeads(prev => [newLead, ...prev])
      toast('Klijent je dodan!')
      setIsOpen(false)
      setForm({ first_name: '', last_name: '', email: '', phone: '', source: 'olx', stage: 'new', budget_min: '', budget_max: '' })
    }
    setSaving(false)
  }

  const filteredLeads = search
    ? leads.filter(l =>
      `${l.first_name} ${l.last_name} ${l.email} ${l.phone}`.toLowerCase().includes(search.toLowerCase())
    )
    : leads

  const leadsByStage = Object.fromEntries(
    STAGES.map(s => [s, filteredLeads.filter(l => (l.stage || l.status) === s)])
  )

  if (loading) {
    return (
      <div className="w-full space-y-6 py-12">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-96 rounded-3xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-4 font-sans animate-fade-in">
      {/* Toast Notifications */}
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
          <p className="page-eyebrow mb-1">RAD SA KLIJENTIMA</p>
          <h1
            className="text-3xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
          >
            {t('title') || 'Potencijalni Kupci (Leads)'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Praćenje zahtjeva kupaca po fazama pregovora i kupovine nekretnine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportLeadsCSV}
            disabled={leads.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={15} />
            <span>Izvoz CSV</span>
          </button>

          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white shadow-md transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #C9963B 0%, #b88328 100%)',
              boxShadow: '0 4px 16px rgba(201,150,59,0.25)',
            }}
          >
            <Plus size={16} />
            <span>Dodaj Klijenta</span>
          </button>
        </div>
      </header>

      {/* Controls Bar */}
      <div className="bg-white rounded-3xl border border-gray-200/70 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pretraži po imenu, emailu ili telefonu..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
          />
        </div>

        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
          <button
            onClick={() => setViewMode('board')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'board' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            <LayoutGrid size={14} />
            <span>Kanban Ljevak</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            <List size={14} />
            <span>Tabela</span>
          </button>
        </div>
      </div>

      {/* Top-level empty state — brand-new agency has no leads yet */}
      {filteredLeads.length === 0 && !loading && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-3xl border-2 border-dashed border-[#C9963B]/40 p-10 text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-[#C9963B] flex items-center justify-center mx-auto border border-amber-200">
            <User size={28} />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}>
              {locale === 'bs' ? 'Upišite svoju prvu stranku' : 'Capture your first lead'}
            </h3>
            <p className="text-xs text-gray-600">
              {locale === 'bs'
                ? 'Dodajte potencijalnog kupca ili prodavca i pokrenite vaš prodajni pipeline.'
                : 'Add your first buyer or seller and start moving them through your pipeline.'}
            </p>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="px-6 py-3 bg-[#C9963B] hover:bg-[#b88328] text-white font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            <Plus size={14} className="inline mr-1" />
            {locale === 'bs' ? 'Dodaj prvog klijenta' : 'Add first lead'}
          </button>
        </div>
      )}

      {/* Kanban Board View */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 overflow-x-auto pb-6">
          {STAGES.map((stage) => {
            const items = leadsByStage[stage] || []
            const meta = STAGE_LABELS[stage]
            return (
              <div key={stage} className="bg-white rounded-3xl border border-gray-200/70 p-4 flex flex-col space-y-3 shadow-sm min-w-[220px]">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta?.color || '#C9963B' }} />
                    <span className="text-xs font-bold text-gray-900">
                      {locale === 'bs' ? meta?.bs : meta?.en}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-gray-700 bg-gray-100">
                    {items.length}
                  </span>
                </div>

                {/* Lead Cards */}
                <div className="space-y-3 flex-1">
                  {items.map((lead) => {
                    const initials = `${lead.first_name?.[0] ?? ''}${lead.last_name?.[0] ?? ''}`.toUpperCase() || 'K'
                    return (
                      <div
                        key={lead.id}
                        className="bg-[#FAF8F5] border border-gray-200/80 rounded-2xl p-4 space-y-3 hover:border-[#C9963B] transition-all shadow-sm group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center border border-amber-200">
                              {initials}
                            </div>
                            <div>
                              <Link href={`/dashboard/leads/${lead.id}`} className="block">
                                <h4 className="font-bold text-sm text-gray-900 group-hover:text-[#C9963B] transition-colors">
                                  {lead.first_name} {lead.last_name || ''}
                                </h4>
                              </Link>
                              <span className="text-[10px] text-gray-400 font-medium">Izvor: {lead.source || 'OLX'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Contact details */}
                        <div className="space-y-1 text-xs text-gray-600">
                          {lead.phone && (
                            <div className="flex items-center justify-between">
                              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-[#C9963B] transition-colors">
                                <Phone size={12} className="text-gray-400" />
                                <span>{lead.phone}</span>
                              </a>
                              <WhatsAppButton phone={lead.phone} entityType="lead" entityId={lead.id} />
                            </div>
                          )}
                          {lead.email && (
                            <p className="flex items-center gap-1 text-[11px] text-gray-500 truncate">
                              <Mail size={11} className="text-gray-400 shrink-0" />
                              <span className="truncate">{lead.email}</span>
                            </p>
                          )}
                        </div>

                        {/* Budget Tag */}
                        {(lead.budget_min || lead.budget_max) && (
                          <div className="bg-white border border-gray-200/80 rounded-xl p-2 text-xs">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Budžet Klijenta</span>
                            <span className="font-bold text-gray-900">
                              {lead.budget_min ? formatPrice(lead.budget_min) : '—'} - {lead.budget_max ? formatPrice(lead.budget_max) : '—'}
                            </span>
                          </div>
                        )}

                        {/* Action selector */}
                        <div className="flex items-center gap-2 pt-1 border-t border-gray-200/60">
                          <select
                            value={lead.stage || lead.status}
                            onChange={(e) => updateStage(lead.id, e.target.value)}
                            className="flex-1 text-xs font-semibold bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:border-[#C9963B]"
                          >
                            {STAGES.map((s) => (
                              <option key={s} value={s}>
                                {locale === 'bs' ? STAGE_LABELS[s]?.bs : STAGE_LABELS[s]?.en}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => deleteLead(lead.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {items.length === 0 && (
                    <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl">
                      Nema klijenata u ovoj fazi
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-3xl border border-gray-200/70 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">Ime Klijenta</th>
                <th className="px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">Telefon & WhatsApp</th>
                <th className="px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">Faza Pregovora</th>
                <th className="px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">Budžet</th>
                <th className="px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider text-right">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center">
                        {(lead.first_name?.[0] || 'K').toUpperCase()}
                      </div>
                      <div>
                        <Link href={`/dashboard/leads/${lead.id}`} className="block"><p className="font-bold text-gray-900 hover:text-[#C9963B] transition-colors">{lead.first_name} {lead.last_name}</p></Link>
                        <p className="text-xs text-gray-400">{lead.email || 'Nema email'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-gray-800">
                    {lead.phone ? (
                      <div className="flex items-center gap-2">
                        <span>{lead.phone}</span>
                        <WhatsAppButton phone={lead.phone} entityType="lead" entityId={lead.id} />
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={lead.stage || lead.status}
                      onChange={(e) => updateStage(lead.id, e.target.value)}
                      className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 focus:outline-none focus:border-[#C9963B]"
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {locale === 'bs' ? STAGE_LABELS[s]?.bs : STAGE_LABELS[s]?.en}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900 text-xs">
                    {lead.budget_min ? formatPrice(lead.budget_min) : '—'} - {lead.budget_max ? formatPrice(lead.budget_max) : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => deleteLead(lead.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Lead Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-xl font-bold text-gray-900">Dodaj Novog Kupca / Zahtjev</h3>
              <p className="text-xs text-gray-500 mt-1">Unesite kontakt podatke kupca i njegov budžet.</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Ime *</label>
                  <input
                    type="text"
                    required
                    placeholder="Emir"
                    value={form.first_name}
                    onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Prezime</label>
                  <input
                    type="text"
                    placeholder="Hadžić"
                    value={form.last_name}
                    onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Broj Telefona</label>
                <input
                  type="tel"
                  placeholder="+387 61 000 000"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">E-mail Adresa</label>
                <input
                  type="email"
                  placeholder="emir@email.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Budžet Min (€)</label>
                  <input
                    type="number"
                    placeholder="100000"
                    value={form.budget_min}
                    onChange={e => setForm(p => ({ ...p, budget_min: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Budžet Max (€)</label>
                  <input
                    type="number"
                    placeholder="200000"
                    value={form.budget_max}
                    onChange={e => setForm(p => ({ ...p, budget_max: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#C9963B] text-white font-semibold text-xs rounded-xl shadow-md hover:bg-[#b88328] transition-colors"
                >
                  {saving ? 'Sačuvavanje...' : 'Sačuvaj Klijenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
