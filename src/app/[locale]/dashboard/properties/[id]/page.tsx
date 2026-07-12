'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Building2, MapPin, BedDouble, Bath,
  Ruler, Calendar, Tag, Edit2, Check, X as XIcon,
  TrendingUp, Eye, ExternalLink, Globe
} from 'lucide-react'
import type { Database } from '@/lib/supabase'

type Property = Database['public']['Tables']['properties']['Row']
type Syndication = Database['public']['Tables']['property_syndications']['Row']

interface Viewing {
  id: string
  scheduled_at: string
  status: string
  contacts?: { first_name: string; last_name: string | null } | null
}

interface Lead {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  stage: string
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  draft: 'bg-amber-100 text-amber-700 border-amber-200',
  sold: 'bg-purple-100 text-purple-700 border-purple-200',
  rented: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
}

const PORTAL_LABELS: Record<string, string> = {
  olx: 'OLX.ba',
  njuskalo: 'Njuškalo.hr',
  nekretnine_rs: 'Nekretnine.rs',
}

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) || 'en'
  const id = params?.id as string

  const [property, setProperty] = useState<Property | null>(null)
  const [syndications, setSyndications] = useState<Syndication[]>([])
  const [viewings, setViewings] = useState<Viewing[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState<Partial<Property>>({})

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient()

      const [{ data: prop }, { data: syns }, { data: vws }, { data: lds }] = await Promise.all([
        supabase.from('properties').select('*').eq('id', id).single(),
        supabase.from('property_syndications').select('*').eq('property_id', id),
        supabase.from('viewings').select('id, scheduled_at, status, contacts(first_name, last_name)').eq('property_id', id).order('scheduled_at', { ascending: false }).limit(5),
        supabase.from('leads').select('id, first_name, last_name, email, stage').eq('property_id', id).order('created_at', { ascending: false }).limit(10),
      ])

      if (prop) {
        setProperty(prop as Property)
        setEditData(prop as Property)
      }
      if (syns) setSyndications(syns as Syndication[])
      if (vws) setViewings(vws as any)
      if (lds) setLeads(lds as Lead[])
      setLoading(false)
    }
    load()
  }, [id])

  const handleSave = async () => {
    if (!property) return
    setSaving(true)
    const supabase = createBrowserClient()
    const { error } = await supabase.from('properties').update({
      title: editData.title,
      description: editData.description,
      price: editData.price,
      status: editData.status,
      city: editData.city,
      address: editData.address,
      bedrooms: editData.bedrooms,
      bathrooms: editData.bathrooms,
      area_size: editData.area_size,
    }).eq('id', id)

    setSaving(false)
    if (!error) {
      setProperty(prev => prev ? { ...prev, ...editData } : prev)
      setEditMode(false)
    }
  }

  const toggleSyndication = async (portal: 'olx' | 'njuskalo' | 'nekretnine_rs') => {
    const supabase = createBrowserClient()
    const existing = syndications.find(s => s.portal_name === portal)

    if (existing) {
      const newStatus = existing.status === 'active' ? 'paused' : 'active'
      await supabase.from('property_syndications').update({ status: newStatus }).eq('id', existing.id)
      setSyndications(prev => prev.map(s => s.id === existing.id ? { ...s, status: newStatus } : s))
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: u } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
      if (!u) return
      const { data: member } = await supabase.from('organization_members').select('organization_id').eq('user_id', (u as any).id).eq('is_primary', true).single()
      if (!member) return
      const { data: newSyn } = await supabase.from('property_syndications').insert({
        organization_id: (member as any).organization_id,
        property_id: id,
        portal_name: portal,
        status: 'active',
      }).select().single()
      if (newSyn) setSyndications(prev => [...prev, newSyn as Syndication])
    }
  }

  const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1'

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Building2 size={48} className="text-muted-foreground/30 mb-3" />
        <h2 className="font-display font-bold text-foreground mb-2">Property not found</h2>
        <Link href={`/${locale}/dashboard/properties`} className="text-primary text-sm hover:underline">
          ← Back to Properties
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Back + Actions */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/${locale}/dashboard/properties`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Properties
        </Link>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button
                onClick={() => { setEditMode(false); setEditData(property) }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <XIcon size={14} /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Check size={14} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Edit2 size={14} /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* Placeholder image header */}
        <div className="h-48 bg-gradient-to-br from-primary/10 via-primary/5 to-muted flex items-center justify-center border-b border-border">
          <Building2 size={64} className="text-primary/20" />
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              {editMode ? (
                <input
                  type="text"
                  value={editData.title || ''}
                  onChange={e => setEditData(p => ({ ...p, title: e.target.value }))}
                  className="w-full text-2xl font-display font-bold bg-transparent border-b-2 border-primary outline-none pb-1"
                />
              ) : (
                <h1 className="font-display text-2xl font-bold text-foreground">{property.title}</h1>
              )}
              <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                <MapPin size={13} />
                <span>{property.city}{property.address ? `, ${property.address}` : ''}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-3xl font-bold text-foreground">
                {editMode ? (
                  <input
                    type="number"
                    value={editData.price || ''}
                    onChange={e => setEditData(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                    className="w-40 text-right bg-transparent border-b-2 border-primary outline-none text-2xl"
                  />
                ) : (
                  Number(property.price).toLocaleString()
                )}
              </p>
              <p className="text-sm text-muted-foreground">{property.currency}</p>
            </div>
          </div>

          {/* Status + Type badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {editMode ? (
              <select
                value={editData.status || ''}
                onChange={e => setEditData(p => ({ ...p, status: e.target.value as any }))}
                className="text-xs border border-border rounded-full px-3 py-1 bg-background outline-none"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="sold">Sold</option>
                <option value="rented">Rented</option>
              </select>
            ) : (
              <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border capitalize ${STATUS_COLORS[property.status] || STATUS_COLORS.draft}`}>
                {property.status}
              </span>
            )}
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-border bg-muted text-muted-foreground capitalize">
              {property.type}
            </span>
            {property.featured && (
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                ⭐ Featured
              </span>
            )}
          </div>

          {/* Spec grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: <BedDouble size={16} />, label: 'Bedrooms', value: property.bedrooms ?? '—', editKey: 'bedrooms', type: 'number' },
              { icon: <Bath size={16} />, label: 'Bathrooms', value: property.bathrooms ?? '—', editKey: 'bathrooms', type: 'number' },
              { icon: <Ruler size={16} />, label: 'Area', value: property.area_size ? `${property.area_size} m²` : '—', editKey: 'area_size', type: 'number' },
              { icon: <Calendar size={16} />, label: 'Year Built', value: property.year_built ?? '—', editKey: 'year_built', type: 'number' },
            ].map(({ icon, label, value, editKey, type }) => (
              <div key={label} className="bg-muted/50 rounded-xl p-3 border border-border/50">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">{icon}<span className="text-xs uppercase tracking-wider font-semibold">{label}</span></div>
                {editMode ? (
                  <input
                    type={type}
                    value={(editData as any)[editKey] || ''}
                    onChange={e => setEditData(p => ({ ...p, [editKey]: type === 'number' ? parseFloat(e.target.value) || null : e.target.value }))}
                    className="w-full text-sm font-bold bg-transparent border-b border-primary outline-none"
                  />
                ) : (
                  <p className="text-sm font-bold text-foreground">{String(value)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="font-display font-bold text-lg mb-3">Description</h2>
            {editMode ? (
              <textarea
                rows={5}
                value={editData.description || ''}
                onChange={e => setEditData(p => ({ ...p, description: e.target.value }))}
                className={inputClass}
                placeholder="Describe the property…"
              />
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {property.description || 'No description provided.'}
              </p>
            )}
          </div>

          {/* Map placeholder */}
          {(property.latitude || property.longitude) && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 pt-5 pb-3">
                <h2 className="font-display font-bold text-lg">Location</h2>
              </div>
              <div className="h-48 bg-muted/50 flex items-center justify-center border-t border-border">
                <div className="text-center">
                  <MapPin size={24} className="text-muted-foreground/40 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {property.latitude?.toFixed(5)}, {property.longitude?.toFixed(5)}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink size={11} /> View in Google Maps
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Recent Viewings */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg">Recent Viewings</h2>
              <span className="text-xs text-muted-foreground">{viewings.length} total</span>
            </div>
            {viewings.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 text-center py-6">No viewings scheduled.</p>
            ) : (
              <div className="divide-y divide-border">
                {viewings.map(v => (
                  <div key={v.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {v.contacts?.first_name || 'Guest'} {v.contacts?.last_name || ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.scheduled_at).toLocaleDateString()} at {new Date(v.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full capitalize ${
                      v.status === 'completed' ? 'bg-green-100 text-green-700' :
                      v.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked Leads */}
          {leads.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="font-display font-bold text-lg mb-4">Interested Leads</h2>
              <div className="divide-y divide-border">
                {leads.map(l => (
                  <div key={l.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{l.first_name} {l.last_name || ''}</p>
                      {l.email && <p className="text-xs text-muted-foreground">{l.email}</p>}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground capitalize">
                      {l.stage}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">Stats</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><Eye size={14} /> Views</div>
              <span className="font-bold text-foreground">{property.views_count ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><Calendar size={14} /> Viewings</div>
              <span className="font-bold text-foreground">{viewings.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp size={14} /> Leads</div>
              <span className="font-bold text-foreground">{leads.length}</span>
            </div>
            <div className="pt-2 border-t border-border text-xs text-muted-foreground">
              Listed: {new Date(property.created_at).toLocaleDateString()}
            </div>
          </div>

          {/* Portal Syndication */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={16} className="text-primary" />
              <h2 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">Portal Syndication</h2>
            </div>
            <div className="space-y-3">
              {(['olx', 'njuskalo', 'nekretnine_rs'] as const).map(portal => {
                const syn = syndications.find(s => s.portal_name === portal)
                const isActive = syn?.status === 'active'
                return (
                  <div key={portal} className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{PORTAL_LABELS[portal]}</p>
                    <button
                      onClick={() => toggleSyndication(portal)}
                      className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${
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
          </div>

          {/* Features */}
          {Array.isArray(property.features) && property.features.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <h2 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">Features</h2>
              <div className="flex flex-wrap gap-2">
                {(property.features as string[]).map((f: string) => (
                  <span key={f} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground capitalize">
                    <Tag size={10} /> {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
