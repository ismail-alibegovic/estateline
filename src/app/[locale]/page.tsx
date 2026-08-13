import Link from 'next/link'
import { Building2, Users, TrendingUp, Sparkles, MapPin, ShieldCheck, BarChart3, Zap, ArrowRight, CheckCircle2 } from 'lucide-react'
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
    nav: { login: 'Sign In', cta: 'Start Free Trial' },
    hero: {
      eyebrow: 'Real Estate CRM · Balkans',
      title: 'The CRM built for the Balkan real estate market.',
      lede: 'Manage every property, lead, deal, viewing, and invoice in one elegant workspace — with built-in portal syncs, AI matchmaking, contract generation, and WhatsApp automation.',
      ctaPrimary: 'Try EstateLine free',
      ctaSecondary: 'Sign in',
      trust: 'Trusted by agencies in Sarajevo, Banja Luka, Belgrade, and Zagreb.',
    },
    stats: [
      { value: '48', label: 'API endpoints live' },
      { value: '3', label: 'Languages (BS / HR / SR / EN)' },
      { value: '100+', label: 'Listings supported per agency' },
      { value: '99.9%', label: 'Service uptime' },
    ],
    modules: {
      title: 'Everything an agency needs.',
      sub: 'One platform. From first contact to signed contract.',
      items: [
        { icon: Building2, title: 'Property Catalogue', body: 'Listings with photos, valuation, geolocation on Leaflet maps, and OLX/Njuskalo/Realitica feed sync.' },
        { icon: Users, title: 'Lead Pipeline', body: 'Drag-and-drop kanban from new lead to closed deal. Status pills, contact history, and smart assignment.' },
        { icon: TrendingUp, title: 'Deals & Valuation', body: 'Track offer → negotiation → close. Automatic valuation using comparable sales in your city.' },
        { icon: MapPin, title: 'Viewings & Calendar', body: 'Book showings, sync reminders via SMS, and never lose track of who saw which property when.' },
        { icon: BarChart3, title: 'Reports & Forecasting', body: 'Financial forecasting, sales velocity, agent performance — generated as PDF on demand.' },
        { icon: Sparkles, title: 'AI Matchmaking', body: 'Match incoming leads to the right property using Gemini embeddings on listing descriptions.' },
        { icon: ShieldCheck, title: 'Contract Generator', body: 'One-click PDF purchase/sale agreements pre-filled from the listing and buyer data.' },
        { icon: Zap, title: 'WhatsApp & Comms', body: 'Inbound WhatsApp webhook, automated instant replies, and a unified communications log.' },
      ],
    },
    pricing: {
      title: 'Simple pricing for every agency.',
      sub: 'No setup fees. Cancel anytime.',
      tiers: [
        { name: 'Starter', price: '€49', period: '/ month', features: ['Up to 25 listings', '2 agent seats', 'Basic portal sync (OLX)', 'Email support'], cta: 'Start with Starter', tier: 'starter' },
        { name: 'EstateLine Pro', price: '€99', period: '/ month', features: ['Up to 100 listings', '10 agent seats', 'All portal syncs', 'Contract generator', 'AI matchmaking'], featured: true, cta: 'Start with Pro', tier: 'pro' },
        { name: 'Enterprise', price: '€199', period: '/ month', features: ['Unlimited listings', 'Unlimited agents', 'Private API & white-label', '24/7 priority support', 'Custom integrations'], cta: 'Talk to sales', tier: 'agency' },
      ],
    },
    footer: { tagline: 'Built for the Balkan real estate market.', rights: 'All rights reserved.' },
  },
  bs: {
    nav: { login: 'Prijava', cta: 'Započni Besplatno' },
    hero: {
      eyebrow: 'Nekretninski CRM · Balkan',
      title: 'CRM izgrađen za balkansko tržište nekretnina.',
      lede: 'Upravljaj svakom nekretninom, leadom, poslom, obilaskom i fakturom u jednom elegantnom radnom prostoru — sa ugrađenom sinhronizacijom portala, AI matchmakingom, generatorom ugovora i WhatsApp automatizacijom.',
      ctaPrimary: 'Isprobaj EstateLine besplatno',
      ctaSecondary: 'Prijavi se',
      trust: 'Vjeruju agencije u Sarajevu, Banjoj Luci, Beogradu i Zagrebu.',
    },
    stats: [
      { value: '48', label: 'aktivnih API ruta' },
      { value: '3', label: 'jezika (BS / HR / SR / EN)' },
      { value: '100+', label: 'oglasa po agenciji' },
      { value: '99.9%', label: 'uptime servisa' },
    ],
    modules: {
      title: 'Sve što agencija treba.',
      sub: 'Jedna platforma. Od prvog kontakta do potpisanog ugovora.',
      items: [
        { icon: Building2, title: 'Katalog Nekretnina', body: 'Oglasi sa fotografijama, procjenom, geolokacijom na Leaflet mapama i sinhronizacijom sa OLX/Njuskalo/Realitica.' },
        { icon: Users, title: 'Lead Pipeline', body: 'Drag-and-drop kanban od novog lead-a do zaključenog posla. Status pilule, historija kontakata i pametna dodjela.' },
        { icon: TrendingUp, title: 'Poslovi & Procjena', body: 'Prati ponuda → pregovori → zaključenje. Automatska procjena na osnovu usporedivih prodaja u tvom gradu.' },
        { icon: MapPin, title: 'Obilasci & Kalendar', body: 'Zakazi obilaske, sinhronizuj podsetnike putem SMS-a i nikad ne izgubi ko je pregledao koju nekretninu i kada.' },
        { icon: BarChart3, title: 'Izvještaji & Prognoze', body: 'Finansijske prognoze, brzina prodaje, performanse agenata — generisano kao PDF na zahtjev.' },
        { icon: Sparkles, title: 'AI Matchmaking', body: 'Spoji dolazeće leadove sa pravom nekretninom koristeći Gemini embeddinge nad opisima oglasa.' },
        { icon: ShieldCheck, title: 'Generator Ugovora', body: 'Jednim klikom PDF ugovori o kupoprodaji, prethodno popunjeni iz oglasa i podataka kupca.' },
        { icon: Zap, title: 'WhatsApp & Komunikacije', body: 'Dolazni WhatsApp webhook, automatski odgovori i jedinstveni log komunikacija.' },
      ],
    },
    pricing: {
      title: 'Jednostavne cijene za svaku agenciju.',
      sub: 'Bez setup troškova. Otkazivanje u bilo kojem trenutku.',
      tiers: [
        { name: 'Starter', price: '€49', period: '/ mjesec', features: ['Do 25 oglasa', '2 agentska mjesta', 'Osnovna sinh. sa portalima (OLX)', 'Email podrška'], cta: 'Kreni sa Starter', tier: 'starter' },
        { name: 'EstateLine Pro', price: '€99', period: '/ mjesec', features: ['Do 100 oglasa', '10 agentskih mjesta', 'Sve sinh. sa portalima', 'Generator ugovora', 'AI matchmaking'], featured: true, cta: 'Kreni sa Pro', tier: 'pro' },
        { name: 'Enterprise', price: '€199', period: '/ mjesec', features: ['Neograničeno oglasa', 'Neograničeno agenata', 'Privatni API & white-label', '24/7 prioritetna podrška', 'Custom integracije'], cta: 'Razgovaraj sa prodajom', tier: 'agency' },
      ],
    },
    footer: { tagline: 'Izgrađeno za balkansko tržište nekretnina.', rights: 'Sva prava zadržana.' },
  },
}

