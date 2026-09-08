'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { FileText, Image as ImageIcon, Save, Upload } from 'lucide-react'

type Branding = {
  address: string
  phone: string
  email: string
  tax_id: string
  footer_text: string
}

const emptyBranding: Branding = {
  address: '',
  phone: '',
  email: '',
  tax_id: '',
  footer_text: '',
}

export default function DocumentBrandingSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [organizationName, setOrganizationName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [branding, setBranding] = useState<Branding>(emptyBranding)

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single()
      if (!profile) {
        setLoading(false)
        return
      }

      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id, organizations(id, name, logo_url, branding)')
        .eq('user_id', profile.id)
        .eq('is_primary', true)
        .single()

      const org = membership?.organizations as any
      if (org) {
        setOrganizationId(org.id)
        setOrganizationName(org.name || '')
        setLogoUrl(org.logo_url || '')
        setBranding({ ...emptyBranding, ...(org.branding || {}) })
      }
      setLoading(false)
    }
    load()
  }, [])

  const updateBranding = (key: keyof Branding, value: string) => {
    setBranding(prev => ({ ...prev, [key]: value }))
  }

  const uploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !organizationId) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Logo mora biti PNG, JPG ili WebP slika.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo može imati najviše 2 MB.')
      return
    }

    setUploadingLogo(true)
    setError(null)
    const supabase = createBrowserClient()
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `${organizationId}/logo-${Date.now()}.${extension}`
    const { error: uploadError } = await supabase.storage
      .from('organization-assets')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setError('Logo nije moguće učitati. Provjerite da je Supabase migracija primijenjena.')
    } else {
      setLogoUrl(supabase.storage.from('organization-assets').getPublicUrl(path).data.publicUrl)
      setSuccess('Logo je učitan. Sačuvajte memorandum da ga uključite u PDF.')
    }
    setUploadingLogo(false)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!organizationId) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    const supabase = createBrowserClient()
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        logo_url: logoUrl.trim() || null,
        branding: branding,
      })
      .eq('id', organizationId)

    setSaving(false)
    if (updateError) {
      setError('Podešavanja nisu sačuvana. Samo vlasnik ili administrator mogu mijenjati memorandum.')
      return
    }
    setSuccess('Memorandum je sačuvan. Novi PDF dokumenti će koristiti ova podešavanja.')
  }

  if (loading) return <div className="animate-pulse h-64 rounded-xl bg-muted" />

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Settings</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Document Branding</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Memorandum agencije koji se automatski dodaje na svaki novi ugovor i drugi generisani PDF.
        </p>
      </div>

      <form onSubmit={save} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
        {error && <div className="badge badge-rose w-full p-3 block rounded-lg text-center">{error}</div>}
        {success && <div className="badge badge-sage w-full p-3 block rounded-lg text-center">{success}</div>}

        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <ImageIcon size={18} className="text-primary" />
            <div>
              <h2 className="font-semibold text-sm">Logo i zaglavlje</h2>
              <p className="text-xs text-muted-foreground">Učitajte PNG, JPG ili WebP logo do 2 MB.</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Logo URL</label>
            <input
              type="url"
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">
              <Upload size={14} />
              {uploadingLogo ? 'Učitavanje…' : 'Učitaj logo'}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} className="sr-only" disabled={uploadingLogo} />
            </label>
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Pregled memoranduma</div>
            <div className="flex items-center gap-3 border-b border-border pb-3">
              {logoUrl ? <img src={logoUrl} alt="" className="h-12 w-20 object-contain" /> : <div className="h-12 w-20 rounded bg-muted flex items-center justify-center"><ImageIcon size={18} className="text-muted-foreground" /></div>}
              <div>
                <div className="font-bold text-sm uppercase">{organizationName}</div>
                <div className="text-[11px] text-muted-foreground">{branding.address || 'Adresa agencije'} {branding.phone && `• ${branding.phone}`}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <FileText size={18} className="text-primary" />
            <h2 className="font-semibold text-sm">Podaci memoranduma</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              ['address', 'Adresa sjedišta'],
              ['phone', 'Telefon'],
              ['email', 'Email'],
              ['tax_id', 'JIB / ID broj'],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</label>
                <input
                  type="text"
                  value={branding[key]}
                  onChange={e => updateBranding(key, e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Tekst podnožja PDF-a</label>
            <input
              type="text"
              value={branding.footer_text}
              onChange={e => updateBranding('footer_text', e.target.value)}
              placeholder={`${organizationName} — Vaš Partner u Nekretninama`}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </section>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:bg-primary/95 disabled:opacity-50 flex items-center gap-2">
            <Save size={16} />
            {saving ? 'Saving…' : 'Sačuvaj memorandum'}
          </button>
        </div>
      </form>
    </div>
  )
}
