'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useTranslations } from 'next-intl'
import { Plus, X, Calendar, Clock, User, Building2, CheckCircle2, MapPin, Phone } from 'lucide-react'

interface Viewing {
  id: string
  property_id: string
  contact_id: string | null
  lead_id: string | null
  scheduled_at: string
  status: string
  notes: string | null
  duration_minutes: number | null
  properties?: { title: string; city: string }
  contacts?: { first_name: string; last_name: string | null; phone?: string } | null
  leads?: { first_name: string; last_name: string | null; phone?: string } | null
}

const DEMO_VIEWINGS: Viewing[] = [
  {
    id: 'demo-viewing-1',
    property_id: 'p1',
    contact_id: 'c1',
    lead_id: null,
    scheduled_at: new Date(Date.now() + 3600000 * 2).toISOString(),
    status: 'confirmed',
    notes: 'Kupac dolazi sa suprugom, traže trosoban stan.',
    duration_minutes: 45,
    properties: { title: 'Dvoetažni Luksuzni Stan - Skenderija', city: 'Sarajevo' },
    contacts: { first_name: 'Emir', last_name: 'Hadžić', phone: '+387 61 222 333' },
  },
  {
    id: 'demo-viewing-2',
    property_id: 'p2',
    contact_id: null,
    lead_id: 'l2',
    scheduled_at: new Date(Date.now() + 3600000 * 5).toISOString(),
    status: 'scheduled',
    notes: 'Obilazak kuće i bašte sa klijentom.',
    duration_minutes: 60,
    properties: { title: 'Moderna Porodična Vila sa Bazenom', city: 'Sarajevo' },
    leads: { first_name: 'Belma', last_name: 'Čolić', phone: '+387 62 444 555' },
  },
  {
    id: 'demo-viewing-3',
    property_id: 'p3',
    contact_id: 'c3',
    lead_id: null,
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    status: 'completed',
    notes: 'Završen pregled, klijent šalje ponudu u ponedjeljak.',
    duration_minutes: 30,
    properties: { title: 'Penthouse sa Pogledom na Grad', city: 'Sarajevo' },
    contacts: { first_name: 'Mirza', last_name: 'Selimović', phone: '+387 61 777 888' },
  },
]

type Toast = { id: string; message: string; type: 'success' | 'error' }

