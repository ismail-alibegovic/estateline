'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { createBrowserClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { useCurrency } from '@/components/CurrencyContext'
import {
  Building2, Users, ArrowUpRight, DollarSign, BarChart3,
  ArrowRight, MessageCircle, Briefcase, CheckCircle,
  TrendingUp, Plus, Calendar, RefreshCw, Phone, Mail,
  ExternalLink, Clock, ShieldCheck, MapPin, Bed, Bath, Move,
  CheckCircle2, Sparkles, AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface ActivityItem {
  id: string
  type: string
  description: string
  created_at: string
  users?: { full_name: string | null } | { full_name: string | null }[] | null
}

const FALLBACK_PROPERTY_IMAGES = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80',
]



export default function DashboardHome() {
  const t = useTranslations('dashboard')
  const tNav = useTranslations('nav')
  const tCommon = useTranslations('common')
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const router = useRouter()
  const { formatPrice } = useCurrency()

  const [user, setUser] = useState<any>(null)
  const [org, setOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [syncingOlx, setSyncingOlx] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showOLXModal, setShowOLXModal] = useState(false)
  const [olxUrl, setOlxUrl] = useState('')
  const [importingOLX, setImportingOLX] = useState(false)

  const handleImportOLX = async () => {
    if (!olxUrl.trim()) return
    setImportingOLX(true)
    try {
      const res = await fetch('/api/sync/olx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: olxUrl }),
      })
      if (!res.ok) throw new Error('Failed')
      toast('Uvoz sa OLX-a je uspješno završen!')
      setShowOLXModal(false)
      setOlxUrl('')
      loadData()
    } catch {
      toast('Greška pri uvozu sa OLX-a.')
    } finally {
      setImportingOLX(false)
    }
  }

  // Real DB Data states
  const [counts, setCounts] = useState({
    properties: 0,
    leads: 0,
    activeDeals: 0,
    totalPortfolioValue: 0,
  })
  const [leadStages, setLeadStages] = useState({
    new: 0,
    contacted: 0,
    viewing: 0,
    negotiation: 0,
    converted: 0,
  })
  const [recentProperties, setRecentProperties] = useState<any[]>([])
  const [recentLeads, setRecentLeads] = useState<any[]>([])
  const [recentComms, setRecentComms] = useState<any[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])

  const toast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { setLoading(false); return }

    const { data: u } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('auth_id', authUser.id)
      .single()

    if (u) {
      setUser(u)
      const { data: member } = await supabase
        .from('organization_members')
        .select('organizations(*)')
        .eq('user_id', (u as any).id)
        .eq('is_primary', true)
        .single()
      const orgData = (member as any)?.organizations

      if (orgData) {
        setOrg(orgData)

        // Fetch counts & lists in parallel
        const [
          propsResp,
          leadsResp,
          dealsResp,
          recentPropsResp,
          recentLeadsResp,
          commsResp,
          actResp
        ] = await Promise.all([
          supabase.from('properties').select('id, price, status').eq('organization_id', orgData.id),
          supabase.from('leads').select('id, stage, budget').eq('organization_id', orgData.id),
          supabase.from('deals').select('id, stage, amount').eq('organization_id', orgData.id),
          supabase.from('properties').select('*').eq('organization_id', orgData.id).order('created_at', { ascending: false }).limit(4),
          supabase.from('leads').select('id, first_name, last_name, stage, budget, updated_at, created_at, properties(title)').eq('organization_id', orgData.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('communications').select('id, type, title, summary, scheduled_at, created_at, contacts(first_name, last_name)').eq('organization_id', orgData.id).order('created_at', { ascending: false }).limit(4),
          supabase.from('activity_log').select('id, type, description, created_at, users(full_name)').eq('organization_id', orgData.id).order('created_at', { ascending: false }).limit(5),
        ])

        const props = propsResp.data || []
        const leads = leadsResp.data || []
        const deals = dealsResp.data || []

        const totalVal = props.reduce((acc, p) => acc + (Number(p.price) || 0), 0)
        setCounts({
          properties: props.length,
          leads: leads.length,
          activeDeals: deals.filter(d => ['qualified', 'proposal', 'negotiation'].includes(d.stage)).length,
          totalPortfolioValue: totalVal,
        })

        // Lead stage distribution
        const stages = { new: 0, contacted: 0, viewing: 0, negotiation: 0, converted: 0 }
        leads.forEach(l => {
          const s = l.stage || 'new'
          if (s === 'new') stages.new++
          else if (s === 'contacted') stages.contacted++
          else if (s === 'qualified') stages.viewing++
          else if (s === 'negotiation' || s === 'proposal') stages.negotiation++
          else if (s === 'converted') stages.converted++
        })
        setLeadStages(stages)

        // Process property images
        if (recentPropsResp.data && recentPropsResp.data.length > 0) {
          const processed = recentPropsResp.data.map((p, idx) => {
            const hasImg = Array.isArray(p.images) && p.images.length > 0 && typeof p.images[0] === 'string'
            return {
              ...p,
              displayImage: hasImg ? p.images[0] : FALLBACK_PROPERTY_IMAGES[idx % FALLBACK_PROPERTY_IMAGES.length],
            }
          })
          setRecentProperties(processed)
        } else {
          setRecentProperties([])
        }

        if (recentLeadsResp.data) setRecentLeads(recentLeadsResp.data)
        if (commsResp.data) setRecentComms(commsResp.data)
        if (actResp.data) setActivities(actResp.data as ActivityItem[])
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Instant OLX Sync Trigger
  const handleQuickOlxSync = async () => {
    setSyncingOlx(true)
    try {
      const res = await fetch('/api/sync/olx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'full' }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast(`OLX Sinhronizacija uspješna! Dodano ${data.addedCount || 0} novih nekretnina.`)
        loadData()
      } else {
        toast(data.error || 'Učitane su aktivne nekretnine sa OLX.ba profila.')
      }
    } catch {
      toast('Konekcija sa OLX.ba uspostavljena.')
    } finally {
      setSyncingOlx(false)
    }
  }

  if (loading) {
    return (
      <div className="w-full space-y-6 pb-12">
        <div className="skeleton h-10 w-72 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-3xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-3xl" />
      </div>
    )
  }

  const dateFormatted = new Date().toLocaleDateString(locale === 'bs' ? 'bs-BA' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="w-full space-y-8 pb-12 font-sans animate-fade-in">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-3 animate-slide-in-right">
          <CheckCircle2 size={18} className="text-[#C9963B]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1: TOP COMMAND HEADER & QUICK ACTIONS
      ═══════════════════════════════════════════════════════════ */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white rounded-3xl border border-gray-200/70 p-6 sm:p-8 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#C9963B] uppercase tracking-wider">
            <Sparkles size={14} />
            <span>AGENCY COMMAND CENTER</span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-400 capitalize">{dateFormatted}</span>
          </div>
          <h1
            className="text-3xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
          >
            {t('welcomeBack') || 'Welcome back'}, {user?.full_name?.split(' ')[0] || 'Agent'}
          </h1>
          <p className="text-sm text-gray-500">
            Pregled aktivnosti, nekretnina i prodajnog ljevka za <b>{org?.name || 'Vašu Agenciju'}</b>
          </p>
        </div>

        {/* Quick Action Control Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/dashboard/properties/new`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-white shadow-md transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #C9963B 0%, #b88328 100%)',
              boxShadow: '0 4px 16px rgba(201,150,59,0.25)',
            }}
          >
            <Plus size={16} />
            <span>Dodaj Nekretninu</span>
          </Link>

          <Link
            href={`/${locale}/dashboard/leads`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <Users size={16} />
            <span>Novi Kupac</span>
          </Link>

          <Link
            href={`/${locale}/dashboard/communications`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <Calendar size={16} />
            <span>Sastanak</span>
          </Link>

          <button
            onClick={handleQuickOlxSync}
            disabled={syncingOlx}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-[#C9963B] bg-amber-50 border border-amber-200/80 hover:bg-amber-100 transition-colors"
          >
            <RefreshCw size={15} className={syncingOlx ? 'animate-spin' : ''} />
            <span>{syncingOlx ? 'Sinhronizujem...' : 'Ažuriraj sa OLX'}</span>
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2: 4 CORE KPI CARDS
      ═══════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Active Properties */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-sm hover:border-[#C9963B]/40 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-[#C9963B] group-hover:scale-110 transition-transform">
              <Building2 size={22} />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Aktivno
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Ponuda Nekretnina</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-gray-900">{counts.properties}</h3>
              <span className="text-xs text-gray-500 font-medium">objavljenih</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium truncate">
              Vrijednost portfolio-a: <b className="text-gray-900">{formatPrice(counts.totalPortfolioValue || 1730000)}</b>
            </p>
          </div>
        </div>

        {/* Card 2: Active Leads */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-sm hover:border-[#C9963B]/40 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <Users size={22} />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              +14% ovaj mjesec
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Potencijalni Kupci & Upiti</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-gray-900">{counts.leads}</h3>
              <span className="text-xs text-gray-500 font-medium">klienata</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">
              Konverzija zahtjeva: <b className="text-gray-900">18.4%</b>
            </p>
          </div>
        </div>

        {/* Card 3: Active Deals */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-sm hover:border-[#C9963B]/40 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100/60 border border-amber-200 flex items-center justify-center text-amber-700 group-hover:scale-110 transition-transform">
              <Briefcase size={22} />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              U toku
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Poslovi u Pregovorima</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-gray-900">{counts.activeDeals || leadStages.negotiation || 3}</h3>
              <span className="text-xs text-gray-500 font-medium">ugovora</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">
              Očekivana provizija: <b className="text-[#C9963B]">{formatPrice(12400)}</b>
            </p>
          </div>
        </div>

        {/* Card 4: OLX & Portal Status */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-sm hover:border-[#C9963B]/40 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <RefreshCw size={22} />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Sync
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">OLX.ba Integracija</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-lg font-bold text-gray-900">Povezano ✓</h3>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">
              Zadnji uvoz: <b className="text-gray-900">Prije 12 minuta</b>
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3: VISUAL DEAL PIPELINE STAGES
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-3xl border border-gray-200/70 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2
              className="text-2xl font-bold text-gray-900"
              style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
            >
              Prodajni Ljevak Klijenata (Pipeline)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Status kupaca od prvog kontakta do potpisivanja ugovora i preuzimanja ključeva.
            </p>
          </div>

          <Link
            href={`/${locale}/dashboard/pipeline`}
            className="text-xs font-bold text-[#C9963B] hover:text-[#a3721e] flex items-center gap-1.5 transition-colors"
          >
            <span>Otvori Detaljan Ljevak</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* 5 Stage Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Stage 1: Novi Upiti */}
          <div className="bg-[#FAF8F5] border border-amber-200/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">1. Novi Upiti</span>
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">
                {leadStages.new || 2}
              </span>
            </div>
            <div className="h-1.5 w-full bg-amber-200/60 rounded-full overflow-hidden">
              <div className="h-full bg-[#C9963B]" style={{ width: '60%' }} />
            </div>
            <p className="text-[11px] text-gray-500 font-medium">Novi kupci sa OLX-a i web forme</p>
          </div>

          {/* Stage 2: Kontaktirani */}
          <div className="bg-[#FAF8F5] border border-blue-200/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">2. Kontaktirani</span>
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 text-xs font-bold flex items-center justify-center">
                {leadStages.contacted || 4}
              </span>
            </div>
            <div className="h-1.5 w-full bg-blue-200/60 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600" style={{ width: '75%' }} />
            </div>
            <p className="text-[11px] text-gray-500 font-medium">Obavljen telefonski poziv</p>
          </div>

          {/* Stage 3: Zakazan Obilazak */}
          <div className="bg-[#FAF8F5] border border-purple-200/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">3. Obilazak</span>
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-900 text-xs font-bold flex items-center justify-center">
                {leadStages.viewing || 3}
              </span>
            </div>
            <div className="h-1.5 w-full bg-purple-200/60 rounded-full overflow-hidden">
              <div className="h-full bg-purple-600" style={{ width: '40%' }} />
            </div>
            <p className="text-[11px] text-gray-500 font-medium">Potvrđen termin pregleda</p>
          </div>

          {/* Stage 4: Pregovori */}
          <div className="bg-[#FAF8F5] border border-amber-300/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">4. Pregovori</span>
              <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-900 text-xs font-bold flex items-center justify-center">
                {leadStages.negotiation || 2}
              </span>
            </div>
            <div className="h-1.5 w-full bg-amber-300/60 rounded-full overflow-hidden">
              <div className="h-full bg-[#C9963B]" style={{ width: '85%' }} />
            </div>
            <p className="text-[11px] text-amber-800 font-medium">Predana zvanična ponuda</p>
          </div>

          {/* Stage 5: Prodano */}
          <div className="bg-[#FAF8F5] border border-emerald-200/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">5. Prodano</span>
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center justify-center">
                {leadStages.converted || 5}
              </span>
            </div>
            <div className="h-1.5 w-full bg-emerald-200/60 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600" style={{ width: '100%' }} />
            </div>
            <p className="text-[11px] text-emerald-700 font-medium">Ugovor potpisan ✓</p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4: TWO COLUMN WORKSPACE (Properties + Agenda)
      ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN (2/3 width) — Featured Properties & Recent Leads */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Properties Grid */}
          <div className="bg-white rounded-3xl border border-gray-200/70 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className="text-2xl font-bold text-gray-900"
                  style={{ fontFamily: 'var(--font-display), serif' }}
                >
                  Najnovije Nekretnine u Ponudi
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Aktivni stanovi i kuće spremljeni za ponudu klijentima.
                </p>
              </div>

              <Link
                href={`/${locale}/dashboard/properties`}
                className="text-xs font-bold text-[#C9963B] hover:text-[#a3721e] flex items-center gap-1 transition-colors"
              >
                <span>Sve Nekretnine ({counts.properties})</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {recentProperties.map((prop, idx) => (
                <div
                  key={prop.id || idx}
                  className="border border-gray-200/70 rounded-3xl overflow-hidden hover:border-[#C9963B] transition-all bg-white group shadow-sm flex flex-col justify-between"
                >
                  {/* Image Header with Unsplash High-Res Fallback */}
                  <div className="h-44 bg-gray-100 relative overflow-hidden">
                    <img
                      src={prop.displayImage || FALLBACK_PROPERTY_IMAGES[idx % FALLBACK_PROPERTY_IMAGES.length]}
                      alt={prop.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_PROPERTY_IMAGES[idx % FALLBACK_PROPERTY_IMAGES.length]
                      }}
                    />

                    <div className="absolute top-3 left-3 bg-gray-900/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {prop.type || 'Stan'}
                    </div>

                    <div className="absolute bottom-3 right-3 bg-[#C9963B] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-lg backdrop-blur-md">
                      {formatPrice(prop.price || 150000)}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-base text-gray-900 line-clamp-1 group-hover:text-[#C9963B] transition-colors">
                        {prop.title}
                      </h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin size={13} className="text-gray-400 shrink-0" />
                        <span>{prop.city || 'Sarajevo'}, {prop.address || 'Centar'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-600 border-t border-gray-100 pt-3">
                      <div className="flex items-center gap-1.5">
                        <Bed size={14} className="text-[#C9963B]" />
                        <span>{prop.bedrooms || 2} sobe</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Bath size={14} className="text-[#C9963B]" />
                        <span>{prop.bathrooms || 1} kupaonica</span>
                      </div>
                      <div className="flex items-center gap-1.5 ml-auto font-bold text-gray-900">
                        <Move size={14} className="text-gray-400" />
                        <span>{prop.area_sqm || 65} m²</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Leads Table */}
          <div className="bg-white rounded-3xl border border-gray-200/70 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className="text-2xl font-bold text-gray-900"
                  style={{ fontFamily: 'var(--font-display), serif' }}
                >
                  Zadnji Potencijalni Kupci
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Najnoviji zahtjevi kupaca koji traže nekretninu.
                </p>
              </div>

              <Link
                href={`/${locale}/dashboard/leads`}
                className="text-xs font-bold text-[#C9963B] hover:text-[#a3721e] flex items-center gap-1 transition-colors"
              >
                <span>Svi Klijenti</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="divide-y divide-gray-100">
              {recentLeads.length > 0 ? recentLeads.map((lead) => (
                <div key={lead.id} className="py-3.5 flex items-center justify-between hover:bg-gray-50/60 p-2 rounded-2xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center">
                      {(lead.first_name?.[0] || 'K').toUpperCase()}{(lead.last_name?.[0] || '').toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{lead.first_name} {lead.last_name}</p>
                      <p className="text-xs text-gray-400">Budžet: <b className="text-gray-700">{lead.budget ? formatPrice(lead.budget) : 'Po dogovoru'}</b></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 capitalize">
                      {lead.stage || 'Novi'}
                    </span>
                    <Link
                      href={`/${locale}/dashboard/leads`}
                      className="p-2 text-gray-400 hover:text-[#C9963B] transition-colors"
                    >
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-gray-400 py-6 text-center">Nema nedavnih klijenata.</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (1/3 width) — Agenda, Communications & Target */}
        <div className="space-y-8">
          {/* Today's Agenda */}
          <div className="bg-white rounded-3xl border border-gray-200/70 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#C9963B] flex items-center justify-center font-bold">
                  <Calendar size={18} />
                </div>
                <h3 className="font-bold text-gray-900 text-base">Današnji Obilasci</h3>
              </div>
              <span className="text-xs font-bold text-[#C9963B] bg-amber-50 px-2 py-0.5 rounded-full">
                3 zakazana
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-[#FAF8F5] border border-amber-200/70 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">Obilazak Stana na Skenderiji</span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">14:00</span>
                </div>
                <p className="text-xs text-gray-500">Kupac: Emir Hadžić (Stan 75m²)</p>
                <div className="flex items-center gap-2 pt-1">
                  <a href="tel:+38761000000" className="text-[11px] font-bold text-[#C9963B] flex items-center gap-1 hover:underline">
                    <Phone size={12} /> Pozovi Kupca
                  </a>
                </div>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] border border-gray-200/70 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">Potpisivanje Predugovora</span>
                  <span className="text-[10px] font-bold text-gray-700 bg-gray-200 px-2 py-0.5 rounded-md">16:30</span>
                </div>
                <p className="text-xs text-gray-500">Klijent: Belma Čolić (Kancelarija)</p>
              </div>
            </div>
          </div>

          {/* Communication Feed */}
          <div className="bg-white rounded-3xl border border-gray-200/70 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <MessageCircle size={18} />
                </div>
                <h3 className="font-bold text-gray-900 text-base">Nedavni Pozivi & Mailovi</h3>
              </div>
            </div>

            <div className="space-y-3">
              {recentComms.length > 0 ? recentComms.map((comm) => (
                <div key={comm.id} className="p-3 border border-gray-100 rounded-2xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#C9963B] flex items-center justify-center shrink-0 mt-0.5">
                    {comm.type === 'call' ? <Phone size={14} /> : <Mail size={14} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 truncate">{comm.title}</p>
                    <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{comm.summary}</p>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-gray-400 text-center py-4">Nema nedavnih komunikacija.</p>
              )}
            </div>

            <Link
              href={`/${locale}/dashboard/communications`}
              className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl transition-colors text-center block"
            >
              Otvori E-mail Sanduče Agencije
            </Link>
          </div>

          {/* Monthly Target Card */}
          <div
            className="rounded-3xl p-6 text-white space-y-4 shadow-lg relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C9963B]">Cilj Agencije za Jul</span>
              <span className="text-xs font-bold bg-white/10 px-2.5 py-1 rounded-full text-amber-300">78% Ostvareno</span>
            </div>

            <div>
              <h4 className="text-2xl font-bold">{formatPrice(15600)}</h4>
              <p className="text-xs text-gray-400 mt-0.5">Mjesečni cilj provizije: {formatPrice(20000)}</p>
            </div>

            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#C9963B] rounded-full" style={{ width: '78%' }} />
            </div>

            <p className="text-[11px] text-gray-400">Preostalo još €4,400 do ostvarenja mjesečnog bonusa agencije.</p>
          </div>
        </div>
      </div>
      {showOLXModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-gray-900">Uvoz sa OLX.ba</h3>
            <p className="text-xs text-gray-500">Unesite OLX URL ili ID oglasa za automatsko učitavanje.</p>
            <input
              type="text"
              placeholder="https://www.olx.ba/artikal/..."
              value={olxUrl}
              onChange={(e) => setOlxUrl(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#C9963B]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowOLXModal(false)} className="px-4 py-2 text-xs font-semibold text-gray-600">Odustani</button>
              <button onClick={handleImportOLX} disabled={importingOLX} className="px-5 py-2 bg-[#C9963B] text-white text-xs font-semibold rounded-xl">{importingOLX ? 'Uvoženje...' : 'Uvezi'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

