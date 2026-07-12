'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

type Deal = Database['public']['Tables']['deals']['Row']
type Property = { title: string }
type Contact = { first_name: string; last_name: string }

interface DealWithRelations extends Deal {
  properties?: Property | null
  contacts?: Contact | null
}

const DEFAULT_STAGES = [
  'new', 'qualified', 'viewing', 'offer', 'negotiation', 
  'under_contract', 'closed_won', 'closed_lost', 'withdrawn'
] as const

const STYLE: Record<string, { dot: string; label: string }> = {
  new: { dot: 'bg-[hsl(215_35%_55%)]', label: 'New' },
  qualified: { dot: 'bg-[hsl(150_30%_45%)]', label: 'Qualified' },
  viewing: { dot: 'bg-[hsl(280_45%_65%)]', label: 'Viewing' },
  offer: { dot: 'bg-[hsl(335_45%_55%)]', label: 'Offer' },
  negotiation: { dot: 'bg-[hsl(20_55%_50%)]', label: 'Negotiation' },
  under_contract: { dot: 'bg-[hsl(38_60%_55%)]', label: 'Under Contract' },
  closed_won: { dot: 'bg-[hsl(140_35%_40%)]', label: 'Closed Won' },
  closed_lost: { dot: 'bg-[hsl(0_30%_50%)]', label: 'Closed Lost' },
  withdrawn: { dot: 'bg-[hsl(0_0%_50%)]', label: 'Withdrawn' },
}

export default function KanbanPage() {
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [newDeal, setNewDeal] = useState({ title: '', price: '', probability: 50 })
  const [showForm, setShowForm] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)

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

  const onDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStage = destination.droppableId as Deal['stage']
    
    // Optimistic update
    setDeals(prevDeals => prevDeals.map(d => 
      d.id === draggableId ? { ...d, stage: newStage } : d
    ))

    // DB update
    const supabase = createBrowserClient()
    await supabase.from('deals').update({ stage: newStage }).eq('id', draggableId)
  }, [])

  const createDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('deals').insert({
      title: newDeal.title,
      price: newDeal.price ? parseFloat(newDeal.price) : 0,
      probability: newDeal.probability,
      assigned_to: user.id,
      stage: 'new',
      // Mocked contact ID required by schema (in real flow this would be a select input)
      contact_id: deals[0]?.contact_id || null // For demo purposes only if a contact exists
    } as any)

    setNewDeal({ title: '', price: '', probability: 50 })
    setShowForm(false)
    fetchDeals()
  }

  const generateContract = async (deal: DealWithRelations) => {
    if (!deal.property_id || !deal.contact_id) {
      alert("Deal must be linked to a Property and Contact to generate a contract.")
      return
    }
    setGenerating(deal.id)
    try {
      const res = await fetch('/api/documents/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: deal.id,
          property_id: deal.property_id,
          contact_id: deal.contact_id
        })
      })

      if (!res.ok) throw new Error('Failed to generate contract')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Contract-${deal.title.replace(/\\s+/g, '-')}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert("Error generating contract.")
    } finally {
      setGenerating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-10 md:px-10 h-[calc(100vh-64px)] flex flex-col">
      <div className="mb-6 flex items-end justify-between shrink-0">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight text-[hsl(var(--foreground))]">Pipeline</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            {deals.length} active deal(s) · €
            {deals.reduce((s, d) => s + (Number(d.price) || 0), 0).toLocaleString()} total
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
        <div className="mb-8 shrink-0 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
          <form onSubmit={createDeal} className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Title</label>
              <input
                type="text"
                value={newDeal.title}
                onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                className="w-64 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Value (€)</label>
              <input
                type="number"
                value={newDeal.price}
                onChange={(e) => setNewDeal({ ...newDeal, price: e.target.value })}
                className="w-32 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]"
              />
            </div>
            <button type="submit" className="rounded-full bg-[hsl(var(--primary))] px-5 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">✕</button>
          </form>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 flex-1 min-h-0 items-start">
          {DEFAULT_STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage)
            const totalValue = stageDeals.reduce((sum, d) => sum + (Number(d.price) || 0), 0)
            
            return (
              <div key={stage} className="flex h-full flex-col min-w-[300px] max-w-[300px] flex-shrink-0 rounded-2xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border)/0.5)]">
                <div className="p-4 shrink-0">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${STYLE[stage]?.dot || 'bg-gray-400'}`} />
                      <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-[hsl(var(--foreground))]">
                        {STYLE[stage]?.label || stage} <span className="text-[hsl(var(--muted-foreground))] font-normal ml-1">({stageDeals.length})</span>
                      </h3>
                    </div>
                  </div>
                  <span className="font-sans text-xs font-medium text-[hsl(var(--muted-foreground))]">
                    €{totalValue.toLocaleString()}
                  </span>
                </div>

                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto px-3 pb-4 transition-colors ${
                        snapshot.isDraggingOver ? 'bg-[hsl(var(--muted))]' : ''
                      }`}
                    >
                      <div className="space-y-3 pt-1">
                        {stageDeals.map((deal, index) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`rounded-xl border bg-[hsl(var(--card))] p-4 shadow-sm transition-all ${
                                  snapshot.isDragging 
                                    ? 'border-[hsl(var(--primary))] shadow-md rotate-2 z-50' 
                                    : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.4)]'
                                }`}
                              >
                                <div className="mb-2">
                                  <h4 className="font-sans text-sm font-semibold text-[hsl(var(--foreground))] leading-tight">
                                    {deal.title}
                                  </h4>
                                </div>

                                {Number(deal.price) > 0 && (
                                  <p className="font-sans text-sm font-semibold text-[hsl(var(--primary))] mb-3">
                                    €{Number(deal.price).toLocaleString()}
                                  </p>
                                )}

                                {(deal.properties || deal.contacts) && (
                                  <div className="space-y-1 mb-3 pt-3 border-t border-[hsl(var(--border)/0.5)]">
                                    {deal.properties && (
                                      <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                        <span className="truncate">{deal.properties.title}</span>
                                      </div>
                                    )}
                                    {deal.contacts && (
                                      <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        <span className="truncate">{deal.contacts.first_name} {deal.contacts.last_name}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                <div className="flex items-center justify-between mt-4">
                                  <p className="font-sans text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]/70">
                                    {new Date(deal.created_at).toLocaleDateString()}
                                  </p>
                                  {deal.property_id && deal.contact_id && (
                                    <button 
                                      onClick={() => generateContract(deal)}
                                      disabled={generating === deal.id}
                                      title="Generate Contract PDF"
                                      className="text-xs flex items-center gap-1 text-[hsl(var(--primary))] hover:text-[hsl(var(--primary)/0.8)] disabled:opacity-50 transition-colors bg-[hsl(var(--primary)/0.1)] px-2 py-1 rounded"
                                    >
                                      {generating === deal.id ? (
                                        <span className="w-3 h-3 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                      )}
                                      Contract
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {stageDeals.length === 0 && !snapshot.isDraggingOver && (
                          <div className="h-24 rounded-xl border-2 border-dashed border-[hsl(var(--border))] flex items-center justify-center">
                            <p className="text-xs text-[hsl(var(--muted-foreground))]/50 font-medium uppercase tracking-widest">Drop here</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}
