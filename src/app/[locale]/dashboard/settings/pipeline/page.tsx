'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import { GitCommit, Plus, Trash2, ArrowUp, ArrowDown, Save, CheckCircle2, ArrowLeft } from 'lucide-react'

const DEFAULT_STAGES = [
  'Novi Upiti (New)',
  'Zakazan Obilazak (Viewing Scheduled)',
  'U Pregovorima (Negotiation)',
  'Ugovor & Kapara (Under Contract)',
  'Prodano / Završeno (Closed Won)'
]

export default function PipelineSettingsPage() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'

  const [stages, setStages] = useState<string[]>(DEFAULT_STAGES)
  const [newStage, setNewStage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const toast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  useEffect(() => {
    const loadStages = async () => {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: u } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
      if (!u) { setLoading(false); return }

      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id, organizations(pipeline_stages)')
        .eq('user_id', u.id)
        .eq('is_primary', true)
        .single()

      if (member) {
        setOrgId(member.organization_id)
        const custom = (member.organizations as any)?.pipeline_stages
        if (Array.isArray(custom) && custom.length > 0) {
          setStages(custom)
        }
      }
      setLoading(false)
    }

    loadStages()
  }, [])

  const addStage = () => {
    if (!newStage.trim()) return
    setStages(prev => [...prev, newStage.trim()])
    setNewStage('')
  }

  const removeStage = (index: number) => {
    if (stages.length <= 2) {
      alert('Morate imati najmanje 2 faze u pipeline-u.')
      return
    }
    setStages(prev => prev.filter((_, i) => i !== index))
  }

  const moveStage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === stages.length - 1) return

    const newStages = [...stages]
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    const temp = newStages[index]
    newStages[index] = newStages[targetIdx]
    newStages[targetIdx] = temp
    setStages(newStages)
  }

  const savePipeline = async () => {
    if (!orgId) return
    setSaving(true)
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('organizations')
      .update({ pipeline_stages: stages })
      .eq('id', orgId)

    if (error) {
      toast('Greška pri spašavanju faza pipeline-a.')
    } else {
      toast('Pipeline faze su uspješno ažurirane!')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-64 w-full rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 font-sans">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-amber-500/30 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 size={18} className="text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E8E2D6]">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/dashboard/settings/custom-fields`}
            className="p-2 rounded-xl bg-amber-50 text-[#C9963B] hover:bg-amber-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1
              className="text-2xl font-bold text-slate-900 tracking-tight"
              style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
            >
              Postavke Pipeline Faza (Funnel)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Prilagodite korake kroz koje prolaze kupci i prodavci u KanBan tabli vaše agencije.
            </p>
          </div>
        </div>

        <button
          onClick={savePipeline}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-semibold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={16} />
          <span>{saving ? 'Spremanje...' : 'Spremi Faze'}</span>
        </button>
      </div>

      {/* Stage Editor Card */}
      <div className="bg-white border border-[#E8E2D6] rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <GitCommit size={18} className="text-[#C9963B]" />
            <span>Trenutne Faze Prodajnog Ciklusa</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">{stages.length} faza aktivno</span>
        </div>

        <div className="space-y-2.5">
          {stages.map((stage, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl group hover:border-amber-300 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-amber-100 text-[#C9963B] font-bold text-xs flex items-center justify-center">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={stage}
                  onChange={e => {
                    const newS = [...stages]
                    newS[idx] = e.target.value
                    setStages(newS)
                  }}
                  className="bg-transparent text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:px-2 focus:py-1 focus:rounded-lg focus:border focus:border-[#C9963B]"
                />
              </div>

              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => moveStage(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 disabled:opacity-30"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => moveStage(idx, 'down')}
                  disabled={idx === stages.length - 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 disabled:opacity-30"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  onClick={() => removeStage(idx)}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Stage */}
        <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
          <input
            type="text"
            value={newStage}
            onChange={e => setNewStage(e.target.value)}
            placeholder="Dodaj novu fazu (npr. 'Procjena Nekretnine')..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#C9963B]"
          />
          <button
            onClick={addStage}
            className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[#C9963B] text-sm font-semibold rounded-xl flex items-center gap-2 transition-all"
          >
            <Plus size={16} />
            <span>Dodaj Fazu</span>
          </button>
        </div>
      </div>
    </div>
  )
}
