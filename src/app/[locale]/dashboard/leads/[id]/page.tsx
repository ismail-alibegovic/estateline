'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useCurrency } from '@/components/CurrencyContext'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Mail, Phone, Building2, Edit2, Check, X as XIcon,
  Star, Tag, Calendar, MessageSquare, Eye, Trash2, Clock,
  TrendingUp, User, Phone as PhoneIcon, DollarSign, Activity,
  Home, ChevronRight, Target, X
} from 'lucide-react'

const STAGE_COLORS: Record<string, string> = {
  'New': 'badge-blue',
  'Contacted': 'badge-indigo',
  'Qualified': 'badge-sage',
  'Proposal': 'badge-gold',
  'Negotiation': 'badge-gold',
  'Closed Won': 'badge-sage',
  'Closed Lost': 'badge-rose',
}

const SOURCE_LABELS: Record<string, string> = {
  'website': 'Website',
  'referral': 'Referral',
  'portal': 'Portal',
  'social': 'Social',
  'email': 'Email',
  'phone': 'Phone',
  'walk-in': 'Walk-in',
  'other': 'Other',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'badge-blue',
  won: 'badge-sage',
  lost: 'badge-rose',
  junk: 'badge-muted',
}

const ALL_STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']
const ALL_SOURCES = ['website', 'referral', 'portal', 'social', 'email', 'phone', 'walk-in', 'other']
const ALL_STATUSES = ['open', 'won', 'lost', 'junk']

interface LeadData {
  id: string
  organization_id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  company: string | null
  stage: string
  source: string | null
  status: string
  property_id: string | null
  budget_min: number | null
  budget_max: number | null
  requirements: string | null
  rating: number | null
  tags: string[] | null
  last_contacted_at: string | null
  last_activity_at: string | null
  lost_reason: string | null
  created_at: string
  updated_at: string
}

interface LinkedProperty {
  id: string
  title: string
  price: number | null
  city: string | null
  status: string
  cover_image_url: string | null
}

interface Communication {
  id: string
  type: string
  title: string
  summary: string | null
  scheduled_at: string
  created_at: string
}

interface Viewing {
  id: string
  scheduled_at: string
  status: string
  duration_minutes: number | null
  notes: string | null
  feedback: string | null
  feedback_rating: number | null
}

