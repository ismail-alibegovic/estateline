import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Bed, Bath, Maximize, Phone, Mail, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { Suspense } from 'react'

interface Props {
  params: Promise<{ subdomain: string; slug: string }>
}

interface Agency {
  id: string
  name: string
  slug: string
  logo_url: string | null
  phone: string | null
  email: string | null
  primary_color: string
  accent_color: string
}

interface Property {
  id: string
  title: string
  slug: string
  price: number
  currency: string
  listing_type: string
  property_type: string
  bedrooms: number | null
  bathrooms: number | null
  area: number | null
  area_unit: string
  address: string
  city: string
  cover_image: string | null
  images: string[] | null
  description: string | null
  features: string[] | null
  featured: boolean
  year_built: number | null
  created_at: string
}

async function getAgency(subdomain: string): Promise<Agency | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get: (name: string) => cookieStore.get(name)?.value } })
  const { data } = await supabase
    .from('agencies')
    .select('id, name, slug, logo_url, phone, email, primary_color, accent_color')
    .eq('slug', subdomain)
    .eq('is_active', true)
    .single()
  return data
}

async function getProperty(orgId: string, slug: string): Promise<Property | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get: (name: string) => cookieStore.get(name)?.value } })
  const { data } = await supabase
    .from('properties')
    .select('*')
    .eq('organization_id', orgId)
    .eq('slug', slug)
    .single()
  return data
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

function PropertyGallery({ images, title }: { images: string[] | null; title: string }) {
  const imgs = images?.length ? images : []
  if (imgs.length === 0) {
    return (
      <div className="aspect-[16/9] bg-gray-100 rounded-2xl flex items-center justify-center text-gray-300">
        <Maximize size={48} />
      </div>
    )
  }
  if (imgs.length === 1) {
    return (
      <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100">
        <Image src={imgs[0]} alt={title} fill className="object-cover" />
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100">
        <Image src={imgs[0]} alt={title} fill className="object-cover" />
      </div>
      {imgs.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {imgs.slice(1, 5).map((img, i) => (
            <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
              <Image src={img} alt={`${title} ${i + 2}`} fill className="object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default async function PropertyDetailPage({ params }: Props) {
  const { subdomain, slug } = await params
  const agency = await getAgency(subdomain)
  if (!agency) notFound()

  const property = await getProperty(agency.id, slug)
  if (!property) notFound()

  const primary = agency.primary_color || '#1a2332'
  const accent = agency.accent_color || '#C9963B'
  const allImages = property.cover_image
    ? [property.cover_image, ...(property.images?.filter(img => img !== property.cover_image) || [])]
    : property.images || []

  return (
    <div className="min-h-screen bg-[#f8f6f3]">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href={`/site/${subdomain}`} className="flex items-center gap-3 group">
            {agency.logo_url ? (
              <Image src={agency.logo_url} alt={agency.name} width={32} height={32} className="object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: primary }}>
                {agency.name.charAt(0)}
              </div>
            )}
            <span className="text-sm font-semibold text-gray-700">{agency.name}</span>
          </Link>
          <Link href={`/site/${subdomain}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={14} /> Back to listings
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href={`/site/${subdomain}`} className="hover:text-gray-800">{agency.name}</Link>
          <ChevronRight size={12} />
          <span className="text-gray-800 font-medium">{property.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Gallery + Details */}
          <div className="lg:col-span-3 space-y-6">
            <Suspense fallback={<div className="aspect-[16/9] bg-gray-100 rounded-2xl" />}>
              <PropertyGallery images={allImages} title={property.title} />
            </Suspense>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider text-white" style={{ background: accent }}>
                      {property.listing_type === 'sale' ? 'For Sale' : 'For Rent'}
                    </span>
                    {property.featured && (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-gray-900 text-white">
                        Featured
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 font-display">{property.title}</h1>
                  <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                    <MapPin size={14} />
                    <span>{property.address}{property.city ? `, ${property.city}` : ''}</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 font-display whitespace-nowrap">
                  {formatPrice(property.price, property.currency)}
                </p>
              </div>

              <div className="flex items-center gap-6 py-4 border-y border-gray-100 mb-4">
                {property.bedrooms != null && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Bed size={16} className="text-gray-400" />
                    <span className="font-semibold">{property.bedrooms}</span> Beds
                  </div>
                )}
                {property.bathrooms != null && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Bath size={16} className="text-gray-400" />
                    <span className="font-semibold">{property.bathrooms}</span> Baths
                  </div>
                )}
                {property.area != null && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Maximize size={16} className="text-gray-400" />
                    <span className="font-semibold">{property.area}</span> {property.area_unit}
                  </div>
                )}
                {property.year_built != null && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-gray-400">Built</span>
                    <span className="font-semibold">{property.year_built}</span>
                  </div>
                )}
              </div>

              {property.description && (
                <div>
                  <h2 className="text-sm font-bold text-gray-900 mb-2">Description</h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{property.description}</p>
                </div>
              )}

              {property.features && property.features.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-sm font-bold text-gray-900 mb-3">Features</h2>
                  <div className="flex flex-wrap gap-2">
                    {property.features.map((feature, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg bg-gray-50 text-xs font-medium text-gray-700 border border-gray-100">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Contact card */}
          <div className="lg:col-span-2">
            <div className="sticky top-8 space-y-4">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Interested? Contact us</h3>
                {agency.phone && (
                  <a
                    href={`tel:${agency.phone}`}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-white mb-3 transition-all hover:opacity-90"
                    style={{ background: primary }}
                  >
                    <Phone size={16} /> {agency.phone}
                  </a>
                )}
                {agency.email && (
                  <a
                    href={`mailto:${agency.email}?subject=Inquiry: ${property.title}`}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all hover:opacity-80"
                    style={{ borderColor: primary, color: primary }}
                  >
                    <Mail size={16} /> Send Email
                  </a>
                )}
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  {agency.logo_url ? (
                    <Image src={agency.logo_url} alt={agency.name} width={40} height={40} className="object-contain" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold" style={{ background: primary }}>
                      {agency.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-gray-900">{agency.name}</p>
                    <p className="text-xs text-gray-500">Real Estate Agency</p>
                  </div>
                </div>
                <Link
                  href={`/site/${subdomain}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold mt-2 transition-colors"
                  style={{ color: accent }}
                >
                  View all listings <ArrowLeft size={12} className="rotate-180" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
