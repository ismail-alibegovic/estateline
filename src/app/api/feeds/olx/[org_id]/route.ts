import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { org_id: string } }) {
  const rl = await checkRateLimit(request as any, 60, 60 * 1000)
  if (!rl.success) {
    return rateLimitResponse()
  }

  const { org_id } = params

  if (!org_id) {
    return new NextResponse('Missing Organization ID', { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required Supabase environment variables in OLX feed route')
    return new NextResponse('Server Configuration Error: Missing required Supabase credentials', { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Fetch properties marked for OLX syndication
  const { data: syndications, error } = await supabase
    .from('property_syndications')
    .select(`
      property_id,
      status,
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
        images
      )
    `)
    .eq('organization_id', org_id)
    .eq('portal_name', 'olx')
    .eq('status', 'active')

  if (error) {
    console.error('Error fetching OLX syndications:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<olx_artikli>\n`

  syndications?.forEach((syn: any) => {
    const prop = syn.properties
    if (!prop) return

    // OLX category mapping
    const isSale = !prop.price_period
    const vrsta = isSale ? 'Prodaja' : 'Najam'

    xml += `  <artikal>\n`
    xml += `    <id>${prop.id}</id>\n`
    xml += `    <naslov><![CDATA[${prop.title}]]></naslov>\n`
    xml += `    <opis><![CDATA[${prop.description || ''}]]></opis>\n`
    xml += `    <cijena>${prop.price}</cijena>\n`
    xml += `    <valuta>${prop.currency || 'BAM'}</valuta>\n`
    xml += `    <vrsta>${vrsta}</vrsta>\n`
    xml += `    <stanje>Korišteno</stanje>\n`
    
    if (prop.city) {
      xml += `    <grad><![CDATA[${prop.city}]]></grad>\n`
    }
    if (prop.address) {
      xml += `    <adresa><![CDATA[${prop.address}]]></adresa>\n`
    }
    
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
    const images = getImages()
    if (images && images.length > 0) {
      xml += `    <slike>\n`
      images.forEach(img => {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${img}`
        xml += `      <slika><![CDATA[${publicUrl}]]></slika>\n`
      })
      xml += `    </slike>\n`
    }

    xml += `  </artikal>\n`
  })

  xml += `</olx_artikli>`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate'
    }
  })
}
