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
        location,
        custom_fields,
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

    // OLX category mapping (Real estate is typically category 1)
    const isSale = prop.type?.toLowerCase() === 'sale'
    const vrsta = isSale ? 'Prodaja' : 'Najam'

    xml += `  <artikal>\n`
    xml += `    <id>${prop.id}</id>\n`
    xml += `    <naslov><![CDATA[${prop.title}]]></naslov>\n`
    xml += `    <opis><![CDATA[${prop.description || ''}]]></opis>\n`
    xml += `    <cijena>${prop.price}</cijena>\n`
    xml += `    <valuta>${prop.currency || 'BAM'}</valuta>\n`
    xml += `    <vrsta>${vrsta}</vrsta>\n`
    xml += `    <stanje>Korišteno</stanje>\n` // Standard tag
    
    const location = prop.location as any
    if (location && location.city) {
      xml += `    <grad><![CDATA[${location.city}]]></grad>\n`
    }
    if (location && location.address) {
      xml += `    <adresa><![CDATA[${location.address}]]></adresa>\n`
    }
    
    const images = prop.images as string[]
    if (images && images.length > 0) {
      xml += `    <slike>\n`
      images.forEach(img => {
        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'}/storage/v1/object/public/${img}`
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
