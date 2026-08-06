'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileText, Plus, Upload, Check, ArrowLeft,
  Sparkles, Code, RefreshCw, Trash2, Eye, Download, ShieldCheck
} from 'lucide-react'
import { extractPlaceholders, SYSTEM_FIELDS_OPTIONS } from '@/lib/pdf-generator'
import { createBrowserClient } from '@/lib/supabase'

interface TemplateItem {
  id: string
  title: string
  description: string
  content: string
  placeholders: string[]
  mappings: Record<string, string>
  updated_at: string
}

const DEFAULT_CONTRACT_TEMPLATES: TemplateItem[] = [
  {
    id: 'tmpl-1',
    title: 'Ugovor o Posredovanju u Prometu Nekretnina',
    description: 'Standardni ugovor između Agencije i Nalogodavca (Kupca/Prodavca).',
    content: `UGOVOR O POSREDOVANJU U PROMETU NEKRETNINA

Zaključen dana \${closing_date} godine u \${property_city}, između:

1. AGENCIJA: \${agency_name}, sa sjedištem u \${agency_address}, JIB: \${agency_tax_id} (u daljem tekstu: Posrednik), i
2. NALOGODAVAC: \${client_name}, sa boravištem u \${client_address}, kontakt email: \${client_email}, telefon: \${client_phone} (u daljem tekstu: Nalogodavac).

ČLAN 1. PREDMET UGOVORA
Posrednik se obavezuje da nastoji pronaći i dovesti u vezu sa Nalogodavcem treće lice radi zaključivanja pravnog posla o prometu nekretnine:
- Naziv nekretnine: \${property_title}
- Adresa nekretnine: \${property_address}, \${property_city}
- Tip i površina: \${property_type}, \${property_area}
- Ugovorena cijena: \${property_price}

ČLAN 2. OBAVEZE POSREDNIKA
Posrednik se obavezuje da pažnjom dobrog privrednika vrši posredovanje, obavještava Nalogodavca o stanju na tržištu i pruža stručnu pomoć.

ČLAN 3. POSREDNIČKA NAKNADA
Za izvršene usluge posredovanja Nalogodavca se obavezuje isplatiti Posredniku naknadu u iznosu od \${agency_commission} po zaključenju ugovora.

U \${property_city}, dana \${closing_date}.`,
    placeholders: [
      'closing_date', 'property_city', 'agency_name', 'agency_address', 'agency_tax_id',
      'client_name', 'client_address', 'client_email', 'client_phone', 'property_title',
      'property_address', 'property_type', 'property_area', 'property_price', 'agency_commission'
    ],
    mappings: {
      closing_date: 'closing_date',
      property_city: 'property_city',
      agency_name: 'agency_name',
      agency_address: 'agency_address',
      agency_tax_id: 'agency_tax_id',
      client_name: 'client_name',
      client_address: 'client_address',
      client_email: 'client_email',
      client_phone: 'client_phone',
      property_title: 'property_title',
      property_address: 'property_address',
      property_type: 'property_type',
      property_area: 'property_area',
      property_price: 'property_price',
      agency_commission: 'agency_commission',
    },
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tmpl-2',
    title: 'Predugovor o Kupoprodaji Nekretnine',
    description: 'Predugovor sa utvrđivanjem kapare i roka za isplatu.',
    content: `PREDUGOVOR O KUPOPRODAJI NEKRETNINE

Zaključen između Prodavca/Kupca: \${client_name} i Agencije \${agency_name}.

Predmet: Nekretnina \${property_title}, locirana na adresi \${property_address}.
Dogovorena cijena: \${property_price}.
Iznos kapare: \${deposit_amount}.
Rok za zaključenje konačnog ugovora: \${closing_date}.

Potpisi ugovornih strana:`,
    placeholders: ['client_name', 'agency_name', 'property_title', 'property_address', 'property_price', 'deposit_amount', 'closing_date'],
    mappings: {
      client_name: 'client_name',
      agency_name: 'agency_name',
      property_title: 'property_title',
      property_address: 'property_address',
      property_price: 'property_price',
      deposit_amount: 'deposit_amount',
      closing_date: 'closing_date',
    },
    updated_at: new Date().toISOString(),
  }
]

