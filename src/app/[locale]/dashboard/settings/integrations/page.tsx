'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useTranslations } from 'next-intl'
import {
  RefreshCw, CheckCircle2, AlertCircle, Copy, Check, Link as LinkIcon,
  ExternalLink, Layers, Database, Sparkles, Building2, ShieldCheck, ArrowUpRight,
  CreditCard, Mail, MessageSquare, GaugeCircle
} from 'lucide-react'

type IntegrationStatus = {
  key: string
  label: string
  description: string
  status: 'connected' | 'partial' | 'missing'
  configured: string[]
  missing: string[]
}

type IntegrationStatusResponse = {
  success: boolean
  checked_at: string
  organization: { id: string; name: string }
  summary: { connected: number; partial: number; missing: number }
  integrations: IntegrationStatus[]
}

const integrationIcons: Record<string, typeof Database> = {
  supabase: Database,
  gemini: Sparkles,
  stripe: CreditCard,
  email: Mail,
  sms: MessageSquare,
  'rate-limit': GaugeCircle,
  'database-url': ShieldCheck,
}

const statusMeta = {
  connected: { label: 'Connected', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  partial: { label: 'Partial', className: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  missing: { label: 'Missing', className: 'bg-gray-50 text-gray-500 border-gray-200', dot: 'bg-gray-400' },
}

export default function IntegrationsPage() {
  const tNav = useTranslations('nav')
  const [org, setOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copiedFeed, setCopiedFeed] = useState<string | null>(null)
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([])

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }
  
  // OLX States
  const [olxUrl, setOlxUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [systemStatus, setSystemStatus] = useState<IntegrationStatusResponse | null>(null)
  const [systemStatusError, setSystemStatusError] = useState<string | null>(null)

  const loadOrgData = async () => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: u } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!u) {
      setLoading(false)
      return
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('organizations(*)')
      .eq('user_id', u.id)
      .eq('is_primary', true)
      .single()

    if (member?.organizations) {
      const orgObj = member.organizations as any
      setOrg(orgObj)
      setOlxUrl(orgObj.olx_profile_url || '')

      try {
        const statsRes = await fetch('/api/sync/olx')
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }
      } catch (err) {
        console.error('Failed to load stats:', err)
      }

      try {
        const statusRes = await fetch('/api/integrations/status', { headers: { Accept: 'application/json' } })
        const statusData = await statusRes.json()
        if (!statusRes.ok) throw new Error(statusData.error || 'Status provjera nije uspjela')
        setSystemStatus(statusData)
        setSystemStatusError(null)
      } catch (err: any) {
        setSystemStatusError(err.message || 'Status provjera nije uspjela')
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadOrgData()
  }, [])

  const handleSaveUrl = async () => {
    if (!org) return
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase
        .from('organizations')
        .update({ olx_profile_url: olxUrl })
        .eq('id', org.id)

      if (error) throw error
      
      setOrg((prev: any) => ({ ...prev, olx_profile_url: olxUrl }))
      toast('OLX profilni link je uspješno spašen!')
    } catch (err: any) {
      toast('Greška pri spašavanju: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSyncProfile = async () => {
    if (!org) return
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)

    try {
      const res = await fetch('/api/sync/olx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'pull', olx_url: olxUrl })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Sinhronizacija nije uspjela')
      }

      setSyncResult(data)
      toast(`Sinhronizacija završena! Uvezeno ${data.importedCount} novih nekretnina.`)
      // Refresh stats
      loadOrgData()
    } catch (err: any) {
      setSyncError(err.message)
      toast(err.message, 'error')
    } finally {
      setSyncing(false)
    }
  }

  const copyToClipboard = (url: string, key: string) => {
    navigator.clipboard.writeText(url)
    setCopiedFeed(key)
    toast('Link kopiran u klipbord!')
    setTimeout(() => setCopiedFeed(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-[#C9963B] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!org) {
    return <div className="p-8 text-gray-500">Organizacija nije pronađena.</div>
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const njuskaloFeedUrl = `${origin}/api/feeds/njuskalo/${org.id}`
  const nekretnineFeedUrl = `${origin}/api/feeds/nekretnine_rs/${org.id}`
  const jsonFeedUrl = `${origin}/api/feeds/json/${org.id}`

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fade-in-up">
      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-slide-in-right ${
              t.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {t.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertCircle size={16} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/60 pb-6">
        <div>
          <p className="page-eyebrow mb-1">INTEGRACIJE & PORTE</p>
          <h1 className="text-3xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display), serif' }}>
            Sinhronizacija Oglasa & Portala
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Automatski uvozite i objavljujte nekretnine na najpopularnijim portalima u BiH i regionu.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200/60 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-800">OLX Integracija Aktivna</span>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-gray-200/70 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="page-eyebrow mb-1">SYSTEM STATUS</p>
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display), serif' }}>
                Runtime konfiguracija
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Prikazuje koje integracije trenutni Estateline servis stvarno vidi. Ključevi se nikad ne prikazuju.
              </p>
            </div>
            {systemStatus && (
              <div className="rounded-2xl bg-[#F5F1EB] px-4 py-3 text-right">
                <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display), serif' }}>{systemStatus.summary.connected}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">connected</p>
              </div>
            )}
          </div>

          {systemStatusError ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {systemStatusError}
            </div>
          ) : systemStatus ? (
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{systemStatus.summary.connected}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/70">ready</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">{systemStatus.summary.partial}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700/70">partial</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 text-center">
                <p className="text-2xl font-bold text-gray-700">{systemStatus.summary.missing}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">missing</p>
              </div>
            </div>
          ) : (
            <div className="mt-5 h-20 animate-pulse rounded-2xl bg-gray-100" />
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(systemStatus?.integrations || []).map((item) => {
            const Icon = integrationIcons[item.key] || Layers
            const meta = statusMeta[item.status]
            return (
              <div key={item.key} className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F1EB] text-[#C9963B]">
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{item.label}</h3>
                      <p className="mt-1 text-xs leading-5 text-gray-500">{item.description}</p>
                    </div>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${meta.className}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                </div>
                {item.missing.length > 0 && (
                  <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-[11px] leading-5 text-gray-500">
                    Missing: {item.missing.join(', ')}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Main OLX Integration Card */}
      <section className="bg-white rounded-3xl border border-gray-200/70 p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/5 to-amber-500/0 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-200/60 shrink-0">
              <span className="font-black text-amber-700 text-xl tracking-tight">OLX</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                OLX.ba Automatski Uvoz
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                  API & Scraper
                </span>
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Uvezi sve nekretnine, fotografije, kvadraturu, spratnost i sobe direktno sa OLX profila agencije.
              </p>
            </div>
          </div>

          <button
            onClick={handleSyncProfile}
            disabled={syncing || !olxUrl}
            className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm text-white shadow-md transition-all duration-200 disabled:opacity-50 shrink-0"
            style={{
              background: 'linear-gradient(135deg, #C9963B 0%, #b88328 100%)',
              boxShadow: '0 4px 16px rgba(201,150,59,0.25)',
            }}
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Sinhronizacija u toku...' : 'Ažuriraj sa OLX.ba'}</span>
          </button>
        </div>

        {/* Input Form */}
        <div className="bg-gray-50/70 border border-gray-200/60 rounded-2xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Link OLX Profila ili Trgovine Agencije
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <LinkIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  placeholder="https://olx.ba/profil/vasa-agencija ili https://olx.ba/shops/vasa-trgovina"
                  value={olxUrl}
                  onChange={(e) => setOlxUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#C9963B] focus:ring-2 focus:ring-[#C9963B]/20 transition-all"
                />
              </div>
              <button
                onClick={handleSaveUrl}
                disabled={saving || !olxUrl}
                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium text-sm rounded-xl transition-colors disabled:opacity-50 shrink-0"
              >
                {saving ? 'Spašavanje...' : 'Sačuvaj Link'}
              </button>
            </div>
          </div>

          {/* Sync Metadata Checklist */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-200/60 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <span>Broj soba & kupatila</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <span>Kvadratura & spratnost</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <span>Vrsta grijanja & oprema</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <span>Sve visoke rezolucije slike</span>
            </div>
          </div>
        </div>

        {/* Sync Results Feedback */}
        {syncResult && (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-5 space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>Uspješno sinhronizovano sa OLX.ba!</span>
            </div>
            <p className="text-xs text-emerald-700 font-medium">
              Sistem je obradio profil i uveo {syncResult.importedCount} novih nekretnina:
            </p>
            {syncResult.imported && syncResult.imported.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {syncResult.imported.map((item: any) => (
                  <div key={item.id} className="bg-white border border-emerald-100 p-3 rounded-xl flex items-center justify-between text-xs shadow-sm">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-gray-900 truncate">{item.title}</p>
                      <p className="text-[11px] text-gray-400">{item.area_size} m² • {item.bedrooms} soba</p>
                    </div>
                    <span className="font-bold text-emerald-700 shrink-0">{item.price.toLocaleString()} KM</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">Sve nekretnine sa ovog profila su već uvozne i ažurne!</p>
            )}
          </div>
        )}

        {syncError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>Greška pri sinhronizaciji: {syncError}</span>
          </div>
        )}
      </section>

      {/* XML Feed Export Portals */}
      <section className="bg-white rounded-3xl border border-gray-200/70 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            XML & JSON Feed Izvoz za Portale
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Kopirajte ove linkove u postavke vaših naloga na regionalnim portalima za automatsko objavljivanje.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Njuškalo */}
          <div className="bg-gray-50/70 border border-gray-200/60 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-900">Njuškalo.hr</span>
                <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">XML</span>
              </div>
              <p className="text-xs text-gray-500">Automatski izvoz oglasa za Njuškalo u HR formatu.</p>
            </div>
            <button
              onClick={() => copyToClipboard(njuskaloFeedUrl, 'njuskalo')}
              className="w-full py-2 px-3 bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              {copiedFeed === 'njuskalo' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copiedFeed === 'njuskalo' ? 'Kopirano' : 'Kopiraj XML Link'}</span>
            </button>
          </div>

          {/* Nekretnine.rs */}
          <div className="bg-gray-50/70 border border-gray-200/60 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-900">Nekretnine.rs</span>
                <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">XML</span>
              </div>
              <p className="text-xs text-gray-500">Automatski izvoz oglasa za Nekretnine.rs u RS formatu.</p>
            </div>
            <button
              onClick={() => copyToClipboard(nekretnineFeedUrl, 'nekretnine')}
              className="w-full py-2 px-3 bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              {copiedFeed === 'nekretnine' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copiedFeed === 'nekretnine' ? 'Kopirano' : 'Kopiraj XML Link'}</span>
            </button>
          </div>

          {/* Custom JSON Feed */}
          <div className="bg-gray-50/70 border border-gray-200/60 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-900">Custom Web Feed</span>
                <span className="text-[10px] font-bold uppercase bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">JSON</span>
              </div>
              <p className="text-xs text-gray-500">Prilagođeni JSON izvor za vašu web stranicu agencije.</p>
            </div>
            <button
              onClick={() => copyToClipboard(jsonFeedUrl, 'json')}
              className="w-full py-2 px-3 bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              {copiedFeed === 'json' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copiedFeed === 'json' ? 'Kopirano' : 'Kopiraj JSON Link'}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
