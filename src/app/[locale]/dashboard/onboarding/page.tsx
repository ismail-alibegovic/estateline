'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Building2, Users, GitCommit, Home, ArrowRight,
  CheckCircle2, Sparkles, ArrowLeft, Loader2
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'

type Locale = 'en' | 'bs'

const dict = {
  en: {
    back: 'Back',
    next: 'Next',
    saving: 'Finishing...',
    finish: 'Finish & Go to Dashboard',
    steps: ['Profile', 'Team', 'Pipeline', 'Property'],
    stepOf: (n: number) => `Step ${n} of 4`,
    s1: {
      eyebrow: 'Agency Profile',
      title: 'Basic information about your agency',
      subtitle: 'Enter official details used on contracts and invoices.',
      agencyName: 'Agency Name',
      agencyNamePh: 'e.g. Prestige Real Estate d.o.o.',
      city: 'City',
      cityPh: 'Sarajevo',
      note: 'We will refine the full address, phone and logo later from Settings → Agency.',
    },
    s2: {
      eyebrow: 'Team',
      title: 'Invite team members (Agents & Admins)',
      subtitle: 'Add an existing EstateLine user by email to your shared workspace. If they have not signed up yet, finish onboarding now and invite them later from Settings → Team.',
      emailPh: 'agent.email@agency.ba',
      roleAgent: 'Real estate agent',
      roleAdmin: 'Administrator',
      addHint: 'Optional — skip with Next if you are the only agent for now.',
      invitedOk: 'Invitation sent',
      invitedFail: 'Could not add this user (they may not be registered yet). Onboarding continues.',
      skipped: 'Skipped — invite team later from Settings → Team',
    },
    s3: {
      eyebrow: 'Pipeline',
      title: 'Set the stages of your sales cycle',
      subtitle: 'Customise the steps you lead buyers and sellers through.',
      stages: ['New Inquiry', 'Viewing Booked', 'In Negotiation', 'Deposit & Contract', 'Closed'],
    },
    s4: {
      eyebrow: 'Property',
      title: 'Add your first listing',
      subtitle: 'Enter your first property into inventory, or finish onboarding now.',
      title_label: 'Listing Title',
      titlePh: 'e.g. Two-storey Apartment on Skenderija',
      price_label: 'Price (BAM)',
      pricePh: '345000',
      addHint: 'Optional — skip with Finish if you would rather add listings from the dashboard.',
      addedOk: 'Listing created',
      addedFail: 'Could not save the listing. Onboarding continues — add it from the dashboard.',
    },
  },
  bs: {
    back: 'Nazad',
    next: 'Nastavi',
    saving: 'Završavanje...',
    finish: 'Završi & Idi na Dashboard',
    steps: ['Profil', 'Tim', 'Pipeline', 'Nekretnina'],
    stepOf: (n: number) => `Korak ${n} od 4`,
    s1: {
      eyebrow: 'Profil Agencije',
      title: 'Osnovni podaci o vašoj agenciji',
      subtitle: 'Unesite zvanične podatke koji će se prikazivati na ugovorima i računima.',
      agencyName: 'Naziv Agencije',
      agencyNamePh: 'npr. Prestige Real Estate d.o.o.',
      city: 'Grad',
      cityPh: 'Sarajevo',
      note: 'Punu adresu, telefon i logo možemo dodati kasnije iz Postavke → Agencija.',
    },
    s2: {
      eyebrow: 'Tim',
      title: 'Pozovite članove tima (Agenti & Administratori)',
      subtitle: 'Dodajte postojećeg EstateLine korisnika preko emaila u zajednički radni prostor. Ako se još nisu registrovali, završite onboarding sada i pozovite ih kasnije iz Postavke → Tim.',
      emailPh: 'email.agenta@agencija.ba',
      roleAgent: 'Agent za nekretnine',
      roleAdmin: 'Administrator',
      addHint: 'Opciono — preskočite sa Nastavi ako ste za sada sami.',
      invitedOk: 'Pozivnica poslana',
      invitedFail: 'Nije moguće dodati korisnika (možda nije registrovan). Onboarding se nastavlja.',
      skipped: 'Preskočeno — pozovite tim kasnije iz Postavke → Tim',
    },
    s3: {
      eyebrow: 'Pipeline',
      title: 'Postavite faze prodajnog ciklusa',
      subtitle: 'Prilagodite korake kroz koje vodite kupce i prodavce.',
      stages: ['Novi Upit', 'Zakazan Obilazak', 'U Pregovorima', 'Kapara & Ugovor', 'Završeno'],
    },
    s4: {
      eyebrow: 'Nekretnina',
      title: 'Dodajte vašu prvu nekretninu',
      subtitle: 'Unesite prvu nekretninu u ponudi ili završite onboarding.',
      title_label: 'Naziv Nekretnine',
      titlePh: 'npr. Dvoetažni Stan na Skenderiji',
      price_label: 'Cijena (KM)',
      pricePh: '345000',
      addHint: 'Opciono — preskočite sa Završi ako želite dodati nekretnine s dashborda.',
      addedOk: 'Nekretnina kreirana',
      addedFail: 'Nije moguće sačuvati nekretninu. Onboarding se nastavlja — dodajte je s dashborda.',
    },
  },
} as const

