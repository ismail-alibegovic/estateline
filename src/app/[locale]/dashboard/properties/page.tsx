'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useTranslations } from 'next-intl'
import type { Database } from '@/lib/supabase'

type Property = Database['public']['Tables']['properties']['Row']

export default function PropertiesPage() {
  const t = useTranslations('properties')
  const tc = useTranslations('common')
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

  if (loading) return <div className="p-8"><div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full" /></div>

  return (
    <div>
      <header className="mb-12 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">{t('title')}</p>
          <h1 className="font-display text-3xl tracking-tight">{t('title')}</h1>
        </div>
        <button className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-muted transition-colors">
          {t('addProperty')}
        </button>
      </header>

      <div className="grid gap-px bg-border rounded-xl overflow-hidden border border-border">
        {properties.length === 0 && (
          <div className="bg-card p-12 text-center text-muted-foreground">{t('empty')}</div>
        )}
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
      </div>
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