interface ActivityEntry {
  id: string
  type: string
  description: string
  created_at: string
  metadata: any
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) || 'en'
  const id = params?.id as string

  const [lead, setLead] = useState<LeadData | null>(null)
  const [linkedProperty, setLinkedProperty] = useState<LinkedProperty | null>(null)
  const [communications, setCommunications] = useState<Communication[]>([])
  const [viewings, setViewings] = useState<Viewing[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [editData, setEditData] = useState<Partial<LeadData>>({})
  const [editTags, setEditTags] = useState<string[]>([])
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [converting, setConverting] = useState(false)
  const [dealType, setDealType] = useState<'sale' | 'rental'>('sale')
  const [dealProperty, setDealProperty] = useState<string>('')
  const [orgProperties, setOrgProperties] = useState<{ id: string; title: string }[]>([])
  const { formatPrice } = useCurrency()

  const getInitials = (first: string, last?: string | null) => {
    const f = first ? first.trim()[0].toUpperCase() : ''
    const l = last ? last.trim()[0].toUpperCase() : ''
    return f + l || '?'
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString(locale === 'bs' ? 'bs-BA' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString(locale === 'bs' ? 'bs-BA' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const daysSince = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  }

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient()

      const [{ data: ld }, { data: comms }, { data: vws }, { data: acts }] = await Promise.all([
        supabase.from('leads').select('*').eq('id', id).single(),
        supabase.from('communications').select('id, type, title, summary, scheduled_at, created_at').eq('lead_id', id).order('created_at', { ascending: false }).limit(10),
        supabase.from('viewings').select('id, scheduled_at, status, duration_minutes, notes, feedback, feedback_rating').eq('lead_id', id).order('scheduled_at', { ascending: false }).limit(10),
        supabase.from('activity_log').select('id, type, description, created_at, metadata').eq('lead_id', id).order('created_at', { ascending: false }).limit(15),
      ])

      if (ld) {
        setLead(ld as LeadData)
        setEditData(ld as LeadData)
        setEditTags((ld as any).tags || [])
        // Fetch org properties for deal conversion dropdown
        if ((ld as any).organization_id) {
          const { data: props } = await supabase
            .from('properties')
            .select('id, title')
            .eq('organization_id', (ld as any).organization_id)
            .order('title', { ascending: true })
            .limit(50)
          if (props) setOrgProperties(props as { id: string; title: string }[])
        }

        if ((ld as any).property_id) {
          const { data: prop } = await supabase
            .from('properties')
            .select('id, title, price, city, status, cover_image_url')
            .eq('id', (ld as any).property_id)
            .single()
          if (prop) setLinkedProperty(prop as LinkedProperty)
        }
      }
      if (comms) setCommunications(comms as Communication[])
      if (vws) setViewings(vws as Viewing[])
      if (acts) setActivity(acts as ActivityEntry[])

      // Fetch org properties for convert modal
      if (ld) {
        const { data: orgId } = await supabase.rpc('get_user_org_id')
        if (orgId) {
          const { data: props } = await supabase
            .from('properties')
            .select('id, title')
            .eq('organization_id', orgId)
            .order('title', { ascending: true })
          if (props) setOrgProperties(props as { id: string; title: string }[])
        }
      }

      setLoading(false)      // Fetch org properties for convert modal
      if (ld) {
        const { data: orgId } = await supabase.from('leads').select('organization_id').eq('id', id).single()
        if (orgId?.organization_id) {
          const { data: props } = await supabase
            .from('properties')
            .select('id, title')
            .eq('organization_id', orgId.organization_id)
            .order('title', { ascending: true })
            .limit(50)
          if (props) setOrgProperties(props)
        }
      }
    }
    load()
  }, [id])

  const handleSave = async () => {
    if (!lead) return
    setSaving(true)
    const supabase = createBrowserClient()
    const { error } = await supabase.from('leads').update({
      first_name: editData.first_name,
      last_name: editData.last_name,
      email: editData.email,
      phone: editData.phone,
      company: editData.company,
      stage: editData.stage,
      source: editData.source,
      status: editData.status,
      budget_min: editData.budget_min,
      budget_max: editData.budget_max,
      requirements: editData.requirements,
      rating: editData.rating,
      tags: editTags,
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    setSaving(false)
    if (!error) {
      setLead(prev => prev ? { ...prev, ...editData, tags: editTags } as LeadData : prev)
      setEditMode(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    const supabase = createBrowserClient()
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (!error) {
      router.push(`/${locale}/dashboard/leads`)
    } else {
      setDeleting(false)
      alert('Failed to delete lead: ' + error.message)
    }
  }
  const handleConvertToDeal = async () => {
    if (!lead) return
    setConverting(true)
    try {
      const res = await fetch(`/api/leads/${id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_type: dealType, property_id: dealProperty || null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Conversion failed")
      }
      setShowConvertModal(false)
      setLead({ ...lead, status: "won" })
      alert(locale === "bs" ? "Lead je uspješno konvertovan u posao!" : "Lead successfully converted to deal!")
      router.push(`/${locale}/dashboard/pipeline`)
    } catch (e: any) {
      alert("Conversion failed: " + e.message)
    } finally {
      setConverting(false)
    }
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !editTags.includes(t)) {
      setEditTags([...editTags, t])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setEditTags(editTags.filter(t => t !== tag))
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

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <User size={48} className="text-muted-foreground/30 mb-3" />
        <h2 className="font-display font-bold text-foreground mb-2">Lead not found</h2>
        <Link href={`/${locale}/dashboard/leads`} className="text-primary text-sm hover:underline">
          ← Back to Leads
        </Link>
      </div>
    )
  }

  const fullName = `${lead.first_name} ${lead.last_name || ''}`.trim()
  const initials = getInitials(lead.first_name, lead.last_name)
  const budgetText = lead.budget_min != null && lead.budget_max != null
    ? `${formatPrice(lead.budget_min)} – ${formatPrice(lead.budget_max)}`
    : lead.budget_min != null
      ? `From ${formatPrice(lead.budget_min)}`
      : lead.budget_max != null
        ? `Up to ${formatPrice(lead.budget_max)}`
        : null

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Back + Actions */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/${locale}/dashboard/leads`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Leads
        </Link>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button
                onClick={() => { setEditMode(false); setEditData(lead); setEditTags(lead.tags || []) }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <X size={14} /> {locale === 'bs' ? 'Otkaži' : 'Cancel'}
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
              {lead.status !== 'won' && lead.status !== 'junk' && (
                <button
                  onClick={() => setShowConvertModal(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-[#C9963B] text-white rounded-lg hover:bg-[#B8862B] transition-colors"
                >
                  <Target size={14} /> {locale === 'bs' ? 'Konvertuj u posao' : 'Convert to Deal'}
                </button>
              )}
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

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <h3 className="font-display font-bold text-lg text-foreground">Delete Lead?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              This will permanently delete <strong className="text-foreground">{fullName}</strong> and all associated data. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-900 font-bold text-lg flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            {editMode ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>First Name</label>
                  <input
                    className={inputClass}
                    value={editData.first_name || ''}
                    onChange={e => setEditData({ ...editData, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Last Name</label>
                  <input
                    className={inputClass}
                    value={editData.last_name || ''}
                    onChange={e => setEditData({ ...editData, last_name: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <h1 className="font-display font-bold text-2xl text-foreground mb-1">{fullName}</h1>
            )}
            {!editMode && (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`badge ${STAGE_COLORS[lead.stage] || 'badge-muted'}`}>{lead.stage}</span>
                <span className={`badge ${STATUS_COLORS[lead.status] || 'badge-muted'}`}>{lead.status}</span>
                {lead.source && <span className="badge badge-muted">{SOURCE_LABELS[lead.source] || lead.source}</span>}
              </div>
            )}
          </div>
        </div>

        {editMode && (
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
            <div>
              <label className={labelClass}>Stage</label>
              <select
                className={inputClass}
                value={editData.stage || 'New'}
                onChange={e => setEditData({ ...editData, stage: e.target.value })}
              >
                {ALL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Source</label>
              <select
                className={inputClass}
                value={editData.source || 'website'}
                onChange={e => setEditData({ ...editData, source: e.target.value })}
              >
                {ALL_SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                className={inputClass}
                value={editData.status || 'open'}
                onChange={e => setEditData({ ...editData, status: e.target.value })}
              >
                {ALL_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-foreground mb-4">Contact Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {editMode ? (
                <>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      className={inputClass}
                      type="email"
                      value={editData.email || ''}
                      onChange={e => setEditData({ ...editData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input
                      className={inputClass}
                      value={editData.phone || ''}
                      onChange={e => setEditData({ ...editData, phone: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Company</label>
                    <input
                      className={inputClass}
                      value={editData.company || ''}
                      onChange={e => setEditData({ ...editData, company: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2.5">
                    <Mail size={16} className="text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">{lead.email || (locale === 'bs' ? 'Nema email' : 'No email')}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone size={16} className="text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">{lead.phone || (locale === 'bs' ? 'Nema telefon' : 'No phone')}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Building2 size={16} className="text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">{lead.company || (locale === 'bs' ? 'Bez firme' : 'No company')}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Budget & Requirements */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-foreground mb-4">Budget & Requirements</h2>
            {editMode ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Budget Min</label>
                    <input
                      className={inputClass}
                      type="number"
                      value={editData.budget_min ?? ''}
                      onChange={e => setEditData({ ...editData, budget_min: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Budget Max</label>
                    <input
                      className={inputClass}
                      type="number"
                      value={editData.budget_max ?? ''}
                      onChange={e => setEditData({ ...editData, budget_max: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Requirements</label>
                  <textarea
                    className={inputClass + ' min-h-[80px] resize-y'}
                    value={editData.requirements || ''}
                    onChange={e => setEditData({ ...editData, requirements: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {budgetText && (
                  <div className="flex items-center gap-2.5">
                    <DollarSign size={16} className="text-[#C9963B] shrink-0" />
                    <span className="text-sm font-semibold text-foreground">{budgetText}</span>
                  </div>
                )}
                {lead.requirements && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{lead.requirements}</p>
                )}
                {!budgetText && !lead.requirements && (
                  <p className="text-sm text-muted-foreground/60 italic">{locale === 'bs' ? 'Nema specificiranih zahtjeva' : 'No requirements specified'}</p>
                )}
              </div>
            )}
          </div>

          {/* Tags & Rating */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-foreground mb-4">Tags & Rating</h2>
            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Rating (1-5)</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setEditData({ ...editData, rating: editData.rating === n ? null : n })}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          size={22}
                          className={editData.rating && editData.rating >= n ? 'fill-[#C9963B] text-[#C9963B]' : 'text-muted-foreground/30'}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editTags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 badge badge-gold">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-red-600">
                          <XIcon size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      className={inputClass + ' flex-1'}
                      placeholder={locale === 'bs' ? 'Dodaj tag…' : 'Add tag…'}
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                    />
                    <button
                      onClick={addTag}
                      className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {lead.rating != null && (
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star
                        key={n}
                        size={16}
                        className={(lead.rating ?? 0) >= n ? 'fill-[#C9963B] text-[#C9963B]' : 'text-muted-foreground/20'}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">({lead.rating}/5)</span>
                  </div>
                )}
                {lead.tags && lead.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {lead.tags.map(tag => (
                      <span key={tag} className="badge badge-gold">{tag}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/60 italic">{locale === 'bs' ? 'Nema tagova' : 'No tags'}</p>
                )}
              </div>
            )}
          </div>

          {/* Linked Property */}
          {linkedProperty && !editMode && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-display font-bold text-lg text-foreground mb-4">Interested Property</h2>
              <Link
                href={`/${locale}/dashboard/properties/${linkedProperty.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/50 transition-all group"
              >
                {linkedProperty.cover_image_url ? (
                  <img
                    src={linkedProperty.cover_image_url}
                    alt={linkedProperty.title}
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Home size={20} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground group-hover:text-[#C9963B] transition-colors truncate">{linkedProperty.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {linkedProperty.city || (locale === 'bs' ? 'Nepoznata lokacija' : 'Unknown location')}
                    {linkedProperty.price != null && ` · ${formatPrice(linkedProperty.price)}`}
                  </p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground shrink-0" />
              </Link>
            </div>
          )}

          {/* Recent Communications */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg text-foreground">Communications</h2>
              <Link href={`/${locale}/dashboard/communications`} className="text-xs text-primary hover:underline">
                {locale === 'bs' ? 'Vidi sve' : 'View all'}
              </Link>
            </div>
            {communications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare size={28} className="text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground/60">{locale === 'bs' ? 'Nema komunikacije' : 'No communications yet'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {communications.map(c => (
                  <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/60">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      c.type === 'call' ? 'bg-blue-100 text-blue-700' :
                      c.type === 'email' ? 'bg-amber-100 text-amber-700' :
                      c.type === 'meeting' ? 'bg-green-100 text-green-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {c.type === 'call' ? <PhoneIcon size={14} /> :
                       c.type === 'email' ? <Mail size={14} /> :
                       c.type === 'meeting' ? <Calendar size={14} /> :
                       <MessageSquare size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{c.title}</p>
                      {c.summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.summary}</p>}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{formatDateTime(c.scheduled_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Viewings */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg text-foreground">Viewings</h2>
              <Link href={`/${locale}/dashboard/viewings`} className="text-xs text-primary hover:underline">
                {locale === 'bs' ? 'Vidi sve' : 'View all'}
              </Link>
            </div>
            {viewings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Eye size={28} className="text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground/60">{locale === 'bs' ? 'Nema obilazaka' : 'No viewings scheduled'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {viewings.map(v => (
                  <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Calendar size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{formatDateTime(v.scheduled_at)}</p>
                      {v.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{v.notes}</p>}
                    </div>
                    <span className={`badge ${
                      v.status === 'completed' ? 'badge-sage' :
                      v.status === 'cancelled' || v.status === 'no-show' ? 'badge-rose' :
                      'badge-blue'
                    }`}>{v.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-foreground mb-4">Activity Timeline</h2>
            {activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity size={28} className="text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground/60">{locale === 'bs' ? 'Nema aktivnosti' : 'No activity yet'}</p>
              </div>
            ) : (
              <div className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                {activity.map(a => (
                  <div key={a.id} className="relative flex items-start gap-3 pl-0">
                    <div className="w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center shrink-0 z-10">
                      <div className="w-2 h-2 rounded-full bg-[#C9963B]" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm text-foreground">{a.description}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{formatDateTime(a.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-display font-bold text-sm text-foreground mb-3 uppercase tracking-wider">Overview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{locale === 'bs' ? 'Dani u sistemu' : 'Days in pipeline'}</span>
                <span className="text-sm font-bold text-foreground">{daysSince(lead.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{locale === 'bs' ? 'Komunikacija' : 'Communications'}</span>
                <span className="text-sm font-bold text-foreground">{communications.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{locale === 'bs' ? 'Obilasci' : 'Viewings'}</span>
                <span className="text-sm font-bold text-foreground">{viewings.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{locale === 'bs' ? 'Zadnji kontakt' : 'Last contact'}</span>
                <span className="text-sm font-bold text-foreground">{formatDate(lead.last_contacted_at) || (locale === 'bs' ? 'Nikad' : 'Never')}</span>
              </div>
            </div>
          </div>

          {/* Created */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-display font-bold text-sm text-foreground mb-3 uppercase tracking-wider">Details</h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-muted-foreground block mb-0.5">{locale === 'bs' ? 'Kreiran' : 'Created'}</span>
                <span className="text-sm text-foreground">{formatDate(lead.created_at)}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-0.5">{locale === 'bs' ? 'Zadnja aktivnost' : 'Last activity'}</span>
                <span className="text-sm text-foreground">{formatDate(lead.last_activity_at) || (locale === 'bs' ? 'Nema' : 'None')}</span>
              </div>
              {lead.lost_reason && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">{locale === 'bs' ? 'Razlog gubitka' : 'Lost reason'}</span>
                  <span className="text-sm text-rose-600">{lead.lost_reason}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-display font-bold text-sm text-foreground mb-3 uppercase tracking-wider">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href={`/${locale}/dashboard/communications?lead=${lead.id}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <MessageSquare size={14} /> {locale === 'bs' ? 'Zabilježi komunikaciju' : 'Log Communication'}
              </Link>
              <Link
                href={`/${locale}/dashboard/viewings?lead=${lead.id}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <Calendar size={14} /> {locale === 'bs' ? 'Zakaži obilazak' : 'Schedule Viewing'}
              </Link>
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <Mail size={14} /> {locale === 'bs' ? 'Pošalji email' : 'Send Email'}
                </a>
              )}
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <Phone size={14} /> {locale === 'bs' ? 'Zovi' : 'Call'}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Convert to Deal Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Target size={18} className="text-amber-600" />
                </div>
                <h3 className="font-display font-bold text-lg text-foreground">
                  {locale === 'bs' ? 'Konvertuj u posao' : 'Convert to Deal'}
                </h3>
              </div>
              <button
                onClick={() => setShowConvertModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              {locale === 'bs'
                ? `Ovo će kreirati novi kontakt i posao za ${lead?.first_name || ''} ${lead?.last_name || ''}, te označiti lead kao "won".`
                : `This will create a new contact and deal for ${lead?.first_name || ''} ${lead?.last_name || ''}, and mark the lead as "won".`}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {locale === 'bs' ? 'Tip posla' : 'Deal Type'}
                </label>
                <select
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  value={dealType}
                  onChange={e => setDealType(e.target.value as 'sale' | 'rental')}
                >
                  <option value="sale">{locale === 'bs' ? 'Prodaja' : 'Sale'}</option>
                  <option value="rental">{locale === 'bs' ? 'Iznajmljivanje' : 'Rental'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {locale === 'bs' ? 'Nekretnina (opciono)' : 'Property (optional)'}
                </label>
                <select
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  value={dealProperty}
                  onChange={e => setDealProperty(e.target.value)}
                >
                  <option value="">{locale === 'bs' ? '— Bez nekretnine —' : '— No property —'}</option>
                  {orgProperties.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                {locale === 'bs' ? 'Otkaži' : 'Cancel'}
              </button>
              <button
                onClick={handleConvertToDeal}
                disabled={converting}
                className="px-4 py-2 text-sm bg-[#C9963B] text-white rounded-lg hover:bg-[#B8862B] transition-colors disabled:opacity-50"
              >
                {converting
                  ? (locale === 'bs' ? 'Konvertujem…' : 'Converting…')
                  : (locale === 'bs' ? 'Konvertuj' : 'Convert')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