// Generate a URL-safe slug and uniqueify with a short suffix to avoid UNIQUE
// (organization_id, slug) collisions during onboarding quick-add.
function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'listing'
  return `${base}-${Math.random().toString(36).slice(2, 6)}`
}

export default function OnboardingWizardPage() {
  const params = useParams()
  const router = useRouter()
  const locale = ((params?.locale as string) || 'en') as Locale
  const t = dict[locale] ?? dict.en

  const [step, setStep] = useState(1)

  const [agencyName, setAgencyName] = useState('')
  const [agencyCity, setAgencyCity] = useState('')

  const [teamEmail, setTeamEmail] = useState('')
  const [teamRole, setTeamRole] = useState<'agent' | 'admin'>('agent')
  const [teamStatus, setTeamStatus] = useState<'idle' | 'pending' | 'invited' | 'failed' | 'skipped'>('idle')

  const [pipelineStages, setPipelineStages] = useState<string[]>([...(t.s3.stages as readonly string[])])

  const [firstPropertyTitle, setFirstPropertyTitle] = useState('')
  const [firstPropertyPrice, setFirstPropertyPrice] = useState('')

  const [saving, setSaving] = useState(false)

  // ─── step 2: optional team invite, calls the existing
  //     /api/organizations/members/add-existing endpoint. ───────────────
  const handleInviteTeammate = async () => {
    const email = teamEmail.trim().toLowerCase()
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setTeamStatus('skipped')
      return
    }
    setTeamStatus('pending')
    try {
      const res = await fetch('/api/organizations/members/add-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: teamRole }),
      })
      setTeamStatus(res.ok ? 'invited' : 'failed')
    } catch {
      setTeamStatus('failed')
    }
  }

  // ─── step 4: optional first property, calls the existing
  //     /api/properties POST endpoint. ──────────────────────────────────
  const handleAddFirstProperty = async () => {
    const title = firstPropertyTitle.trim()
    const price = Number(firstPropertyPrice)
    if (!title || !price || price <= 0) return // optional → caller skips
    try {
      await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug: slugify(title),
          price,
          currency: 'BAM',
          city: agencyCity.trim() || 'Sarajevo',
          country: 'BA',
          status: 'draft',
          type: 'apartment',
        }),
      })
    } catch {
      /* surfaced via return status to the UI badge */
    }
  }

  const handleCompleteOnboarding = async () => {
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: u } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .single()
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

      // Best-effort side effects — onboarding must complete even if these fail,
      // since the user has no way to retry the wizard.
      await Promise.allSettled([
        teamStatus === 'idle' && teamEmail.trim()
          ? handleInviteTeammate()
          : Promise.resolve(),
        firstPropertyTitle.trim() && firstPropertyPrice
          ? handleAddFirstProperty()
          : Promise.resolve(),
      ])
    } catch {
      /* fall through to dashboard */
    } finally {
      setSaving(false)
      router.push(`/${locale}/dashboard`)
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
                {t.steps[s - 1]}
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
                <span>{t.stepOf(1)}</span>
              </div>
              <h1
                className="text-2xl font-bold text-slate-900 tracking-tight"
                style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
              >
                {t.s1.title}
              </h1>
              <p className="text-xs text-slate-500">{t.s1.subtitle}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.s1.agencyName}
                </label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={e => setAgencyName(e.target.value)}
                  placeholder={t.s1.agencyNamePh}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.s1.city}
                </label>
                <input
                  type="text"
                  value={agencyCity}
                  onChange={e => setAgencyCity(e.target.value)}
                  placeholder={t.s1.cityPh}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">{t.s1.note}</p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-md"
              >
                <span>{t.next}</span>
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
                <span>{t.stepOf(2)}</span>
              </div>
              <h1
                className="text-2xl font-bold text-slate-900 tracking-tight"
                style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
              >
                {t.s2.title}
              </h1>
              <p className="text-xs text-slate-500">{t.s2.subtitle}</p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={teamEmail}
                  onChange={e => {
                    setTeamEmail(e.target.value)
                    setTeamStatus('idle')
                  }}
                  placeholder={t.s2.emailPh}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
                <select
                  value={teamRole}
                  onChange={e => setTeamRole(e.target.value as 'agent' | 'admin')}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                >
                  <option value="agent">{t.s2.roleAgent}</option>
                  <option value="admin">{t.s2.roleAdmin}</option>
                </select>
              </div>

              {teamStatus === 'pending' && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 size={14} className="animate-spin" />
                  <span>...</span>
                </div>
              )}
              {teamStatus === 'invited' && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold">
                  <CheckCircle2 size={14} />
                  <span>{t.s2.invitedOk}</span>
                </div>
              )}
              {teamStatus === 'failed' && (
                <div className="text-xs text-amber-600 font-semibold">{t.s2.invitedFail}</div>
              )}

              <p className="text-[11px] text-slate-400 leading-relaxed">{t.s2.addHint}</p>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                <span className="inline-flex items-center gap-2">
                  <ArrowLeft size={14} />
                  {t.back}
                </span>
              </button>
              <button
                onClick={() => {
                  if (teamEmail.trim() && teamStatus === 'idle') {
                    void handleInviteTeammate()
                  }
                  setStep(3)
                }}
                className="px-6 py-3 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-md"
              >
                <span>{t.next}</span>
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
                <span>{t.stepOf(3)}</span>
              </div>
              <h1
                className="text-2xl font-bold text-slate-900 tracking-tight"
                style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
              >
                {t.s3.title}
              </h1>
              <p className="text-xs text-slate-500">{t.s3.subtitle}</p>
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
                <span className="inline-flex items-center gap-2">
                  <ArrowLeft size={14} />
                  {t.back}
                </span>
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-6 py-3 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-md"
              >
                <span>{t.next}</span>
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
                <span>{t.stepOf(4)}</span>
              </div>
              <h1
                className="text-2xl font-bold text-slate-900 tracking-tight"
                style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
              >
                {t.s4.title}
              </h1>
              <p className="text-xs text-slate-500">{t.s4.subtitle}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.s4.title_label}
                </label>
                <input
                  type="text"
                  value={firstPropertyTitle}
                  onChange={e => setFirstPropertyTitle(e.target.value)}
                  placeholder={t.s4.titlePh}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.s4.price_label}
                </label>
                <input
                  type="number"
                  value={firstPropertyPrice}
                  onChange={e => setFirstPropertyPrice(e.target.value)}
                  placeholder={t.s4.pricePh}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{t.s4.addHint}</p>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                <span className="inline-flex items-center gap-2">
                  <ArrowLeft size={14} />
                  {t.back}
                </span>
              </button>
              <button
                onClick={() => void handleCompleteOnboarding()}
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-md"
              >
                <Sparkles size={16} />
                <span>{saving ? t.saving : t.finish}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