export default async function LandingPage({ params }: { params: { locale: string } }) {
  const locale: 'en' | 'bs' = (params.locale as Locale) === 'bs' ? 'bs' : 'en'
  setRequestLocale(locale)
  const t = dict[locale]

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[hsl(220_18%_12%)] font-body" style={{ fontFamily: 'var(--font-body), Outfit, sans-serif' }}>
      {/* ════════ NAV ════════ */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#FDFBF7]/80 border-b border-[hsl(38_16%_90%)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1c2434] to-[#0d1117] flex items-center justify-center shadow-sm">
              <Building2 className="w-4 h-4 text-[#C9963B]" strokeWidth={2.2} />
            </div>
            <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display), serif' }}>Estateline</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href={`/${locale}/login`} className="text-sm font-medium text-[hsl(220_18%_30%)] hover:text-[#C9963B] transition-colors px-3 py-2">
              {t.nav.login}
            </Link>
            <Link href={`/${locale}/signup`} className="text-sm font-semibold text-white bg-[#1c2434] hover:bg-[#0d1117] px-4 py-2 rounded-lg shadow-sm transition-all">
              {t.nav.cta}
            </Link>
          </div>
        </div>
      </nav>

      {/* ════════ HERO ════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1c2434] via-[#0d1117] to-[#1c2434]" />
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 25% 30%, #C9963B 0, transparent 35%), radial-gradient(circle at 80% 70%, #C9963B 0, transparent 40%)' }} />
        <div className="relative max-w-6xl mx-auto px-6 py-24 sm:py-32 text-center text-white">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 mb-7">
            <Sparkles className="w-3 h-3 text-[#C9963B]" strokeWidth={2.4} />
            <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#C9963B]">{t.hero.eyebrow}</span>
          </div>
          <h1 className="text-[clamp(2.4rem,5vw,4rem)] font-semibold tracking-[-0.028em] leading-[1.05] max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", serif' }}>
            {t.hero.title}
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-white/70 font-light max-w-2xl mx-auto leading-relaxed">{t.hero.lede}</p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={`/${locale}/signup`} className="group inline-flex items-center gap-2 bg-[#C9963B] hover:bg-[#d4a548] text-white font-semibold text-sm px-6 py-3.5 rounded-xl shadow-[0_8px_24px_rgba(201,150,59,0.35)] transition-all">
              {t.hero.ctaPrimary}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} />
            </Link>
            <Link href={`/${locale}/login`} className="inline-flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 text-white font-medium text-sm px-6 py-3.5 rounded-xl transition-all">
              {t.hero.ctaSecondary}
            </Link>
          </div>
          <p className="mt-8 text-xs text-white/45 tracking-wide">{t.hero.trust}</p>
        </div>
      </section>

      {/* ════════ STATS ════════ */}
      <section className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-6">
        {t.stats.map((s, i) => (
          <div key={i} className="text-center md:text-left">
            <div className="text-3xl font-semibold text-[#1c2434]" style={{ fontFamily: 'var(--font-display), serif' }}>{s.value}</div>
            <div className="mt-1 text-xs font-medium text-[hsl(220_10%_45%)] tracking-wide uppercase">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ════════ MODULES ════════ */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="page-eyebrow mb-2">{t.hero.eyebrow.split('·')[0].trim()}</p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.024em]" style={{ fontFamily: 'var(--font-display), serif' }}>{t.modules.title}</h2>
          <p className="mt-3 text-base text-[hsl(220_10%_45%)]">{t.modules.sub}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {t.modules.items.map((m, i) => (
            <div key={i} className="bg-white border border-[hsl(38_16%_90%)] rounded-2xl p-6 hover:shadow-lg hover:border-[#C9963B]/40 transition-all duration-300 group">
              <div className="w-11 h-11 rounded-xl bg-[#FDFBF7] border border-[hsl(38_16%_88%)] flex items-center justify-center mb-4 group-hover:border-[#C9963B] transition-colors">
                <m.icon className="w-5 h-5 text-[#C9963B]" strokeWidth={1.8} />
              </div>
              <h3 className="font-semibold text-base tracking-tight" style={{ fontFamily: 'var(--font-display), serif' }}>{m.title}</h3>
              <p className="mt-2 text-sm text-[hsl(220_10%_45%)] leading-relaxed">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════ PRICING ════════ */}
      <section className="bg-[#F5F1E8] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="page-eyebrow mb-2">{t.nav.cta}</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.024em]" style={{ fontFamily: 'var(--font-display), serif' }}>{t.pricing.title}</h2>
            <p className="mt-3 text-base text-[hsl(220_10%_45%)]">{t.pricing.sub}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {t.pricing.tiers.map((tier, i) => (
              <div key={i} className={`relative rounded-3xl p-7 ${tier.featured ? 'bg-[#1c2434] text-white shadow-2xl ring-2 ring-[#C9963B] md:-mt-3' : 'bg-white border border-[hsl(38_16%_88%)] shadow-sm'}`}>
                {tier.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#C9963B] text-white text-[10px] font-bold tracking-wider uppercase shadow-md">
                    <Sparkles className="w-3 h-3" strokeWidth={2.5} /> Pro
                  </span>
                )}
                <h3 className={`font-semibold text-xl ${tier.featured ? 'text-white' : 'text-[#1c2434]'}`} style={{ fontFamily: 'var(--font-display), serif' }}>{tier.name}</h3>
                <div className="mt-3">
                  <span className="text-4xl font-semibold" style={{ fontFamily: 'var(--font-display), serif' }}>{tier.price}</span>
                  <span className={`text-sm font-medium ${tier.featured ? 'text-white/55' : 'text-[hsl(220_10%_50%)]'}`}> {tier.period}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[#C9963B]" strokeWidth={2} />
                      <span className={tier.featured ? 'text-white/85' : 'text-[hsl(220_10%_30%)]'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href={`/${locale}/signup`} className={`mt-7 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${tier.featured ? 'bg-[#C9963B] hover:bg-[#d4a548] text-white' : 'bg-[#1c2434] hover:bg-[#0d1117] text-white'}`}>
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ CTA STRIP ════════ */}
      <section className="bg-[#1c2434] text-white">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.024em] max-w-xl mx-auto" style={{ fontFamily: 'var(--font-display), serif' }}>
            {t.hero.ctaPrimary}.
          </h2>
          <p className="mt-4 text-white/65 max-w-md mx-auto">{t.hero.lede.split(' —')[0]}.</p>
          <Link href={`/${locale}/signup`} className="mt-8 inline-flex items-center gap-2 bg-[#C9963B] hover:bg-[#d4a548] text-white font-semibold text-sm px-6 py-3.5 rounded-xl shadow-[0_8px_24px_rgba(201,150,59,0.4)] transition-all">
            {t.nav.cta}
            <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
          </Link>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="bg-[#0d1117] text-white/55">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/[0.07] flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-[#C9963B]" strokeWidth={2.2} />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight" style={{ fontFamily: 'var(--font-display), serif' }}>Estateline</span>
            <span className="text-xs text-white/40 ml-2">{t.footer.tagline}</span>
          </div>
          <p className="text-xs text-white/40">© {new Date().getFullYear()} EstateLine. {t.footer.rights}</p>
        </div>
      </footer>
    </main>
  )
}
