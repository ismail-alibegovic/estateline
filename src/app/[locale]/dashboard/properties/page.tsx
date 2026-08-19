'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useTranslations } from 'next-intl'
import { useCurrency } from '@/components/CurrencyContext'
import { useRouter, useParams } from 'next/navigation'
import {
  Plus, RefreshCw, Building2, ExternalLink, MapPin, Edit3, Trash2, StickyNote,
  LayoutGrid, List, Bed, Bath, Move, Search, Filter, CheckCircle2, X, Download, CheckSquare
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface PropertyItem {
  id: string
  title: string
  type: string
  price: number
  status: string
  city: string | null
  address: string | null
  bedrooms: number | null
  bathrooms: number | null
  area_size: number | null
  description?: string | null
  notes?: string | null
  cover_image_url?: string | null
  images?: string[]
}

const FALLBACK_PROPERTY_IMAGES = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80',
]



type Toast = { id: string; message: string; type: 'success' | 'error' }

export default function PropertiesPage() {
  const t = useTranslations('properties')
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const { formatPrice } = useCurrency()

  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isNoteOpen, setIsNoteOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [selectedProp, setSelectedProp] = useState<PropertyItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Forms
  const [form, setForm] = useState({
    title: '',
    type: 'Stan',
    price: '',
    city: 'Sarajevo',
    address: '',
    bedrooms: '2',
    bathrooms: '1',
    area_size: '70',
    description: '',
    notes: '',
    cover_image_url: '',
  })

  const [noteInput, setNoteInput] = useState('')
  const [olxUrl, setOlxUrl] = useState('')
  const [importing, setImporting] = useState(false)

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
      const oid = (member as any).organization_id
      setOrgId(oid)

      const { data: props } = await supabase
        .from('properties')
        .select('*')
        .eq('organization_id', oid)
        .order('created_at', { ascending: false })

      if (props && props.length > 0) {
        setProperties(props as any)
      } else {
        setProperties([])
        setIsImportOpen(true)
      }
    } else {
      setProperties([])
      setIsImportOpen(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)

    if (!orgId) {
      toast('Organizacija nije pronađena — kontaktirajte podršku.', 'error')
      setSaving(false)
      return
    }

    const supabase = createBrowserClient()
    const { data: inserted, error: insertErr } = await supabase.from('properties').insert({
      organization_id: orgId,
      title: form.title,
      type: form.type,
      price: parseFloat(form.price) || 150000,
      city: form.city || 'Sarajevo',
      address: form.address || '',
      bedrooms: parseInt(form.bedrooms) || 2,
      bathrooms: parseInt(form.bathrooms) || 1,
      area_size: parseFloat(form.area_size) || 70,
      status: 'active',
      description: form.description || '',
    }).select().single()

    if (insertErr) {
      toast(`Greška pri dodavanju: ${insertErr.message}`, 'error')
      setSaving(false)
      return
    }

    const newProp: PropertyItem = {
      id: inserted.id,
      title: inserted.title,
      type: inserted.type || 'Stan',
      price: inserted.price || 0,
      status: inserted.status || 'active',
      city: inserted.city || 'Sarajevo',
      address: inserted.address || '',
      bedrooms: inserted.bedrooms || 0,
      bathrooms: inserted.bathrooms || 0,
      area_size: inserted.area_size || 0,
      description: inserted.description || '',
      images: inserted.images || [],
    }

    toast('Nova nekretnina je dodana!')
    setIsAddOpen(false)
    loadData()
    setForm({ title: '', type: 'Stan', price: '', city: 'Sarajevo', address: '', bedrooms: '2', bathrooms: '1', area_size: '70', description: '', notes: '', cover_image_url: '' })
    setSaving(false)
  }
  const exportPropertiesCSV = () => {
    const headers = ['Title', 'Type', 'Price', 'Status', 'City', 'Address', 'Bedrooms', 'Bathrooms', 'Area (sqm)', 'Description']
    const rows = properties.map(p => [
      p.title,
      p.type,
      p.price,
      p.status,
      p.city || '',
      p.address || '',
      p.bedrooms || '',
      p.bathrooms || '',
      p.area_size || '',
      (p.description || '').replace(/[\n\r]/g, ' ')
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(cell => {
        const s = String(cell ?? '')
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
      }).join(','))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `estateline-properties-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }


  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllProperties = () => setSelectedIds(new Set(filtered.map(p => p.id)))

  const bulkDeleteProperties = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Obrisati ${selectedIds.size} nekretnina?`)) return
    const supabase = createBrowserClient()
    const { error } = await supabase.from('properties').delete().in('id', Array.from(selectedIds))
    if (error) { toast(error.message, 'error'); return }
    setProperties(prev => prev.filter(p => !selectedIds.has(p.id)))
    setSelectedIds(new Set())
    setBulkMode(false)
    toast(`${selectedIds.size} nekretnina obrisano`)
  }

  const openEditModal = (p: PropertyItem) => {
    setSelectedProp(p)
    setForm({
      title: p.title,
      type: p.type || 'Stan',
      price: String(p.price || ''),
      city: p.city || 'Sarajevo',
      address: p.address || '',
      bedrooms: String(p.bedrooms || '2'),
      bathrooms: String(p.bathrooms || '1'),
      area_size: String(p.area_size || '70'),
      description: p.description || '',
      notes: p.notes || '',
      cover_image_url: p.images?.[0] || '',
    })
    setIsEditOpen(true)
  }

  const handleEditProperty = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProp) return
    setSaving(true)

    const updatedProp: PropertyItem = {
      ...selectedProp,
      title: form.title,
      type: form.type,
      price: parseFloat(form.price) || selectedProp.price,
      city: form.city,
      address: form.address,
      bedrooms: parseInt(form.bedrooms) || selectedProp.bedrooms,
      bathrooms: parseInt(form.bathrooms) || selectedProp.bathrooms,
      area_size: parseFloat(form.area_size) || selectedProp.area_size,
      notes: form.notes,
    }

    if (orgId) {
      const supabase = createBrowserClient()
      await supabase.from('properties').update({
        title: form.title,
        type: form.type,
        price: parseFloat(form.price) || selectedProp.price,
        city: form.city,
        address: form.address,
        bedrooms: parseInt(form.bedrooms) || selectedProp.bedrooms,
        bathrooms: parseInt(form.bathrooms) || selectedProp.bathrooms,
        area_size: parseFloat(form.area_size) || selectedProp.area_size,
      }).eq('id', selectedProp.id)
    }

    setProperties(prev => prev.map(p => p.id === selectedProp.id ? updatedProp : p))
    toast('Nekretnina je ažurirana!')
    setIsEditOpen(false)
    setSaving(false)
  }

  const saveNote = async () => {
    if (!selectedProp) return
    setProperties(prev => prev.map(p => p.id === selectedProp.id ? { ...p, notes: noteInput } : p))
    toast('Interna napomena je sačuvana!')
    setIsNoteOpen(false)
  }

  const deleteProperty = async (id: string) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovu nekretninu iz ponude?')) return
    if (orgId) {
      const supabase = createBrowserClient()
      await supabase.from('properties').delete().eq('id', id)
    }
    setProperties(prev => prev.filter(p => p.id !== id))
    toast('Nekretnina je obrisana!')
  }

  const handleImportOLX = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!olxUrl.trim()) return
    setImporting(true)

    try {
      const res = await fetch('/api/sync/olx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'pull', olx_url: olxUrl }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        const count = data.importedCount || 0
        toast(count > 0
          ? `Uspješno uvezeno ${count} nekretnina sa OLX.ba!`
          : 'Nema novih nekretnina za uvoz sa OLX.ba.')
        loadData()
      } else {
        toast(data.error || 'Neuspješan uvoz sa OLX-a. Provjerite URL.', 'error')
      }
    } catch (err) {
      toast('Došlo je do greške prilikom uvoza sa OLX-a', 'error')
    } finally {
      setImporting(false)
      setIsImportOpen(false)
      setOlxUrl('')
    }
  }

  const filtered = properties.filter(p => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.address || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || p.type === typeFilter
    const price = p.price || 0
    const matchesPriceMin = !priceMin || price >= parseFloat(priceMin)
    const matchesPriceMax = !priceMax || price <= parseFloat(priceMax)
    return matchesStatus && matchesSearch && matchesType && matchesPriceMin && matchesPriceMax
  })

  if (loading) {
    return (
      <div className="w-full space-y-6 py-12">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-80 rounded-3xl" />
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
          <p className="page-eyebrow mb-1">KATALOG AGENCIJE</p>
          <h1
            className="text-3xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
          >
            Ponuda Nekretnina
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Upravljanje oglasima, unosi, agencijske napomene i sinhronizacija sa OLX.ba.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()) }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors shadow-sm ${
              bulkMode ? 'text-white bg-gray-900 border border-gray-800' : 'text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            <CheckSquare size={15} />
            <span>{bulkMode ? 'Otkaži' : 'Odaberi'}</span>
          </button>

          <button
            onClick={exportPropertiesCSV}
            disabled={properties.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={15} />
            <span>Izvoz CSV</span>
          </button>

          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-[#C9963B] bg-amber-50 border border-amber-200/80 hover:bg-amber-100 transition-colors shadow-sm"
          >
            <RefreshCw size={15} />
            <span>Uvoz sa OLX.ba</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white shadow-md transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #C9963B 0%, #b88328 100%)',
              boxShadow: '0 4px 16px rgba(201,150,59,0.25)',
            }}
          >
            <Plus size={16} />
            <span>Dodaj Nekretninu</span>
          </button>
        </div>
      </header>

      {/* Controls & Filter Tabs */}
      <div className="bg-white rounded-3xl border border-gray-200/70 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Pretraži po nazivu, gradu ili adresi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-gray-100 text-gray-600 border border-gray-200 focus:outline-none focus:border-[#C9963B]"
            >
              <option value="all">Svi tipovi</option>
              <option value="apartment">Stan</option>
              <option value="house">Kuća</option>
              <option value="land">Zemljište</option>
              <option value="commercial">Poslovni</option>
            </select>

            {/* Price Range */}
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                placeholder="Min €"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="w-20 px-2 py-1.5 text-xs rounded-xl bg-gray-100 text-gray-600 border border-gray-200 focus:outline-none focus:border-[#C9963B]"
              />
              <span className="text-xs text-gray-400">—</span>
              <input
                type="number"
                placeholder="Max €"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="w-20 px-2 py-1.5 text-xs rounded-xl bg-gray-100 text-gray-600 border border-gray-200 focus:outline-none focus:border-[#C9963B]"
              />
            </div>

            {(priceMin || priceMax || typeFilter !== 'all') && (
              <button
                onClick={() => { setPriceMin(''); setPriceMax(''); setTypeFilter('all') }}
                className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                ✕ Očisti
              </button>
            )}

            {(['all', 'active', 'sold', 'rented', 'draft'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all capitalize ${
                  statusFilter === status
                    ? 'bg-[#C9963B] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? `Sve (${properties.length})` : status === 'active' ? 'Aktivne' : status === 'sold' ? 'Prodano' : status === 'rented' ? 'Iznajmljeno' : 'Nacrt'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty State Banner */}
      {filtered.length === 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-3xl border-2 border-dashed border-[#C9963B]/40 p-10 text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-[#C9963B] flex items-center justify-center mx-auto border border-amber-200">
            <RefreshCw size={28} />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-gray-900">Uvezite Vaše Nekretnine sa OLX.ba</h3>
            <p className="text-xs text-gray-600">
              Unesite link vašeg OLX profila ili pojedinačnog oglasa za automatsko povlačenje svih fotografija, cijena i detalja.
            </p>
          </div>
          <button
            onClick={() => setIsImportOpen(true)}
            className="px-6 py-3 bg-[#C9963B] hover:bg-[#b88328] text-white font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            + Uvezi sa OLX.ba Odmah
          </button>
        </div>
      )}

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((p, idx) => {
          const getImageUrl = (images: any) => {
            if (!Array.isArray(images) || images.length === 0) return null
            const first = images[0]
            if (typeof first === 'string') return first
            if (typeof first === 'object' && first !== null && first.url) return first.url
            return null
          }
          const coverImage = getImageUrl(p.images) || FALLBACK_PROPERTY_IMAGES[idx % FALLBACK_PROPERTY_IMAGES.length]

          return (
            <Link
              href={`/${locale}/dashboard/properties/${p.id}`}
              key={p.id}
              className={`group relative bg-white rounded-3xl border ${selectedIds.has(p.id) ? 'border-[#C9963B] ring-2 ring-[#C9963B]/20' : 'border-gray-200/70'} overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer block`}
            >
              {bulkMode && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(p.id)}
                  onChange={() => toggleSelect(p.id)} onClick={(e) => e.stopPropagation()}
                  className="absolute top-3 right-3 w-5 h-5 rounded border-gray-300 text-[#C9963B] focus:ring-[#C9963B] cursor-pointer z-10"
                />
              )}
              {/* Image & Price Header */}
              <div className="h-48 bg-gray-100 relative overflow-hidden">
                <Image
                  src={coverImage}
                  alt={p.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  unoptimized
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-gray-900/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                  {p.type || 'Stan'}
                </div>
                <div className="absolute bottom-3 right-3 bg-[#C9963B] text-white font-bold text-sm px-3.5 py-1.5 rounded-xl shadow-lg">
                  {formatPrice(Number(p.price) || 150000)}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base text-gray-900 group-hover:text-[#C9963B] transition-colors line-clamp-2">
                    {p.title}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-2">
                    <MapPin size={13} className="text-gray-400 shrink-0" />
                    <span>{p.city || 'Sarajevo'}, {p.address || 'Centar'}</span>
                  </p>

                  {/* Agent Notes snippet */}
                  {p.notes && (
                    <div className="mt-3 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/60 text-xs text-amber-900 italic flex items-start gap-1.5">
                      <StickyNote size={14} className="text-[#C9963B] shrink-0 mt-0.5" />
                      <span className="line-clamp-2">„{p.notes}”</span>
                    </div>
                  )}
                </div>

                {/* Specs */}
                <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-gray-100 text-xs text-gray-600 bg-gray-50/60 rounded-xl px-2">
                  <div className="flex items-center gap-1.5 justify-center">
                    <Bed size={14} className="text-[#C9963B]" />
                    <span className="font-bold text-gray-900">{p.bedrooms ?? '—'} sobe</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-center border-x border-gray-200">
                    <Bath size={14} className="text-[#C9963B]" />
                    <span className="font-bold text-gray-900">{p.bathrooms ?? '—'} kup.</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-center">
                    <Move size={14} className="text-gray-400" />
                    <span className="font-bold text-gray-900">{p.area_size ? `${p.area_size} m²` : '—'}</span>
                  </div>
                </div>

                {/* Actions: Edit, Note, Delete */}
                <div className="flex items-center justify-between pt-1 gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(p) }}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit3 size={14} /> Izmjeni
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedProp(p); setNoteInput(p.notes || ''); setIsNoteOpen(true); }}
                    className="p-2 border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-xl transition-colors"
                    title="Dodaj agencijsku napomenu"
                  >
                    <StickyNote size={15} />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); deleteProperty(p.id) }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="Ukloni nekretninu"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Bulk Action Bar */}
      {bulkMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 rounded-2xl bg-gray-900 text-white shadow-2xl border border-gray-800">
          <span className="text-sm font-semibold">{selectedIds.size} odabrano</span>
          <button onClick={selectAllProperties} className="text-xs text-gray-300 hover:text-white underline">Odaberi sve</button>
          <button onClick={bulkDeleteProperties} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold transition-colors">
            <Trash2 size={14} />
            Obriši odabrano
          </button>
          <button onClick={() => { setBulkMode(false); setSelectedIds(new Set()) }} className="text-xs text-gray-400 hover:text-white">Odustani</button>
        </div>
      )}

      {/* Modal Import OLX */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 relative">
            <button onClick={() => setIsImportOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>

            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#C9963B] flex items-center justify-center mb-3 border border-amber-200">
                <RefreshCw size={22} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Uvoz Nekretnina sa OLX.ba</h3>
              <p className="text-xs text-gray-500 mt-1">
                Nalijepite link vaše OLX radnje, profila ili oglasa za automatski uvoz svih detalja i slika.
              </p>
            </div>

            <form onSubmit={handleImportOLX} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  OLX.ba Link Radnje ili Oglasa *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://olx.ba/artikal/1234567 ili profil"
                  value={olxUrl}
                  onChange={e => setOlxUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="px-6 py-2.5 bg-[#C9963B] text-white font-semibold text-xs rounded-xl shadow-md hover:bg-[#b88328] transition-colors flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Uvoženje...</span>
                    </>
                  ) : (
                    <span>Uvezi sa OLX.ba</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Property */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsAddOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>

            <div>
              <h3 className="text-xl font-bold text-gray-900">Dodaj Novu Nekretninu</h3>
              <p className="text-xs text-gray-500 mt-1">Unesite osnovne podatke o novoj nekretnini u ponudi.</p>
            </div>

            <form onSubmit={handleAddProperty} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Naziv Nekretnine *</label>
                <input
                  type="text"
                  required
                  placeholder="Dvoetažni Luksuzni Stan sa Garažom"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Vrsta</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  >
                    <option value="Stan">Stan</option>
                    <option value="Kuća">Kuća / Vila</option>
                    <option value="Poslovni prostor">Poslovni prostor</option>
                    <option value="Zemljište">Zemljište</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Cijena (€) *</label>
                  <input
                    type="number"
                    required
                    placeholder="250000"
                    value={form.price}
                    onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Adresa / Lokacija</label>
                  <input
                    type="text"
                    placeholder="Skenderija"
                    value={form.address}
                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Soba</label>
                  <input
                    type="number"
                    value={form.bedrooms}
                    onChange={e => setForm(p => ({ ...p, bedrooms: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Kupatila</label>
                  <input
                    type="number"
                    value={form.bathrooms}
                    onChange={e => setForm(p => ({ ...p, bathrooms: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Površina (m²)</label>
                  <input
                    type="number"
                    value={form.area_size}
                    onChange={e => setForm(p => ({ ...p, area_size: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Interna Napomena Agencije</label>
                <textarea
                  rows={2}
                  placeholder="Prodavac spreman na pregovore..."
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">
                  Odustani
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#C9963B] text-white font-semibold text-xs rounded-xl shadow-md hover:bg-[#b88328] transition-colors">
                  {saving ? 'Sačuvavanje...' : 'Sačuvaj Nekretninu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Property */}
      {isEditOpen && selectedProp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsEditOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>

            <div>
              <h3 className="text-xl font-bold text-gray-900">Izmjeni Nekretninu</h3>
              <p className="text-xs text-gray-500 mt-1">Ažurirajte cijenu, kvadraturu ili opise nekretnine.</p>
            </div>

            <form onSubmit={handleEditProperty} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Naziv Nekretnine</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Cijena (€)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Površina (m²)</label>
                  <input
                    type="number"
                    value={form.area_size}
                    onChange={e => setForm(p => ({ ...p, area_size: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Interna Napomena</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">
                  Odustani
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#C9963B] text-white font-semibold text-xs rounded-xl shadow-md hover:bg-[#b88328] transition-colors">
                  {saving ? 'Ažuriranje...' : 'Sačuvaj Izmjene'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Note */}
      {isNoteOpen && selectedProp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setIsNoteOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>

            <div>
              <h3 className="text-lg font-bold text-gray-900">Agencijska Napomena</h3>
              <p className="text-xs text-gray-500 mt-0.5">{selectedProp.title}</p>
            </div>

            <textarea
              rows={4}
              placeholder="Unesite tajnu napomenu za agencijski tim (npr. popust, kontakt prodavca)..."
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsNoteOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-600">Odustani</button>
              <button onClick={saveNote} className="px-5 py-2 bg-[#C9963B] text-white text-xs font-semibold rounded-xl">Sačuvaj Napomenu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
