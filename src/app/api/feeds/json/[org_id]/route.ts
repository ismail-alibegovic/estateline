import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { org_id: string } }) {
  const { org_id } = params

  if (!org_id) {
    return NextResponse.json({ error: 'Missing Organization ID' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
  )

  // Fetch all active syndicated properties for the organization
  const { data: syndications, error } = await supabase
    .from('property_syndications')
    .select(`
      id,
      portal_name,
      status,
      external_id,
      last_synced_at,
      properties (
        id,
        title,
        description,
        price,
        currency,
        type,
        price_period,
        city,
        address,
        latitude,
        longitude,
        cover_image_url,
        images,
        custom_fields
      )
    `)
    .eq('organization_id', org_id)
    .eq('status', 'active')

  if (error) {
    console.error('Error fetching JSON feed syndications:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }

  // Format listings cleanly
  const listings = (syndications || []).map((syn: any) => {
    const prop = syn.properties
    if (!prop) return null

    const getImages = (): string[] => {
      const imgs = prop.images
      if (Array.isArray(imgs)) {
        return imgs.map((item: any) => {
          if (typeof item === 'string') return item
          if (item && typeof item === 'object' && item.url) return item.url
          return ''
        }).filter(Boolean)
      }
      if (prop.cover_image_url) {
        return [prop.cover_image_url]
      }
      return []
    }

    const imagesMapped = getImages().map(img => 
      `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'}/storage/v1/object/public/${img}`
    )

    return {
      id: prop.id,
      portal: syn.portal_name,
      external_id: syn.external_id,
      last_synced_at: syn.last_synced_at,
      title: prop.title,
      description: prop.description,
      price: prop.price,
      currency: prop.currency || 'BAM',
      type: prop.type,
      location: {
        city: prop.city,
        address: prop.address,
        latitude: prop.latitude,
        longitude: prop.longitude
      },
      features: prop.custom_fields,
      images: imagesMapped
    }
  }).filter(Boolean)

  return NextResponse.json({
    organization_id: org_id,
    generated_at: new Date().toISOString(),
    count: listings.length,
    listings
  }, {
    status: 200,
    headers: {
      'Cache-Control': 's-maxage=1800, stale-while-revalidate'
    }
  })
}
