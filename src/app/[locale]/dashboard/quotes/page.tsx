'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Plus, X, Landmark, FileText, User, Building2, Download, Printer, CheckCircle2 } from 'lucide-react'
import { useCurrency } from '@/components/CurrencyContext'

interface QuoteItem {
  id: string
  title: string
  client_name: string
  property_title: string
  property_price: number
  agency_fee_pct: number
  notary_fee_est: number
  total_investment: number
  status: 'sent' | 'accepted' | 'declined'
  created_at: string
}

const DEMO_QUOTES: QuoteItem[] = [
  {
    id: 'quote-1',
    title: 'Službena Ponuda - Stan Skenderija',
    client_name: 'Emir Hadžić',
    property_title: 'Dvoetažni Stan na Skenderiji (Podgaj 14)',
    property_price: 345000,
    agency_fee_pct: 3.0,
    notary_fee_est: 1200,
    total_investment: 356550,
    status: 'sent',
    created_at: new Date().toISOString(),
  },
  {
    id: 'quote-2',
    title: 'Agencijska Ponuda - Vila Ilidža',
    client_name: 'Belma Čolić',
    property_title: 'Moderna Porodična Vila sa Bazenom',
    property_price: 680000,
    agency_fee_pct: 3.0,
    notary_fee_est: 2500,
    total_investment: 702900,
    status: 'accepted',
    created_at: new Date().toISOString(),
  },
]

type Toast = { id: string; message: string; type: 'success' | 'error' }

