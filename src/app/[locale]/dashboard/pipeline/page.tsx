'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Plus, X, TrendingUp, DollarSign, FileText } from 'lucide-react'

type Deal = Database['public']['Tables']['deals']['Row']
type Property = { title: string }
type Contact = { first_name: string; last_name: string | null }

interface DealWithRelations extends Deal {
  properties?: Property | null
  contacts?: Contact | null
}

interface PropertyOption { id: string; title: string; city: string }
interface ContactOption { id: string; first_name: string; last_name: string | null }

type Toast = { id: string; message: string; type: 'success' | 'error' }

const DEFAULT_STAGES = [
  'new', 'qualified', 'viewing', 'offer', 'negotiation',
  'under_contract', 'closed_won', 'closed_lost', 'withdrawn'
] as const

const STYLE: Record<string, { dot: string; label: string; bg: string }> = {
  new: { dot: 'bg-sky-400', label: 'New', bg: 'bg-sky-50' },
  qualified: { dot: 'bg-emerald-400', label: 'Qualified', bg: 'bg-emerald-50' },
  viewing: { dot: 'bg-violet-400', label: 'Viewing', bg: 'bg-violet-50' },
  offer: { dot: 'bg-pink-400', label: 'Offer', bg: 'bg-pink-50' },
  negotiation: { dot: 'bg-orange-400', label: 'Negotiation', bg: 'bg-orange-50' },
  under_contract: { dot: 'bg-amber-400', label: 'Under Contract', bg: 'bg-amber-50' },
  closed_won: { dot: 'bg-green-500', label: 'Closed Won', bg: 'bg-green-50' },
  closed_lost: { dot: 'bg-red-400', label: 'Closed Lost', bg: 'bg-red-50' },
  withdrawn: { dot: 'bg-gray-400', label: 'Withdrawn', bg: 'bg-gray-50' },
}

