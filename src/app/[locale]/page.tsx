import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BarChart3, Building2, CheckCircle2, FileSignature, MapPin, MessageSquareText, ShieldCheck, Sparkles, TrendingUp, Users, Zap } from 'lucide-react'
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
  hero: { eyebrow: string; title: string; lede: string; ctaPrimary: string; ctaSecondary: string; trust: string }
  stats: readonly { value: string; label: string }[]
  modules: { title: string; sub: string; items: readonly { icon: typeof Building2; title: string; body: string }[] }
  pricing: { title: string; sub: string; tiers: readonly Tier[] }
  footer: { tagline: string; rights: string }
}

const dict: Record<'en' | 'bs', Dict> = {
  en: {
    nav: { login: 'Sign in', cta: 'Start trial' },
    hero: {
      eyebrow: 'Real estate CRM for Balkan agencies',
      title: 'Run listings, leads, viewings and contracts from one real estate command center.',
      lede: 'Estateline connects listings, leads, viewings, documents, portal feeds, and AI property writing in one controlled workspace built around how agencies in the region actually work.',
      ctaPrimary: 'Open your workspace',
      ctaSecondary: 'See the platform',
      trust: 'Built for agencies managing OLX feeds, client follow-up, viewings, contracts, and team handoffs.',
    },
    stats: [
      { value: '48', label: 'production API routes' },
      { value: '12', label: 'agency workspaces in DB' },
      { value: '100+', label: 'listings per agency tier' },
      { value: 'AI', label: 'Gemini property copy live' },
    ],
    modules: {
      title: 'The work stays in one line.',
      sub: 'From captured lead to signed paperwork, every step is traceable.',
      items: [
        { icon: Building2, title: 'Listing control', body: 'Properties with photos, pricing, area data, locations, ownership details, and public feed output.' },
        { icon: Users, title: 'Lead pipeline', body: 'A clear sales board for new leads, qualified buyers, negotiations, and closed deals.' },
        { icon: MapPin, title: 'Viewings', body: 'Schedule property visits, track attendance, and keep context attached to the exact listing.' },
        { icon: FileSignature, title: 'Contracts', body: 'Generate branded PDF documents with Balkan character support and agency-ready fields.' },
        { icon: BarChart3, title: 'Reports', body: 'Pipeline, lead conversion, financial forecasting, and agent performance without spreadsheets.' },
        { icon: Sparkles, title: 'AI descriptions', body: 'Gemini writes property copy from structured listing data, with fallback logic if the API is unavailable.' },
        { icon: ShieldCheck, title: 'Access control', body: 'Supabase-backed auth, memberships, organization context, and protected dashboard routes.' },
        { icon: MessageSquareText, title: 'Communication', body: 'Email, WhatsApp, SMS, and client portal workflows are prepared for real production keys.' },
      ],
    },
    pricing: {
      title: 'Pricing that matches agency size.',
      sub: 'Start lean, then expand seats, listings, and automation when operations need it.',
      tiers: [
        { name: 'Starter', price: '€49', period: '/ month', features: ['Up to 25 listings', '2 agent seats', 'Basic OLX feed', 'Email support'], cta: 'Start Starter', tier: 'starter' },
        { name: 'EstateLine Pro', price: '€99', period: '/ month', features: ['Up to 100 listings', '10 agent seats', 'Portal feeds', 'Contract generator', 'AI property copy'], featured: true, cta: 'Start Pro', tier: 'pro' },
        { name: 'Agency', price: '€199', period: '/ month', features: ['Unlimited listings', 'Unlimited agents', 'Private API', 'White-label portal', 'Priority support'], cta: 'Talk to sales', tier: 'agency' },
      ],
    },
    footer: { tagline: 'Real estate CRM for Balkan agencies.', rights: 'All rights reserved.' },
  },
  bs: {
    nav: { login: 'Prijava', cta: 'Započni probu' },
    hero: {
      eyebrow: 'Nekretninski CRM za balkanske agencije',
      title: 'Vodi oglase, leadove, obilaske i ugovore iz jednog centra za nekretnine.',
      lede: 'Estateline povezuje oglase, leadove, obilaske, dokumente, portal feedove i AI opise nekretnina u jedan kontrolisan radni prostor napravljen za stvarni rad agencija u regiji.',
      ctaPrimary: 'Otvori workspace',
      ctaSecondary: 'Pogledaj platformu',
      trust: 'Za agencije koje vode OLX feedove, klijente, obilaske, ugovore i timske handoffe.',
    },
    stats: [
      { value: '48', label: 'produkcijskih API ruta' },
      { value: '12', label: 'agencijskih workspace-a u bazi' },
      { value: '100+', label: 'oglasa po Pro agenciji' },
      { value: 'AI', label: 'Gemini opisi aktivni' },
    ],
    modules: {
      title: 'Posao ostaje u jednoj liniji.',
      sub: 'Od prvog leada do potpisanih papira, svaki korak ima trag.',
      items: [
        { icon: Building2, title: 'Kontrola oglasa', body: 'Nekretnine sa fotografijama, cijenom, kvadraturom, lokacijom, vlasničkim podacima i public feed outputom.' },
        { icon: Users, title: 'Lead pipeline', body: 'Jasna prodajna tabla za nove leadove, kvalifikovane kupce, pregovore i zatvorene poslove.' },
        { icon: MapPin, title: 'Obilasci', body: 'Zakazivanje pregleda, evidencija prisustva i kontekst vezan za tačnu nekretninu.' },
        { icon: FileSignature, title: 'Ugovori', body: 'Brendirani PDF dokumenti sa podrškom za naša slova i poljima spremnim za agenciju.' },
        { icon: BarChart3, title: 'Izvještaji', body: 'Pipeline, konverzija leadova, finansijska prognoza i performanse agenata bez Excela.' },
        { icon: Sparkles, title: 'AI opisi', body: 'Gemini piše opise iz strukturisanih podataka oglasa, sa fallback logikom ako API nije dostupan.' },
        { icon: ShieldCheck, title: 'Kontrola pristupa', body: 'Supabase auth, članstva, organizacijski kontekst i zaštićene dashboard rute.' },
        { icon: MessageSquareText, title: 'Komunikacija', body: 'Email, WhatsApp, SMS i client portal tokovi su spremni za produkcijske ključeve.' },
      ],
    },
    pricing: {
      title: 'Cijene prema veličini agencije.',
      sub: 'Kreni jednostavno, pa proširi mjesta, oglase i automatizaciju kad operacije porastu.',
      tiers: [
        { name: 'Starter', price: '€49', period: '/ mjesec', features: ['Do 25 oglasa', '2 agentska mjesta', 'Osnovni OLX feed', 'Email podrška'], cta: 'Kreni Starter', tier: 'starter' },
        { name: 'EstateLine Pro', price: '€99', period: '/ mjesec', features: ['Do 100 oglasa', '10 agentskih mjesta', 'Portal feedovi', 'Generator ugovora', 'AI opisi nekretnina'], featured: true, cta: 'Kreni Pro', tier: 'pro' },
        { name: 'Agency', price: '€199', period: '/ mjesec', features: ['Neograničeno oglasa', 'Neograničeno agenata', 'Privatni API', 'White-label portal', 'Prioritetna podrška'], cta: 'Razgovaraj s prodajom', tier: 'agency' },
      ],
    },
    footer: { tagline: 'Nekretninski CRM za balkanske agencije.', rights: 'Sva prava zadržana.' },
  },
}

