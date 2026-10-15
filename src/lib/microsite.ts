import { createClient } from '@supabase/supabase-js'

/**
 * Public microsite data access. Reads ONLY through the whitelisted
 * SECURITY DEFINER RPCs from migration 006 (get_public_org_by_slug,
 * get_public_properties); there is no table-level anon access.
 */

export interface Agency {
  id: string
  name: string
  slug: string
  logo_url: string | null
  phone: string | null
  email: string | null
  website: string | null
  primary_color: string
  accent_color: string
  tagline: string | null
  bio: string | null
  city: string | null
  address: string | null
}

export interface Property {
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

function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)

export function mapAgency(row: any): Agency {
  const b = (row?.branding && typeof row.branding === 'object' ? row.branding : {}) as Record<string, unknown>
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo_url: row.logo_url ?? str(b.logo_url),
    phone: str(b.phone),
    email: str(b.email),
    website: str(b.website),
    primary_color: str(b.primary_color) ?? str(b.primaryColor) ?? '#1a2332',
    accent_color: str(b.accent_color) ?? str(b.accentColor) ?? '#C9963B',
    tagline: str(b.tagline),
    bio: str(b.bio),
    city: str(b.city),
    address: str(b.address),
  }
}

export function mapProperty(row: any): Property {
  const images = Array.isArray(row.images)
    ? row.images.filter((x: unknown): x is string => typeof x === 'string')
    : null
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    price: Number(row.price ?? 0),
    currency: row.currency || 'EUR',
    listing_type: row.price_period ? 'rent' : 'sale',
    property_type: row.type ?? '',
    bedrooms: row.bedrooms ?? null,
    bathrooms: row.bathrooms ?? null,
    area: row.area_size != null ? Number(row.area_size) : null,
    area_unit: 'm²',
    address: row.address ?? '',
    city: row.city ?? '',
    cover_image: row.cover_image_url ?? images?.[0] ?? null,
    images,
    description: row.description ?? null,
    features: null,
    featured: !!row.featured,
    year_built: row.year_built ?? null,
    created_at: row.created_at ?? '',
  }
}

export async function getAgencyBySlug(slug: string): Promise<Agency | null> {
  const { data, error } = await publicClient().rpc('get_public_org_by_slug', { p_slug: slug })
  if (error || !Array.isArray(data) || data.length === 0) return null
  return mapAgency(data[0])
}

export async function getPublicProperties(orgId: string): Promise<Property[]> {
  const { data, error } = await publicClient().rpc('get_public_properties', { p_org_id: orgId })
  if (error || !Array.isArray(data)) return []
  return data.slice(0, 50).map(mapProperty)
}

export async function getPublicPropertyBySlug(orgId: string, slug: string): Promise<Property | null> {
  const all = await getPublicProperties(orgId)
  return all.find(p => p.slug === slug) ?? null
}
