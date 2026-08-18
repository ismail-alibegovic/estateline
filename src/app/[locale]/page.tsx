import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BarChart3, Building2, CalendarDays, CheckCircle2, FileSignature, Globe2, ShieldCheck, Sparkles, TrendingUp, Users } from 'lucide-react'
import { setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n'

export const dynamic = 'force-static'
export const revalidate = 3600

type Tier = {
  name: string
  price: string
  period: string
  features: readonly string[]
  cta: string
  tier: string
  featured?: boolean
}

type Dict = {
  nav: { login: string; cta: string }
  hero: { eyebrow: string; titleA: string; titleB: string; lede: string; ctaPrimary: string; ctaSecondary: string; trust: string }
  cards: readonly { icon: typeof Building2; title: string; body: string }[]
  stats: readonly { value: string; label: string }[]
  modules: { title: string; sub: string; items: readonly { icon: typeof Building2; title: string; body: string }[] }
  pricing: { title: string; sub: string; tiers: readonly Tier[] }
  footer: { tagline: string; rights: string }
}

const dict: Record<'en' | 'bs', Dict> = {
  en: {
    nav: { login: 'Sign in', cta: 'Start free trial' },
    hero: {
      eyebrow: 'Premium Balkan Real Estate Platform',
      titleA: 'Where Luxury Real Estate Meets',
      titleB: 'Peak Performance',
      lede: 'Manage agency listings, client leads, OLX syndication, viewings, reports, and automated contracts in one unified CRM workspace.',
      ctaPrimary: 'Start free trial',
      ctaSecondary: 'Sign in',
      trust: 'Built for agencies that need listings, clients, documents, and portal feeds under control.',
    },
    cards: [
      { icon: Building2, title: 'Multi-Tenant CRM', body: 'Isolated secure agency workspaces' },
      { icon: TrendingUp, title: 'OLX & Portal Sync', body: 'Automated listing import and syndication' },
    ],
    stats: [
      { value: '48', label: 'API endpoints live' },
      { value: '12', label: 'Agency workspaces' },
      { value: '100+', label: 'Listings per Pro agency' },
      { value: 'AI', label: 'Gemini descriptions live' },
    ],
    modules: {
      title: 'A complete agency operating layer.',
      sub: 'Every daily workflow connects back to the same client, listing, and deal record.',
      items: [
        { icon: Building2, title: 'Property catalogue', body: 'Listings with photos, pricing, area data, location, ownership context, and portal-ready output.' },
        { icon: Users, title: 'Lead pipeline', body: 'Move buyers from first inquiry to qualified negotiation with clear stages and ownership.' },
        { icon: CalendarDays, title: 'Viewings calendar', body: 'Schedule showings, track activity, and keep follow-up tied to the exact property.' },
        { icon: FileSignature, title: 'Contract generator', body: 'Generate PDF agreements with proper Balkan character support and agency-ready fields.' },
        { icon: BarChart3, title: 'Reports', body: 'Follow conversion, financial forecasting, agent performance, and time-to-close.' },
        { icon: Sparkles, title: 'AI copy', body: 'Generate polished property descriptions from structured listing data through Gemini.' },
      ],
    },
    pricing: {
      title: 'Simple plans for growing agencies.',
      sub: 'Start with the workflow you need now, then expand seats, listings, and automation.',
      tiers: [
        { name: 'Starter', price: '€49', period: '/ month', features: ['Up to 25 listings', '2 agent seats', 'Basic OLX feed', 'Email support'], cta: 'Start with Starter', tier: 'starter' },
        { name: 'EstateLine Pro', price: '€99', period: '/ month', features: ['Up to 100 listings', '10 agent seats', 'Portal feeds', 'Contract generator', 'AI property copy'], featured: true, cta: 'Start with Pro', tier: 'pro' },
        { name: 'Agency', price: '€199', period: '/ month', features: ['Unlimited listings', 'Unlimited agents', 'Private API', 'White-label portal', 'Priority support'], cta: 'Talk to sales', tier: 'agency' },
      ],
    },
    footer: { tagline: 'EstateLine Real Estate Management Platform', rights: 'All rights reserved.' },
  },
  bs: {
    nav: { login: 'Prijava', cta: 'Započni besplatno' },
    hero: {
      eyebrow: 'Premium Balkan Real Estate Platform',
      titleA: 'Where Luxury Real Estate Meets',
      titleB: 'Peak Performance',
      lede: 'Upravljaj oglasima, leadovima, OLX distribucijom, obilascima, izvještajima i automatizovanim ugovorima iz jednog CRM workspace-a.',
      ctaPrimary: 'Započni besplatno',
      ctaSecondary: 'Prijavi se',
      trust: 'Za agencije kojima oglasi, klijenti, dokumenti i portali moraju biti pod kontrolom.',
    },
    cards: [
      { icon: Building2, title: 'Multi-Tenant CRM', body: 'Odvojeni sigurni workspace-i za agencije' },
      { icon: TrendingUp, title: 'OLX & Portal Sync', body: 'Automatski import i distribucija oglasa' },
    ],
    stats: [
      { value: '48', label: 'aktivnih API ruta' },
      { value: '12', label: 'agencijskih workspace-a' },
      { value: '100+', label: 'oglasa po Pro agenciji' },
      { value: 'AI', label: 'Gemini opisi aktivni' },
    ],
    modules: {
      title: 'Kompletan operativni sloj za agenciju.',
      sub: 'Svaki dnevni workflow vraća se na isti zapis klijenta, oglasa i posla.',
      items: [
        { icon: Building2, title: 'Katalog nekretnina', body: 'Oglasi sa fotografijama, cijenom, kvadraturom, lokacijom, vlasničkim kontekstom i portal outputom.' },
        { icon: Users, title: 'Lead pipeline', body: 'Vodi kupce od prvog upita do kvalifikovanih pregovora kroz jasne faze i vlasništvo.' },
        { icon: CalendarDays, title: 'Kalendar obilazaka', body: 'Zakazuj preglede, prati aktivnosti i veži follow-up za tačnu nekretninu.' },
        { icon: FileSignature, title: 'Generator ugovora', body: 'Generiši PDF ugovore sa podrškom za naša slova i poljima spremnim za agenciju.' },
        { icon: BarChart3, title: 'Izvještaji', body: 'Prati konverzije, finansijske prognoze, performanse agenata i vrijeme zatvaranja.' },
        { icon: Sparkles, title: 'AI opisi', body: 'Generiši kvalitetne opise nekretnina iz strukturisanih podataka oglasa kroz Gemini.' },
      ],
    },
    pricing: {
      title: 'Jednostavni planovi za rast agencije.',
      sub: 'Kreni s workflowom koji trebaš sada, pa proširi mjesta, oglase i automatizaciju.',
      tiers: [
        { name: 'Starter', price: '€49', period: '/ mjesec', features: ['Do 25 oglasa', '2 agentska mjesta', 'Osnovni OLX feed', 'Email podrška'], cta: 'Kreni sa Starter', tier: 'starter' },
        { name: 'EstateLine Pro', price: '€99', period: '/ mjesec', features: ['Do 100 oglasa', '10 agentskih mjesta', 'Portal feedovi', 'Generator ugovora', 'AI opisi nekretnina'], featured: true, cta: 'Kreni sa Pro', tier: 'pro' },
        { name: 'Agency', price: '€199', period: '/ mjesec', features: ['Neograničeno oglasa', 'Neograničeno agenata', 'Privatni API', 'White-label portal', 'Prioritetna podrška'], cta: 'Razgovaraj s prodajom', tier: 'agency' },
      ],
    },
    footer: { tagline: 'EstateLine Real Estate Management Platform', rights: 'Sva prava zadržana.' },
  },
}

export default async function LandingPage({ params }: { params: { locale: string } }) {
  const locale: 'en' | 'bs' = (params.locale as Locale) === 'bs' ? 'bs' : 'en'
  setRequestLocale(locale)
  const t = dict[locale]

  return (
    <main className="min-h-screen overflow-y-auto bg-[#FDFBF7] font-sans text-gray-900" style={{ fontFamily: 'var(--font-body), Outfit, sans-serif' }}>
      <section className="grid min-h-[100dvh] lg:grid-cols-2">
        <div
          className="relative flex min-h-[42rem] flex-col justify-between overflow-hidden px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:p-16"
          style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 52%, #0F172A 100%)' }}
        >
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#C9963B] opacity-20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#C9963B] opacity-15 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:72px_72px]" />

          <nav className="relative z-10 flex items-center justify-between gap-6">
            <Link href={`/${locale}`} className="flex items-center gap-4">
              <Image
                src="/logo-icon.png"
                alt="EstateLine"
                width={48}
                height={48}
                priority
                className="h-12 w-12 object-contain drop-shadow-[0_4px_16px_rgba(201,150,59,0.5)]"
              />
              <div>
                <span className="block text-2xl font-bold leading-none tracking-tight text-white" style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}>
                  EstateLine
                </span>
                <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.25em] text-[#C9963B]">
                  REAL ESTATE CRM
                </span>
              </div>
            </Link>

            <div className="hidden items-center gap-3 sm:flex lg:hidden">
              <Link href={`/${locale}/login`} className="rounded-xl px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white">
                {t.nav.login}
              </Link>
              <Link href={`/${locale}/signup`} className="rounded-xl bg-[#C9963B] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(201,150,59,0.25)] transition hover:-translate-y-0.5 hover:bg-[#b88328]">
                {t.nav.cta}
              </Link>
            </div>
          </nav>

          <div className="relative z-10 my-16 max-w-xl space-y-7 lg:my-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-amber-300 backdrop-blur-md">
              <Sparkles size={14} />
              <span>{t.hero.eyebrow}</span>
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl xl:text-6xl" style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}>
              {t.hero.titleA}{' '}
              <span className="text-[#C9963B]">{t.hero.titleB}</span>
            </h1>

            <p className="max-w-lg text-base font-light leading-relaxed text-gray-300 sm:text-lg">
              {t.hero.lede}
            </p>

            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <Link href={`/${locale}/signup`} className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #C9963B 0%, #b88328 100%)', boxShadow: '0 4px 16px rgba(201,150,59,0.25)' }}>
                {t.hero.ctaPrimary}
                <ArrowRight size={16} />
              </Link>
              <Link href={`/${locale}/login`} className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white/85 backdrop-blur-md transition hover:bg-white/10 hover:text-white">
                {t.hero.ctaSecondary}
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
              {t.cards.map((card) => (
                <div key={card.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                  <card.icon size={20} className="text-[#C9963B]" />
                  <p className="mt-3 text-sm font-bold text-white">{card.title}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-400">{card.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
            <span>{t.hero.trust}</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <ShieldCheck size={14} className="text-emerald-400" />
              Supabase secured
            </span>
          </div>
        </div>

        <div className="relative flex min-h-screen flex-col bg-[#FDFBF7] px-6 py-8 sm:px-10 lg:p-16">
          <div className="flex items-center justify-end gap-3">
            <Link href={`/${locale}/login`} className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 sm:inline-flex">
              {t.nav.login}
            </Link>
            <Link href={`/${locale}/signup`} className="rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #C9963B 0%, #b88328 100%)', boxShadow: '0 4px 16px rgba(201,150,59,0.25)' }}>
              {t.nav.cta}
            </Link>
          </div>

          <div className="my-auto w-full max-w-xl self-center py-12">
            <p className="page-eyebrow mb-2">WORKSPACE PREVIEW</p>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl" style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}>
              One control room for listings, leads, and documents.
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              The public page should feel like the same product as the login screen: calm, premium, structured, and operational.
            </p>

            <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <Image src="/logo-icon.png" alt="EstateLine" width={36} height={36} className="h-9 w-9 object-contain drop-shadow-[0_2px_8px_rgba(201,150,59,0.3)]" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">EstateLine Workspace</p>
                    <p className="text-xs text-gray-400">Test Estate · Sarajevo</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">Live</span>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-2xl bg-[#F5F1EB] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Pipeline</p>
                  {['New lead', 'Qualified', 'Viewing', 'Negotiation'].map((stage, index) => (
                    <div key={stage} className="mt-3 rounded-xl bg-white px-3 py-3 shadow-sm">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-700">{stage}</span>
                        <span className="font-mono text-gray-400">0{index + 3}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-[#C9963B]" style={{ width: `${38 + index * 13}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {t.stats.map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}>{stat.value}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-[#C9963B]/25 bg-[#C9963B]/10 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Globe2 size={16} className="text-[#C9963B]" />
                      OLX feed connected
                    </div>
                    <p className="mt-2 text-xs leading-5 text-gray-500">Listings stay ready for agency websites and portal syndication.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-gray-400">
            {t.footer.tagline}
          </div>
        </div>
      </section>

      <section className="bg-[#FAF8F5] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <p className="page-eyebrow mb-2">AGENCY OPERATIONS</p>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl" style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}>
              {t.modules.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-500">{t.modules.sub}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {t.modules.items.map((item) => (
              <article key={item.title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5F1EB] text-[#C9963B]">
                  <item.icon size={20} strokeWidth={1.9} />
                </div>
                <h3 className="text-base font-bold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F5F1EB] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="page-eyebrow mb-2">PRICING</p>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl" style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}>
              {t.pricing.title}
            </h2>
            <p className="mt-3 text-sm text-gray-500">{t.pricing.sub}</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {t.pricing.tiers.map((tier) => (
              <article key={tier.name} className={`relative flex min-h-[27rem] flex-col rounded-3xl p-7 ${tier.featured ? 'bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A] text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]' : 'border border-gray-200 bg-white text-gray-900 shadow-sm'}`}>
                {tier.featured && (
                  <span className="absolute right-6 top-6 rounded-full bg-[#C9963B] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    Pro
                  </span>
                )}
                <h3 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}>{tier.name}</h3>
                <div className="mt-5 flex items-end gap-2">
                  <span className="text-5xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}>{tier.price}</span>
                  <span className={`pb-2 text-sm ${tier.featured ? 'text-white/55' : 'text-gray-500'}`}>{tier.period}</span>
                </div>
                <ul className="mt-8 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#C9963B]" />
                      <span className={tier.featured ? 'text-white/82' : 'text-gray-600'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href={`/${locale}/signup`} className={`mt-auto inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${tier.featured ? 'bg-[#C9963B] text-white hover:bg-[#b88328]' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
                  {tier.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#0F172A] px-6 py-8 text-white sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 border-t border-white/10 pt-6 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-icon.png" alt="EstateLine" width={32} height={32} className="h-8 w-8 object-contain" />
            <span>© {new Date().getFullYear()} EstateLine CRM</span>
          </div>
          <span>{t.footer.rights}</span>
        </div>
      </footer>
    </main>
  )
}
