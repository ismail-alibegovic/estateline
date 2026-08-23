'use client'

import { useRef, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Copy, ArrowLeft, ArrowRight, Loader2, Database, Users, Building2, UserPlus } from 'lucide-react'

type Entity = 'contacts' | 'leads' | 'properties'

type DuplicateInfo =
  | { kind: 'in-file'; rowNumber: number }
  | { kind: 'existing' }

type PreviewRow = {
  rowNumber: number
  status: 'valid' | 'error' | 'duplicate'
  errors: string[]
  warnings: string[]
  duplicates: DuplicateInfo[]
}

type PreviewSummary = {
  total: number
  valid: number
  errors: number
  duplicatesInFile: number
  duplicatesExisting: number
}

type CommitSummary = PreviewSummary & {
  inserted: number
  skippedDuplicates: number
  failedRows: number
}

type Toast = { id: string; message: string; type: 'success' | 'error' }

const ENTITY_META: Record<Entity, { icon: React.ReactNode; labelBs: string; labelEn: string; descBs: string; descEn: string }> = {
  contacts: {
    icon: <Users className="w-5 h-5" />,
    labelEn: 'Contacts',
    labelBs: 'Kontakti',
    descEn: 'Buyers, owners, tenants, partners',
    descBs: 'Kupci, vlasnici, zakupci, partneri',
  },
  leads: {
    icon: <UserPlus className="w-5 h-5" />,
    labelEn: 'Leads',
    labelBs: 'Upiti',
    descEn: 'Inquiries and prospects',
    descBs: 'Upiti i potencijalni kupci',
  },
  properties: {
    icon: <Building2 className="w-5 h-5" />,
    labelEn: 'Properties',
    labelBs: 'Nekretnine',
    descEn: 'Listings with details',
    descBs: 'Nekretnine sa detaljima',
  },
}

const FIELD_LABELS: Record<string, { en: string; bs: string }> = {
  first_name: { en: 'First name', bs: 'Ime' },
  last_name: { en: 'Last name', bs: 'Prezime' },
  email: { en: 'Email', bs: 'Email' },
  phone: { en: 'Phone', bs: 'Telefon' },
  type: { en: 'Type', bs: 'Tip' },
  city: { en: 'City', bs: 'Grad' },
  company: { en: 'Company', bs: 'Kompanija' },
  notes: { en: 'Notes', bs: 'Napomene' },
  title: { en: 'Title', bs: 'Naslov' },
  description: { en: 'Description', bs: 'Opis' },
  price: { en: 'Price', bs: 'Cijena' },
  area_size: { en: 'Area (m²)', bs: 'Kvadratura (m²)' },
  rooms: { en: 'Rooms', bs: 'Sobe' },
  bathrooms: { en: 'Bathrooms', bs: 'Kupatila' },
  address: { en: 'Address', bs: 'Adresa' },
  municipality: { en: 'Municipality', bs: 'Opština' },
  status: { en: 'Status', bs: 'Status' },
  source: { en: 'Source', bs: 'Izvor' },
  budget_min: { en: 'Min. budget', bs: 'Min. budžet' },
  budget_max: { en: 'Max. budget', bs: 'Maks. budžet' },
  name: { en: 'Name', bs: 'Naziv' },
}

function fieldLabel(field: string, locale: string): string {
  const known = FIELD_LABELS[field]
  if (known) return locale === 'bs' ? known.bs : known.en
  return field.replace(/_/g, ' ')
}

type Step = 'upload' | 'review' | 'done'