export default function DocumentTemplatesPage() {
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) || 'en'

  const [templates, setTemplates] = useState<TemplateItem[]>(DEFAULT_CONTRACT_TEMPLATES)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(DEFAULT_CONTRACT_TEMPLATES[0])
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editContent, setEditContent] = useState('')
  const [parsedPlaceholders, setParsedPlaceholders] = useState<string[]>([])
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const toast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  useEffect(() => {
    if (selectedTemplate) {
      setEditTitle(selectedTemplate.title)
      setEditDesc(selectedTemplate.description)
      setEditContent(selectedTemplate.content)
      setFieldMappings(selectedTemplate.mappings || {})
      const found = extractPlaceholders(selectedTemplate.content)
      setParsedPlaceholders(found)
    }
  }, [selectedTemplate])

  const handleContentChange = (val: string) => {
    setEditContent(val)
    const found = extractPlaceholders(val)
    setParsedPlaceholders(found)
  }

  const handleMappingChange = (placeholder: string, systemVal: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [placeholder]: systemVal,
    }))
  }

  const handleSaveTemplate = () => {
    if (!editTitle.trim()) return
    const updated: TemplateItem = {
      id: selectedTemplate ? selectedTemplate.id : `tmpl-${Date.now()}`,
      title: editTitle,
      description: editDesc,
      content: editContent,
      placeholders: parsedPlaceholders,
      mappings: fieldMappings,
      updated_at: new Date().toISOString(),
    }

    if (selectedTemplate) {
      setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? updated : t))
    } else {
      setTemplates(prev => [updated, ...prev])
    }

    setSelectedTemplate(updated)
    setIsEditing(false)
    toast('Šablon ugovora je uspješno sačuvan!')
  }

  const handleTestGenerate = async () => {
    if (!selectedTemplate) return
    setGenerating(true)

    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedTemplate.title,
          content: selectedTemplate.content,
          custom_values: {
            closing_date: new Date().toLocaleDateString('bs-BA'),
            property_city: 'Sarajevo',
            agency_name: 'Estateline Premium Real Estate',
            agency_address: 'Maršala Tita 28, Sarajevo',
            agency_tax_id: '4201928370004',
            client_name: 'Edin Džeko',
            client_address: 'Zmaja od Bosne 12',
            client_email: 'edin@example.ba',
            client_phone: '+387 61 123 456',
            property_title: 'Dvoetažni Stan na Skenderiji',
            property_address: 'Podgaj 14',
            property_type: 'Stan',
            property_area: '115 m²',
            property_price: '345.000 KM',
            agency_commission: '10.350 KM',
            deposit_amount: '35.000 KM',
          },
        }),
      })

      if (!res.ok) throw new Error('Failed to generate PDF')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedTemplate.title}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()

      toast('Testni PDF je uspješno generisan i preuzet!')
    } catch {
      toast('Greška pri generisanju testnog PDF-a.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-amber-500/30 text-sm font-semibold flex items-center gap-2 animate-bounce">
          <Check size={18} className="text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8E2D6]">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/dashboard/documents`}
              className="p-2 rounded-xl bg-amber-50 text-[#C9963B] hover:bg-amber-100 transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1
                className="text-3xl font-bold text-slate-900 tracking-tight"
                style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
              >
                Ugovori & Šabloni (PDF Editor)
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Upravljajte šablonima ugovora sa automatskim popunjavanjem varijabli iz baze podataka.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const newTmpl: TemplateItem = {
                id: `tmpl-${Date.now()}`,
                title: 'Novi Šablon Ugovora',
                description: 'Opis novog ugovornog šablona',
                content: 'UGOVOR O POSREDOVANJU\n\nKlijent: ${client_name}\nNekretnina: ${property_title}\nCijena: ${property_price}',
                placeholders: ['client_name', 'property_title', 'property_price'],
                mappings: { client_name: 'client_name', property_title: 'property_title', property_price: 'property_price' },
                updated_at: new Date().toISOString(),
              }
              setTemplates(prev => [newTmpl, ...prev])
              setSelectedTemplate(newTmpl)
              setIsEditing(true)
            }}
            className="px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-semibold flex items-center gap-2 shadow-md transition-all"
          >
            <Plus size={16} />
            <span>Novi Šablon</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar: Template list */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Dostupni Šabloni ({templates.length})
            </h2>
          </div>

          <div className="space-y-3">
            {templates.map(t => {
              const isSelected = selectedTemplate?.id === t.id
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTemplate(t)
                    setIsEditing(false)
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50/50 border-[#C9963B] shadow-sm'
                      : 'bg-white border-[#E8E2D6] hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-[#C9963B] text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <FileText size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{t.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-slate-400">
                    <Code size={12} />
                    <span>{t.placeholders.length} detektovanih polja</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Panel: Template Editor & Field Mapping */}
        {selectedTemplate && (
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-[#E8E2D6] rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedTemplate.title}</h2>
                  <p className="text-xs text-slate-500">{selectedTemplate.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestGenerate}
                    disabled={generating}
                    className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[#C9963B] text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Download size={14} />
                    <span>{generating ? 'Generisanje...' : 'Testiraj PDF'}</span>
                  </button>

                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all"
                  >
                    {isEditing ? 'Otkaži' : 'Uredi Tekst'}
                  </button>
                </div>
              </div>

              {/* Title / Description edit mode */}
              {isEditing && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Naziv Šablona
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[#C9963B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Opis Šablona
                    </label>
                    <input
                      type="text"
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[#C9963B]"
                    />
                  </div>
                </div>
              )}

              {/* Contract Body Text Area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Sadržaj Ugovora sa Varijablama ($&#123;naziv_polja&#125;)</span>
                  <span className="text-amber-600 font-normal normal-case text-xs flex items-center gap-1">
                    <Sparkles size={12} /> Auto-detect placeholdera aktivan
                  </span>
                </label>

                {isEditing ? (
                  <textarea
                    rows={12}
                    value={editContent}
                    onChange={e => handleContentChange(e.target.value)}
                    className="w-full p-4 font-mono text-xs bg-slate-950 text-amber-200 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#C9963B]/40 leading-relaxed shadow-inner"
                  />
                ) : (
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                    {selectedTemplate.content}
                  </div>
                )}
              </div>

              {/* Field Mapping Configurator */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Code size={16} className="text-[#C9963B]" />
                    <span>Mapiranje Polja Ugovora (System Mapping)</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {parsedPlaceholders.length} detektovanih promenjivih
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {parsedPlaceholders.map(placeholder => {
                    const currentMapping = fieldMappings[placeholder] || placeholder
                    return (
                      <div
                        key={placeholder}
                        className="p-3 bg-amber-50/40 border border-amber-200/60 rounded-xl flex items-center justify-between gap-3"
                      >
                        <span className="font-mono text-xs font-semibold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-amber-300">
                          &#36;&#123;{placeholder}&#125;
                        </span>

                        <select
                          value={currentMapping}
                          onChange={e => handleMappingChange(placeholder, e.target.value)}
                          className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-[#C9963B]"
                        >
                          {SYSTEM_FIELDS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={handleSaveTemplate}
                  className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-semibold shadow-md transition-all flex items-center gap-2"
                >
                  <Check size={16} />
                  <span>Spremi Šablon & Mapiranje</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