const productRows = [
  { label: 'RAWAN_DOO / OLX feed', value: 'active', tone: 'text-emerald-300' },
  { label: 'Test Estate workspace', value: '12 orgs', tone: 'text-[#d6b15f]' },
  { label: 'Contract PDF engine', value: 'unicode ready', tone: 'text-sky-200' },
]

export default async function LandingPage({ params }: { params: { locale: string } }) {
  const locale: 'en' | 'bs' = (params.locale as Locale) === 'bs' ? 'bs' : 'en'
  setRequestLocale(locale)
  const t = dict[locale]

  return (
    <main className="min-h-screen bg-[#080806] text-[#f7f0dc] antialiased" style={{ fontFamily: 'var(--font-body), Outfit, sans-serif' }}>
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.16] [background-image:radial-gradient(circle_at_20%_10%,#d9b85c_0,transparent_24rem),radial-gradient(circle_at_90%_20%,#594016_0,transparent_28rem),linear-gradient(115deg,transparent_0,rgba(255,255,255,0.08)_45%,transparent_62%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:64px_64px]" />

      <nav className="sticky top-0 z-50 border-b border-[#d6b15f]/15 bg-[#080806]/82 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href={`/${locale}`} className="flex items-center gap-3">
            <Image src="/estateline-mark-clean.png" alt="EstateLine Real Estate CRM" width={128} height={80} priority className="h-12 w-20 object-contain object-left sm:h-14 sm:w-24" />
            <div className="hidden sm:block">
              <p className="text-[1.1rem] font-black leading-none tracking-[-0.04em] text-[#f6e8b8]">EstateLine</p>
              <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.32em] text-[#d6b15f]/72">Real Estate CRM</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href={`/${locale}/login`} className="rounded-full px-4 py-2 text-sm font-medium text-[#f7f0dc]/72 transition hover:bg-white/[0.06] hover:text-[#f7f0dc]">
              {t.nav.login}
            </Link>
            <Link href={`/${locale}/signup`} className="rounded-full bg-[#d6b15f] px-5 py-2.5 text-sm font-semibold text-[#090806] shadow-[0_18px_50px_rgba(214,177,95,.25)] transition hover:-translate-y-0.5 hover:bg-[#f0ce78] active:translate-y-0">
              {t.nav.cta}
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative z-10 overflow-hidden border-b border-[#d6b15f]/10">
        <div className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:py-24">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-2 border border-[#d6b15f]/25 bg-[#d6b15f]/10 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#e4c774]">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
              {t.hero.eyebrow}
            </div>
            <h1 className="text-balance text-[clamp(2.9rem,6.2vw,6.2rem)] font-black leading-[0.92] tracking-[-0.07em] text-[#f8f0d7]">
              {t.hero.title}
            </h1>
            <p className="mt-8 max-w-2xl text-pretty text-lg leading-8 text-[#d8cfb6]/72 sm:text-xl">
              {t.hero.lede}
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href={`/${locale}/signup`} className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#d6b15f] px-7 py-4 text-sm font-bold text-[#090806] shadow-[0_22px_70px_rgba(214,177,95,.28)] transition hover:-translate-y-0.5 hover:bg-[#f0ce78] active:translate-y-0">
                {t.hero.ctaPrimary}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" strokeWidth={2.4} />
              </Link>
              <Link href={`/${locale}/login`} className="inline-flex items-center justify-center rounded-full border border-[#d6b15f]/22 bg-white/[0.04] px-7 py-4 text-sm font-semibold text-[#f7f0dc] transition hover:border-[#d6b15f]/45 hover:bg-white/[0.08]">
                {t.hero.ctaSecondary}
              </Link>
            </div>
            <p className="mt-8 max-w-xl text-sm leading-6 text-[#d8cfb6]/45">{t.hero.trust}</p>
          </div>

          <div className="relative lg:pl-4">
            <div className="absolute -left-12 top-10 h-56 w-56 rounded-full bg-[#d6b15f]/15 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-[#d6b15f]/20 bg-[#10100d]/88 p-3 shadow-[0_40px_120px_rgba(0,0,0,.55)]">
              <div className="rounded-[1.4rem] border border-white/8 bg-[#0c0c0a] p-4">
                <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-4">
                  <div className="flex items-center gap-3">
                    <Image src="/estateline-mark-clean.png" alt="EstateLine icon" width={54} height={34} className="h-8 w-12 object-contain" />
                    <div>
                      <p className="text-sm font-semibold text-[#f6e8b8]">EstateLine Command</p>
                      <p className="text-xs text-[#d8cfb6]/45">live agency workspace</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">Live</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_.78fr]">
                  <div className="rounded-2xl border border-white/8 bg-[#15140f] p-4">
                    <div className="mb-5 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d6b15f]">Pipeline</p>
                      <TrendingUp className="h-4 w-4 text-[#d6b15f]" />
                    </div>
                    {['New lead', 'Qualified', 'Viewing', 'Negotiation'].map((item, index) => (
                      <div key={item} className="mb-3 rounded-xl border border-white/8 bg-black/24 p-3 last:mb-0">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-[#f7f0dc]/88">{item}</span>
                          <span className="font-mono text-xs text-[#d8cfb6]/45">0{index + 3}</span>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                          <div className="h-full rounded-full bg-[#d6b15f]" style={{ width: `${34 + index * 14}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-2xl border border-[#d6b15f]/18 bg-[#d6b15f]/10 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d6b15f]">Today</p>
                      <p className="mt-5 text-4xl font-black tracking-[-0.06em] text-[#f8f0d7]">9</p>
                      <p className="mt-1 text-sm text-[#d8cfb6]/55">active listings</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-[#15140f] p-4">
                      <Zap className="mb-8 h-5 w-5 text-[#d6b15f]" />
                      <p className="text-sm font-semibold text-[#f7f0dc]">AI description ready</p>
                      <p className="mt-1 text-xs leading-5 text-[#d8cfb6]/48">Generated through Gemini, with safe fallback.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-3">
                  {productRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.035] px-4 py-3">
                      <span className="text-sm text-[#d8cfb6]/65">{row.label}</span>
                      <span className={`text-xs font-bold uppercase tracking-[0.18em] ${row.tone}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-b border-[#d6b15f]/10 bg-[#0b0a08]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-[#d6b15f]/10 px-5 py-px sm:px-8 md:grid-cols-4">
          {t.stats.map((stat) => (
            <div key={stat.label} className="bg-[#0b0a08] px-4 py-8 sm:px-6">
              <div className="text-4xl font-black tracking-[-0.06em] text-[#f6e8b8]">{stat.value}</div>
              <div className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-[#d8cfb6]/45">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="mb-12 grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d6b15f]">Platform modules</p>
            <h2 className="mt-4 text-balance text-4xl font-black uppercase leading-[0.95] tracking-[-0.055em] text-[#f8f0d7] sm:text-6xl">{t.modules.title}</h2>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-[#d8cfb6]/62 lg:justify-self-end">{t.modules.sub}</p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-[2rem] border border-[#d6b15f]/12 bg-[#d6b15f]/12 sm:grid-cols-2 lg:grid-cols-4">
          {t.modules.items.map((item) => (
            <article key={item.title} className="group min-h-60 bg-[#10100d] p-6 transition hover:bg-[#17150f]">
              <div className="mb-10 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d6b15f]/18 bg-[#d6b15f]/10 text-[#d6b15f] transition group-hover:scale-105 group-hover:border-[#d6b15f]/45">
                <item.icon className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <h3 className="text-lg font-bold tracking-[-0.03em] text-[#f8f0d7]">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#d8cfb6]/52">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 border-y border-[#d6b15f]/10 bg-[#e8dcc0] text-[#11100d]">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#9c7426]">Agency plans</p>
            <h2 className="mt-4 text-balance text-4xl font-black uppercase leading-[0.95] tracking-[-0.055em] sm:text-6xl">{t.pricing.title}</h2>
            <p className="mt-5 text-lg leading-8 text-[#4d4636]">{t.pricing.sub}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {t.pricing.tiers.map((tier) => (
              <article key={tier.name} className={`relative flex min-h-[30rem] flex-col rounded-[1.75rem] p-7 ${tier.featured ? 'bg-[#0b0a08] text-[#f7f0dc] shadow-[0_32px_90px_rgba(0,0,0,.35)]' : 'border border-[#d7c9a6] bg-[#fff8e8]'}`}>
                {tier.featured && <span className="absolute right-6 top-6 rounded-full bg-[#d6b15f] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#090806]">Pro</span>}
                <h3 className="text-2xl font-black tracking-[-0.04em]">{tier.name}</h3>
                <div className="mt-7 flex items-end gap-2">
                  <span className="text-6xl font-black tracking-[-0.07em]">{tier.price}</span>
                  <span className={`pb-2 text-sm font-semibold ${tier.featured ? 'text-[#d8cfb6]/55' : 'text-[#665c45]'}`}>{tier.period}</span>
                </div>
                <ul className="mt-9 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-6">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#b98d31]" strokeWidth={2.2} />
                      <span className={tier.featured ? 'text-[#f7f0dc]/76' : 'text-[#342f23]'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href={`/${locale}/signup`} className={`mt-auto inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition hover:-translate-y-0.5 active:translate-y-0 ${tier.featured ? 'bg-[#d6b15f] text-[#090806] hover:bg-[#f0ce78]' : 'bg-[#11100d] text-[#f7f0dc] hover:bg-[#2a2418]'}`}>
                  {tier.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="overflow-hidden rounded-[2.25rem] border border-[#d6b15f]/18 bg-[#10100d] p-8 sm:p-12 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-12">
          <div>
            <Image src="/estateline-mark-clean.png" alt="EstateLine Real Estate CRM" width={220} height={138} className="mb-8 h-auto w-32 object-contain sm:w-40" />
            <h2 className="max-w-3xl text-balance text-4xl font-black uppercase leading-[0.95] tracking-[-0.055em] text-[#f8f0d7] sm:text-6xl">{t.hero.ctaPrimary}</h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#d8cfb6]/62">{t.hero.trust}</p>
          </div>
          <Link href={`/${locale}/signup`} className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#d6b15f] px-7 py-4 text-sm font-black text-[#090806] transition hover:-translate-y-0.5 hover:bg-[#f0ce78] lg:mt-0">
            {t.nav.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[#d6b15f]/10 bg-[#050504]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-9 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-4">
            <Image src="/estateline-mark-clean.png" alt="EstateLine" width={58} height={36} className="h-8 w-12 object-contain" />
            <div>
              <p className="text-sm font-bold tracking-[-0.02em] text-[#f6e8b8]">EstateLine</p>
              <p className="text-xs text-[#d8cfb6]/42">{t.footer.tagline}</p>
            </div>
          </div>
          <p className="text-xs text-[#d8cfb6]/38">© {new Date().getFullYear()} EstateLine. {t.footer.rights}</p>
        </div>
      </footer>
    </main>
  )
}