export default function ImportPage() {
  const t = useTranslations('importPage')
  const tNav = useTranslations('nav')

  const [step, setStep] = useState<Step>('upload')
  const [entity, setEntity] = useState<Entity>('contacts')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const [headers, setHeaders] = useState<string[]>([])
  const [mapped, setMapped] = useState<Record<number, string>>({})
  const [unmapped, setUnmapped] = useState<string[]>([])
  const [sampleRows, setSampleRows] = useState<PreviewRow[]>([])
  const [summary, setSummary] = useState<PreviewSummary | null>(null)
  const [truncated, setTruncated] = useState(false)

  const [dupMode, setDupMode] = useState<'skip' | 'insert'>('skip')
  const [commitResult, setCommitResult] = useState<{ summary: CommitSummary; rowErrors: { rowNumber: number; errors: string[] }[] } | null>(null)

  const [toasts, setToasts] = useState<Toast[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const locale = useLocale()

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  const reset = () => {
    setStep('upload')
    setFile(null)
    setHeaders([])
    setMapped({})
    setUnmapped([])
    setSampleRows([])
    setSummary(null)
    setTruncated(false)
    setDupMode('skip')
    setCommitResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const buildForm = (): FormData => {
    const form = new FormData()
    form.append('entity', entity)
    form.append('file', file as File)
    return form
  }

  const runPreview = async () => {
    if (!file) return
    setLoading(true)
    try {
      const res = await fetch('/api/import/preview', { method: 'POST', body: buildForm() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'preview failed')
      setHeaders(data.headers)
      setMapped(data.mapped)
      setUnmapped(data.unmapped)
      setSampleRows(data.sampleRows)
      setSummary({
        total: data.summary.total,
        valid: data.summary.valid,
        errors: data.summary.errors,
        duplicatesInFile: data.summary.duplicatesInFile,
        duplicatesExisting: data.summary.duplicatesExisting,
      })
      setTruncated(data.truncated)
      setStep('review')
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const runCommit = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/import/commit?duplicates=${dupMode}`, { method: 'POST', body: buildForm() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'import failed')
      setCommitResult({ summary: data.summary, rowErrors: data.rowErrors })
      setStep('done')
      toast(t('toastImported', { count: data.summary.inserted }))
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) setFile(dropped)
  }

  const entityMeta = ENTITY_META[entity]
  const isBs = locale === 'bs'

  return (
    <div className="space-y-6">
      {/* Toasts */}
      <div className="fixed top-20 right-4 z-[60] space-y-2 w-80">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold border ${
            t.type === 'success' ? 'bg-gray-900 text-white border-gray-800' : 'bg-red-600 text-white border-red-500'
          }`}>
            {t.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/70 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tNav('importData')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        {step !== 'upload' && (
          <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all">
            <ArrowLeft size={14} /> {t('startOver')}
          </button>
        )}
      </header>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        {(['upload', 'review', 'done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
              step === s ? 'bg-[#C9963B] text-white shadow-sm'
              : (s === 'done' && step === 'done') || (s === 'upload' && step !== 'upload') ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-100 text-gray-400'
            }`}>{i + 1}</span>
            <span className={step === s ? 'text-gray-900' : 'text-gray-400'}>
              {s === 'upload' ? t('stepUpload') : s === 'review' ? t('stepReview') : t('stepDone')}
            </span>
            {i < 2 && <span className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* STEP 1 — upload */}
      {step === 'upload' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.keys(ENTITY_META) as Entity[]).map(e => (
              <button key={e} onClick={() => setEntity(e)} className={`text-left p-4 rounded-2xl border-2 transition-all ${entity === e ? 'border-[#C9963B] bg-amber-50/50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${entity === e ? 'bg-[#C9963B] text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {ENTITY_META[e].icon}
                </div>
                <div className="font-bold text-sm text-gray-900">{isBs ? ENTITY_META[e].labelBs : ENTITY_META[e].labelEn}</div>
                <div className="text-xs text-gray-500 mt-0.5">{isBs ? ENTITY_META[e].descBs : ENTITY_META[e].descEn}</div>
              </button>
            ))}
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`rounded-3xl border-2 border-dashed p-10 text-center transition-all ${dragOver ? 'border-[#C9963B] bg-amber-50/70' : 'border-[#C9963B]/40 bg-gradient-to-br from-amber-50 to-orange-50/50'}`}
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-[#C9963B] flex items-center justify-center mx-auto border border-amber-200">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="mt-4 font-bold text-gray-900">{t('dropTitle')}</h3>
            <p className="text-xs text-gray-500 mt-1">{t('dropHint')}</p>
            {file && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm text-sm">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-gray-800">{file.name}</span>
                <span className="text-xs text-gray-400">({Math.round(file.size / 1024)} KB)</span>
              </div>
            )}
            <div className="mt-4">
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-all">
                {t('chooseFile')}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              disabled={!file || loading}
              onClick={runPreview}
              className="flex items-center gap-2 px-6 py-3 bg-[#C9963B] hover:bg-[#b88328] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {t('analyze')}
            </button>
          </div>
        </>
      )}

      {/* STEP 2 — review */}
      {step === 'review' && summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: t('statTotal'), value: summary.total, color: 'text-gray-900', icon: null },
              { label: t('statValid'), value: summary.valid, color: 'text-emerald-600', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
              { label: t('statErrors'), value: summary.errors, color: 'text-red-600', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
              { label: t('statDupInFile'), value: summary.duplicatesInFile, color: 'text-amber-600', icon: <Copy className="w-3.5 h-3.5" /> },
              { label: t('statDupExisting'), value: summary.duplicatesExisting, color: 'text-purple-600', icon: <Database className="w-3.5 h-3.5" /> },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-200/70 p-4 shadow-sm">
                <div className={`flex items-center gap-1.5 text-lg font-bold ${s.color}`}>{s.icon}{s.value.toLocaleString()}</div>
                <div className="text-[11px] text-gray-500 mt-0.5 font-medium">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-gray-200/70 p-4 sm:p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-sm text-gray-900">{t('mappingTitle')}</h2>
            <div className="flex flex-wrap gap-2">
              {headers.map((h, i) => (
                <span key={`${h}-${i}`} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${mapped[i] ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-400 line-through'}`}>
                  {h}{mapped[i] ? ` → ${fieldLabel(mapped[i], locale)}` : ''}
                </span>
              ))}
            </div>
            {unmapped.length > 0 && (
              <p className="text-xs text-gray-500">{t('unmappedNote', { columns: unmapped.join(', ') })}</p>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-gray-200/70 p-4 sm:p-5 shadow-sm overflow-x-auto">
            <h2 className="font-bold text-sm text-gray-900 mb-3">{t('previewTitle')} {truncated && <span className="text-xs font-normal text-gray-400">({t('first200')})</span>}</h2>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 pr-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">#</th>
                  <th className="py-2 pr-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('colStatus')}</th>
                  <th className="py-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('colDetails')}</th>
                </tr>
              </thead>
              <tbody>
                {sampleRows.map(r => (
                  <tr key={r.rowNumber} className="border-b border-gray-50 text-sm">
                    <td className="py-2 pr-3 text-gray-400 text-xs">{r.rowNumber}</td>
                    <td className="py-2 pr-3">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                        r.status === 'valid' ? 'bg-emerald-50 text-emerald-700'
                        : r.status === 'duplicate' ? 'bg-purple-50 text-purple-700'
                        : 'bg-red-50 text-red-700'
                      }`}>{r.status}</span>
                    </td>
                    <td className="py-2 text-xs text-gray-600">
                      {[...r.errors, ...r.warnings, ...r.duplicates.map(d => d.kind === 'in-file' ? `= row ${d.rowNumber}` : '= existing record')].join('; ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200/70 p-4 sm:p-5 shadow-sm">
            <h2 className="font-bold text-sm text-gray-900 mb-3">{t('dupPolicyTitle')}</h2>
            <div className="space-y-2">
              {(['skip', 'insert'] as const).map(m => (
                <label key={m} className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${dupMode === m ? 'border-[#C9963B] bg-amber-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="dupMode" checked={dupMode === m} onChange={() => setDupMode(m)} className="mt-0.5 accent-[#C9963B]" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{m === 'skip' ? t('dupSkip') : t('dupInsert')}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{m === 'skip' ? t('dupSkipDesc') : t('dupInsertDesc')}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              disabled={loading || summary.valid + (dupMode === 'insert' ? summary.duplicatesInFile + summary.duplicatesExisting : 0) === 0}
              onClick={runCommit}
              className="flex items-center gap-2 px-6 py-3 bg-[#C9963B] hover:bg-[#b88328] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              {t('importNow')}
            </button>
          </div>
        </>
      )}

      {/* STEP 3 — done */}
      {step === 'done' && commitResult && (
        <div className="bg-white rounded-3xl border border-gray-200/70 p-6 sm:p-8 shadow-sm max-w-2xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{t('doneTitle')}</h2>
          <p className="text-sm text-gray-500 mt-1">{isBs ? `${entityMeta.labelBs} — ${file?.name}` : `${entityMeta.labelEn} — ${file?.name}`}</p>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
              <div className="text-2xl font-bold text-emerald-700">{commitResult.summary.inserted.toLocaleString()}</div>
              <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">{t('doneInserted')}</div>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
              <div className="text-2xl font-bold text-purple-700">{commitResult.summary.skippedDuplicates.toLocaleString()}</div>
              <div className="text-[11px] font-semibold text-purple-600 mt-0.5">{t('doneSkipped')}</div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <div className="text-2xl font-bold text-red-700">{commitResult.summary.failedRows.toLocaleString()}</div>
              <div className="text-[11px] font-semibold text-red-600 mt-0.5">{t('doneFailed')}</div>
            </div>
          </div>

          {commitResult.rowErrors.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{t('failedRowsTitle')}</h3>
              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                {commitResult.rowErrors.slice(0, 50).map(re => (
                  <li key={re.rowNumber} className="text-xs text-gray-600">
                    <span className="font-semibold text-red-600">row {re.rowNumber}:</span> {re.errors.join('; ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
