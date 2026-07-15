import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { org_id: string } }) {
  const { org_id } = params

  if (!org_id) {
    return new NextResponse('Missing Organization ID', { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
  )

  // Fetch properties marked for Njuskalo syndication
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
        city,
        address,
        cover_image_url,
        images
      )
    `)
    .eq('organization_id', org_id)
    .eq('portal_name', 'njuskalo')
    .eq('status', 'active')

  if (error) {
    console.error('Error fetching njuskalo syndications:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<propertyList>\n`

  syndications?.forEach((syn: any) => {
    const prop = syn.properties
    if (!prop) return

    xml += `  <property>\n`
    xml += `    <id>${prop.id}</id>\n`
    xml += `    <title><![CDATA[${prop.title}]]></title>\n`
    xml += `    <description><![CDATA[${prop.description || ''}]]></description>\n`
    xml += `    <price>${prop.price}</price>\n`
    xml += `    <currency>${prop.currency}</currency>\n`
    xml += `    <type>${prop.type}</type>\n`
    
    if (prop.address) {
      xml += `    <address><![CDATA[${prop.address}]]></address>\n`
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
      xml += `    <images>\n`
      images.forEach(img => {
        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'}/storage/v1/object/public/${img}`
        xml += `      <image><![CDATA[${publicUrl}]]></image>\n`
      })
      xml += `    </images>\n`
    }

    xml += `  </property>\n`
  })

  xml += `</propertyList>`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate'
    }
  })
}