export default function KanbanPage() {
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  const [newDeal, setNewDeal] = useState({
    title: '',
    contact_id: '',
    property_id: '',
    price: '',
    probability: '50',
    type: 'sale',
    commission_pct: '',
    expected_close_date: '',
  })

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  const loadData = async () => {
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

    if (!member) { setLoading(false); return }
    const oid = (member as any).organization_id
    setOrgId(oid)

    const [{ data: dealsData }, { data: propsData }, { data: contsData }] = await Promise.all([
      supabase
        .from('deals')
        .select('*, properties(title), contacts(first_name, last_name)')
        .eq('organization_id', oid)
        .order('created_at', { ascending: false }),
      supabase.from('properties').select('id, title, city').eq('organization_id', oid).order('title'),
      supabase.from('contacts').select('id, first_name, last_name').eq('organization_id', oid).order('first_name'),
    ])

    if (dealsData) setDeals(dealsData as any)
    if (propsData) setProperties(propsData as any)
    if (contsData) setContacts(contsData as any)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const onDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStage = destination.droppableId as Deal['stage']
    setDeals(prev => prev.map(d => d.id === draggableId ? { ...d, stage: newStage } : d))
    const supabase = createBrowserClient()
    await supabase.from('deals').update({ stage: newStage }).eq('id', draggableId)
  }, [])

  const createDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDeal.contact_id) { toast('Please select a contact', 'error'); return }
    if (!orgId) return
    setSaving(true)

    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()

    const commission = newDeal.commission_pct && newDeal.price
      ? (parseFloat(newDeal.price) * parseFloat(newDeal.commission_pct)) / 100
      : null

    const { error } = await supabase.from('deals').insert({
      organization_id: orgId,
      title: newDeal.title,
      contact_id: newDeal.contact_id,
      property_id: newDeal.property_id || null,
      price: newDeal.price ? parseFloat(newDeal.price) : 0,
      probability: parseInt(newDeal.probability) || 50,
      type: newDeal.type as 'sale' | 'rental',
      stage: 'new',
      commission_pct: newDeal.commission_pct ? parseFloat(newDeal.commission_pct) : null,
      commission_amount: commission,
      expected_close_date: newDeal.expected_close_date || null,
      assigned_to: user?.id || null,
    } as any)

    setSaving(false)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Deal created!')
      setNewDeal({ title: '', contact_id: '', property_id: '', price: '', probability: '50', type: 'sale', commission_pct: '', expected_close_date: '' })
      setShowForm(false)
      loadData()
    }
  }

  const generateContract = async (deal: DealWithRelations) => {
    if (!deal.property_id || !deal.contact_id) {
      toast('Deal must be linked to a Property and Contact to generate a contract.', 'error')
      return
    }
    setGenerating(deal.id)
    try {
      const res = await fetch('/api/documents/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: deal.id, property_id: deal.property_id, contact_id: deal.contact_id })
      })
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Contract-${deal.title.replace(/\s+/g, '-')}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast('Contract downloaded!')
    } catch {
      toast('Error generating contract.', 'error')
    } finally {
      setGenerating(null)
    }
  }

  const totalPipeline = deals.reduce((s, d) => s + (Number(d.price) || 0), 0)
  const closedWon = deals.filter(d => d.stage === 'closed_won').reduce((s, d) => s + (Number(d.price) || 0), 0)
  const weightedPipeline = deals
    .filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost' && d.stage !== 'withdrawn')
    .reduce((s, d) => s + ((Number(d.price) || 0) * (d.probability || 0)) / 100, 0)

  const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] gap-4">
      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border ${t.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {t.type === 'success' ? '✓' : '✗'} {t.message}
          </div>
        ))}
      </div>

      {/* Header + Metrics */}
      <div className="shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Sales</p>
            <h1 className="font-display text-3xl font-bold tracking-tight">Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-1">{deals.length} deals</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus size={16} /> New Deal
          </button>
        </div>

        {/* Pipeline Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary"><DollarSign size={18} /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pipeline</p>
              <p className="text-xl font-bold font-display">€{totalPipeline.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500"><TrendingUp size={18} /></div>
            <div>
              <p className="text-xs text-muted-foreground">Closed Won</p>
              <p className="text-xl font-bold font-display text-emerald-600">€{closedWon.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500"><TrendingUp size={18} /></div>
            <div>
              <p className="text-xs text-muted-foreground">Weighted Value</p>
              <p className="text-xl font-bold font-display text-amber-600">€{Math.round(weightedPipeline).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1 min-h-0 items-start">
          {DEFAULT_STAGES.map((stage) => {
            const stageDeals = deals.filter(d => d.stage === stage)
            const totalValue = stageDeals.reduce((sum, d) => sum + (Number(d.price) || 0), 0)

            return (
              <div key={stage} className="flex flex-col min-w-[256px] max-w-[256px] flex-shrink-0 rounded-2xl bg-muted/50 border border-border/60">
                <div className="px-3.5 pt-3.5 pb-2.5 shrink-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`h-2 w-2 rounded-full ${STYLE[stage]?.dot || 'bg-gray-400'}`} />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {STYLE[stage]?.label}
                    </h3>
                    <span className="ml-auto text-xs font-bold text-muted-foreground bg-background px-1.5 py-0.5 rounded-full border border-border">{stageDeals.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">€{totalValue.toLocaleString()}</p>
                </div>

                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto px-2.5 pb-3 transition-colors min-h-[60px] ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}`}
                    >
                      <div className="space-y-2 pt-1">
                        {stageDeals.map((deal, index) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`rounded-xl border bg-card p-3.5 shadow-sm transition-all ${
                                  snapshot.isDragging
                                    ? 'border-primary shadow-lg rotate-1 z-50'
                                    : 'border-border hover:border-primary/30 hover:shadow-sm'
                                }`}
                              >
                                <h4 className="text-sm font-semibold text-foreground leading-tight mb-1">{deal.title}</h4>

                                {Number(deal.price) > 0 && (
                                  <p className="text-sm font-bold text-primary mb-2">
                                    €{Number(deal.price).toLocaleString()}
                                  </p>
                                )}

                                {(deal.properties || deal.contacts) && (
                                  <div className="space-y-1 mb-2 pt-2 border-t border-border/50">
                                    {deal.properties && (
                                      <p className="text-xs text-muted-foreground truncate">🏠 {deal.properties.title}</p>
                                    )}
                                    {deal.contacts && (
                                      <p className="text-xs text-muted-foreground truncate">👤 {deal.contacts.first_name} {deal.contacts.last_name}</p>
                                    )}
                                  </div>
                                )}

                                {deal.probability !== null && deal.probability > 0 && (
                                  <div className="mb-2">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[10px] text-muted-foreground">Probability</span>
                                      <span className="text-[10px] font-bold text-muted-foreground">{deal.probability}%</span>
                                    </div>
                                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary rounded-full transition-all"
                                        style={{ width: `${deal.probability}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-[10px] text-muted-foreground/60">
                                    {new Date(deal.created_at).toLocaleDateString()}
                                  </p>
                                  {deal.property_id && deal.contact_id && (
                                    <button
                                      onClick={() => generateContract(deal)}
                                      disabled={generating === deal.id}
                                      className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 bg-primary/10 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                                    >
                                      {generating === deal.id ? (
                                        <span className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <FileText size={10} />
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
                          <div className="h-16 rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center">
                            <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">Drop here</p>
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

      {/* New Deal Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-display font-bold">New Deal</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createDeal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Deal Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sale of Downtown Apartment"
                  className={inputClass}
                  value={newDeal.title}
                  onChange={e => setNewDeal(p => ({ ...p, title: e.target.value }))}
                />
              </div>

              {/* Contact — required */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Contact * <span className="text-muted-foreground font-normal normal-case">(buyer/client)</span></label>
                {contacts.length === 0 ? (
                  <p className="text-xs text-amber-600 border border-amber-200 bg-amber-50 rounded-lg px-3 py-2">
                    No contacts found. Add a contact first.
                  </p>
                ) : (
                  <select
                    required
                    className={inputClass}
                    value={newDeal.contact_id}
                    onChange={e => setNewDeal(p => ({ ...p, contact_id: e.target.value }))}
                  >
                    <option value="">— Select contact —</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.first_name} {c.last_name || ''}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Property */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Property</label>
                <select
                  className={inputClass}
                  value={newDeal.property_id}
                  onChange={e => setNewDeal(p => ({ ...p, property_id: e.target.value }))}
                >
                  <option value="">— No property linked —</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.city})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Deal Value (€)</label>
                  <input type="number" placeholder="250000" min="0" className={inputClass} value={newDeal.price} onChange={e => setNewDeal(p => ({ ...p, price: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Type</label>
                  <select className={inputClass} value={newDeal.type} onChange={e => setNewDeal(p => ({ ...p, type: e.target.value }))}>
                    <option value="sale">Sale</option>
                    <option value="rental">Rental</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Probability (%)</label>
                  <input type="range" min="0" max="100" step="5" className="w-full accent-primary" value={newDeal.probability} onChange={e => setNewDeal(p => ({ ...p, probability: e.target.value }))} />
                  <p className="text-xs text-center text-muted-foreground mt-0.5">{newDeal.probability}%</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Commission (%)</label>
                  <input type="number" placeholder="3" min="0" max="100" step="0.5" className={inputClass} value={newDeal.commission_pct} onChange={e => setNewDeal(p => ({ ...p, commission_pct: e.target.value }))} />
                  {newDeal.commission_pct && newDeal.price && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      = €{Math.round((parseFloat(newDeal.price) * parseFloat(newDeal.commission_pct)) / 100).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Expected Close Date</label>
                <input type="date" className={inputClass} value={newDeal.expected_close_date} onChange={e => setNewDeal(p => ({ ...p, expected_close_date: e.target.value }))} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={saving || !newDeal.contact_id} className="px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all">
                  {saving ? 'Creating…' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
