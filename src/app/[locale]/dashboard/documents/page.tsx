'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useTranslations } from 'next-intl'
import {
  FileText, Folder, Upload, Search, Download, Trash2,
  File, Tag, Sparkles, Edit3, FileCheck, Building2, User,
  Plus, CheckCircle2, X
} from 'lucide-react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

interface DocumentItem {
  id: string
  title: string
  fileName: string
  fileSize: string
  category: string
  uploadedAt: string
  fileUrl: string
}



export default function DocumentsPage() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const [activeTab, setActiveTab] = useState<'library' | 'builder'>('library')
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'contracts' | 'leases' | 'templates'>('all')
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([])

  // Library Modal State
  const [isOpen, setIsOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [newCategory, setNewCategory] = useState<DocumentItem['category']>('contracts')
  const [uploading, setUploading] = useState(false)

  // Builder States
  const [orgName, setOrgName] = useState('Prestige Real Estate d.o.o.')
  const [customTitle, setCustomTitle] = useState('KUPOPRODAJNI PREDUGOVOR NEKRETNINE')
  const [agencyFee, setAgencyFee] = useState('3.0')
  const [customTerms, setCustomTerms] = useState<string[]>([
    'Ovaj predugovor je pravno obavezujući nakon potpisivanja obje ugovorne strane.',
    'Kupac se obavezuje uplatiti kaparu u iznosu od 10% od ukupne kupoprodajne cijene.',
    'Prodavac garantuje da nekretnina nema tereta i da je vlasništvo 1/1.',
    'Konačni ugovor će se zaključiti kod nadležnog notara u roku od 30 dana.'
  ])
  const [generating, setGenerating] = useState(false)

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  useEffect(() => {
    const loadData = async () => {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: u } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
      if (!u) { setLoading(false); return }

      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id, organizations(name)')
        .eq('user_id', u.id)
        .eq('is_primary', true)
        .single()

      if (!member) { setLoading(false); return }
      const oid = member.organization_id
      setOrgId(oid)
      if ((member.organizations as any)?.name) {
        setOrgName((member.organizations as any).name)
      }

      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', oid)
        .order('created_at', { ascending: false })

      if (docsData && docsData.length > 0) {
        setDocuments(docsData.map(d => ({
          id: d.id,
          title: d.title,
          fileName: (d.metadata as any)?.file_name || 'dokument.pdf',
          fileSize: (d.metadata as any)?.file_size || '—',
          category: d.type === 'other' ? (d.metadata as any)?.category || 'other' : d.type,
          uploadedAt: d.created_at,
          fileUrl: d.file_url
        })))
      } else {
        setDocuments([])
      }
      setLoading(false)
    }

    loadData()
  }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setUploading(true)

    const fileSize = selectedFile ? (selectedFile.size > 1048576 ? `${(selectedFile.size / 1048576).toFixed(1)} MB` : `${Math.round(selectedFile.size / 1024)} KB`) : '150 KB'

    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      title: newTitle,
      fileName: selectedFile?.name || `${newTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      fileSize,
      category: newCategory,
      uploadedAt: new Date().toISOString(),
      fileUrl: '',
    }

    setDocuments(prev => [newDoc, ...prev])
    toast('Dokument je uspješno dodan u biblioteku!')
    setNewTitle('')
    setSelectedFile(null)
    setIsOpen(false)
    setUploading(false)
  }

  const deleteDoc = (id: string) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj dokument?')) return
    setDocuments(prev => prev.filter(d => d.id !== id))
    toast('Dokument je obrisan!')
  }

  const filteredDocs = documents.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.fileName.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="w-full space-y-6 py-12">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-3xl" />
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
          <p className="page-eyebrow mb-1">PRAVNA DOKUMENTACIJA</p>
          <h1
            className="text-3xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
          >
            Dokumenti & Ugovori
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Arhiva zk izvadaka, posredničkih ugovora i generator zvaničnih predugovora.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200 shrink-0 gap-1">
          <button
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'library' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Biblioteka Dokumenta
          </button>
          <button
            onClick={() => setActiveTab('builder')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'builder' ? 'bg-[#C9963B] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Sparkles size={14} />
            <span>Generator Ugovora</span>
          </button>
          <Link
            href={`/${locale}/dashboard/documents/templates`}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-700 hover:text-slate-900 hover:bg-white/60 transition-all flex items-center gap-1.5"
          >
            <FileText size={14} className="text-[#C9963B]" />
            <span>Šabloni & PDF Editor</span>
          </Link>
        </div>
      </header>

      {/* TAB 1: LIBRARY */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          {/* Top Bar */}
          <div className="bg-white rounded-3xl border border-gray-200/70 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Pretraži dokumente po nazivu..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
              />
            </div>

            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white shadow-md transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #C9963B 0%, #b88328 100%)',
                boxShadow: '0 4px 16px rgba(201,150,59,0.25)',
              }}
            >
              <Upload size={16} />
              <span>Dodaj Dokument</span>
            </button>
          </div>

          {/* Folder Categories */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: 'all', label: 'Svi Dokumenti', count: documents.length },
              { key: 'contracts', label: 'Posrednički Ugovori', count: documents.filter(d => d.category === 'contracts').length },
              { key: 'leases', label: 'ZK Izvadci & Vlasništvo', count: documents.filter(d => d.category === 'leases').length },
              { key: 'templates', label: 'Šabloni & Predugovori', count: documents.filter(d => d.category === 'templates').length },
            ].map(folder => (
              <div
                key={folder.key}
                onClick={() => setCategoryFilter(folder.key as any)}
                className={`bg-white border rounded-3xl p-5 shadow-sm hover:border-[#C9963B] transition-all cursor-pointer flex flex-col justify-between h-28 group ${
                  categoryFilter === folder.key ? 'border-[#C9963B] ring-2 ring-[#C9963B]/20' : 'border-gray-200/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#C9963B] flex items-center justify-center font-bold">
                    <Folder size={20} />
                  </div>
                  <span className="text-xs font-bold text-gray-400">{folder.count} fajlova</span>
                </div>
                <h4 className="font-bold text-sm text-gray-900 group-hover:text-[#C9963B] transition-colors">{folder.label}</h4>
              </div>
            ))}
          </div>

          {/* Documents Table */}
          <div className="bg-white rounded-3xl border border-gray-200/70 shadow-sm overflow-hidden divide-y divide-gray-100">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50/60 transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#C9963B] flex items-center justify-center shrink-0 border border-amber-200/60">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-gray-900 truncate">{doc.title}</h4>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{doc.fileName} • {doc.fileSize}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 uppercase">
                    {doc.category}
                  </span>
                  <button
                    onClick={() => deleteDoc(doc.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE CONTRACT BUILDER */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Builder Controls */}
          <div className="bg-white rounded-3xl border border-gray-200/70 p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Postavke Predugovora</h3>
              <p className="text-xs text-gray-500 mt-1">Prilagodite naslov, proviziju i klauzule ugovora u realnom vremenu.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Naslov Ugovora</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Agencijska Provizija (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={agencyFee}
                  onChange={e => setAgencyFee(e.target.value)}
                  className="w-32 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Klauzule Ugovora</label>
                <div className="space-y-2">
                  {customTerms.map((term, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">{index + 1}.</span>
                      <input
                        type="text"
                        value={term}
                        onChange={e => {
                          const updated = [...customTerms]
                          updated[index] = e.target.value
                          setCustomTerms(updated)
                        }}
                        className="flex-1 px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#C9963B]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live A4 Preview */}
          <div className="bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center">
            <div className="w-full pb-3 mb-4 text-left flex justify-between items-center text-xs text-gray-400 font-bold border-b border-gray-800">
              <span>PREGLED A4 DOKUMENTA</span>
              <span className="text-[#C9963B]">ZVANIČNI DRAFT</span>
            </div>

            <div className="w-full bg-white text-gray-900 p-8 rounded-2xl shadow-xl font-serif text-xs leading-relaxed space-y-4">
              <div className="text-center border-b border-gray-900 pb-3">
                <h3 className="font-bold text-sm tracking-wider uppercase">{customTitle}</h3>
                <p className="text-[10px] text-gray-500 font-sans mt-0.5">{orgName}</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold border-b border-gray-300 text-[10px] uppercase">I. UGOVORNE STRANE</h4>
                <p><span className="font-bold">POSREDNIK / AGENCIJA:</span> {orgName}</p>
                <p><span className="font-bold">KUPAC / KLIJENT:</span> Emir Hadžić (Sarajevo)</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold border-b border-gray-300 text-[10px] uppercase">II. PREDMET UGOVORA</h4>
                <p><span className="font-bold">Nekretnina:</span> Dvoetažni Luksuzni Stan - Skenderija (Podgaj 14)</p>
                <p><span className="font-bold">Površina:</span> 115 m² • 3 sobe • 2 kupaonice</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold border-b border-gray-300 text-[10px] uppercase">III. FINANSIJSKI USLOVI & PROVIZIJA</h4>
                <p><span className="font-bold">Ugovorena Cijena:</span> €345,000.00</p>
                <p><span className="font-bold">Provizija Agencije ({agencyFee}%):</span> €10,350.00</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold border-b border-gray-300 text-[10px] uppercase">IV. ODREDBE I KLAUZULE</h4>
                {customTerms.map((t, idx) => (
                  <p key={idx}>{idx + 1}. {t}</p>
                ))}
              </div>

              <div className="pt-6 grid grid-cols-2 gap-4 text-[10px]">
                <div className="border-t border-gray-400 pt-1">
                  <p className="font-bold">Za Agenciju (Potpis):</p>
                </div>
                <div className="border-t border-gray-400 pt-1">
                  <p className="font-bold">Za Kupca (Potpis):</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload */}
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
              <h3 className="text-xl font-bold text-gray-900">Dodaj Dokument u Biblioteku</h3>
              <p className="text-xs text-gray-500 mt-1">Unesite naziv dokumenta i izaberite kategoriju.</p>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Naziv Dokumenta *</label>
                <input
                  type="text"
                  required
                  placeholder="ZK Izvadak / Posrednički Ugovor"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Kategorija</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                >
                  <option value="contracts">Posrednički Ugovori</option>
                  <option value="leases">ZK Izvadci & Vlasništvo</option>
                  <option value="templates">Šabloni & Predugovori</option>
                </select>
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
                  disabled={uploading}
                  className="px-6 py-2.5 bg-[#C9963B] text-white font-semibold text-xs rounded-xl shadow-md hover:bg-[#b88328] transition-colors"
                >
                  {uploading ? 'Dodavanje...' : 'Sačuvaj Dokument'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
