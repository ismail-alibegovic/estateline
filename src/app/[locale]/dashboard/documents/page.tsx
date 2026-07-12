'use client'

import { useState, useEffect } from 'react'
import { 
  FileText, 
  Folder, 
  Upload, 
  Plus, 
  Search, 
  Download, 
  Trash2, 
  File, 
  Tag, 
  FolderPlus,
  Eye
} from 'lucide-react'

interface DocumentItem {
  id: string
  title: string
  fileName: string
  fileSize: string
  category: 'contracts' | 'brochures' | 'templates' | 'leases'
  uploadedAt: string
}

const DEFAULT_DOCUMENTS: DocumentItem[] = [
  {
    id: '1',
    title: 'Down Town Loft Exclusive Agency Contract',
    fileName: 'exclusive_agency_contract_downtown.pdf',
    fileSize: '1.4 MB',
    category: 'contracts',
    uploadedAt: new Date(Date.now() - 86400000).toISOString().split('T')[0]
  },
  {
    id: '2',
    title: 'Balkans Real Estate Purchase Template',
    fileName: 'purchase_template_standard_v2.docx',
    fileSize: '420 KB',
    category: 'templates',
    uploadedAt: new Date(Date.now() - 172800000).toISOString().split('T')[0]
  },
  {
    id: '3',
    title: 'Residential Lease Agreement Draft',
    fileName: 'standard_lease_agreement_bih.pdf',
    fileSize: '890 KB',
    category: 'leases',
    uploadedAt: '2026-07-10'
  }
]

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'contracts' | 'brochures' | 'templates' | 'leases'>('all')
  
  // Modal State
  const [isOpen, setIsOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newFileName, setNewFileName] = useState('')
  const [newCategory, setNewCategory] = useState<DocumentItem['category']>('contracts')

  useEffect(() => {
    const saved = localStorage.getItem('estateline_documents')
    if (saved) {
      try {
        setDocuments(JSON.parse(saved))
      } catch {
        setDocuments(DEFAULT_DOCUMENTS)
      }
    } else {
      setDocuments(DEFAULT_DOCUMENTS)
      localStorage.setItem('estateline_documents', JSON.stringify(DEFAULT_DOCUMENTS))
    }
  }, [])

  const saveDocs = (updated: DocumentItem[]) => {
    setDocuments(updated)
    localStorage.setItem('estateline_documents', JSON.stringify(updated))
  }

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const name = newFileName.trim() || 'uploaded_document.pdf'

    const newDoc: DocumentItem = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle,
      fileName: name,
      fileSize: `${(Math.random() * 2 + 0.1).toFixed(1)} MB`,
      category: newCategory,
      uploadedAt: new Date().toISOString().split('T')[0]
    }

    const updated = [newDoc, ...(documents || [])]
    saveDocs(updated)

    // Reset Form
    setNewTitle('')
    setNewFileName('')
    setNewCategory('contracts')
    setIsOpen(false)
  }

  const deleteDoc = (id: string) => {
    if (!documents) return
    const updated = documents.filter(d => d.id !== id)
    saveDocs(updated)
  }

  const filteredDocs = (documents || []).filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase()) || 
                          d.fileName.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Documents Library</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Store, catalog, and share legal contracts, brochures, and listing materials.
          </p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg shadow-soft transition-all"
        >
          <Upload size={18} />
          Upload Document
        </button>
      </div>

      {/* Categories Grid */}
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
            className={`p-4 bg-card border border-border rounded-xl shadow-soft hover:shadow-md hover:border-primary/30 transition-all cursor-pointer flex flex-col justify-between h-28 ${
              categoryFilter === folder.key ? 'ring-2 ring-primary border-primary/30' : ''
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

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-card border border-border rounded-xl shadow-soft">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg bg-background text-sm text-foreground">
          <Tag size={14} className="text-muted-foreground" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="bg-transparent border-none p-0 pr-6 focus:ring-0 text-sm font-medium"
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
      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="text-center p-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm font-medium">No documents found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredDocs.map((doc) => (
              <div 
                key={doc.id}
                className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-primary/5 text-primary border border-primary/10 rounded-lg">
                    <File size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-foreground text-sm font-display truncate">
                      {doc.title}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {doc.fileName} • {doc.fileSize}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                    {doc.category}
                  </span>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-all"
                    title="Download"
                  >
                    <Download size={16} />
                  </a>
                  <button
                    onClick={() => deleteDoc(doc.id)}
                    className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted transition-all"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
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
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  File Name
                </label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g. contract_draft.pdf"
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="contracts">Contracts & Agreements</option>
                  <option value="leases">Lease Agreements</option>
                  <option value="templates">Templates</option>
                  <option value="brochures">Brochures & Media</option>
                </select>
              </div>

              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/10 transition-colors">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-xs text-muted-foreground">Drag and drop file here or click to browse</p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg shadow-soft hover:bg-primary/90 transition-colors text-sm"
              >
                Upload File
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
