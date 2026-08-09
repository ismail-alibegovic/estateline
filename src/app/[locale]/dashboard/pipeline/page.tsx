'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Plus, X, TrendingUp, DollarSign, FileText, Trash2, Building2, User, CheckCircle2, ChevronRight } from 'lucide-react'
import { useCurrency } from '@/components/CurrencyContext'

interface DealItem {
  id: string
  title: string
  contact_name: string
  property_title: string
  price: number
  stage: 'new' | 'viewing' | 'negotiation' | 'under_contract' | 'closed_won'
  expected_date?: string
  commission?: number
}

const STAGES = [
  { id: 'new', label: '1. Novi Upiti', color: '#2563EB', bg: '#EFF6FF' },
  { id: 'viewing', label: '2. Zakazan Obilazak', color: '#9333EA', bg: '#F3E8FF' },
  { id: 'negotiation', label: '3. U Pregovorima', color: '#D97706', bg: '#FEF3C7' },
  { id: 'under_contract', label: '4. Ugovor & Kapara', color: '#C9963B', bg: '#FAF8F5' },
  { id: 'closed_won', label: '5. Prodano (Završeno)', color: '#059669', bg: '#ECFDF5' },
] as const

type Toast = { id: string; message: string; type: 'success' | 'error' }

export default function KanbanPage() {
  const { formatPrice } = useCurrency()
  const [deals, setDeals] = useState<DealItem[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const [form, setForm] = useState({
    title: '',
    contact_name: '',
    property_title: '',
    price: '',
    stage: 'new' as DealItem['stage'],
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
      setOrgId(oid)

      const { data: dealsData } = await supabase
        .from('deals')
        .select('*, properties(title), contacts(first_name, last_name)')
        .eq('organization_id', oid)
        .order('created_at', { ascending: false })

      if (dealsData && dealsData.length > 0) {
        setDeals(dealsData.map(d => ({
          id: d.id,
          title: d.title,
          contact_name: (d as any).contacts ? `${(d as any).contacts.first_name} ${(d as any).contacts.last_name || ''}` : 'Klijent',
          property_title: (d as any).properties?.title || 'Nekretnina',
          price: Number(d.price) || 0,
          stage: (['new', 'viewing', 'negotiation', 'under_contract', 'closed_won'].includes(d.stage) ? d.stage : 'new') as any,
          commission: Number(d.commission_amount) || Math.round((Number(d.price) || 0) * 0.03),
        })))
      } else {
        setDeals([])
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const moveStage = async (dealId: string, nextStage: DealItem['stage']) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: nextStage } : d))
    toast('Faza posla je ažurirana!')

    if (orgId && !dealId.startsWith('deal-')) {
      const supabase = createBrowserClient()
      await supabase.from('deals').update({ stage: nextStage }).eq('id', dealId)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)

    const newDeal: DealItem = {
      id: `deal-${Date.now()}`,
      title: form.title,
      contact_name: form.contact_name || 'Novi Kupac',
      property_title: form.property_title || 'Nekretnina',
      price: parseFloat(form.price) || 200000,
      stage: form.stage,
      commission: Math.round((parseFloat(form.price) || 200000) * 0.03),
    }

    setDeals(prev => [newDeal, ...prev])
    toast('Novi posao je kreiran u pipeline-u!')
    setShowModal(false)
    setForm({ title: '', contact_name: '', property_title: '', price: '', stage: 'new' })
    setSaving(false)
  }

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
    <div className="max-w-[1600px] mx-auto space-y-8 py-4 font-sans animate-fade-in">
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
          <p className="page-eyebrow mb-1">PRODAJNI PIPELINE AGENCIJE</p>
          <h1
            className="text-3xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
          >
            Prodajne Faze & Deal-ovi
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Kanban tabla za praćenje pregovora, ponuda, kapara i ugovorenih provizija.
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
          <span>Dodaj Novi Posao</span>
        </button>
      </header>

      {/* 5-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage.id)
          const totalVal = stageDeals.reduce((sum, d) => sum + d.price, 0)

          return (
            <div key={stage.id} className="bg-gray-100/70 rounded-3xl p-4 border border-gray-200/60 flex flex-col justify-between min-h-[550px] space-y-4">
              <div className="space-y-3">
                {/* Stage Header */}
                <div className="bg-white rounded-2xl p-3.5 border border-gray-200/70 shadow-sm flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-900">{stage.label}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border" style={{ color: stage.color, background: stage.bg, borderColor: `${stage.color}30` }}>
                      {stageDeals.length}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-gray-500 mt-1">{formatPrice(totalVal)}</p>
                </div>

                {/* Deal Cards */}
                <div className="space-y-3">
                  {stageDeals.map(d => (
                    <div
                      key={d.id}
                      className="bg-white rounded-2xl p-4 border border-gray-200/70 shadow-sm hover:border-[#C9963B] transition-all space-y-3 group"
                    >
                      <div>
                        <h4 className="font-bold text-xs text-gray-900 group-hover:text-[#C9963B] transition-colors">{d.title}</h4>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-1">
                          <Building2 size={12} className="text-gray-400" />
                          <span className="truncate">{d.property_title}</span>
                        </p>
                      </div>

                      <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-gray-100 space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-gray-500">Cijena:</span>
                          <span className="font-bold text-gray-900">{formatPrice(d.price)}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-gray-500">Kupac:</span>
                          <span className="font-bold text-gray-800">{d.contact_name}</span>
                        </div>
                        {d.commission && (
                          <div className="flex justify-between text-[11px] pt-1 border-t border-gray-200/50">
                            <span className="text-[#C9963B] font-bold">Provizija (3%):</span>
                            <span className="font-bold text-[#C9963B]">{formatPrice(d.commission)}</span>
                          </div>
                        )}
                      </div>

                      {/* Move Stage Selector */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-gray-400">Pomjeri fazu:</span>
                        <select
                          value={d.stage}
                          onChange={e => moveStage(d.id, e.target.value as any)}
                          className="text-[10px] font-bold px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 outline-none focus:border-[#C9963B]"
                        >
                          <option value="new">Upit</option>
                          <option value="viewing">Obilazak</option>
                          <option value="negotiation">Pregovori</option>
                          <option value="under_contract">Kapara</option>
                          <option value="closed_won">Prodano</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* New Deal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>

            <div>
              <h3 className="text-xl font-bold text-gray-900">Dodaj Novi Posao</h3>
              <p className="text-xs text-gray-500 mt-1">Unesite detalje pregovora i povežite nekretninu i kupca.</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Naziv Posla *</label>
                <input
                  type="text"
                  required
                  placeholder="Kupoprodaja stana na Skenderiji..."
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Ime Kupca</label>
                <input
                  type="text"
                  placeholder="Emir Hadžić"
                  value={form.contact_name}
                  onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Vrijednost (€)</label>
                  <input
                    type="number"
                    placeholder="345000"
                    value={form.price}
                    onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Faza</label>
                  <select
                    value={form.stage}
                    onChange={e => setForm(p => ({ ...p, stage: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  >
                    <option value="new">Novi Upit</option>
                    <option value="viewing">Obilazak</option>
                    <option value="negotiation">Pregovori</option>
                    <option value="under_contract">Kapara</option>
                    <option value="closed_won">Prodano</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">
                  Odustani
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#C9963B] text-white font-semibold text-xs rounded-xl shadow-md hover:bg-[#b88328] transition-colors">
                  {saving ? 'Sačuvavanje...' : 'Sačuvaj Posao'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
