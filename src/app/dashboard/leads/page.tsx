'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

type Lead = Database['public']['Tables']['leads']['Row']

const STAGES = ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost']

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient()
      const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
      if (data) setLeads(data as Lead[])
      setLoading(false)
    }
    load()
  }, [])

  const updateStatus = async (id: string, status: string) => {
    const supabase = createBrowserClient()
    await supabase.from('leads').update({ status }).eq('id', id)
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))
  }

  if (loading) {
    return <div className="flex justify-center py-24"><div className="animate-spin h-7 w-7 border-b-2 border-primary rounded-full" /></div>
  }

  const leadsByStage = Object.fromEntries(STAGES.map((s) => [s, leads.filter((l) => l.status === s)])) as Record<string, Lead[]>

  return (
    <div>
      <header className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">CRM</p>
        <h1 className="font-display text-4xl tracking-tight">Leads</h1>
      </header>

      <div className="flex gap-4 overflow-x-auto pb-6">
        {STAGES.map((stage) => {
          const items = leadsByStage[stage] || []
          return (
            <section key={stage} className="min-w-[280px] flex-shrink-0">
              <div className="flex items-baseline justify-between mb-3 px-1">
                <h2 className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{stage}</h2>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((lead) => (
                  <article key={lead.id} className="bg-card border border-border rounded-md px-4 py-3">
                    <p className="font-medium text-sm">
                      {lead.first_name} {lead.last_name || ''}
                    </p>
                    {lead.email && <p className="text-xs text-muted-foreground mt-0.5">{lead.email}</p>}
                    {lead.phone && <p className="text-xs text-muted-foreground">{lead.phone}</p>}
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                      className="mt-3 w-full text-xs border border-border bg-background rounded px-1.5 py-1 text-muted-foreground"
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </article>
                ))}
                {items.length === 0 && (
                  <div className="text-xs text-muted-foreground/60 text-center py-6 border border-dashed border-border rounded-md">—</div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