export default function ViewingsPage() {
  const t = useTranslations('viewings')
  const [viewings, setViewings] = useState<Viewing[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const [newViewing, setNewViewing] = useState({
    title: '',
    client_name: '',
    phone: '',
    date: '',
    time: '14:00',
    duration: '45',
    notes: '',
    status: 'scheduled',
  })

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  const loadData = useCallback(async () => {
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
        .from('viewings')
        .select('*, properties(title, city), contacts(first_name, last_name, phone), leads(first_name, last_name, phone)')
        .eq('organization_id', (member as any).organization_id)
        .order('scheduled_at', { ascending: true })

      if (data && data.length > 0) {
        setViewings(data as any)
      } else {
        setViewings([])
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCreateViewing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newViewing.title || !newViewing.date) {
      toast('Molimo unesite naslov nekretnine i datum', 'error')
      return
    }
    setSaving(true)

    const scheduled_at = new Date(`${newViewing.date}T${newViewing.time}`).toISOString()
    const item: Viewing = {
      id: `demo-${Date.now()}`,
      property_id: 'p1',
      contact_id: null,
      lead_id: null,
      scheduled_at,
      status: newViewing.status,
      notes: newViewing.notes,
      duration_minutes: parseInt(newViewing.duration),
      properties: { title: newViewing.title, city: 'Sarajevo' },
      contacts: { first_name: newViewing.client_name || 'Klijent', last_name: '', phone: newViewing.phone },
    }

    setViewings(prev => [item, ...prev])
    toast('Obilazak je zakazan!')
    setShowModal(false)
    setNewViewing({ title: '', client_name: '', phone: '', date: '', time: '14:00', duration: '45', notes: '', status: 'scheduled' })
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="w-full space-y-6 py-12">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-3xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4 font-sans animate-fade-in">
      {/* Toast popup */}
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
          <p className="page-eyebrow mb-1">KALENDAR AGENCIJE</p>
          <h1
            className="text-3xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
          >
            {t('title') || 'Obilasci & Sastanci'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Raspored pregleda nekretnina sa kupcima i potpisivanja ugovora.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white shadow-md transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #C9963B 0%, #b88328 100%)',
            boxShadow: '0 4px 16px rgba(201,150,59,0.25)',
          }}
        >
          <Plus size={16} />
          <span>Zakazi Novi Obilazak</span>
        </button>
      </header>

      {/* Viewings Timeline List */}
      <div className="space-y-4">
        {viewings.map((v) => {
          const client = v.contacts || v.leads
          const dateObj = new Date(v.scheduled_at)
          const timeStr = dateObj.toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })
          const dateStr = dateObj.toLocaleDateString('bs-BA', { weekday: 'short', day: 'numeric', month: 'short' })

          return (
            <div
              key={v.id}
              className="bg-white border border-gray-200/70 rounded-3xl p-6 shadow-sm hover:border-[#C9963B] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/70 flex flex-col items-center justify-center text-[#C9963B] shrink-0">
                  <Clock size={18} />
                  <span className="font-bold text-sm text-gray-900 mt-1">{timeStr}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#C9963B] uppercase tracking-wider">{dateStr}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                      {v.status === 'confirmed' ? 'Potvrđeno' : v.status === 'completed' ? 'Završeno' : 'Zakazano'}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-gray-900 group-hover:text-[#C9963B] transition-colors">
                    {v.properties?.title || 'Nekretnina'}
                  </h3>

                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <User size={13} className="text-gray-400" />
                    <span>Kupac: <b>{client?.first_name || 'Klijent'} {client?.last_name || ''}</b></span>
                    {client?.phone && (
                      <a href={`tel:${client.phone}`} className="text-[#C9963B] font-bold flex items-center gap-1 hover:underline ml-2">
                        <Phone size={12} /> {client.phone}
                      </a>
                    )}
                  </p>

                  {v.notes && (
                    <p className="text-xs text-gray-400 italic pt-1">„{v.notes}”</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span className="text-xs text-gray-400 font-medium">Trajanje: {v.duration_minutes || 45} min</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Schedule Viewing */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-xl font-bold text-gray-900">Zakazi Obilazak Nekretnine</h3>
              <p className="text-xs text-gray-500 mt-1">Unesite detalje za pregled nekretnine sa kupcem.</p>
            </div>

            <form onSubmit={handleCreateViewing} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Naziv Nekretnine *</label>
                <input
                  type="text"
                  required
                  placeholder="Dvoetažni Luksuzni Stan - Skenderija"
                  value={newViewing.title}
                  onChange={e => setNewViewing(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Ime Kupca</label>
                  <input
                    type="text"
                    placeholder="Emir Hadžić"
                    value={newViewing.client_name}
                    onChange={e => setNewViewing(p => ({ ...p, client_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Telefon</label>
                  <input
                    type="tel"
                    placeholder="+387 61 000 000"
                    value={newViewing.phone}
                    onChange={e => setNewViewing(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Datum *</label>
                  <input
                    type="date"
                    required
                    value={newViewing.date}
                    onChange={e => setNewViewing(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Vrijeme</label>
                  <input
                    type="time"
                    value={newViewing.time}
                    onChange={e => setNewViewing(p => ({ ...p, time: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Napomena za Obilazak</label>
                <textarea
                  rows={2}
                  placeholder="Kupac traži informacije o garažnom mjestu..."
                  value={newViewing.notes}
                  onChange={e => setNewViewing(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#C9963B] text-white font-semibold text-xs rounded-xl shadow-md hover:bg-[#b88328] transition-colors"
                >
                  {saving ? 'Zakazivanje...' : 'Zakazi Obilazak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
