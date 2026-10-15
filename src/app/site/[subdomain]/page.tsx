import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAgencyBySlug as getAgency, getPublicProperties as getProperties, getPublicPropertyBySlug as getProperty, type Agency, type Property } from '@/lib/microsite'
import Image from 'next/image'
import { MapPin, Bed, Bath, Maximize, Phone, Mail, Globe, ChevronRight, Star, ArrowLeft } from 'lucide-react'

interface Props {
  params: Promise<{ subdomain: string }>
}

function formatPrice(price: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale === 'bs' ? 'bs-BA' : 'en-US', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export default async function MicrositePage({ params }: Props) {
  const { subdomain } = await params
  const agency = await getAgency(subdomain)
  if (!agency) notFound()

  const properties = await getProperties(agency.id)
  const primary = agency.primary_color || '#1a2332'
  const accent = agency.accent_color || '#C9963B'
  const featured = properties.filter(p => p.featured)
  const recent = properties.slice(0, 12)

  return (
    <div className="min-h-screen bg-[#f8f6f3]">
      {/* Hero */}
      <header
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}dd 100%)` }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl" style={{ background: accent, transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl" style={{ background: accent, transform: 'translate(-30%, 30%)' }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="flex items-center gap-5 mb-8">
            {agency.logo_url ? (
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center p-2">
                <Image src={agency.logo_url} alt={agency.name} width={64} height={64} className="object-contain" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold" style={{ background: accent }}>
                {agency.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white font-display tracking-tight">{agency.name}</h1>
              {agency.tagline && (
                <p className="text-white/70 text-sm mt-1 font-body">{agency.tagline}</p>
              )}
            </div>
          </div>

          {agency.bio && (
            <p className="text-white/80 text-base max-w-2xl leading-relaxed font-body">{agency.bio}</p>
          )}

          <div className="flex flex-wrap gap-4 mt-8">
            {agency.phone && (
              <a href={`tel:${agency.phone}`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105" style={{ background: accent, color: primary }}>
                <Phone size={16} /> {agency.phone}
              </a>
            )}
            {agency.email && (
              <a href={`mailto:${agency.email}`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-white border border-white/20 backdrop-blur-sm hover:bg-white/20 transition-all">
                <Mail size={16} /> {agency.email}
              </a>
            )}
            {agency.website && (
              <a href={agency.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-white border border-white/20 backdrop-blur-sm hover:bg-white/20 transition-all">
                <Globe size={16} /> Website
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Featured Properties */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-8">
            <Star size={20} style={{ color: accent }} />
            <h2 className="text-2xl font-bold text-gray-900 font-display">Featured Properties</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.slice(0, 6).map((property) => (
              <Link
                key={property.id}
                href={`/site/${subdomain}/property/${property.slug}`}
                className="group block bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  {property.cover_image ? (
                    <Image
                      src={property.cover_image}
                      alt={property.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Maximize size={40} />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider text-white" style={{ background: accent }}>
                      Featured
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-white/90 text-gray-800">
                      {property.listing_type === 'sale' ? 'For Sale' : 'For Rent'}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-lg font-bold text-gray-900 font-display">{formatPrice(property.price, property.currency, 'en')}</p>
                  <h3 className="text-sm font-semibold text-gray-800 mt-1 line-clamp-1">{property.title}</h3>
                  <div className="flex items-center gap-1 text-gray-500 text-xs mt-2">
                    <MapPin size={12} />
                    <span>{property.city}{property.address ? `, ${property.address}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    {property.bedrooms != null && (
                      <span className="flex items-center gap-1"><Bed size={13} /> {property.bedrooms}</span>
                    )}
                    {property.bathrooms != null && (
                      <span className="flex items-center gap-1"><Bath size={13} /> {property.bathrooms}</span>
                    )}
                    {property.area != null && (
                      <span className="flex items-center gap-1"><Maximize size={13} /> {property.area} {property.area_unit}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* All Properties */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-gray-900 font-display mb-8">
          {featured.length > 0 ? 'All Properties' : 'Properties'}
        </h2>
        {recent.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Maximize size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-body">No properties listed yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recent.map((property) => (
              <Link
                key={property.id}
                href={`/site/${subdomain}/property/${property.slug}`}
                className="group block bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  {property.cover_image ? (
                    <Image
                      src={property.cover_image}
                      alt={property.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Maximize size={40} />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-white/90 text-gray-800">
                      {property.listing_type === 'sale' ? 'For Sale' : 'For Rent'}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-lg font-bold text-gray-900 font-display">{formatPrice(property.price, property.currency, 'en')}</p>
                  <h3 className="text-sm font-semibold text-gray-800 mt-1 line-clamp-1">{property.title}</h3>
                  <div className="flex items-center gap-1 text-gray-500 text-xs mt-2">
                    <MapPin size={12} />
                    <span>{property.city}{property.address ? `, ${property.address}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    {property.bedrooms != null && (
                      <span className="flex items-center gap-1"><Bed size={13} /> {property.bedrooms}</span>
                    )}
                    {property.bathrooms != null && (
                      <span className="flex items-center gap-1"><Bath size={13} /> {property.bathrooms}</span>
                    )}
                    {property.area != null && (
                      <span className="flex items-center gap-1"><Maximize size={13} /> {property.area} {property.area_unit}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {agency.logo_url ? (
              <Image src={agency.logo_url} alt={agency.name} width={32} height={32} className="object-contain" />
            ) : null}
            <span className="text-sm font-semibold text-gray-700">{agency.name}</span>
          </div>
          {agency.address && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin size={12} />
              <span>{agency.address}{agency.city ? `, ${agency.city}` : ''}</span>
            </div>
          )}
          <p className="text-xs text-gray-400">Powered by Estateline</p>
        </div>
      </footer>
    </div>
  )
}
