'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import {
  FileText,
  Folder,
  Upload,
  Search,
  Download,
  Trash2,
  File,
  Tag,
  Sparkles,
  Edit3,
  FileCheck,
  Building,
  User,
  Plus
} from 'lucide-react'

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
  const [activeTab, setActiveTab] = useState<'library' | 'builder'>('library')
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [orgId, setOrgId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'contracts' | 'brochures' | 'templates' | 'leases'>('all')
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([])

  // Library Modal State
  const [isOpen, setIsOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [newCategory, setNewCategory] = useState<DocumentItem['category']>('contracts')

  // Builder States
  const [deals, setDeals] = useState<any[]>([])
  const [selectedDealId, setSelectedDealId] = useState('')
  const [orgName, setOrgName] = useState('Estateline Real Estate')
  const [customTitle, setCustomTitle] = useState('STANDARD PURCHASE AND AGENCY CONTRACT')
  const [agencyFee, setAgencyFee] = useState('3.0')
  const [customTerms, setCustomTerms] = useState<string[]>([
    'This contract is binding upon signature by both parties.',
    'All information provided is believed to be accurate.',
    'This document serves as a preliminary agreement.',
    'Legal review is recommended before final signing.'
  ])
  const [generating, setGenerating] = useState(false)

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  // Load Library Documents & Deals
  useEffect(() => {
    const loadData = async () => {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fix Auth ID Bug
      const { data: u } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
      if (!u) return

      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id, organizations(name)')
        .eq('user_id', u.id)
        .eq('is_primary', true)
        .single()

      if (!member) return
      const oid = member.organization_id
      setOrgId(oid)
      setOrgName((member.organizations as any)?.name || 'Estateline Real Estate')

      // Load real documents
      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', oid)
        .order('created_at', { ascending: false })

      if (docsData) {
        setDocuments(docsData.map(d => ({
          id: d.id,
          title: d.title,
          fileName: (d.metadata as any)?.file_name || 'document.pdf',
          fileSize: (d.metadata as any)?.file_size || '—',
          category: d.type === 'other' ? (d.metadata as any)?.category || 'other' : d.type,
          uploadedAt: d.created_at,
          fileUrl: d.file_url
        })))
      }

      const { data: dealsData } = await supabase
        .from('deals')
        .select(`
          id,
          title,
          price,
          property_id,
          contact_id,
          properties(id, title, price, currency, address, city, country, area_size, bedrooms, bathrooms),
          contacts(id, first_name, last_name, email)
        `)
        .eq('organization_id', member.organization_id)
        .order('created_at', { ascending: false })

      if (dealsData) setDeals(dealsData)
    }

    loadData()
  }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !selectedFile || !orgId) return

    setGenerating(true)
    const supabase = createBrowserClient()

    // 1. Upload to Storage
    const fileExt = selectedFile.name.split('.').pop()
    const filePath = `${orgId}/${Math.random().toString(36).substring(2)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, selectedFile)

    if (uploadError) {
      toast('Upload failed: ' + uploadError.message, 'error')
      setGenerating(false)
      return
    }

    const fileSize = selectedFile.size > 1048576
      ? `${(selectedFile.size / 1048576).toFixed(1)} MB`
      : `${Math.round(selectedFile.size / 1024)} KB`

    // 2. Save to DB
    const { data: newDoc, error: dbError } = await supabase.from('documents').insert({
      organization_id: orgId,
      title: newTitle,
      file_url: filePath,
      type: ['contract', 'agreement'].includes(newCategory) ? newCategory : 'other',
      metadata: {
        file_name: selectedFile.name,
        file_size: fileSize,
        category: newCategory
      }
    } as any).select().single()

    setGenerating(false)
    if (dbError) {
      toast('DB Save failed: ' + dbError.message, 'error')
    } else {
      setDocuments(prev => [{
        id: newDoc.id,
        title: newDoc.title,
        fileName: selectedFile.name,
        fileSize,
        category: newCategory,
        uploadedAt: newDoc.created_at,
        fileUrl: filePath
      }, ...prev])
      toast('Document uploaded!')
      setNewTitle('')
      setSelectedFile(null)
      setIsOpen(false)
    }
  }

  const deleteDoc = async (id: string) => {
    const docToDelete = documents.find(d => d.id === id)
    if (!docToDelete) return

    const supabase = createBrowserClient()

    // Delete from DB
    const { error: dbError } = await supabase.from('documents').delete().eq('id', id)
    if (dbError) {
      toast('Delete failed: ' + dbError.message, 'error')
      return
    }

    // Delete from Storage
    await supabase.storage.from('documents').remove([docToDelete.fileUrl])

    setDocuments(prev => prev.filter(d => d.id !== id))
    toast('Document deleted!')
  }

  const downloadDoc = async (doc: DocumentItem) => {
    const supabase = createBrowserClient()
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.fileUrl, 60)

    if (error) {
      toast('Download failed: ' + error.message, 'error')
    } else if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  const filteredDocs = (documents || []).filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.fileName.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Selected Deal details resolver
  const activeDeal = deals.find(d => d.id === selectedDealId)

  // Trigger PDF contract build API
  const handleGeneratePDF = async () => {
    if (!activeDeal) {
      toast('Please select a deal first.', 'error')
      return
    }
    if (!activeDeal.property_id || !activeDeal.contact_id) {
      toast('The selected deal must be linked to both a Property and Contact.', 'error')
      return
    }

    setGenerating(true)
    try {
      const res = await fetch('/api/documents/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: activeDeal.id,
          property_id: activeDeal.property_id,
          contact_id: activeDeal.contact_id
        })
      })

      if (!res.ok) throw new Error('API Generation Failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Contract-${activeDeal.title.replace(/\s+/g, '-')}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
      toast('PDF generated and downloaded!')

      // Save into the library log
      const newLibDoc: DocumentItem = {
        id: Math.random().toString(36).substring(2, 11),
        title: `Official PDF Contract - ${activeDeal.title}`,
        fileName: `contract-${activeDeal.id.substring(0, 8)}.pdf`,
        fileSize: '45 KB',
        category: 'contracts',
        uploadedAt: new Date().toISOString().split('T')[0],
        fileUrl: '' // Generated PDFs aren't currently saved to storage in this path
      }
      setDocuments(prev => [newLibDoc, ...prev])
    } catch (err: any) {
      toast('Failed to download contract: ' + err.message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border ${t.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
            }`}>
            {t.type === 'success' ? '✓' : '✗'} {t.message}
          </div>
        ))}
      </div>

      {/* Header + Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Documents & Agreements</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Build exclusive listing templates, view library media, and generate official contract drafts.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex border border-border bg-muted/30 p-1 rounded-xl shrink-0 self-start">
          <button
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'library'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Library
          </button>
          <button
            onClick={() => setActiveTab('builder')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'builder'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <Sparkles size={12} className="text-primary" /> Live Contract Builder
          </button>
        </div>
      </div>

      {/* Tab 1: Documents Library */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-card border border-border p-4 rounded-xl shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">Browse shared media asset folders and invoices.</p>
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              <Upload size={14} /> Upload Document
            </button>
          </div>

          {/* Folders Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'contracts', label: 'Contracts & Agreements', count: (documents || []).filter(d => d.category === 'contracts').length, color: 'text-primary bg-primary/10 border-primary/20' },
              { key: 'leases', label: 'Lease Agreements', count: (documents || []).filter(d => d.category === 'leases').length, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
              { key: 'templates', label: 'Legal Templates', count: (documents || []).filter(d => d.category === 'templates').length, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
              { key: 'brochures', label: 'Brochures & Media', count: (documents || []).filter(d => d.category === 'brochures').length, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' }
            ].map((folder) => (
              <div
                key={folder.key}
                onClick={() => setCategoryFilter(folder.key as any)}
                className={`p-4 bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer flex flex-col justify-between h-28 ${categoryFilter === folder.key ? 'ring-2 ring-primary border-primary/30' : ''
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`p-2.5 rounded-lg border ${folder.color}`}>
                    <Folder size={18} />
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">{folder.count} files</span>
                </div>
                <h4 className="font-semibold text-foreground text-sm font-display leading-tight">{folder.label}</h4>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 p-4 bg-card border border-border rounded-xl shadow-sm">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg bg-background text-xs text-foreground">
              <Tag size={12} className="text-muted-foreground" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="bg-transparent border-none p-0 pr-6 focus:ring-0 text-xs font-semibold cursor-pointer outline-none"
              >
                <option value="all">All Categories</option>
                <option value="contracts">Contracts</option>
                <option value="leases">Lease Agreements</option>
                <option value="templates">Templates</option>
                <option value="brochures">Brochures</option>
              </select>
            </div>
          </div>

          {/* Files List */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {filteredDocs.length === 0 ? (
              <div className="text-center p-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/45 mb-3" />
                <p className="text-muted-foreground text-xs font-medium">No documents found in this filter.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredDocs.map((doc) => (
                  <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-muted/15 transition-colors gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-primary/5 text-primary border border-primary/10 rounded-lg">
                        <File size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-foreground text-xs font-display truncate">
                          {doc.title}
                        </h4>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {doc.fileName} • {doc.fileSize}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                        {doc.category}
                      </span>
                      <button
                        onClick={() => downloadDoc(doc)}
                        className="p-2 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted transition-all"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => deleteDoc(doc.id)}
                        className="p-2 text-muted-foreground hover:text-rose-600 rounded-lg hover:bg-muted transition-all"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Live Contract Builder */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left panel: Editors and select boxes */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <div className="border-b pb-3 flex items-center justify-between">
              <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                <Edit3 size={16} className="text-primary" /> Builder Settings
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                Live Drafting
              </span>
            </div>

            <div className="space-y-4">
              {/* Select Deal */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Select Associated Deal *
                </label>
                {deals.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                    No deals found in CRM. Generate a deal under the Pipeline page first.
                  </p>
                ) : (
                  <select
                    value={selectedDealId}
                    onChange={(e) => setSelectedDealId(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  >
                    <option value="">— Select a Deal to populate contract —</option>
                    {deals.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.properties?.title || 'No Property'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Custom Header Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Agreement Title
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              {/* Commission Percentage */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Agency Fee / Commission Percentage
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={agencyFee}
                    onChange={(e) => setAgencyFee(e.target.value)}
                    className="w-24 rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                  <span className="text-sm font-semibold text-muted-foreground">%</span>
                </div>
              </div>

              {/* Terms list */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Edit Standard Clauses
                </label>
                <div className="space-y-2">
                  {customTerms.map((term, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <span className="text-xs font-bold text-muted-foreground">{index + 1}.</span>
                      <input
                        type="text"
                        value={term}
                        onChange={(e) => {
                          const updated = [...customTerms]
                          updated[index] = e.target.value
                          setCustomTerms(updated)
                        }}
                        className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <button
                onClick={handleGeneratePDF}
                disabled={generating || !selectedDealId}
                className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/95 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {generating ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                    </svg>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <FileCheck size={14} /> Generate Official PDF Contract
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right panel: Legal document preview */}
          <div className="bg-neutral-800 border border-neutral-700/80 rounded-2xl p-6 shadow-xl flex flex-col items-center">
            <div className="w-full border-b border-neutral-700 pb-3 mb-4 text-left flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Live Preview</span>
              <span className="text-[10px] text-neutral-500 font-mono">Standard A4 Layout</span>
            </div>

            {/* Document sheet */}
            <div className="w-full aspect-[1/1.414] bg-white text-neutral-900 border shadow-lg p-8 select-none font-serif text-[11px] leading-relaxed relative flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="text-center mb-6">
                  <h3 className="font-bold text-[13px] border-b-2 border-neutral-900 pb-2 uppercase tracking-wide">
                    {customTitle}
                  </h3>
                  <p className="text-[9px] text-neutral-500 font-sans mt-1">
                    ESTATELINE SYSTEM GENERATED DRAFT
                  </p>
                </div>

                {/* Parties details */}
                <section className="mb-5 space-y-1">
                  <h4 className="font-bold border-b border-neutral-300 pb-0.5 uppercase tracking-wide text-[10px]">
                    I. PARTIES TO CONTRACT
                  </h4>
                  <p>
                    <span className="font-bold">SELLER / REPRESENTED AGENCY:</span> {orgName}
                  </p>
                  <p>
                    <span className="font-bold">BUYER / CLIENT:</span>{' '}
                    {activeDeal?.contacts
                      ? `${activeDeal.contacts.first_name} ${activeDeal.contacts.last_name || ''} (${activeDeal.contacts.email || 'No email'})`
                      : '___________________________ (Select Deal)'}
                  </p>
                </section>

                {/* Property Details */}
                <section className="mb-5 space-y-1">
                  <h4 className="font-bold border-b border-neutral-300 pb-0.5 uppercase tracking-wide text-[10px]">
                    II. PROPERTY DETAILS
                  </h4>
                  {activeDeal?.properties ? (
                    <>
                      <p><span className="font-bold">Title:</span> {activeDeal.properties.title}</p>
                      <p>
                        <span className="font-bold">Address:</span> {activeDeal.properties.address || 'N/A'},{' '}
                        {activeDeal.properties.city || 'N/A'}
                      </p>
                      <p>
                        <span className="font-bold">Details:</span> {activeDeal.properties.area_size || '—'} m² |{' '}
                        {activeDeal.properties.bedrooms || '—'} Bedrooms | {activeDeal.properties.bathrooms || '—'} Bathrooms
                      </p>
                    </>
                  ) : (
                    <p className="text-neutral-400 italic">No property linked to this deal.</p>
                  )}
                </section>

                {/* Financial clauses */}
                <section className="mb-5 space-y-1">
                  <h4 className="font-bold border-b border-neutral-300 pb-0.5 uppercase tracking-wide text-[10px]">
                    III. FINANCIAL COMPROMISE
                  </h4>
                  <p>
                    <span className="font-bold">Sales Value:</span>{' '}
                    <span className="font-bold text-neutral-900">
                      {activeDeal?.properties?.price
                        ? `${activeDeal.properties.price.toLocaleString()} ${activeDeal.properties.currency || 'BAM'}`
                        : '________ BAM (Populates from Deal)'}
                    </span>
                  </p>
                  <p>
                    <span className="font-bold">Agency Brokerage Fee:</span>{' '}
                    {agencyFee}% equal to{' '}
                    <span className="font-bold">
                      {activeDeal?.properties?.price
                        ? `${Math.round((Number(activeDeal.properties.price) * parseFloat(agencyFee)) / 100).toLocaleString()} ${activeDeal.properties.currency || 'BAM'}`
                        : '________ BAM'}
                    </span>
                  </p>
                </section>

                {/* Custom Clauses */}
                <section className="space-y-1 mb-5">
                  <h4 className="font-bold border-b border-neutral-300 pb-0.5 uppercase tracking-wide text-[10px]">
                    IV. TERMS & CONDITIONS
                  </h4>
                  {customTerms.map((term, index) => (
                    <p key={index}>
                      {index + 1}. {term}
                    </p>
                  ))}
                </section>
              </div>

              {/* Signatures */}
              <div className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <p className="font-bold">For Agency (Seller):</p>
                    <div className="border-t border-neutral-400 pt-1 text-[9px] text-neutral-500">
                      Authorized Agent Signature
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="font-bold">For Client (Buyer):</p>
                    <div className="border-t border-neutral-400 pt-1 text-[9px] text-neutral-500">
                      Client Signature
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-[8px] text-neutral-400 text-center font-sans">
                  Page 1 of 1 • Generated by Estateline Document Builder
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Library Document Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground font-display">Upload Document</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Agency Agreement"
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="contracts">Contracts &amp; Agreements</option>
                  <option value="leases">Lease Agreements</option>
                  <option value="templates">Templates</option>
                  <option value="brochures">Brochures &amp; Media</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Select File
                </label>
                <label className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/10 hover:border-primary/30 transition-all cursor-pointer">
                  <Upload className="h-8 w-8 text-muted-foreground/60" />
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedFile.size > 1048576
                          ? `${(selectedFile.size / 1048576).toFixed(1)} MB`
                          : `${Math.round(selectedFile.size / 1024)} KB`}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Click to browse or drag &amp; drop</p>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg shadow-soft hover:bg-primary/90 transition-colors text-sm disabled:opacity-50"
              >
                {generating ? 'Uploading...' : 'Upload File'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
