'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function NewPropertyPage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customFields, setCustomFields] = useState<any[]>([])
  const [customValues, setCustomValues] = useState<Record<string, any>>({})
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    price_period: 'one_time',
    currency: 'EUR',
    type: 'apartment',
    status: 'draft',
    city: '',
    address: '',
    bedrooms: '',
    bathrooms: '',
    area_size: '',
    year_built: '',
  })

  useEffect(() => {
    const loadDefs = async () => {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: u } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
      if (!u) return

      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', u.id)
        .eq('is_primary', true)
        .single()

      if (member) {
        const { data: defs } = await supabase
          .from('custom_field_definitions')
          .select('*')
          .eq('organization_id', member.organization_id)
          .eq('entity', 'property')
        if (defs) setCustomFields(defs)
      }
    }
    loadDefs()
  }, [])

  const field = (key: keyof typeof formData) => ({
    value: formData[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setFormData(prev => ({ ...prev, [key]: e.target.value })),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setLoading(false); return }

    // Look up internal user first (Fixes Auth ID Bug)
    const { data: u } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!u) { setError('User profile not found'); setLoading(false); return }

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', u.id)
      .eq('is_primary', true)
      .single()
    if (!member) { setError('No organization found'); setLoading(false); return }

    // Generate slug from title
    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now()

    const { error: insertError } = await supabase.from('properties').insert({
      organization_id: member.organization_id,
      title: formData.title,
      description: formData.description || null,
      slug,
      price: parseFloat(formData.price),
      price_period: formData.price_period,
      currency: formData.currency,
      type: formData.type,
      status: formData.status,
      city: formData.city,
      address: formData.address || null,
      area_size: formData.area_size ? parseFloat(formData.area_size) : null,
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
      bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
      year_built: formData.year_built ? parseInt(formData.year_built) : null,
      features: [],
      images: [],
      country: 'BA',
      custom_fields: customValues,
    })

    setLoading(false)
    if (insertError) {
      setError(insertError.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push(`/${locale}/dashboard/properties`), 1200)
    }
  }

  const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5'

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="text-emerald-500" size={32} />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground">Property Added!</h2>
        <p className="text-muted-foreground text-sm">Redirecting to properties list…</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <Link
          href={`/${locale}/dashboard/properties`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft size={14} /> Back to Properties
        </Link>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Properties</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Add New Property</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-sm">
          <h2 className="text-base font-display font-bold">Basic Details</h2>
          <div>
            <label className={labelClass}>Property Title *</label>
            <input type="text" required placeholder="e.g. Modern 2-Bedroom Apartment in Sarajevo" className={inputClass} {...field('title')} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              placeholder="Describe the property, its features, and surroundings..."
              rows={4}
              className={inputClass}
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Price *</label>
              <input type="number" required placeholder="250000" min="0" className={inputClass} {...field('price')} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Price Period</label>
              <select className={inputClass} {...field('price_period')}>
                <option value="one_time">One-time</option>
                <option value="monthly">Per Month</option>
                <option value="yearly">Per Year</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Currency</label>
              <select className={inputClass} {...field('currency')}>
                <option value="EUR">EUR (€)</option>
                <option value="BAM">BAM (KM)</option>
                <option value="RSD">RSD (din)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select className={inputClass} {...field('status')}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Property Type</label>
              <select className={inputClass} {...field('type')}>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="villa">Villa</option>
                <option value="office">Office</option>
                <option value="land">Land</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Area Size (m²)</label>
              <input type="number" placeholder="75" min="0" className={inputClass} {...field('area_size')} />
            </div>
            <div>
              <label className={labelClass}>Year Built</label>
              <input type="number" placeholder="2010" min="1800" max="2030" className={inputClass} {...field('year_built')} />
            </div>
            <div>
              <label className={labelClass}>Bedrooms</label>
              <input type="number" placeholder="2" min="0" className={inputClass} {...field('bedrooms')} />
            </div>
            <div>
              <label className={labelClass}>Bathrooms</label>
              <input type="number" placeholder="1" min="0" className={inputClass} {...field('bathrooms')} />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-sm">
          <h2 className="text-base font-display font-bold">Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>City *</label>
              <input type="text" required placeholder="e.g. Sarajevo" className={inputClass} {...field('city')} />
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <input type="text" placeholder="e.g. Ferhadija 12" className={inputClass} {...field('address')} />
            </div>
          </div>
        </div>

        {/* Custom Fields Section */}
        {customFields.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-sm">
            <h2 className="text-base font-display font-bold">Custom Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customFields.map(field => {
                const labelText = field.required ? `${field.label} *` : field.label
                return (
                  <div key={field.id}>
                    <label className={labelClass}>{labelText}</label>
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
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href={`/${locale}/dashboard/properties`}
            className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {loading ? 'Saving…' : 'Add Property'}
          </button>
        </div>
      </form>
    </div>
  )
}
