import { createServerClient } from '@supabase/ssr'
import { notFound } from 'next/navigation'
import type { Database } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Property = {
  id: string
  title: string
  description: string | null
  slug: string
  price: number
  currency: string
  price_period: string | null
  city: string
  address: string | null
  area_size: number | null
  bedrooms: number | null
  bathrooms: number | null
  year_built: number | null
  cover_image_url: string | null
  images: unknown
  type: string
  featured: boolean
}

type Org = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  locale_default: string
  currency_default: string
}

const theme = {
  bg: '#faf6f0',
  card: '#ffffff',
  fg: '#2b2420',
  muted: '#8a7f76',
  accent: '#b45309',
  border: '#e8dfb5',
}

function fmt(n: number, cur = 'BAM', locale = 'en') {
  const label = { BAM: 'KM', EUR: '€', USD: '$', HRK: 'kn' }[cur] ?? cur
  try {
    return `${new Intl.NumberFormat(locale === 'bs' ? 'bs-BA' : 'en-US', { maximumFractionDigits: 0 }).format(n)} ${label}`
  } catch {
    return `${n.toLocaleString()} ${label}`
  }
}

export default async function OrgMicrosite({ params }: { params: { subdomain: string } }) {
  const slug = params.subdomain

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { get: () => '', set: () => {}, remove: () => {} } }
  )

  const { data: orgRaw, error: orgErr } = await supabase
    .rpc('get_public_org_by_slug', { p_slug: slug })

  const org = orgRaw as any[]

  if (orgErr || !org || org.length === 0) notFound()
  const org_ = org[0] as Org

  const { data: propertiesRaw, error: propErr } = await supabase
    .rpc('get_public_properties', { p_org_id: org_.id })

  if (propErr) {
    console.error('RPC error:', propErr)
  }

  const listings = (propertiesRaw ?? []) as Property[]

  return (
    <main
      style={{
        '--ms-bg': theme.bg,
        '--ms-card': theme.card,
        '--ms-fg': theme.fg,
        '--ms-muted': theme.muted,
        '--ms-accent': theme.accent,
        '--ms-border': theme.border,
      } as React.CSSProperties}
      className="min-h-screen bg-[var(--ms-bg)] text-[var(--ms-fg)]"
    >
      {/* Masthead */}
      <header className="border-b" style={{ borderColor: theme.border }}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center gap-4">
            {org_.logo_url && (
              <img src={org_.logo_url} alt={`${org_.name} logo`} className="h-12 w-12 rounded-full object-cover" />
            )}
            <div>
              <p className="text-[0.7rem] uppercase tracking-[0.22em] text-[var(--ms-muted)] font-sans">Aktuelne nekretnine · Listings</p>
              <h1 className="font-serif text-4xl md:text-5xl mt-1 leading-none">{org_.name}</h1>
            </div>
          </div>
          <p className="mt-5 max-w-2xl text-[var(--ms-muted)] font-sans text-sm leading-relaxed">
            Browse our active listings. Tap any property to contact us — we respond fast.
          </p>
        </div>
      </header>

      {/* Listings */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-serif text-2xl">
            Available properties
            <span className="ml-3 text-sm align-middle text-[var(--ms-muted)] font-sans">({listings.length})</span>
          </h2>
        </div>

        {listings.length === 0 && (
          <div className="border rounded-lg p-10 text-center" style={{ borderColor: theme.border }}>
            <p className="text-[var(--ms-muted)] font-sans text-sm">No published properties yet.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map(p => {
            const wifi = p.price_period ? 'For rent' : 'For sale'
            const img = p.cover_image_url && p.cover_image_url.length > 0
              ? p.cover_image_url
              : '/api/placeholder/600/400'
            return (
              <article
                key={p.id}
                className="border rounded-lg overflow-hidden bg-[var(--ms-card)] hover:shadow-md transition-shadow flex flex-col"
                style={{ borderColor: theme.border }}
              >
                <div className="relative aspect-[4/3] bg-[#eee4d1] flex items-center justify-center overflow-hidden">
                  {img !== '/api/placeholder/600/400' ? (
                    <img src={img} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#b39a78] font-sans text-sm">No image</span>
                  )}
                  {p.featured && (
                    <span
                      className="absolute top-3 left-3 text-[0.65rem] uppercase tracking-wider px-2 py-1 rounded font-sans"
                      style={{ background: theme.accent, color: '#fff' }}
                    >
                      Featured
                    </span>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-serif text-lg leading-tight">{p.title}</h3>
                    <span
                      className="text-[0.65rem] px-2 py-1 rounded-full font-sans shrink-0"
                      style={{ background: theme.border, color: theme.fg }}
                    >
                      {wifi}
                    </span>
                  </div>

                  <p className="text-[var(--ms-muted)] font-sans text-sm mt-1">
                    {p.city}{p.address ? ` · ${p.address.slice(0, 40)}${p.address.length > 40 ? '…' : ''}` : ''}
                  </p>

                  <div className="mt-3 flex gap-4 text-xs font-sans text-[var(--ms-muted)]">
                    {p.bedrooms ? <span>{p.bedrooms} bd</span> : null}
                    {p.bathrooms ? <span>{p.bathrooms} ba</span> : null}
                    {p.area_size ? <span>{p.area_size} m²</span> : null}
                    {p.year_built ? <span>{p.year_built}</span> : null}
                  </div>

                  <div className="mt-4 pt-3 border-t flex justify-between items-end flex-1" style={{ borderColor: theme.border }}>
                    <span className="font-serif text-2xl">
                      {fmt(Number(p.price), p.currency, org_.locale_default)}
                      {p.price_period && <span className="text-xs text-[var(--ms-muted)] font-sans">/mo</span>}
                    </span>
                    <span className="text-[var(--ms-accent)] font-sans text-sm">View →</span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-10" style={{ borderColor: theme.border }}>
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[var(--ms-muted)] font-sans">© {new Date().getFullYear()} {org_.name}</p>
          <p className="text-xs text-[var(--ms-muted)] font-sans">Powered by Estateline</p>
        </div>
      </footer>
    </main>
  )
}
