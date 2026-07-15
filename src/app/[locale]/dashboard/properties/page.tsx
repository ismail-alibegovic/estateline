'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useTranslations } from 'next-intl'
import { useCurrency } from '@/components/CurrencyContext'
import type { Database } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { Plus, RefreshCw, Building2, ExternalLink, MapPin, ChevronRight, LayoutGrid, List, BedDouble, Bath, Ruler } from 'lucide-react'
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
  const { formatPrice } = useCurrency()
  const [properties, setProperties] = useState<Property[]>([])
  const [syndications, setSyndications] = useState<Syndication[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const getCoverImage = (p: Property): string => {
    if (p.cover_image_url) return p.cover_image_url
    if (Array.isArray(p.images) && p.images.length > 0) {
      const first = p.images[0]
      if (typeof first === 'string') return first
      if (first && typeof first === 'object' && (first as any).url) return (first as any).url
    }
    return ''
  }

  // OLX Import Modal States
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [olxUrl, setOlxUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient()
    
    // Resolve organization configuration
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: u } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
      if (u) {
        const { data: member } = await supabase
          .from('organization_members')
          .select('organizations(olx_profile_url)')
          .eq('user_id', u.id)
          .eq('is_primary', true)
          .single()

        if (member?.organizations) {
          setOlxUrl((member.organizations as any).olx_profile_url || '')
        }
      }
    }

    const [{ data: props }, { data: syns }] = await Promise.all([
      supabase.from('properties').select('*').order('created_at', { ascending: false }),
      supabase.from('property_syndications').select('*')
    ])

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

  const handleImportFromOlx = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!olxUrl.trim()) return
    setImporting(true)
    setImportResult(null)
    setImportError(null)

    try {
      const res = await fetch('/api/sync/olx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'pull', olx_url: olxUrl })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setImportResult(data)
      // Reload properties grid
      await loadData()
    } catch (err: any) {
      setImportError(err.message)
    } finally {
      setImporting(false)
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
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <RefreshCw size={14} className={importing ? 'animate-spin' : ''} />
            Import from OLX
          </button>
          <Link
            href={`/${locale}/dashboard/properties/new`}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shrink-0"
          >
            <Plus size={16} /> {t('addProperty')}
          </Link>
        </div>
      </div>

      {/* Filters & View Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'draft', 'inactive', 'sold', 'rented'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all capitalize shadow-sm ${
                statusFilter === status
                  ? 'bg-primary text-primary-foreground border-primary shadow-primary/10'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {status === 'all' ? `All (${properties.length})` : `${status} (${properties.filter(p => p.status === status).length})`}
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/40 shrink-0 self-start sm:self-auto shadow-sm">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'grid'
                ? 'bg-white text-[#3520D5] shadow-sm border border-black/5'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid size={13} />
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'list'
                ? 'bg-white text-[#3520D5] shadow-sm border border-black/5'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List size={13} />
            List
          </button>
        </div>
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
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => {
              const propSyns = syndications.filter(s => s.property_id === p.id && s.status === 'active')
              const coverImage = getCoverImage(p)
              return (
                <div key={p.id} className="group relative flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 shadow-sm animate-fade-in">
                  {/* Photo Header */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted border-b border-border">
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-muted">
                        <Building2 size={40} className="text-muted-foreground/30" />
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <span className={`absolute top-3 left-3 text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm ${STATUS_COLORS[p.status] || STATUS_COLORS.draft}`}>
                      {p.status}
                    </span>

                    {/* Price Tag Overlay */}
                    <span className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md text-white px-3 py-1.5 rounded-xl font-bold text-sm shadow-md border border-white/10">
                      {formatPrice(Number(p.price), p.price_period)}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      {/* Type & Syndications */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#3520D5] bg-[#3520D5]/5 px-2 py-0.5 rounded border border-[#3520D5]/10">
                          {p.type}
                        </span>
                        {propSyns.length > 0 && (
                          <div className="flex gap-1">
                            {propSyns.map(s => (
                              <span key={s.id} className="text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
                                {s.portal_name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <Link href={`/${locale}/dashboard/properties/${p.id}`} className="block group/title">
                        <h3 className="font-display text-base font-bold text-foreground leading-snug group-hover/title:text-primary transition-colors line-clamp-2 min-h-[2.75rem]">
                          {p.title}
                        </h3>
                      </Link>

                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-2 truncate">
                        <MapPin size={12} className="shrink-0 text-muted-foreground/60" />
                        <span>{p.city}{p.address ? `, ${p.address}` : ''}</span>
                      </p>
                    </div>

                    {/* Specs divider bar */}
                    <div className="grid grid-cols-3 gap-2 py-2.5 my-1 border-y border-border/60 text-muted-foreground text-xs bg-muted/25 rounded-xl px-2">
                      <div className="flex items-center gap-1.5 justify-center">
                        <BedDouble size={14} className="text-muted-foreground/60" />
                        <span className="font-bold text-foreground">{p.bedrooms ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-center border-x border-border/60">
                        <Bath size={14} className="text-muted-foreground/60" />
                        <span className="font-bold text-foreground">{p.bathrooms ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-center">
                        <Ruler size={14} className="text-muted-foreground/60" />
                        <span className="font-bold text-foreground truncate">{p.area_size ? `${p.area_size} m²` : '—'}</span>
                      </div>
                    </div>

                    {/* Actions footer */}
                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        href={`/${locale}/dashboard/properties/${p.id}`}
                        className="flex-1 text-center py-2 text-xs font-semibold bg-muted hover:bg-primary hover:text-white rounded-lg transition-colors border border-border/60 hover:border-transparent text-foreground hover:shadow-sm"
                      >
                        View Details
                      </Link>
                      <button
                        onClick={() => setSelectedProperty(p)}
                        className="p-2 border border-border/80 rounded-lg hover:bg-[#3520D5]/5 hover:text-primary transition-colors shrink-0 text-muted-foreground flex items-center justify-center"
                        title="Syndicate listing"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border shadow-sm">
            {filtered.map((p) => {
              const propSyns = syndications.filter(s => s.property_id === p.id && s.status === 'active')
              const coverImage = getCoverImage(p)
              return (
                <article key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Small Thumbnail */}
                    <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 border border-border bg-muted">
                      {coverImage ? (
                        <img src={coverImage} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 size={20} className="text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    
                    <Link
                      href={`/${locale}/dashboard/properties/${p.id}`}
                      className="flex-1 min-w-0 group"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-display text-base font-bold text-foreground leading-tight group-hover:text-primary transition-colors truncate">{p.title}</h3>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_COLORS[p.status] || STATUS_COLORS.draft}`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5"><MapPin size={11} /> {p.city}</span>
                        <span>•</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider">{p.type}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[11px]"><BedDouble size={11} /> {p.bedrooms ?? '—'} beds</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[11px]"><Bath size={11} /> {p.bathrooms ?? '—'} baths</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[11px]"><Ruler size={11} /> {p.area_size ? `${p.area_size} m²` : '—'}</span>
                        {propSyns.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              {propSyns.map(s => (
                                <span key={s.id} className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 border border-blue-200">
                                  {s.portal_name}
                                </span>
                              ))}
                            </span>
                          </>
                        )}
                      </div>
                    </Link>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 self-end sm:self-auto">
                    <p className="font-display text-lg font-bold text-foreground whitespace-nowrap">
                      {formatPrice(Number(p.price), p.price_period)}
                    </p>
                    <button
                      onClick={() => setSelectedProperty(p)}
                      className="flex items-center gap-1.5 text-xs border border-border bg-background hover:bg-muted px-2.5 py-1.5 rounded-lg transition-colors text-muted-foreground hover:text-foreground shadow-sm"
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
        )
      )}

      {/* Import from OLX Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold">Import Listings from OLX.ba</h2>
              <button 
                onClick={() => {
                  setIsImportOpen(false)
                  setImportResult(null)
                  setImportError(null)
                }} 
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleImportFromOlx} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                  OLX Profile or Store Link
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://olx.ba/profil/vaš-profil"
                  value={olxUrl}
                  onChange={(e) => setOlxUrl(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  We will scan this profile/shop link and import any active real estate listings into Estateline.
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportOpen(false)
                    setImportResult(null)
                    setImportError(null)
                  }}
                  className="px-4 py-2 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing || !olxUrl}
                  className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {importing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    'Import Listings'
                  )}
                </button>
              </div>
            </form>

            {/* Import Results Display */}
            {importResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200/60 rounded-xl space-y-2 max-h-48 overflow-y-auto">
                <p className="text-xs text-emerald-800 font-bold">
                  Successfully imported {importResult.importedCount} listings!
                </p>
                {importResult.imported.length > 0 ? (
                  <div className="space-y-1.5 mt-2">
                    {importResult.imported.map((item: any) => (
                      <div key={item.id} className="bg-white border border-emerald-100 p-2 rounded-lg flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-800 truncate pr-2">{item.title}</span>
                        <span className="font-bold text-emerald-700 shrink-0">{item.price.toLocaleString()} BAM</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-500 italic">No new listings found (all properties on this profile are already imported and up-to-date!).</p>
                )}
              </div>
            )}

            {importError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                Error during import: {importError}
              </div>
            )}
          </div>
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
