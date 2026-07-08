'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useTranslations } from 'next-intl'

interface Viewing {
  id: string
  property_id: string
  contact_id: string
  scheduled_at: string
  status: string
  notes: string
  properties?: { title: string }
  contacts?: { first_name: string; last_name: string }
}

export default function ViewingsPage() {
  const t = useTranslations('viewings')
  const tc = useTranslations('common')
  const [viewings, setViewings] = useState<Viewing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('viewings')
        .select('*, properties(title), contacts(first_name, last_name)')
        .order('scheduled_at', { ascending: false })
      if (data) setViewings(data as any)
      setLoading(false)
    }
    fetch()
  }, [])

  if (loading) return <div className="p-8"><div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full" /></div>

  const statusStyle = (s: string) =>
    s === 'scheduled' ? 'bg-secondary text-secondary-foreground' :
    s === 'confirmed' ? 'bg-primary/10 text-primary' :
    s === 'completed' ? 'bg-primary/20 text-primary' :
    'bg-muted text-muted-foreground'

  return (
    <div>
      <header className="mb-12">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">{tc('loading')}</p>
        <div className="flex items-end justify-between">
          <h1 className="font-display text-3xl tracking-tight">{t('title')}</h1>
          <button className="text-sm font-medium text-primary hover:underline">{t('addViewing')}</button>
        </div>
      </header>

      {viewings.length === 0 && (
        <div className="border border-border rounded-lg p-8 text-center text-muted-foreground">
          {t('empty')}
        </div>
      )}

      <div className="space-y-3">
        {viewings.map(v => (
          <div key={v.id} className="border border-border rounded-lg p-4 flex items-center justify-between bg-card">
            <div>
              <p className="font-medium">{v.properties?.title || '—'}</p>
              <p className="text-sm text-muted-foreground">
                {v.contacts?.first_name} {v.contacts?.last_name || ''}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {new Date(v.scheduled_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} · {new Date(v.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${statusStyle(v.status)}`}>{v.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
