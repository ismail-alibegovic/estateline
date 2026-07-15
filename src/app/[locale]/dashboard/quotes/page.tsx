'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { DataTable } from '@/components/ui/data-table'
import { getColumns, Quote } from './columns'
import { Plus, X, Landmark, FileText, User, Building2 } from 'lucide-react'

interface PropertyOption { id: string; title: string; price: number; currency: string }
interface ContactOption { id: string; first_name: string; last_name: string | null }
interface LeadOption { id: string; first_name: string; last_name: string | null }

type Toast = { id: string; message: string; type: 'success' | 'error' }

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  // New Quote Form State
  const [propertyId, setPropertyId] = useState('')
  const [contactId, setContactId] = useState('')
  const [leadId, setLeadId] = useState('')
  const [category, setCategory] = useState('Sale')
  const [amount, setAmount] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [description, setDescription] = useState('')
  
  // Bank Details State
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [swiftCode, setSwiftCode] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankBranch, setBankBranch] = useState('')

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

      const [quotesResp, propertiesResp, contactsResp, leadsResp] = await Promise.all([
        supabase
          .from('quotes')
          .select('*, properties(title, price, currency), contacts(first_name, last_name), leads(first_name, last_name)')
          .eq('organization_id', oid)
          .order('created_at', { ascending: false }),
        supabase.from('properties').select('id, title, price, currency').eq('organization_id', oid).eq('status', 'active'),
        supabase.from('contacts').select('id, first_name, last_name').eq('organization_id', oid).order('first_name'),
        supabase.from('leads').select('id, first_name, last_name').eq('organization_id', oid).order('first_name'),
      ])

      if (quotesResp.data) setQuotes(quotesResp.data as Quote[])
      if (propertiesResp.data) setProperties(propertiesResp.data as PropertyOption[])
      if (contactsResp.data) setContacts(contactsResp.data as ContactOption[])
      if (leadsResp.data) setLeads(leadsResp.data as LeadOption[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Prefill price when a property is selected
  const handlePropertyChange = (pid: string) => {
    setPropertyId(pid)
    if (!pid) {
      setAmount('')
      setUnitPrice('')
      return
    }
    const prop = properties.find(p => p.id === pid)
    if (prop) {
      setAmount(prop.price.toString())
      setUnitPrice(prop.price.toString())
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) return
    setSaving(true)

    const supabase = createBrowserClient()
    const { error } = await supabase.from('quotes').insert({
      organization_id: orgId,
      property_id: propertyId || null,
      contact_id: contactId || null,
      lead_id: leadId || null,
      category,
      amount: amount ? Number(amount) : null,
      unit_price: unitPrice ? Number(unitPrice) : null,
      description: description || null,
      account_name: accountName || null,
      account_number: accountNumber || null,
      swift_code: swiftCode || null,
      bank_name: bankName || null,
      bank_branch: bankBranch || null,
    })

    if (error) {
      toast(error.message, 'error')
      setSaving(false)
    } else {
      toast('Quote created successfully!')
      setPropertyId(''); setContactId(''); setLeadId(''); setCategory('Sale')
      setAmount(''); setUnitPrice(''); setDescription('')
      setAccountName(''); setAccountNumber(''); setSwiftCode(''); setBankName(''); setBankBranch('')
      setIsOpen(false)
      setSaving(false)
      loadData()
    }
  }

  const handleDelete = async (id: string) => {
    const supabase = createBrowserClient()
    const { error } = await supabase.from('quotes').delete().eq('id', id)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Quote deleted')
      loadData()
    }
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
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Financials</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Quotes</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage price quotes, bank details, and payment structures.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-sm"
        >
          <Plus size={16} /> Create Quote
        </button>
      </div>

      {/* Quotes Table */}
      <DataTable columns={getColumns({ onDelete: handleDelete })} data={quotes} searchKey="category" />

      {/* Create Quote Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold font-display flex items-center gap-2">
                <FileText className="text-primary h-5 w-5" />
                Create Quote
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-5">
              {/* Properties selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  <Building2 size={11} className="inline mr-1" />Related Property
                </label>
                <select className={inputClass} value={propertyId} onChange={e => handlePropertyChange(e.target.value)}>
                  <option value="">— Select property —</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.price.toLocaleString()} {p.currency})</option>
                  ))}
                </select>
              </div>

              {/* Client assignment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    <User size={11} className="inline mr-1" />Related Contact
                  </label>
                  <select className={inputClass} value={contactId} onChange={e => { setContactId(e.target.value); if (e.target.value) setLeadId('') }}>
                    <option value="">— Select contact —</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.first_name} {c.last_name || ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    <User size={11} className="inline mr-1" />Related Lead
                  </label>
                  <select className={inputClass} value={leadId} onChange={e => { setLeadId(e.target.value); if (e.target.value) setContactId('') }}>
                    <option value="">— Select lead —</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>{l.first_name} {l.last_name || ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price detail block */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Category</label>
                  <select className={inputClass} value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="Sale">Sale</option>
                    <option value="Rent">Rent</option>
                    <option value="Consulting">Consulting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Quote Amount *</label>
                  <input type="number" required placeholder="Total sum" className={inputClass} value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Unit Price</label>
                  <input type="number" placeholder="Per unit/sqm" className={inputClass} value={unitPrice} onChange={e => setUnitPrice(e.target.value)} />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description / Notes</label>
                <textarea rows={2} placeholder="Installment details, special conditions..." className={inputClass} value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              {/* Section Header: Bank Details */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Landmark className="text-muted-foreground h-4 w-4" />
                  Bank / Payment Transfer Details
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Account Name</label>
                      <input type="text" placeholder="e.g. Agency DOO" className={inputClass} value={accountName} onChange={e => setAccountName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Account Number (IBAN)</label>
                      <input type="text" placeholder="Bank account number" className={inputClass} value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="block text-xs text-muted-foreground mb-1">SWIFT / BIC</label>
                      <input type="text" placeholder="SWIFT code" className={inputClass} value={swiftCode} onChange={e => setSwiftCode(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Bank Name</label>
                      <input type="text" placeholder="e.g. UniCredit" className={inputClass} value={bankName} onChange={e => setBankName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Branch</label>
                      <input type="text" placeholder="e.g. Sarajevo" className={inputClass} value={bankBranch} onChange={e => setBankBranch(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all text-sm">
                {saving ? 'Creating…' : 'Create Quote'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
