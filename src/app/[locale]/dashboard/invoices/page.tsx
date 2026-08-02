'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Plus, X, Receipt, Calculator, Building, Landmark, Trash2, Printer, CheckCircle2, Download } from 'lucide-react'
import { useCurrency } from '@/components/CurrencyContext'

interface InvoiceItem {
  id: string
  number: string
  client_name: string
  title: string
  subtotal: number
  tax: number
  grand_total: number
  status: 'paid' | 'pending' | 'overdue'
  due_date: string
  created_at: string
}

const DEMO_INVOICES: InvoiceItem[] = [
  {
    id: 'inv-1',
    number: 'INV-2026-104',
    client_name: 'Emir Hadžić',
    title: 'Agencijska Provizija za Stan na Skenderiji',
    subtotal: 10350,
    tax: 1759.5,
    grand_total: 12109.5,
    status: 'paid',
    due_date: '10. Aug 2026',
    created_at: new Date().toISOString(),
  },
  {
    id: 'inv-2',
    number: 'INV-2026-105',
    client_name: 'Belma Čolić',
    title: 'Agencijska Provizija za Vilu na Ilidži',
    subtotal: 20400,
    tax: 3468,
    grand_total: 23868,
    status: 'pending',
    due_date: '25. Aug 2026',
    created_at: new Date().toISOString(),
  },
]

type Toast = { id: string; message: string; type: 'success' | 'error' }