export default function QuotesPage() {
  const { formatPrice } = useCurrency()
  const [quotes, setQuotes] = useState<QuoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [previewQuote, setPreviewQuote] = useState<QuoteItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const [form, setForm] = useState({
    title: '',
    client_name: '',
    property_title: '',
    property_price: '',
    agency_fee_pct: '3.0',
    notary_fee_est: '1200',
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
      setOrgId((member as any).organization_id)
      const { data: quotesResp } = await supabase
        .from('quotes')
        .select('*, properties(title, price), contacts(first_name, last_name)')
        .eq('organization_id', (member as any).organization_id)
        .order('created_at', { ascending: false })

      if (quotesResp && quotesResp.length > 0) {
        setQuotes(quotesResp.map(q => {
          const propPrice = Number((q as any).properties?.price || q.amount || 200000)
          const fee = Math.round(propPrice * 0.03)
          return {
            id: q.id,
            title: q.description || 'Agencijska Ponuda',
            client_name: (q as any).contacts ? `${(q as any).contacts.first_name} ${(q as any).contacts.last_name || ''}` : 'Kupac',
            property_title: (q as any).properties?.title || 'Nekretnina',
            property_price: propPrice,
            agency_fee_pct: 3.0,
            notary_fee_est: 1200,
            total_investment: propPrice + fee + 1200,
            status: 'sent',
            created_at: q.created_at,
          }
        }))
      } else {
        setQuotes(DEMO_QUOTES)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)

    const price = parseFloat(form.property_price) || 200000
    const feePct = parseFloat(form.agency_fee_pct) || 3.0
    const feeAmt = (price * feePct) / 100
    const notary = parseFloat(form.notary_fee_est) || 1200

    const newQuote: QuoteItem = {
      id: `quote-${Date.now()}`,
      title: form.title,
      client_name: form.client_name || 'Kupac',
      property_title: form.property_title || 'Nekretnina',
      property_price: price,
      agency_fee_pct: feePct,
      notary_fee_est: notary,
      total_investment: price + feeAmt + notary,
      status: 'sent',
      created_at: new Date().toISOString(),
    }

    setQuotes(prev => [newQuote, ...prev])
    toast('Agencijska ponuda je kreirana!')
    setForm({ title: '', client_name: '', property_title: '', property_price: '', agency_fee_pct: '3.0', notary_fee_est: '1200' })
    setIsOpen(false)
    setSaving(false)
  }

  const deleteQuote = (id: string) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovu ponudu?')) return
    setQuotes(prev => prev.filter(q => q.id !== id))
    toast('Ponuda je obrisana!')
  }

  if (loading) {
    return (
      <div className="w-full space-y-6 py-12">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="skeleton h-36 rounded-3xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4 font-sans animate-fade-in">
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
          <p className="page-eyebrow mb-1">FINANSIJSKE PONUDE AGENCIJE</p>
          <h1
            className="text-3xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
          >
            Ponude za Kupce
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Zvanične ponude nekretnina sa obračunom kupoprodajne cijene, agencijske provizije i notarskih taksi.
          </p>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white shadow-md transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #C9963B 0%, #b88328 100%)',
            boxShadow: '0 4px 16px rgba(201,150,59,0.25)',
          }}
        >
          <Plus size={16} />
          <span>Kreiraj Novu Ponudu</span>
        </button>
      </header>

      {/* Quotes Cards List */}
      <div className="space-y-4">
        {quotes.map(q => {
          const feeAmt = (q.property_price * q.agency_fee_pct) / 100

          return (
            <div
              key={q.id}
              className="bg-white border border-gray-200/70 rounded-3xl p-6 shadow-sm hover:border-[#C9963B] transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#C9963B] uppercase tracking-wider">Agencijski Obračun</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Poslano Kupcu
                  </span>
                </div>

                <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#C9963B] transition-colors">{q.title}</h3>

                <div className="text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Kupac: <b>{q.client_name}</b></span>
                  <span>Nekretnina: <b>{q.property_title}</b></span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 max-w-md text-xs text-gray-600">
                  <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 block">Cijena Nekretnine</span>
                    <span className="font-bold text-gray-900">{formatPrice(q.property_price)}</span>
                  </div>
                  <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-200/50">
                    <span className="text-[10px] text-amber-800 block">Provizija (3%)</span>
                    <span className="font-bold text-[#C9963B]">{formatPrice(feeAmt)}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 block">Notar (Procjena)</span>
                    <span className="font-bold text-gray-900">{formatPrice(q.notary_fee_est)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Ukupna Investicija</span>
                  <span className="text-2xl font-bold text-gray-900">{formatPrice(q.total_investment)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewQuote(q)}
                    className="px-4 py-2 bg-gray-100 hover:bg-[#C9963B] hover:text-white text-gray-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <FileText size={14} /> Pregled Ponude
                  </button>

                  <button
                    onClick={() => deleteQuote(q.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal New Quote */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 relative">
            <button onClick={() => setIsOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>

            <div>
              <h3 className="text-xl font-bold text-gray-900">Kreiraj Ponudu za Kupca</h3>
              <p className="text-xs text-gray-500 mt-1">Obračun ukupnih troškova za kupovinu nekretnine.</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Naslov Ponude *</label>
                <input
                  type="text"
                  required
                  placeholder="Službena Ponuda - Stan na Skenderiji"
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
                  value={form.client_name}
                  onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Naziv Nekretnine</label>
                <input
                  type="text"
                  placeholder="Dvoetažni Stan na Skenderiji"
                  value={form.property_title}
                  onChange={e => setForm(p => ({ ...p, property_title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Cijena (€)</label>
                  <input
                    type="number"
                    placeholder="345000"
                    value={form.property_price}
                    onChange={e => setForm(p => ({ ...p, property_price: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Provizija (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.agency_fee_pct}
                    onChange={e => setForm(p => ({ ...p, agency_fee_pct: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">
                  Odustani
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#C9963B] text-white font-semibold text-xs rounded-xl shadow-md hover:bg-[#b88328] transition-colors">
                  {saving ? 'Kreiranje...' : 'Sačuvaj Ponudu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview Quote */}
      {previewQuote && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative">
            <button onClick={() => setPreviewQuote(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>

            <div className="border-b border-gray-200 pb-4">
              <span className="text-[10px] font-bold text-[#C9963B] uppercase tracking-wider">ESTATELINE PREVIEW</span>
              <h3 className="text-xl font-bold text-gray-900 mt-1">{previewQuote.title}</h3>
              <p className="text-xs text-gray-500">Za kupca: <b>{previewQuote.client_name}</b></p>
            </div>

            <div className="space-y-3 text-xs text-gray-700 bg-[#FAF8F5] p-4 rounded-2xl border border-gray-100">
              <div className="flex justify-between py-1 border-b border-gray-200/50">
                <span>Predmet ponude:</span>
                <span className="font-bold text-gray-900">{previewQuote.property_title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200/50">
                <span>Cijena nekretnine:</span>
                <span className="font-bold text-gray-900">{formatPrice(previewQuote.property_price)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200/50">
                <span>Agencijska provizija ({previewQuote.agency_fee_pct}%):</span>
                <span className="font-bold text-[#C9963B]">{formatPrice((previewQuote.property_price * previewQuote.agency_fee_pct) / 100)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200/50">
                <span>Procijenjeni notarski troškovi:</span>
                <span className="font-bold text-gray-900">{formatPrice(previewQuote.notary_fee_est)}</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-bold text-gray-900 pt-2 border-t border-gray-300">
                <span>Ukupno potrebna investicija:</span>
                <span className="text-[#C9963B]">{formatPrice(previewQuote.total_investment)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { window.print(); }}
                className="px-5 py-2.5 bg-gray-900 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-md hover:bg-gray-800"
              >
                <Printer size={14} /> Odštampaj Ponudu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
