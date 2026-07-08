'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

type Deal = Database['public']['Tables']['deals']['Row']
type Property = { title: string }
type Contact = { first_name: string; last_name: string }

interface DealWithRelations extends Deal {
  properties?: Property | null
  contacts?: Contact | null
}

const DEFAULT_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as const

const STYLE: Record<string, { dot: string; label: string }> = {
  new: { dot: 'bg-[hsl(215_35%_55%)]', label: 'New' },
  contacted: { dot: 'bg-[hsl(38_60%_55%)]', label: 'Contacted' },
  qualified: { dot: 'bg-[hsl(150_30%_45%)]', label: 'Qualified' },
  proposal: { dot: 'bg-[hsl(335_45%_55%)]', label: 'Proposal' },
  negotiation: { dot: 'bg-[hsl(20_55%_50%)]', label: 'Negotiation' },
  closed_won: { dot: 'bg-[hsl(140_35%_40%)]', label: 'Closed Won' },
  closed_lost: { dot: 'bg-[hsl(0_30%_50%)]', label: 'Closed Lost' },
}

export default function KanbanPage() {
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [newDeal, setNewDeal] = useState({ title: '', price: '', probability: 50 })
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchDeals()
  }, [])

  const fetchDeals = async () => {
    const supabase = createBrowserClient()
    const { data } = await supabase
      .from('deals')
      .select('*, properties(title), contacts(first_name, last_name)')
      .order('created_at', { ascending: false })
    if (data) setDeals(data as any)
    setLoading(false)
  }

  const moveDeal = async (id: string, stage: string) => {
    const supabase = createBrowserClient()
    await supabase.from('deals').update({ stage }).eq('id', id)
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage: stage as Deal['stage'] } : d)))
  }

  const createDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('deals').insert({
      title: newDeal.title,
      price: newDeal.price ? parseFloat(newDeal.price) : null,
      probability: newDeal.probability,
      assigned_to: user.id,
    })

    setNewDeal({ title: '', price: '', probability: 50 })
    setShowForm(false)
    fetchDeals()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl leading-tight text-[hsl(var(--foreground))]">Pipeline</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            {deals.length} active deal(s) · €
            {deals.reduce((s, d) => s + (d.price || 0), 0).toLocaleString()} total
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-[hsl(var(--primary))] px-5 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] transition hover:opacity-90"
        >
          + New Deal
        </button>
      </div>

      {showForm && (
        <div className="mb-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
          <form onSubmit={createDeal} className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Title
              </label>
              <input
                type="text"
                value={newDeal.title}
                onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                className="w-64 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Value (€)
              </label>
              <input
                type="number"
                value={newDeal.price}
                onChange={(e) => setNewDeal({ ...newDeal, price: e.target.value })}
                className="w-32 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Probability (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={newDeal.probability}
                onChange={(e) => setNewDeal({ ...newDeal, probability: parseInt(e.target.value) })}
                className="w-24 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-[hsl(var(--primary))] px-5 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-2 text-sm text-[hsl(var(--muted-foreground))]"
            >
              ✕
            </button>
          </form>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-6">
        {DEFAULT_STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage)
          const totalValue = stageDeals.reduce((sum, d) => sum + (d.price || 0), 0)
          return (
            <div
              key={stage}
              className="min-w-[280px] flex-shrink-0 rounded-2xl bg-[hsl(var(--muted))] p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${STYLE[stage].dot}`} />
                  <h3 className="font-sans text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    {STYLE[stage].label} ({stageDeals.length})
                  </h3>
                </div>
                <span className="font-sans text-xs font-medium text-[hsl(var(--muted-foreground))]">
                  €{totalValue.toLocaleString()}
                </span>
              </div>

              <div className="space-y-2">
                {stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 transition-all hover:border-[hsl(var(--primary)/0.4)] hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-sans text-sm font-medium text-[hsl(var(--foreground))]">
                        {deal.title}
                      </h4>
                      <select
                        value={deal.stage}
                        onChange={(e) => moveDeal(deal.id, e.target.value)}
                        className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-1 py-0.5 text-xs text-[hsl(var(--foreground))] outline-none"
                      >
                        {DEFAULT_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {STYLE[s].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {deal.price ? (
                      <p className="mt-1 font-sans text-sm font-semibold text-[hsl(var(--primary))]">
                        €{deal.price.toLocaleString()} · {deal.probability}%
                      </p>
                    ) : null}

                    {deal.properties && (
                      <p className="mt-1 font-sans text-xs text-[hsl(var(--muted-foreground))]">
                        {deal.properties.title}
                      </p>
                    )}
                    {deal.contacts && (
                      <p className="font-sans text-xs text-[hsl(var(--muted-foreground))]">
                        {deal.contacts.first_name} {deal.contacts.last_name}
                      </p>
                    )}
                    <p className="mt-1 font-sans text-xs text-[hsl(var(--muted-foreground))]/70">
                      {new Date(deal.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                {stageDeals.length === 0 && (
                  <p className="px-1 py-2 text-center font-sans text-xs text-[hsl(var(--muted-foreground))]/60">
                    —
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
