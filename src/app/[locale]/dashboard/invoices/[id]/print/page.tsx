'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { Printer, ArrowLeft, Building, User, Landmark, ShieldCheck } from 'lucide-react'

interface InvoiceDetails {
  id: string
  title: string
  invoice_number: string
  invoice_date: string
  due_date: string | null
  status: string
  currency: string
  subtotal: number
  tax: number
  discount: number
  grand_total: number
  payment_terms: string
  billing_street: string | null
  billing_city: string | null
  billing_state: string | null
  billing_postal_code: string | null
  billing_country: string | null
  contacts: { first_name: string; last_name: string | null; email: string; phone: string } | null
  quotes: {
    account_name: string | null
    account_number: string | null
    swift_code: string | null
    bank_name: string | null
    bank_branch: string | null
  } | null
}

interface InvoiceItem {
  id: string
  description: string
  qty: number
  unit_price: number
  total: number
}

interface OrgDetails {
  name: string
}

export default function PrintInvoicePage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [org, setOrg] = useState<OrgDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const loadInvoice = async () => {
      const supabase = createBrowserClient()
      
      // Fetch Invoice Header
      const { data: inv } = await supabase
        .from('invoices')
        .select('*, contacts(first_name, last_name, email, phone), quotes(account_name, account_number, swift_code, bank_name, bank_branch)')
        .eq('id', id)
        .single()

      if (inv) {
        setInvoice(inv as any)
        
        // Fetch Line Items
        const { data: lineItems } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', id)
        if (lineItems) setItems(lineItems as InvoiceItem[])

        // Fetch Org name
        const { data: o } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', inv.organization_id)
          .single()
        if (o) setOrg(o as OrgDetails)
      }
      setLoading(false)
    }

    loadInvoice()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-8 space-y-4">
        <h1 className="text-xl font-bold text-red-500">Invoice not found</h1>
        <button onClick={() => router.back()} className="px-4 py-2 bg-primary text-white rounded">Back</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-100 py-8 px-4 print:bg-white print:py-0 print:px-0">
      {/* Control bar */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between no-print bg-white p-4 rounded-xl border border-border shadow-sm">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} /> Back to Invoices
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-sm"
        >
          <Printer size={16} /> Print Invoice
        </button>
      </div>

      {/* A4 Invoice page */}
      <div className="max-w-4xl mx-auto bg-white p-12 rounded-xl border border-border shadow-md print:shadow-none print:border-none print:p-0 print:max-w-full">
        {/* Header Grid */}
        <div className="grid grid-cols-2 gap-8 border-b pb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">{org?.name || 'Real Estate Agency'}</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Licensed Real Estate Brokerage</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-primary mb-1">INVOICE</h2>
            <p className="font-mono text-sm text-foreground">Invoice No: {invoice.invoice_number}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Date: {new Date(invoice.invoice_date).toLocaleDateString()}
            </p>
            {invoice.due_date && (
              <p className="text-xs text-red-500 font-semibold mt-0.5">
                Due Date: {new Date(invoice.due_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Client & Billing Info */}
        <div className="grid grid-cols-2 gap-8 py-8 border-b">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <Building size={12} /> Billed From
            </h3>
            <p className="font-semibold text-foreground">{org?.name}</p>
            <p className="text-xs text-muted-foreground mt-1">Estateline Agent Platform</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <User size={12} /> Billed To
            </h3>
            {invoice.contacts ? (
              <>
                <p className="font-semibold text-foreground">
                  {invoice.contacts.first_name} {invoice.contacts.last_name || ''}
                </p>
                {invoice.contacts.email && <p className="text-xs text-muted-foreground mt-0.5">{invoice.contacts.email}</p>}
                {invoice.contacts.phone && <p className="text-xs text-muted-foreground mt-0.5">{invoice.contacts.phone}</p>}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">— No client contact linked —</p>
            )}
            
            {/* Address */}
            {(invoice.billing_street || invoice.billing_city) && (
              <div className="mt-3 text-xs text-muted-foreground leading-relaxed border-t pt-2 border-dashed">
                <p className="font-semibold text-foreground text-[10px] uppercase">Address:</p>
                <p>{invoice.billing_street}</p>
                <p>{invoice.billing_city}, {invoice.billing_state || ''} {invoice.billing_postal_code || ''}</p>
                <p>{invoice.billing_country}</p>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Title */}
        <div className="py-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Subject / Description:</p>
          <h4 className="text-sm font-semibold text-foreground mt-1">{invoice.title}</h4>
        </div>

        {/* Line Items Table */}
        <table className="w-full text-left border-collapse my-6">
          <thead>
            <tr className="border-b bg-neutral-50 print:bg-neutral-50 text-xs font-bold text-muted-foreground uppercase">
              <th className="py-2.5 px-3">Description</th>
              <th className="py-2.5 px-3 text-center w-16">Qty</th>
              <th className="py-2.5 px-3 text-right w-32">Unit Price</th>
              <th className="py-2.5 px-3 text-right w-32">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 px-3 font-medium text-foreground">{item.description}</td>
                <td className="py-3 px-3 text-center">{item.qty}</td>
                <td className="py-3 px-3 text-right font-mono">{item.unit_price.toLocaleString()} {invoice.currency}</td>
                <td className="py-3 px-3 text-right font-mono font-semibold">{item.total.toLocaleString()} {invoice.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Summary */}
        <div className="flex justify-between items-start pt-4">
          {/* Bank Payment Instructions (Crucial for Balkan standard payment templates) */}
          <div className="w-1/2">
            {invoice.quotes && invoice.quotes.account_number ? (
              <div className="p-4 bg-neutral-50 rounded-lg border border-border text-xs leading-relaxed print:bg-neutral-50 max-w-sm">
                <h4 className="font-semibold text-foreground flex items-center gap-1 mb-2">
                  <Landmark size={12} className="text-muted-foreground" />
                  Bank Transfer Instructions
                </h4>
                <p><span className="text-muted-foreground">Account Name:</span> {invoice.quotes.account_name || org?.name}</p>
                <p><span className="text-muted-foreground">IBAN / Account:</span> <span className="font-mono font-semibold">{invoice.quotes.account_number}</span></p>
                {invoice.quotes.swift_code && <p><span className="text-muted-foreground">SWIFT / BIC:</span> <span className="font-mono">{invoice.quotes.swift_code}</span></p>}
                <p><span className="text-muted-foreground">Bank:</span> {invoice.quotes.bank_name || 'Local Bank'} {invoice.quotes.bank_branch ? `(${invoice.quotes.bank_branch})` : ''}</p>
              </div>
            ) : (
              <div className="p-4 bg-neutral-50 rounded-lg border border-border text-[11px] text-muted-foreground max-w-sm">
                Please settle payment via bank transfer using your standard agency arrangement, or contact the agent directly for account detail updates.
              </div>
            )}
          </div>

          <div className="text-right w-1/3 space-y-1.5 border-t pt-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal:</span>
              <span className="font-semibold font-mono">{invoice.subtotal.toLocaleString()} {invoice.currency}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>VAT ({invoice.subtotal > 0 ? Math.round((invoice.tax / invoice.subtotal) * 100) : 17}%):</span>
              <span className="font-semibold font-mono">{invoice.tax.toLocaleString()} {invoice.currency}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-xs text-red-500">
                <span>Discount:</span>
                <span className="font-mono">-{invoice.discount.toLocaleString()} {invoice.currency}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-primary pt-2 border-t border-double">
              <span>Grand Total:</span>
              <span className="font-mono">{invoice.grand_total.toLocaleString()} {invoice.currency}</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-16 border-t pt-6 text-center text-[10px] text-muted-foreground">
          <p className="flex items-center justify-center gap-1 font-semibold text-foreground mb-1">
            <ShieldCheck size={12} className="text-emerald-500" />
            Thank you for your business!
          </p>
          <p>This is a computer generated document and is valid without signature or stamp.</p>
        </div>
      </div>
      
      {/* Printable overrides style block */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
          }
        }
      `}</style>
    </div>
  )
}
