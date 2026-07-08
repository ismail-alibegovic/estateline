'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

type Property = Database['public']['Tables']['properties']['Row']

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient()
      const { data } = await supabase.from('properties').select('*').order('created_at', { ascending: false })
      if (data) setProperties(data as Property[])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex justify-center py-24"><div className="animate-spin h-7 w-7 border-b-2 border-primary rounded-full" /></div>
  }

  return (
    <div className="max-w-6xl">
      <header className="flex items-end justify-between mb-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Inventory</p>
          <h1 className="font-display text-4xl tracking-tight">Properties</h1>
        </div>
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          + Add Property
        </button>
      </header>

      {properties.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center border border-dashed border-border rounded-lg">
          No properties yet.
        </p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
          {properties.map((p) => (
            <article key={p.id} className="grid grid-cols-[1fr_auto] gap-6 px-6 py-5 bg-card hover:bg-muted/40 transition-colors">
              <div className="min-w-0">
                <h3 className="font-display text-lg leading-tight">{p.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {p.city} <span className="text-foreground/30 mx-1.5">·</span> <span className="capitalize">{p.type}</span> <span className="text-foreground/30 mx-1.5">·</span> <span className="capitalize">{p.status}</span>
                </p>
                {p.area_size != null && (
                  <p className="text-xs text-muted-foreground mt-1">{Math.round(p.area_size)} m²</p>
                )}
              </div>
              <div className="text-right whitespace-nowrap">
                <p className="font-display text-xl">{Number(p.price).toLocaleString()} <span className="text-sm text-muted-foreground">{p.currency}</span></p>
                <p className="mt-1">
                  <StatusPill status={p.status} />
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: Property['status'] }) {
  const palette: Record<string, string> = {
    active: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40',
    sold: 'text-clay-700 bg-clay-50 dark:text-clay-300 dark:bg-clay-950/40',
    rented: 'text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/40',
    inactive: 'text-muted-foreground bg-muted',
    draft: 'text-muted-foreground bg-muted',
  }
  return <span className={`inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${palette[status] || palette.draft}`}>{status}</span>
}