export default function InvoicesPage() {
  const { formatPrice } = useCurrency()
  const [invoices, setInvoices] = useState<InvoiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [previewInv, setPreviewInv] = useState<InvoiceItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const [form, setForm] = useState({
    title: '',
    client_name: '',
    subtotal: '',
    taxRate: '17',
    status: 'pending' as InvoiceItem['status'],
    due_date: '',
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
      const { data: invData } = await supabase
        .from('invoices')
        .select('*, contacts(first_name, last_name)')
        .eq('organization_id', (member as any).organization_id)
        .order('created_at', { ascending: false })

      if (invData && invData.length > 0) {
        setInvoices(invData.map(i => {
          const sub = Number(i.subtotal || i.total_amount || 10000)
          const taxVal = Math.round(sub * 0.17)
          return {
            id: i.id,
            number: i.number || `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
            client_name: (i as any).contacts ? `${(i as any).contacts.first_name} ${(i as any).contacts.last_name || ''}` : 'Klijent',
            title: i.title || 'Faktura za Agencijsku Uslugu',
            subtotal: sub,
            tax: taxVal,
            grand_total: sub + taxVal,
            status: i.status === 'paid' ? 'paid' : i.status === 'overdue' ? 'overdue' : 'pending',
            due_date: i.due_date || 'Nije definisano',
            created_at: i.created_at,
          }
        }))
      } else {
        setInvoices(DEMO_INVOICES)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)

    const sub = parseFloat(form.subtotal) || 10000
    const taxRateVal = parseFloat(form.taxRate) || 17
    const taxVal = Math.round(sub * (taxRateVal / 100))

    const newInv: InvoiceItem = {
      id: `inv-${Date.now()}`,
      number: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      client_name: form.client_name || 'Kupac',
      title: form.title,
      subtotal: sub,
      tax: taxVal,
      grand_total: sub + taxVal,
      status: form.status,
      due_date: form.due_date || new Date(Date.now() + 86400000 * 14).toLocaleDateString('bs-BA'),
      created_at: new Date().toISOString(),
    }

    setInvoices(prev => [newInv, ...prev])
    toast('Faktura je uspješno kreirana!')
    setForm({ title: '', client_name: '', subtotal: '', taxRate: '17', status: 'pending', due_date: '' })
    setIsOpen(false)
    setSaving(false)
  }

  const deleteInvoice = (id: string) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovu fakturu?')) return
    setInvoices(prev => prev.filter(i => i.id !== id))
    toast('Faktura je obrisana!')
  }

  if (loading) {
    return (
      <div className="w-full space-y-6 py-12">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-3xl" />
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
          <p className="page-eyebrow mb-1">EVIDENCIJA FAKTURA AGENCIJE</p>
          <h1
            className="text-3xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
          >
            Fakture & Provizije
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Izdavanje agencijskih računa, evidencija PDV-a i instant PDF preuzimanje faktura.
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
          <span>Nova Faktura</span>
        </button>
      </header>

      {/* Invoices List */}
      <div className="space-y-4">
        {invoices.map(inv => (
          <div
            key={inv.id}
            className="bg-white border border-gray-200/70 rounded-3xl p-6 shadow-sm hover:border-[#C9963B] transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#C9963B] font-mono">{inv.number}</span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  inv.status === 'paid'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : inv.status === 'overdue'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {inv.status === 'paid' ? 'Plaćeno' : inv.status === 'overdue' ? 'Kasni' : 'Čeka Uplatu'}
                </span>
              </div>

              <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#C9963B] transition-colors">{inv.title}</h3>
              <p className="text-xs text-gray-500">Kupac / Klijent: <b>{inv.client_name}</b> • Rok uplate: {inv.due_date}</p>
            </div>

            <div className="flex flex-col items-end gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Ukupno sa PDV-om (17%)</span>
                <span className="text-2xl font-bold text-gray-900">{formatPrice(inv.grand_total)}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewInv(inv)}
                  className="px-4 py-2 bg-gray-100 hover:bg-[#C9963B] hover:text-white text-gray-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Receipt size={14} /> PDF Faktura
                </button>

                <button
                  onClick={() => deleteInvoice(inv.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal New Invoice */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 relative">
            <button onClick={() => setIsOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>

            <div>
              <h3 className="text-xl font-bold text-gray-900">Kreiraj Novu Fakturu</h3>
              <p className="text-xs text-gray-500 mt-1">Unesite iznos agencijske usluge i podatke klijenta.</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Opis Usluge / Naslov *</label>
                <input
                  type="text"
                  required
                  placeholder="Agencijska provizija za posredovanje..."
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Ime Kupca / Klijenta</label>
                <input
                  type="text"
                  placeholder="Emir Hadžić"
                  value={form.client_name}
                  onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Osnovica (€)</label>
                  <input
                    type="number"
                    placeholder="10350"
                    value={form.subtotal}
                    onChange={e => setForm(p => ({ ...p, subtotal: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Status Uplate</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  >
                    <option value="pending">Čeka Uplatu</option>
                    <option value="paid">Plaćeno</option>
                    <option value="overdue">Kasni</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">
                  Odustani
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#C9963B] text-white font-semibold text-xs rounded-xl shadow-md hover:bg-[#b88328] transition-colors">
                  {saving ? 'Kreiranje...' : 'Sačuvaj Fakturu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview Invoice PDF */}
      {previewInv && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative">
            <button onClick={() => setPreviewInv(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>

            <div className="border-b border-gray-200 pb-4 flex justify-between items-start">
              <div>
                <span className="text-xs font-mono font-bold text-[#C9963B]">{previewInv.number}</span>
                <h3 className="text-xl font-bold text-gray-900 mt-0.5">ZVANIČNA FAKTURA AGENCIJE</h3>
                <p className="text-xs text-gray-500">Za: <b>{previewInv.client_name}</b></p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                {previewInv.status === 'paid' ? 'Plaćeno' : 'Čeka Uplatu'}
              </span>
            </div>

            <div className="space-y-3 text-xs text-gray-700 bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span>Stavka:</span>
                <span className="font-bold text-gray-900">{previewInv.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span>Osnovica bez PDV-a:</span>
                <span className="font-bold text-gray-900">{formatPrice(previewInv.subtotal)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span>PDV (17%):</span>
                <span className="font-bold text-gray-900">{formatPrice(previewInv.tax)}</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-bold text-gray-900 pt-2 border-t border-gray-300">
                <span>UKUPNO ZA UPLATU:</span>
                <span className="text-[#C9963B]">{formatPrice(previewInv.grand_total)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { window.print(); }}
                className="px-5 py-2.5 bg-gray-900 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-md hover:bg-gray-800"
              >
                <Printer size={14} /> Štampaj / Preuzmi PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
