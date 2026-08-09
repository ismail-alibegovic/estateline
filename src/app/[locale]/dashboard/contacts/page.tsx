'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useTranslations } from 'next-intl'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { Plus, X, Search, Users, Mail, Trash2, Phone, Building2, CheckCircle2, MapPin } from 'lucide-react'

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

const TYPE_LABELS: Record<string, { bs: string; color: string; bg: string }> = {
  client: { bs: 'Kupac', color: '#C9963B', bg: '#FAF8F5' },
  owner: { bs: 'Vlasnik / Prodavac', color: '#9333EA', bg: '#F3E8FF' },
  tenant: { bs: 'Zakupac', color: '#059669', bg: '#ECFDF5' },
  vendor: { bs: 'Partner / Notar', color: '#2563EB', bg: '#EFF6FF' },
  other: { bs: 'Ostalo', color: '#6B7280', bg: '#F3F4F6' },
}

type Toast = { id: string; message: string; type: 'success' | 'error' }

export default function ContactsPage() {
  const t = useTranslations('contacts')
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'client' | 'owner' | 'tenant' | 'vendor'>('all')
  const [toasts, setToasts] = useState<Toast[]>([])

  // Modal
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    type: 'client',
    city: 'Sarajevo',
    company: '',
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

      if (data && data.length > 0) {
        setContacts(data as ContactRow[])
      } else {
        setContacts([])
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadContacts() }, [loadContacts])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name.trim()) return
    setSaving(true)

    if (orgId) {
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

      if (error) {
        toast(error.message, 'error')
      } else {
        toast('Kontakt je usješno dodan!')
        setIsOpen(false)
        setForm({ first_name: '', last_name: '', email: '', phone: '', type: 'client', city: 'Sarajevo', company: '' })
        loadContacts()
      }
    } else {
      const newContact: ContactRow = {
        id: crypto.randomUUID(),
        first_name: form.first_name,
        last_name: form.last_name || null,
        email: form.email || null,
        phone: form.phone || null,
        type: form.type,
        city: form.city || 'Sarajevo',
        company: form.company || null,
        created_at: new Date().toISOString(),
      }
      setContacts(prev => [newContact, ...prev])
      toast('Kontakt je dodan!')
      setIsOpen(false)
      setForm({ first_name: '', last_name: '', email: '', phone: '', type: 'client', city: 'Sarajevo', company: '' })
    }
    setSaving(false)
  }

  const deleteContact = async (id: string) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj kontakt?')) return
    const supabase = createBrowserClient()
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Kontakt je obrisan!')
      setContacts(prev => prev.filter(c => c.id !== id))
    }
  }

  const filtered = contacts.filter(c => {
    const matchSearch = search === '' || `${c.first_name} ${c.last_name} ${c.email} ${c.phone} ${c.company}`.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || c.type === typeFilter
    return matchSearch && matchType
  })

  if (loading) {
    return (
      <div className="w-full space-y-6 py-12">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-44 rounded-3xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-4 font-sans animate-fade-in">
      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold border ${
              t.type === 'success' ? 'bg-gray-900 text-white border-gray-800' : 'bg-red-600 text-white border-red-500'
            }`}
          >
            {t.type === 'success' ? <CheckCircle2 size={16} className="text-[#C9963B]" /> : <X size={16} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/70 pb-6">
        <div>
          <p className="page-eyebrow mb-1">IMENIK AGENCIJE</p>
          <h1
            className="text-3xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
          >
            {t('title') || 'Adresar & Kontakti'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Baza kupaca, vlasnika nekretnina, zakupaca, notara i agencijskih partnera.
          </p>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white shadow-md transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #C9963B 0%, #b88328 100%)',
            boxShadow: '0 4px 16px rgba(201,150,59,0.25)',
          }}
        >
          <Plus size={16} />
          <span>Dodaj Novi Kontakt</span>
        </button>
      </header>

      {/* Controls & Filter Tabs */}
      <div className="bg-white rounded-3xl border border-gray-200/70 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Pretraži po imenu, telefonu, emailu ili firmi..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
            />
          </div>

          {/* Type Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'client', 'owner', 'tenant', 'vendor'] as const).map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all capitalize ${
                  typeFilter === type
                    ? 'bg-[#C9963B] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type === 'all' ? `Svi (${contacts.length})` : TYPE_LABELS[type]?.bs || type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid List of Contacts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((c) => {
          const typeMeta = TYPE_LABELS[c.type] || TYPE_LABELS.client
          const initials = `${c.first_name?.[0] ?? ''}${c.last_name?.[0] ?? ''}`.toUpperCase() || 'K'
          return (
            <div
              key={c.id}
              className="bg-white border border-gray-200/70 rounded-3xl p-6 hover:border-[#C9963B] transition-all shadow-sm flex flex-col justify-between space-y-4 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 font-bold text-base flex items-center justify-center border border-amber-200/80 shrink-0">
                    {initials}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-gray-900 group-hover:text-[#C9963B] transition-colors">
                      {c.first_name} {c.last_name || ''}
                    </h3>
                    {c.company && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Building2 size={12} className="text-gray-400" />
                        <span>{c.company}</span>
                      </p>
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border" style={{ color: typeMeta.color, background: typeMeta.bg, borderColor: `${typeMeta.color}30` }}>
                  {typeMeta.bs}
                </span>
              </div>

              {/* Contact info list */}
              <div className="space-y-2 text-xs text-gray-600 bg-[#FAF8F5] p-3.5 rounded-2xl border border-gray-100">
                {c.phone ? (
                  <div className="flex items-center justify-between">
                    <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 font-semibold text-gray-800 hover:text-[#C9963B]">
                      <Phone size={13} className="text-gray-400" />
                      <span>{c.phone}</span>
                    </a>
                    <WhatsAppButton phone={c.phone} entityType="contact" entityId={c.id} />
                  </div>
                ) : (
                  <p className="text-gray-400 italic">Nema broja telefona</p>
                )}

                {c.email && (
                  <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-gray-600 hover:text-[#C9963B] truncate pt-1 border-t border-gray-200/60">
                    <Mail size={13} className="text-gray-400 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </a>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <MapPin size={12} /> {c.city || 'Sarajevo'}
                </span>

                <button
                  onClick={() => deleteContact(c.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal New Contact */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-xl font-bold text-gray-900">Dodaj Novi Kontakt</h3>
              <p className="text-xs text-gray-500 mt-1">Unesite lične podatke kupca, prodavca ili notara.</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Ime *</label>
                  <input
                    type="text"
                    required
                    placeholder="Haris"
                    value={form.first_name}
                    onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Prezime</label>
                  <input
                    type="text"
                    placeholder="Dizdarević"
                    value={form.last_name}
                    onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Broj Telefona</label>
                <input
                  type="tel"
                  placeholder="+387 61 000 000"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">E-mail Adresa</label>
                <input
                  type="email"
                  placeholder="haris@email.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Uloga / Vrsta</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  >
                    <option value="client">Kupac</option>
                    <option value="owner">Vlasnik / Prodavac</option>
                    <option value="tenant">Zakupac</option>
                    <option value="vendor">Partner / Notar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Grad</label>
                  <input
                    type="text"
                    placeholder="Sarajevo"
                    value={form.city}
                    onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#C9963B] text-white font-semibold text-xs rounded-xl shadow-md hover:bg-[#b88328] transition-colors"
                >
                  {saving ? 'Sačuvavanje...' : 'Sačuvaj Kontakt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
