'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useTranslations } from 'next-intl'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { Plus, X, Search, Users } from 'lucide-react'

interface ContactRow {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  type: string
  city: string | null
  company: string | null
  created_at: string
}

const TYPE_COLORS: Record<string, string> = {
  client: 'bg-blue-50 text-blue-700 border-blue-200',
  owner: 'bg-violet-50 text-violet-700 border-violet-200',
  tenant: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  vendor: 'bg-amber-50 text-amber-700 border-amber-200',
  other: 'bg-gray-50 text-gray-600 border-gray-200',
}

type Toast = { id: string; message: string; type: 'success' | 'error' }

export default function ContactsPage() {
  const t = useTranslations('contacts')
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'client' | 'owner' | 'tenant' | 'vendor' | 'other'>('all')
  const [toasts, setToasts] = useState<Toast[]>([])

  // Modal
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    type: 'client', city: '', company: '',
  })

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  const loadContacts = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: u } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!u) { setLoading(false); return }

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', (u as any).id)
      .eq('is_primary', true)
      .single()

    if (member) {
      setOrgId((member as any).organization_id)
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', (member as any).organization_id)
        .order('created_at', { ascending: false })
      if (data) setContacts(data as ContactRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadContacts() }, [loadContacts])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId || !form.first_name.trim()) return
    setSaving(true)

    const supabase = createBrowserClient()
    const { error } = await supabase.from('contacts').insert({
      organization_id: orgId,
      first_name: form.first_name,
      last_name: form.last_name || null,
      email: form.email || null,
      phone: form.phone || null,
      type: form.type,
      city: form.city || null,
      company: form.company || null,
    })

    setSaving(false)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Contact added!')
      setIsOpen(false)
      setForm({ first_name: '', last_name: '', email: '', phone: '', type: 'buyer', city: '', company: '' })
      loadContacts()
    }
  }

  const filtered = contacts.filter(c => {
    const matchSearch = search === '' || `${c.first_name} ${c.last_name} ${c.email} ${c.phone} ${c.company}`.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || c.type === typeFilter
    return matchSearch && matchType
  })

  const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border ${
              t.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {t.type === 'success' ? '✓' : '✗'} {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">CRM</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{contacts.length} contacts total</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-sm"
        >
          <Plus size={16} /> {t('addContact')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card border border-border rounded-xl">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none w-full"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'client', 'owner', 'tenant', 'vendor', 'other'].map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all capitalize ${
                typeFilter === type
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {type === 'all' ? 'All' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-2xl bg-card">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users size={28} className="text-muted-foreground" />
          </div>
          <h3 className="font-display font-semibold text-foreground mb-1">
            {search || typeFilter !== 'all' ? 'No contacts match your filters' : 'No contacts yet'}
          </h3>
          <p className="text-muted-foreground text-sm mb-4">Add your clients and partners here.</p>
          {!search && typeFilter === 'all' && (
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all"
            >
              <Plus size={16} /> Add First Contact
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">Name</th>
                <th className="px-5 py-3.5 font-semibold hidden md:table-cell">Email</th>
                <th className="px-5 py-3.5 font-semibold">Phone</th>
                <th className="px-5 py-3.5 font-semibold">Type</th>
                <th className="px-5 py-3.5 font-semibold hidden lg:table-cell">City</th>
                <th className="px-5 py-3.5 font-semibold hidden lg:table-cell">Company</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 font-semibold text-foreground">
                    {c.first_name} {c.last_name || ''}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground hidden md:table-cell">{c.email || '—'}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>{c.phone || '—'}</span>
                      {c.phone && <WhatsAppButton phone={c.phone} entityType="contact" entityId={c.id} />}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${TYPE_COLORS[c.type] || TYPE_COLORS.other}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground hidden lg:table-cell">{c.city || '—'}</td>
                  <td className="px-5 py-4 text-muted-foreground hidden lg:table-cell">{c.company || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Contact Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold font-display">New Contact</h2>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">First Name *</label>
                  <input type="text" required placeholder="Jane" className={inputClass} value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Last Name</label>
                  <input type="text" placeholder="Doe" className={inputClass} value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Email</label>
                <input type="email" placeholder="jane@example.com" className={inputClass} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Phone</label>
                <input type="tel" placeholder="+387 61 000 000" className={inputClass} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Type</label>
                  <select className={inputClass} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    <option value="client">Client</option>
                    <option value="owner">Owner</option>
                    <option value="tenant">Tenant</option>
                    <option value="vendor">Vendor</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">City</label>
                  <input type="text" placeholder="Sarajevo" className={inputClass} value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Company</label>
                <input type="text" placeholder="Acme Real Estate" className={inputClass} value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all text-sm mt-2"
              >
                {saving ? 'Saving…' : 'Add Contact'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
