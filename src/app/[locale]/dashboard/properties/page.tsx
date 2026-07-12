'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useTranslations } from 'next-intl'
import type { Database } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { Plus, RefreshCw, Building2, ExternalLink, MapPin, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type Property = Database['public']['Tables']['properties']['Row']
type Syndication = Database['public']['Tables']['property_syndications']['Row']

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sold: 'bg-purple-50 text-purple-700 border-purple-200',
  rented: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  inactive: 'bg-gray-50 text-gray-500 border-gray-200',
  draft: 'bg-amber-50 text-amber-600 border-amber-200',
}

export default function PropertiesPage() {
  const t = useTranslations('properties')
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const [properties, setProperties] = useState<Property[]>([])
  const [syndications, setSyndications] = useState<Syndication[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [syncingPortal, setSyncingPortal] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all')

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data: props } = await supabase.from('properties').select('*').order('created_at', { ascending: false })
    const { data: syns } = await supabase.from('property_syndications').select('*')
    if (props) setProperties(props as Property[])
    if (syns) setSyndications(syns as Syndication[])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const toggleSyndication = async (propertyId: string, portal: 'olx' | 'njuskalo' | 'nekretnine_rs') => {
    const supabase = createBrowserClient()
    const existing = syndications.find(s => s.property_id === propertyId && s.portal_name === portal)

    if (existing) {
      await supabase.from('property_syndications').update({ status: existing.status === 'active' ? 'paused' : 'active' }).eq('id', existing.id)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: u } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
      if (!u) return
      const { data: member } = await supabase.from('organization_members').select('organization_id').eq('user_id', (u as any).id).eq('is_primary', true).single()
      if (!member) return
      await supabase.from('property_syndications').insert({
        organization_id: (member as any).organization_id,
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
      alert('OLX Sync triggered!')
    } catch {
      alert('Sync failed.')
    } finally {
      setSyncingPortal(null)
    }
  }

  const filtered = statusFilter === 'all' ? properties : properties.filter(p => p.status === statusFilter)

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Listings</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{properties.length} properties total</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={triggerOlxSync}
            disabled={syncingPortal === 'olx'}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncingPortal === 'olx' ? 'animate-spin' : ''} />
            {syncingPortal === 'olx' ? 'Syncing…' : 'Sync OLX'}
          </button>
          <Link
            href={`/${locale}/dashboard/properties/new`}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
          >
            <Plus size={16} /> {t('addProperty')}
          </Link>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'active', 'draft', 'inactive', 'sold', 'rented'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all capitalize ${
              statusFilter === status ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {status === 'all' ? `All (${properties.length})` : `${status} (${properties.filter(p => p.status === status).length})`}
          </button>
        ))}
      </div>

      {/* Properties List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-2xl bg-card">
          <Building2 size={48} className="text-muted-foreground/30 mb-3" />
          <h3 className="font-display font-semibold text-foreground mb-1">
            {statusFilter !== 'all' ? `No ${statusFilter} properties` : 'No properties yet'}
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            {statusFilter !== 'all' ? 'Try another status filter.' : 'Add your first property listing.'}
          </p>
          {statusFilter === 'all' && (
            <Link
              href={`/${locale}/dashboard/properties/new`}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90"
            >
              <Plus size={16} /> Add Property
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {filtered.map((p) => {
            const propSyns = syndications.filter(s => s.property_id === p.id && s.status === 'active')
            return (
              <article key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                <Link
                  href={`/${locale}/dashboard/properties/${p.id}`}
                  className="flex-1 min-w-0 group"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-display text-base font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{p.title}</h3>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_COLORS[p.status] || STATUS_COLORS.draft}`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin size={12} className="shrink-0" />
                    <span className="truncate">{p.city} · <span className="capitalize">{p.type}</span></span>
                    {propSyns.length > 0 && (
                      <span className="ml-2 flex items-center gap-1">
                        {propSyns.map(s => (
                          <span key={s.id} className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 border border-blue-200">
                            {s.portal_name}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </Link>

                <div className="flex items-center gap-4 shrink-0">
                  <p className="font-display text-lg font-bold text-foreground whitespace-nowrap">
                    {Number(p.price).toLocaleString()} <span className="text-xs text-muted-foreground font-normal">{p.currency}</span>
                  </p>
                  <button
                    onClick={() => setSelectedProperty(p)}
                    className="flex items-center gap-1.5 text-xs border border-border hover:bg-muted px-2.5 py-1.5 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink size={12} />
                    Syndicate
                  </button>
                  <Link
                    href={`/${locale}/dashboard/properties/${p.id}`}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Syndication Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-display font-bold">Syndicate Property</h2>
              <button onClick={() => setSelectedProperty(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <p className="text-sm text-muted-foreground mb-4 font-medium">{selectedProperty.title}</p>
            <div className="space-y-3">
              {(['olx', 'njuskalo', 'nekretnine_rs'] as const).map(portal => {
                const syn = syndications.find(s => s.property_id === selectedProperty.id && s.portal_name === portal)
                const isActive = syn?.status === 'active'
                return (
                  <div key={portal} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{portal.replace('_', '.')}</p>
                      <p className="text-xs text-muted-foreground">{isActive ? 'Active syndication' : 'Not syndicating'}</p>
                    </div>
                    <button
                      onClick={() => toggleSyndication(selectedProperty.id, portal)}
                      className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-colors border ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                      }`}
                    >
                      {isActive ? '● Active' : 'Enable'}
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="pt-5">
              <button
                onClick={() => setSelectedProperty(null)}
                className="w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
