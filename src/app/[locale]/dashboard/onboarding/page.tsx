'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Building2, Users, GitCommit, Home, ArrowRight,
  CheckCircle2, Sparkles, Upload, ArrowLeft
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'

export default function OnboardingWizardPage() {
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) || 'en'

  const [step, setStep] = useState(1)

  // Step 1 Form
  const [agencyName, setAgencyName] = useState('')
  const [agencyAddress, setAgencyAddress] = useState('')
  const [agencyPhone, setAgencyPhone] = useState('')

  // Step 2 Form
  const [teamEmail, setTeamEmail] = useState('')
  const [teamRole, setTeamRole] = useState<'agent' | 'admin'>('agent')

  // Step 3 Form
  const [pipelineStages, setPipelineStages] = useState([
    'Novi Upit', 'Zakazan Obilazak', 'U Pregovorima', 'Kapara & Ugovor', 'Završeno'
  ])

  // Step 4 Form
  const [firstPropertyTitle, setFirstPropertyTitle] = useState('')
  const [firstPropertyPrice, setFirstPropertyPrice] = useState('')

  const [saving, setSaving] = useState(false)

  const handleCompleteOnboarding = async () => {
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: u } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
        if (u) {
          const { data: member } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', u.id)
            .single()

          if (member) {
            await supabase
              .from('organizations')
              .update({
                name: agencyName || undefined,
                pipeline_stages: pipelineStages,
              })
              .eq('id', member.organization_id)
          }
        }
      }
      router.push(`/${locale}/dashboard`)
    } catch {
      router.push(`/${locale}/dashboard`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-2xl bg-white border border-[#E8E2D6] rounded-3xl p-8 shadow-xl space-y-8">
        {/* Progress Bar */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s
                    ? 'bg-[#C9963B] text-white shadow-md shadow-amber-500/20'
                    : step > s
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step > s ? <CheckCircle2 size={16} /> : s}
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-slate-600">
                {s === 1 ? 'Profil' : s === 2 ? 'Tim' : s === 3 ? 'Pipeline' : 'Nekretnina'}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Agency Profile */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#C9963B] uppercase tracking-wider">
                <Building2 size={16} />
                <span>Korak 1 od 4</span>
              </div>
              <h1
                className="text-2xl font-bold text-slate-900 tracking-tight"
                style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
              >
                Osnovni podaci o vašoj agenciji
              </h1>
              <p className="text-xs text-slate-500">Unesite zvanične podatke koji će se prikazivati na ugovorima i računima.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Naziv Agencije
                </label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={e => setAgencyName(e.target.value)}
                  placeholder="npr. Prestige Real Estate d.o.o."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Sjedište / Adresa
                  </label>
                  <input
                    type="text"
                    value={agencyAddress}
                    onChange={e => setAgencyAddress(e.target.value)}
                    placeholder="Maršala Tita 12, Sarajevo"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Telefon Agencije
                  </label>
                  <input
                    type="text"
                    value={agencyPhone}
                    onChange={e => setAgencyPhone(e.target.value)}
                    placeholder="+387 33 000 000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-md"
              >
                <span>Nastavi</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Team Invites */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#C9963B] uppercase tracking-wider">
                <Users size={16} />
                <span>Korak 2 od 4</span>
              </div>
              <h1
                className="text-2xl font-bold text-slate-900 tracking-tight"
                style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
              >
                Pozovite članove tima (Agenti & Administratori)
              </h1>
              <p className="text-xs text-slate-500">Omogućite agentima pristup zajedničkom CRM radnom prostoru.</p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={teamEmail}
                  onChange={e => setTeamEmail(e.target.value)}
                  placeholder="email.agenta@agencija.ba"
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
                <select
                  value={teamRole}
                  onChange={e => setTeamRole(e.target.value as any)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                >
                  <option value="agent">Agent za nekretnine</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                Nazad
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-md"
              >
                <span>Nastavi</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Pipeline Stages */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#C9963B] uppercase tracking-wider">
                <GitCommit size={16} />
                <span>Korak 3 od 4</span>
              </div>
              <h1
                className="text-2xl font-bold text-slate-900 tracking-tight"
                style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
              >
                Postavite faze prodajnog ciklusa
              </h1>
              <p className="text-xs text-slate-500">Prilagodite korake kroz koje vodite kupce i prodavce.</p>
            </div>

            <div className="space-y-2">
              {pipelineStages.map((stg, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-[#C9963B] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span>{stg}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                Nazad
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-6 py-3 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-md"
              >
                <span>Nastavi</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: First Property Listing */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#C9963B] uppercase tracking-wider">
                <Home size={16} />
                <span>Korak 4 od 4</span>
              </div>
              <h1
                className="text-2xl font-bold text-slate-900 tracking-tight"
                style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
              >
                Dodajte vašu prvu nekretninu
              </h1>
              <p className="text-xs text-slate-500">Unesite prvu nekretninu u ponudi ili završite onboarding.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Naziv Nekretnine
                </label>
                <input
                  type="text"
                  value={firstPropertyTitle}
                  onChange={e => setFirstPropertyTitle(e.target.value)}
                  placeholder="npr. Dvoetažni Stan na Skenderiji"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cijena (KM)
                </label>
                <input
                  type="number"
                  value={firstPropertyPrice}
                  onChange={e => setFirstPropertyPrice(e.target.value)}
                  placeholder="345000"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                Nazad
              </button>
              <button
                onClick={handleCompleteOnboarding}
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-md"
              >
                <Sparkles size={16} />
                <span>{saving ? 'Završavanje...' : 'Završi & Idi na Dashboard'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
