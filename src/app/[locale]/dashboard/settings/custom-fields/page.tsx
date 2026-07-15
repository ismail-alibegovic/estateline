'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Plus, Trash2, Sliders, CheckSquare, Layers } from 'lucide-react'

interface CustomFieldDefinition {
  id: string
  entity: 'lead' | 'contact' | 'property' | 'deal'
  name: string
  label: string
  field_type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'url'
  options: string[]
  required: boolean
}

export default function CustomFieldsSettingsPage() {
  const [fields, setFields] = useState<CustomFieldDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  
  // Form State
  const [entity, setEntity] = useState<'lead' | 'contact' | 'property' | 'deal'>('property')
  const [label, setLabel] = useState('')
  const [fieldType, setFieldType] = useState<CustomFieldDefinition['field_type']>('text')
  const [optionsStr, setOptionsStr] = useState('')
  const [required, setRequired] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadCustomFields()
  }, [])

  const loadCustomFields = async () => {
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
      setOrgId(member.organization_id)
      const { data: defs } = await supabase
        .from('custom_field_definitions')
        .select('*')
        .eq('organization_id', member.organization_id)
        .order('created_at', { ascending: true })
      
      if (defs) {
        setFields(defs.map((d: any) => ({
          ...d,
          options: Array.isArray(d.options) ? d.options : []
        })))
      }
    }
    setLoading(false)
  }

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim() || !orgId) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    // Generate lower_snake_case name from label
    const name = label.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '')

    // Parse options
    const options = optionsStr
      .split(',')
      .map(o => o.trim())
      .filter(Boolean)

    const supabase = createBrowserClient()
    const { error: insertError } = await supabase.from('custom_field_definitions').insert({
      organization_id: orgId,
      entity,
      name,
      label: label.trim(),
      field_type: fieldType,
      options: fieldType === 'select' || fieldType === 'multiselect' ? options : [],
      required,
    })

    setSaving(false)
    if (insertError) {
      setError(insertError.message)
    } else {
      setSuccess('Custom field created successfully!')
      setLabel('')
      setOptionsStr('')
      setRequired(false)
      loadCustomFields()
    }
  }

  const handleDeleteField = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom field? All values associated with entities will remain in JSONB but this definition will be lost.')) return
    const supabase = createBrowserClient()
    const { error: deleteError } = await supabase.from('custom_field_definitions').delete().eq('id', id)
    
    if (deleteError) {
      alert('Failed to delete field: ' + deleteError.message)
    } else {
      loadCustomFields()
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin h-7 w-7 border-b-2 border-primary rounded-full" />
      </div>
    )
  }

  const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all'
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5'

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <header className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Settings</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Custom Fields</h1>
        <p className="mt-2 text-muted-foreground">
          Define extra metadata fields to display and capture on properties, leads, contacts, and deals.
        </p>
      </header>

      {error && <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}
      {success && <div className="p-4 mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creation Form */}
        <section className="bg-card border border-border rounded-xl p-6 shadow-sm h-fit">
          <h2 className="text-base font-bold font-display mb-4 flex items-center gap-1.5">
            <Plus size={16} /> Create Field
          </h2>
          <form onSubmit={handleCreateField} className="space-y-4">
            <div>
              <label className={labelClass}>Target Entity</label>
              <select value={entity} onChange={e => setEntity(e.target.value as any)} className={inputClass}>
                <option value="property">Property</option>
                <option value="lead">Lead</option>
                <option value="contact">Contact</option>
                <option value="deal">Deal</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Field Label</label>
              <input
                type="text"
                required
                placeholder="e.g. Heating Type"
                value={label}
                onChange={e => setLabel(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Field Type</label>
              <select value={fieldType} onChange={e => setFieldType(e.target.value as any)} className={inputClass}>
                <option value="text">Short Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="boolean">Yes/No (Boolean)</option>
                <option value="select">Dropdown Menu</option>
                <option value="multiselect">Multi-Select List</option>
                <option value="url">URL Link</option>
              </select>
            </div>

            {(fieldType === 'select' || fieldType === 'multiselect') && (
              <div>
                <label className={labelClass}>Dropdown Options (comma-separated)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gas, Electric, Central"
                  value={optionsStr}
                  onChange={e => setOptionsStr(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="required"
                checked={required}
                onChange={e => setRequired(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="required" className="text-sm font-medium text-foreground select-none">
                Field is Required
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full mt-6 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/95 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creating...' : 'Create Field'}
            </button>
          </form>
        </section>

        {/* Existing Fields Table */}
        <section className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-bold font-display flex items-center gap-1.5">
            <Sliders size={16} /> Configured Fields ({fields.length})
          </h2>

          {fields.length === 0 ? (
            <div className="bg-card border border-border border-dashed rounded-xl p-8 text-center text-muted-foreground text-sm">
              No custom fields defined yet. Define fields on the left to extend your CRM data schemas.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="p-3">Label (Name)</th>
                    <th className="p-3">Entity</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Req</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-sm text-foreground">
                  {fields.map(field => (
                    <tr key={field.id} className="hover:bg-muted/5 transition-colors">
                      <td className="p-3">
                        <p className="font-semibold">{field.label}</p>
                        <p className="text-xs text-muted-foreground font-mono">{field.name}</p>
                      </td>
                      <td className="p-3 capitalize">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">
                          <Layers size={10} /> {field.entity}
                        </span>
                      </td>
                      <td className="p-3 capitalize text-xs text-muted-foreground font-medium">
                        {field.field_type === 'multiselect' ? 'Multi-Select' : field.field_type}
                        {field.options.length > 0 && ` (${field.options.length} options)`}
                      </td>
                      <td className="p-3">
                        {field.required ? (
                          <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                            Yes
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteField(field.id)}
                          className="p-1 text-muted-foreground hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
