'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useTranslations } from 'next-intl'
import type { Database } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Property = Database['public']['Tables']['properties']['Row']
type Syndication = Database['public']['Tables']['property_syndications']['Row']

export default function PropertiesPage() {
  const t = useTranslations('properties')
  const tc = useTranslations('common')
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [syndications, setSyndications] = useState<Syndication[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [syncingPortal, setSyncingPortal] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = createBrowserClient()
    const { data: props } = await supabase.from('properties').select('*').order('created_at', { ascending: false })
    const { data: syns } = await supabase.from('property_syndications').select('*')
    if (props) setProperties(props as Property[])
    if (syns) setSyndications(syns as Syndication[])
    setLoading(false)
  }

  const toggleSyndication = async (propertyId: string, portal: 'olx' | 'njuskalo' | 'nekretnine_rs') => {
    const supabase = createBrowserClient()
    const existing = syndications.find(s => s.property_id === propertyId && s.portal_name === portal)

    if (existing) {
      // Toggle logic: delete to stop sync, or toggle status
      if (existing.status === 'active') {
        await supabase
          .from('property_syndications')
          .update({ status: 'paused' })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('property_syndications')
          .update({ status: 'active' })
          .eq('id', existing.id)
      }
    } else {
      // Get org id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single()
      if (!member) return

      await supabase
        .from('property_syndications')
        .insert({
          organization_id: member.organization_id,
          property_id: propertyId,
          portal_name: portal,
          status: 'active'
        })
    }

    loadData()
  }

  const triggerOlxSync = async () => {
    setSyncingPortal('olx')
    try {
      await fetch('/api/sync/olx', { method: 'POST' })
      alert('OLX Sync triggered successfully!')
    } catch (e) {
      alert('Failed to trigger OLX sync.')
    } finally {
      setSyncingPortal(null)
    }
  }

  if (loading) return <div className="p-8"><div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full" /></div>

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10">
      <header className="mb-12 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">{t('title')}</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t('title')}</h1>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={triggerOlxSync}
            disabled={syncingPortal === 'olx'}
            className="rounded-full border border-border bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            {syncingPortal === 'olx' ? 'Syncing OLX...' : 'Sync OLX'}
          </button>
          <button 
            onClick={() => router.push('/dashboard/properties/new')}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {t('addProperty')}
          </button>
        </div>
      </header>

      <div className="grid gap-px bg-border rounded-xl overflow-hidden border border-border">
        {properties.length === 0 && (
          <div className="bg-card p-12 text-center text-muted-foreground">{t('empty')}</div>
        )}
        <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
          {properties.map((p) => {
            const propSyns = syndications.filter(s => s.property_id === p.id && s.status === 'active')
            return (
              <article key={p.id} className="grid grid-cols-[1fr_auto] gap-6 px-6 py-5 bg-card hover:bg-muted/40 transition-colors">
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold leading-tight">{p.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {p.city} <span className="text-foreground/30 mx-1.5">·</span> <span className="capitalize">{p.type}</span> <span className="text-foreground/30 mx-1.5">·</span> <span className="capitalize">{p.status}</span>
                  </p>
                  <div className="flex gap-2 mt-3 items-center">
                    <button 
                      onClick={() => setSelectedProperty(p)}
                      className="text-xs border border-border hover:bg-muted px-2.5 py-1 rounded transition-colors"
                    >
                      🔗 Syndicate ({propSyns.length})
                    </button>
                    {propSyns.map(s => (
                      <span key={s.id} className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        {s.portal_name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <p className="font-display text-xl font-bold">{Number(p.price).toLocaleString()} <span className="text-sm text-muted-foreground">{p.currency}</span></p>
                  <p className="mt-1.5">
                    <StatusPill status={p.status} />
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[hsl(var(--card))] p-6 shadow-xl border border-[hsl(var(--border))]">
            <h2 className="text-xl font-display font-bold mb-4">Syndicate: {selectedProperty.title}</h2>
            <div className="space-y-4">
              {(['olx', 'njuskalo', 'nekretnine_rs'] as const).map(portal => {
                const syn = syndications.find(s => s.property_id === selectedProperty.id && s.portal_name === portal)
                const isActive = syn?.status === 'active'
                return (
                  <div key={portal} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-wider text-foreground">{portal.replace('_', '.')}</p>
                      <p className="text-xs text-muted-foreground">
                        {isActive ? 'Syndication active' : 'Paused / Inactive'}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleSyndication(selectedProperty.id, portal)}
                      className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-colors ${
                        isActive 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {isActive ? 'Active' : 'Enable'}
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="pt-6 flex justify-end">
              <button 
                onClick={() => setSelectedProperty(null)}
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
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
