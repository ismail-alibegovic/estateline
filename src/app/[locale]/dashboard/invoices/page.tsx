'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { DataTable } from '@/components/ui/data-table'
import { getColumns, Invoice } from './columns'
import { Plus, X, Receipt, Calculator, Building, Landmark, Trash2 } from 'lucide-react'

interface ContactOption { id: string; first_name: string; last_name: string | null }
interface QuoteOption { id: string; amount: number; contact_id: string; property_id: string; properties: { title: string } }
interface LineItemInput { description: string; qty: number; unit_price: number }

type Toast = { id: string; message: string; type: 'success' | 'error' }

export default function InvoicesPage() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [quotes, setQuotes] = useState<QuoteOption[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  // New Invoice Form State
  const [title, setTitle] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [quoteId, setQuoteId] = useState('')
  const [contactId, setContactId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('bank_transfer')
  const [currency, setCurrency] = useState('BAM')
  const [discount, setDiscount] = useState('0')
  const [taxRate, setTaxRate] = useState('17') // 17% Balkan standard VAT
  
  // Addresses State
  const [billingStreet, setBillingStreet] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingState, setBillingState] = useState('')
  const [billingPostalCode, setBillingPostalCode] = useState('')
  const [billingCountry, setBillingCountry] = useState('')

  // Dynamic Line Items State
  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { description: 'Agency commission fee', qty: 1, unit_price: 0 }
  ])

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

      const [invoicesResp, contactsResp, quotesResp] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, contacts(first_name, last_name)')
          .eq('organization_id', oid)
          .order('created_at', { ascending: false }),
        supabase.from('contacts').select('id, first_name, last_name').eq('organization_id', oid).order('first_name'),
        supabase
          .from('quotes')
          .select('id, amount, contact_id, property_id, properties(title)')
          .eq('organization_id', oid),
      ])

      if (invoicesResp.data) setInvoices(invoicesResp.data as Invoice[])
      if (contactsResp.data) setContacts(contactsResp.data as ContactOption[])
      if (quotesResp.data) setQuotes(quotesResp.data as any[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Real-time invoice amount calculations
  const calculateTotals = () => {
    const subtotal = lineItems.reduce((acc, item) => acc + (item.qty * item.unit_price), 0)
    const discVal = Number(discount) || 0
    const taxPercentage = Number(taxRate) || 0
    const taxVal = Math.round(subtotal * (taxPercentage / 100))
    const grandTotal = Math.max(0, subtotal + taxVal - discVal)
    return { subtotal, tax: taxVal, grandTotal }
  }

  const { subtotal, tax, grandTotal } = calculateTotals()

  // Auto-generate invoice number based on date and count
  useEffect(() => {
    if (isOpen && !invoiceNumber) {
      const year = new Date().getFullYear()
      const rand = Math.floor(1000 + Math.random() * 9000)
      setInvoiceNumber(`INV-${year}-${rand}`)
    }
  }, [isOpen, invoiceNumber])

  // Prefill details from selected Quote
  const handleQuoteChange = (qid: string) => {
    setQuoteId(qid)
    if (!qid) return

    const quote = quotes.find(q => q.id === qid)
    if (quote) {
      setContactId(quote.contact_id || '')
      setTitle(`Invoice for ${quote.properties?.title || 'Property Transaction'}`)
      setLineItems([
        { description: `Real estate services for: ${quote.properties?.title || 'Property'}`, qty: 1, unit_price: quote.amount }
      ])
    }
  }

  const handleAddLineItem = () => {
    setLineItems(prev => [...prev, { description: '', qty: 1, unit_price: 0 }])
  }

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) return
    setLineItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleLineItemChange = (index: number, field: keyof LineItemInput, val: any) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      return { ...item, [field]: val }
    }))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !orgId) return
    setSaving(true)

    const supabase = createBrowserClient()

    // 1. Insert Invoice Header
    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .insert({
        organization_id: orgId,
        title,
        invoice_number: invoiceNumber || null,
        quote_id: quoteId || null,
        contact_id: contactId || null,
        due_date: dueDate || null,
        subtotal,
        discount: Number(discount) || 0,
        tax,
        grand_total: grandTotal,
        currency,
        payment_terms: paymentTerms,
        billing_street: billingStreet || null,
        billing_city: billingCity || null,
        billing_state: billingState || null,
        billing_postal_code: billingPostalCode || null,
        billing_country: billingCountry || null,
        status: 'draft',
        invoice_date: new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single()

    if (invErr) {
      toast(invErr.message, 'error')
      setSaving(false)
      return
    }

    // 2. Insert Invoice Line Items
    const itemsToInsert = lineItems.map(item => ({
      invoice_id: inv.id,
      description: item.description,
      qty: item.qty,
      unit_price: item.unit_price,
      total: item.qty * item.unit_price,
    }))

    const { error: itemsErr } = await supabase.from('invoice_items').insert(itemsToInsert)

    setSaving(false)
    if (itemsErr) {
      toast(itemsErr.message, 'error')
    } else {
      toast('Invoice created successfully!')
      setTitle(''); setInvoiceNumber(''); setQuoteId(''); setContactId(''); setDueDate('')
      setBillingStreet(''); setBillingCity(''); setBillingState(''); setBillingPostalCode(''); setBillingCountry('')
      setLineItems([{ description: 'Agency commission fee', qty: 1, unit_price: 0 }])
      setIsOpen(false)
      loadData()
    }
  }

  const handleMarkPaid = async (id: string) => {
    const supabase = createBrowserClient()
    const { error } = await supabase.from('invoices').update({ status: 'paid' }).eq('id', id)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Invoice marked as Paid!')
      loadData()
    }
  }

  const handleDelete = async (id: string) => {
    const supabase = createBrowserClient()
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Invoice deleted')
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
          <h1 className="font-display text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate invoices, billing receipts, and monitor active client balances.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-sm"
        >
          <Plus size={16} /> Create Invoice
        </button>
      </div>

      {/* Invoices Table */}
      <DataTable columns={getColumns({ locale, onDelete: handleDelete, onMarkPaid: handleMarkPaid })} data={invoices} searchKey="title" />

      {/* Create Invoice Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[95vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-display flex items-center gap-2">
                <Receipt className="text-primary h-5 w-5" />
                New Invoice
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Reference Quote selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Link to Quote (Optional)</label>
                <select className={inputClass} value={quoteId} onChange={e => handleQuoteChange(e.target.value)}>
                  <option value="">— Select quote —</option>
                  {quotes.map(q => (
                    <option key={q.id} value={q.id}>Quote for: {q.properties?.title || 'Property'} — ({q.amount.toLocaleString()} BAM)</option>
                  ))}
                </select>
              </div>

              {/* Title & Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Invoice Title *</label>
                  <input type="text" required placeholder="e.g. Commission fee apartment sale" className={inputClass} value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Invoice Number *</label>
                  <input type="text" required className={`${inputClass} font-mono`} value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                </div>
              </div>

              {/* Client & Date details */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Client Contact *</label>
                  <select required className={inputClass} value={contactId} onChange={e => setContactId(e.target.value)}>
                    <option value="">— Select client —</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.first_name} {c.last_name || ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Due Date</label>
                  <input type="date" required className={inputClass} value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Payment Method</label>
                  <select className={inputClass} value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash Payment</option>
                    <option value="credit_card">Credit Card</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Line Items Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Calculator className="text-muted-foreground h-4 w-4" />
                    Line Items
                  </h3>
                  <button type="button" onClick={handleAddLineItem} className="text-xs font-bold text-primary hover:underline">
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder="Item description..."
                          className={inputClass}
                          value={item.description}
                          onChange={e => handleLineItemChange(idx, 'description', e.target.value)}
                        />
                      </div>
                      <div className="w-16">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Qty"
                          className={inputClass}
                          value={item.qty}
                          onChange={e => handleLineItemChange(idx, 'qty', Number(e.target.value))}
                        />
                      </div>
                      <div className="w-28">
                        <input
                          type="number"
                          required
                          placeholder="Unit Price"
                          className={inputClass}
                          value={item.unit_price}
                          onChange={e => handleLineItemChange(idx, 'unit_price', Number(e.target.value))}
                        />
                      </div>
                      <div className="text-sm font-mono font-semibold w-20 text-right pr-2">
                        {(item.qty * item.unit_price).toLocaleString()}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(idx)}
                        disabled={lineItems.length === 1}
                        className="text-muted-foreground hover:text-red-500 disabled:opacity-30 p-1.5 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing Address */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Building className="text-muted-foreground h-4 w-4" />
                  Billing Address
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input type="text" placeholder="Street Address" className={inputClass} value={billingStreet} onChange={e => setBillingStreet(e.target.value)} />
                  </div>
                  <div>
                    <input type="text" placeholder="City" className={inputClass} value={billingCity} onChange={e => setBillingCity(e.target.value)} />
                  </div>
                  <div>
                    <input type="text" placeholder="State/Region" className={inputClass} value={billingState} onChange={e => setBillingState(e.target.value)} />
                  </div>
                  <div>
                    <input type="text" placeholder="Postal Code" className={inputClass} value={billingPostalCode} onChange={e => setBillingPostalCode(e.target.value)} />
                  </div>
                  <div>
                    <input type="text" placeholder="Country" className={inputClass} value={billingCountry} onChange={e => setBillingCountry(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Totals Summary block */}
              <div className="border-t pt-4 flex justify-between items-start bg-neutral-50 p-4 rounded-xl">
                <div className="grid grid-cols-2 gap-2 w-1/2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground">Currency</label>
                    <select className="border text-xs px-2 py-1 rounded bg-background" value={currency} onChange={e => setCurrency(e.target.value)}>
                      <option value="BAM">BAM (KM)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground">Discount Amount</label>
                    <input type="number" className="border text-xs px-2 py-1 rounded w-20 bg-background" value={discount} onChange={e => setDiscount(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground">VAT Rate (%)</label>
                    <input type="number" className="border text-xs px-2 py-1 rounded w-20 bg-background" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
                  </div>
                </div>

                <div className="text-right space-y-1 w-1/2">
                  <p className="text-xs text-muted-foreground">Subtotal: <span className="font-semibold text-foreground">{subtotal.toLocaleString()} {currency}</span></p>
                  <p className="text-xs text-muted-foreground">VAT ({taxRate}%): <span className="font-semibold text-foreground">{tax.toLocaleString()} {currency}</span></p>
                  {Number(discount) > 0 && <p className="text-xs text-red-500">Discount: <span>-{Number(discount).toLocaleString()} {currency}</span></p>}
                  <p className="text-lg font-bold text-primary pt-1 border-t">Total: {grandTotal.toLocaleString()} {currency}</p>
                </div>
              </div>

              <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all text-sm">
                {saving ? 'Creating…' : 'Create Invoice'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
