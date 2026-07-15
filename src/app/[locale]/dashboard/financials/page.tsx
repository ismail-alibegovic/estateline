'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCurrency } from '@/components/CurrencyContext'
import {
  DollarSign,
  TrendingUp,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  Percent,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react'

export default function FinancialsDashboard() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalQuoted: 0,
    totalInvoiced: 0,
    collectedRevenue: 0,
    pendingRevenue: 0,
    taxCollected: 0,
    paidCount: 0,
    unpaidCount: 0,
    quoteToInvoicePct: 0
  })
  const [recentQuotes, setRecentQuotes] = useState<any[]>([])
  const [recentInvoices, setRecentInvoices] = useState<any[]>([])
  const params = useParams()
  const locale = params?.locale || 'en'
  const { formatPrice } = useCurrency()

  useEffect(() => {
    const loadFinancials = async () => {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Resolve organization (Fixes Auth ID Bug)
      const { data: u } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
      if (!u) {
        setLoading(false)
        return
      }

      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', u.id)
        .eq('is_primary', true)
        .single()

      if (!member) {
        setLoading(false)
        return
      }
      const orgId = member.organization_id

      // Fetch Quotes & Invoices
      const [
        { data: quotes },
        { data: invoices }
      ] = await Promise.all([
        supabase
          .from('quotes')
          .select('id, amount, category, created_at, lead_id, contact_id, leads(first_name, last_name), contacts(first_name, last_name)')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        supabase
          .from('invoices')
          .select('id, grand_total, tax, status, title, invoice_number, invoice_date')
          .eq('organization_id', orgId)
          .order('invoice_date', { ascending: false })
      ])

      const quotesList = quotes || []
      const invoicesList = invoices || []

      // Calculate Metrics
      const totalQuoted = quotesList.reduce((sum, q) => sum + (Number(q.amount) || 0), 0)
      const totalInvoiced = invoicesList.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0)
      
      const paidInvoices = invoicesList.filter(inv => inv.status === 'paid')
      const collectedRevenue = paidInvoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0)
      const taxCollected = paidInvoices.reduce((sum, inv) => sum + (Number(inv.tax) || 0), 0)
      
      const pendingInvoices = invoicesList.filter(inv => inv.status !== 'paid' && inv.status !== 'void')
      const pendingRevenue = pendingInvoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0)

      const paidCount = paidInvoices.length
      const unpaidCount = pendingInvoices.length
      
      // Conversion Rate (Quotes converted to Invoices)
      // For demo / metric purpose, calculate the ratio of invoice count to quote count
      const quoteToInvoicePct = quotesList.length > 0 
        ? Math.round((invoicesList.length / quotesList.length) * 100)
        : 0

      setMetrics({
        totalQuoted,
        totalInvoiced,
        collectedRevenue,
        pendingRevenue,
        taxCollected,
        paidCount,
        unpaidCount,
        quoteToInvoicePct
      })

      setRecentQuotes(quotesList.slice(0, 5))
      setRecentInvoices(invoicesList.slice(0, 5))
      setLoading(false)
    }

    loadFinancials()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full" />
      </div>
    )
  }

  // Invoice Paid vs Unpaid ratio details for SVG
  const totalCount = metrics.paidCount + metrics.unpaidCount
  const paidPercentage = totalCount > 0 ? Math.round((metrics.paidCount / totalCount) * 100) : 0
  const radius = 24
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (paidPercentage / 100) * circumference

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <header className="flex justify-between items-start">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Accounting & Performance</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">Financials Overview</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Track revenue collections, pending deals value, and invoices distributions.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/${locale}/dashboard/quotes`}
            className="px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-neutral-50 transition-colors"
          >
            Manage Quotes
          </Link>
          <Link
            href={`/${locale}/dashboard/invoices`}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/95 transition-all shadow-sm"
          >
            Billing System
          </Link>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Quoted */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs uppercase font-bold tracking-wider">Total Quoted</span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600"><TrendingUp size={14} /></div>
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{formatPrice(metrics.totalQuoted)}</p>
          <p className="text-[11px] text-muted-foreground">Deal values sent in quotes</p>
        </div>

        {/* Collected Revenue */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs uppercase font-bold tracking-wider">Collected Revenue</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 size={14} /></div>
          </div>
          <p className="text-2xl font-bold font-display text-emerald-600">{formatPrice(metrics.collectedRevenue)}</p>
          <p className="text-[11px] text-muted-foreground">Fully paid invoice amounts</p>
        </div>

        {/* Pending Revenue */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs uppercase font-bold tracking-wider">Pending Balance</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600"><Clock size={14} /></div>
          </div>
          <p className="text-2xl font-bold font-display text-amber-600">{formatPrice(metrics.pendingRevenue)}</p>
          <p className="text-[11px] text-muted-foreground">Unpaid invoices in pipeline</p>
        </div>

        {/* VAT Tax Collected */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs uppercase font-bold tracking-wider">VAT Tax (17%)</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600"><Percent size={14} /></div>
          </div>
          <p className="text-2xl font-bold font-display text-purple-600">{formatPrice(metrics.taxCollected)}</p>
          <p className="text-[11px] text-muted-foreground">Tax component on paid deals</p>
        </div>
      </div>

      {/* Row 2: Charts and Ratios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quote-to-Invoice Conversion funnel */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm col-span-2 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between border-b pb-3.5">
            <h3 className="font-display font-bold text-base text-foreground">Deal Conversion Summary</h3>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">Conversion Funnel</span>
          </div>

          <div className="space-y-4">
            {/* Total Deals generated */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground font-medium">1. Quotes Generated</span>
                <span>{formatPrice(metrics.totalQuoted)} ({recentQuotes.length} Deals)</span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-3 overflow-hidden">
                <div className="bg-sky-500 h-full rounded-full w-full" />
              </div>
            </div>

            {/* Total Invoiced */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground font-medium">2. Billing Invoiced</span>
                <span>{formatPrice(metrics.totalInvoiced)} ({recentInvoices.length} Invoices)</span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${metrics.totalQuoted > 0 ? (metrics.totalInvoiced / metrics.totalQuoted) * 100 : 80}%` }}
                />
              </div>
            </div>

            {/* Total Collected */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground font-medium">3. Revenue Collected</span>
                <span>{formatPrice(metrics.collectedRevenue)} ({metrics.paidCount} Paid)</span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${metrics.totalInvoiced > 0 ? (metrics.collectedRevenue / metrics.totalInvoiced) * 100 : 60}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-muted-foreground pt-4 border-t border-border/60">
            <span>Overall quote-to-bill conversion ratio:</span>
            <span className="font-bold text-foreground text-sm">{metrics.quoteToInvoicePct}%</span>
          </div>
        </div>

        {/* Invoice Paid Ratio circle */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between items-center col-span-1 text-center">
          <div className="w-full flex items-center justify-between border-b pb-3.5 mb-4 text-left">
            <h3 className="font-display font-bold text-base text-foreground">Invoice Status</h3>
            <span className="text-xs font-semibold text-muted-foreground">Ratio</span>
          </div>

          <div className="relative w-32 h-32 flex items-center justify-center mb-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r={radius} className="stroke-neutral-100 fill-none" strokeWidth="5" />
              <circle
                cx="30"
                cy="30"
                r={radius}
                className="stroke-emerald-500 fill-none transition-all duration-500"
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground">{paidPercentage}%</span>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Paid</span>
            </div>
          </div>

          <div className="grid grid-cols-2 w-full text-xs border-t border-border pt-4">
            <div className="border-r border-border pr-2">
              <p className="font-bold text-emerald-600 text-sm">{metrics.paidCount}</p>
              <p className="text-muted-foreground text-[10px]">Paid Bills</p>
            </div>
            <div className="pl-2">
              <p className="font-bold text-amber-600 text-sm">{metrics.unpaidCount}</p>
              <p className="text-muted-foreground text-[10px]">Pending Bills</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Lists side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quotes */}
        <section className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="font-display text-lg font-bold text-foreground">Recent Quotes</h2>
            <Link href={`/${locale}/dashboard/quotes`} className="text-xs text-primary hover:underline flex items-center">
              View All <ChevronRight size={12} />
            </Link>
          </div>

          {recentQuotes.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">No quotes issued yet.</div>
          ) : (
            <div className="divide-y divide-border/60">
              {recentQuotes.map((q) => {
                const clientName = q.leads
                  ? `${q.leads.first_name} ${q.leads.last_name || ''}`
                  : q.contacts
                  ? `${q.contacts.first_name} ${q.contacts.last_name || ''}`
                  : 'N/A'

                return (
                  <div key={q.id} className="flex justify-between items-center py-3.5 hover:bg-neutral-50/20 transition-colors">
                    <div>
                      <p className="text-xs font-semibold text-neutral-800">{clientName}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{q.category || 'Real Estate Services'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatPrice(Number(q.amount))}</p>
                      <p className="text-[9px] text-muted-foreground/60">{new Date(q.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Recent Invoices */}
        <section className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="font-display text-lg font-bold text-foreground">Recent Invoices</h2>
            <Link href={`/${locale}/dashboard/invoices`} className="text-xs text-primary hover:underline flex items-center">
              View All <ChevronRight size={12} />
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">No invoices generated yet.</div>
          ) : (
            <div className="divide-y divide-border/60">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="flex justify-between items-center py-3 hover:bg-neutral-50/20 transition-colors">
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-semibold text-neutral-800 truncate">{inv.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-muted-foreground font-mono">{inv.invoice_number}</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        inv.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : inv.status === 'unpaid'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{formatPrice(Number(inv.grand_total))}</p>
                    <p className="text-[9px] text-muted-foreground/60">{new Date(inv.invoice_date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
