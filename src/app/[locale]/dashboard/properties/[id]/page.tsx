'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useCurrency } from '@/components/CurrencyContext'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Building2, MapPin, BedDouble, Bath,
  Ruler, Calendar, Tag, Edit2, Check, X as XIcon,
  TrendingUp, Eye, ExternalLink, Globe, ChevronLeft, ChevronRight, Trash2
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
  active: 'badge-sage',
  draft: 'badge-gold',
  sold: 'badge-gold',
  rented: 'badge-indigo',
  inactive: 'badge-rose opacity-75',
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
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editData, setEditData] = useState<Partial<Property>>({})
  const [customFields, setCustomFields] = useState<any[]>([])
  const [customValues, setCustomValues] = useState<Record<string, any>>({})
  const { formatPrice, currency } = useCurrency()
  const [activeImgIdx, setActiveImgIdx] = useState(0)

  const getInitials = (first: string, last?: string | null) => {
    const f = first ? first.trim()[0].toUpperCase() : ''
    const l = last ? last.trim()[0].toUpperCase() : ''
    return f + l || '?'
  }

  const getImages = (): string[] => {
    if (!property) return []
    const imgs = property.images
    if (Array.isArray(imgs)) {
      return imgs.map((item: any) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && item.url) return item.url
        return ''
      }).filter(Boolean)
    }
    if (property.cover_image_url) {
      return [property.cover_image_url]
    }
    return []
  }

  const propertyImages = getImages()

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
        setCustomValues((prop as any).custom_fields || {})

        // Load custom field definitions for the org
        const { data: defs } = await supabase
          .from('custom_field_definitions')
          .select('*')
          .eq('organization_id', (prop as any).organization_id)
          .eq('entity', 'property')
        if (defs) setCustomFields(defs)
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
      custom_fields: customValues,
    }).eq('id', id)

    setSaving(false)
    if (!error) {
      setProperty(prev => prev ? { ...prev, ...editData, custom_fields: customValues } as any : prev)
      setEditMode(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    const supabase = createBrowserClient()
    const { error } = await supabase.from('properties').delete().eq('id', id)
    if (!error) {
      router.push(`/${locale}/dashboard/properties`)
    } else {
      setDeleting(false)
      alert('Failed to delete property: ' + error.message)
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <Edit2 size={14} /> Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold font-display mb-2 text-foreground">Delete Property?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently remove <strong>{property.title}</strong> and all associated data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-semibold border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* Premium Image Gallery Slider */}
        {propertyImages.length > 0 ? (
          <div className="border-b border-border bg-black/5 dark:bg-black/45">
            {/* Main Image Slider */}
            <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden flex items-center justify-center bg-black/95">
              <img
                src={propertyImages[activeImgIdx]}
                alt={`${property.title} - Photo ${activeImgIdx + 1}`}
                className="w-full h-full object-contain"
              />

              {propertyImages.length > 1 && (
                <>
                  {/* Left Navigation Arrow */}
                  <button
                    onClick={() => setActiveImgIdx(prev => (prev === 0 ? propertyImages.length - 1 : prev - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black text-foreground hover:scale-105 active:scale-95 flex items-center justify-center shadow-md backdrop-blur-sm transition-all z-10"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  {/* Right Navigation Arrow */}
                  <button
                    onClick={() => setActiveImgIdx(prev => (prev === propertyImages.length - 1 ? 0 : prev + 1))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black text-foreground hover:scale-105 active:scale-95 flex items-center justify-center shadow-md backdrop-blur-sm transition-all z-10"
                  >
                    <ChevronRight size={20} />
                  </button>

                  {/* Image Counter Badge */}
                  <span className="absolute bottom-4 right-4 px-2.5 py-1 rounded-md bg-black/70 text-white text-xs font-semibold tracking-wider backdrop-blur-sm z-10">
                    {activeImgIdx + 1} / {propertyImages.length}
                  </span>
                </>
              )}
            </div>

            {/* Thumbnail Navigation Row */}
            {propertyImages.length > 1 && (
              <div className="p-3 bg-muted/30 border-t border-border flex gap-2 overflow-x-auto scrollbar-thin">
                {propertyImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImgIdx(idx)}
                    className={`relative w-20 aspect-[16/10] rounded-lg overflow-hidden border-2 shrink-0 transition-all ${idx === activeImgIdx
                        ? 'border-primary opacity-100 scale-105 shadow-sm'
                        : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Fallback Placeholder */
          <div className="h-48 bg-gradient-to-br from-primary/10 via-primary/5 to-muted flex items-center justify-center border-b border-border">
            <Building2 size={64} className="text-primary/20" />
          </div>
        )}

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
              <div className="font-display text-3xl font-bold text-foreground">
                {editMode ? (
                  <div className="flex flex-col items-end">
                    <input
                      type="number"
                      value={editData.price || ''}
                      onChange={e => setEditData(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                      className="w-40 text-right bg-transparent border-b-2 border-primary outline-none text-2xl font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 lowercase">KM (BAM)</span>
                  </div>
                ) : (
                  formatPrice(Number(property.price), property.price_period)
                )}
              </div>
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
              { icon: <BedDouble size={16} className="text-[#C9963B]" />, label: 'Bedrooms', value: property.bedrooms ?? '—', editKey: 'bedrooms', type: 'number', iconBg: 'bg-amber-500/10 border border-amber-500/20' },
              { icon: <Bath size={16} className="text-[#C9963B]" />, label: 'Bathrooms', value: property.bathrooms ?? '—', editKey: 'bathrooms', type: 'number', iconBg: 'bg-amber-500/10 border border-amber-500/20' },
              { icon: <Ruler size={16} className="text-[#C9963B]" />, label: 'Area', value: property.area_size ? `${property.area_size} m²` : '—', editKey: 'area_size', type: 'number', iconBg: 'bg-amber-500/10 border border-amber-500/20' },
              { icon: <Calendar size={16} className="text-[#C9963B]" />, label: 'Year Built', value: property.year_built ?? '—', editKey: 'year_built', type: 'number', iconBg: 'bg-amber-500/10 border border-amber-500/20' },
            ].map(({ icon, label, value, editKey, type, iconBg }) => (
              <div key={label} className="bg-gradient-to-b from-white to-muted/20 rounded-xl p-4 border border-border/80 shadow-sm transition-all duration-200 hover:shadow-md">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <div className={`p-1.5 rounded-lg shrink-0 ${iconBg}`}>{icon}</div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</span>
                </div>
                {editMode ? (
                  <input
                    type={type}
                    value={(editData as any)[editKey] || ''}
                    onChange={e => setEditData(p => ({ ...p, [editKey]: type === 'number' ? parseFloat(e.target.value) || null : e.target.value }))}
                    className="w-full text-sm font-extrabold bg-transparent border-b border-primary outline-none focus:border-primary text-foreground"
                  />
                ) : (
                  <p className="text-sm font-extrabold text-foreground">{String(value)}</p>
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

          {/* Custom Fields Section */}
          {customFields.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="font-display font-bold text-lg mb-3">Custom Details</h2>
              {editMode ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFields.map(field => {
                    const labelText = field.required ? `${field.label} *` : field.label
                    return (
                      <div key={field.id}>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">{labelText}</label>
                        {field.field_type === 'select' ? (
                          <select
                            required={field.required}
                            value={customValues[field.name] || ''}
                            onChange={e => setCustomValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                            className={inputClass}
                          >
                            <option value="">Select option...</option>
                            {Array.isArray(field.options) && field.options.map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.field_type === 'boolean' ? (
                          <select
                            required={field.required}
                            value={customValues[field.name] !== undefined ? String(customValues[field.name]) : ''}
                            onChange={e => setCustomValues(prev => ({ ...prev, [field.name]: e.target.value === 'true' }))}
                            className={inputClass}
                          >
                            <option value="">Select...</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        ) : (
                          <input
                            type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : field.field_type === 'url' ? 'url' : 'text'}
                            required={field.required}
                            value={customValues[field.name] || ''}
                            onChange={e => setCustomValues(prev => ({ ...prev, [field.name]: field.field_type === 'number' ? parseFloat(e.target.value) || '' : e.target.value }))}
                            className={inputClass}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {customFields.map(field => {
                    const rawVal = customValues[field.name]
                    let displayVal = rawVal
                    if (rawVal === undefined || rawVal === null || rawVal === '') {
                      displayVal = '—'
                    } else if (field.field_type === 'boolean') {
                      displayVal = rawVal ? 'Yes' : 'No'
                    } else if (field.field_type === 'url') {
                      displayVal = (
                        <a href={rawVal} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          {rawVal} <ExternalLink size={10} />
                        </a>
                      )
                    }

                    return (
                      <div key={field.id} className="border-b border-border/40 pb-2">
                        <span className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{field.label}</span>
                        <div className="text-sm font-semibold text-foreground mt-0.5">{displayVal}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Real Google Maps */}
          {(property.latitude || property.longitude) && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 flex items-center justify-between border-b border-border animate-fade-in">
                <div>
                  <h2 className="font-display font-bold text-lg">Location</h2>
                  <p className="text-xs text-muted-foreground">
                    Coords: {property.latitude?.toFixed(5)}, {property.longitude?.toFixed(5)}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                >
                  <ExternalLink size={12} /> View in Google Maps
                </a>
              </div>
              <div className="h-64 w-full bg-muted/30">
                <iframe
                  title="Google Maps Location"
                  width="100%"
                  height="100%"
                  className="border-0 shadow-inner"
                  loading="lazy"
                  allowFullScreen
                  src={`https://maps.google.com/maps?q=${property.latitude},${property.longitude}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                ></iframe>
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
              <div className="divide-y divide-border/60">
                {viewings.map(v => (
                  <div key={v.id} className="flex items-center justify-between py-3.5 hover:bg-muted/10 transition-colors px-1 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 text-[#C9963B] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                        {getInitials(v.contacts?.first_name || 'Guest', v.contacts?.last_name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-800 leading-tight">
                          {v.contacts?.first_name || 'Guest'} {v.contacts?.last_name || ''}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(v.scheduled_at).toLocaleDateString()} at {new Date(v.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <span className={`badge ${v.status === 'completed' ? 'badge-sage' :
                        v.status === 'cancelled' ? 'badge-rose' :
                          'badge-indigo'
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
              <div className="divide-y divide-border/60">
                {leads.map(l => (
                  <div key={l.id} className="flex items-center justify-between py-3.5 hover:bg-muted/10 transition-colors px-1 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-50 border border-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                        {getInitials(l.first_name, l.last_name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-800 leading-tight">{l.first_name} {l.last_name || ''}</p>
                        {l.email && <p className="text-[11px] text-muted-foreground mt-0.5">{l.email}</p>}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground capitalize shadow-sm">
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

                // Bespoke portal brand colors
                const activeClasses =
                  portal === 'olx' ? 'bg-[#3520D5]/10 text-[#3520D5] border-[#3520D5]/20 hover:bg-[#3520D5]/15' :
                    portal === 'njuskalo' ? 'bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100' :
                      'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'

                return (
                  <div key={portal} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0 last:pb-0">
                    <p className="text-xs font-semibold text-foreground">{PORTAL_LABELS[portal]}</p>
                    <button
                      onClick={() => toggleSyndication(portal)}
                      className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl font-bold border transition-all shadow-sm ${isActive
                          ? activeClasses
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
              <div className="flex flex-wrap gap-1.5">
                {(property.features as string[]).map((f: string) => (
                  <span key={f} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl bg-[#3520D5]/5 border border-[#3520D5]/10 text-[#3520D5] hover:bg-[#3520D5]/10 font-bold transition-all capitalize shadow-sm">
                    <Tag size={10} className="text-[#3520D5]/60" /> {f}
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
