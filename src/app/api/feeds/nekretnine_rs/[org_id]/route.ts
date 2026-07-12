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

  // Fetch properties marked for nekretnine_rs syndication
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
    .eq('portal_name', 'nekretnine_rs')
    .eq('status', 'active')

  if (error) {
    console.error('Error fetching nekretnine_rs syndications:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<nekretnine_oglasi>\n`

  syndications?.forEach((syn: any) => {
    const prop = syn.properties
    if (!prop) return

    xml += `  <oglas>\n`
    xml += `    <referentni_id>${prop.id}</referentni_id>\n`
    xml += `    <naslov><![CDATA[${prop.title}]]></naslov>\n`
    xml += `    <opis><![CDATA[${prop.description || ''}]]></opis>\n`
    xml += `    <cena>${prop.price}</cena>\n`
    xml += `    <valuta>${prop.currency}</valuta>\n`
    xml += `    <vrsta_nekretnine>${prop.type}</vrsta_nekretnine>\n`
    
    const location = prop.location as any
    if (location && location.address) {
      xml += `    <lokacija><![CDATA[${location.address}]]></lokacija>\n`
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

    xml += `  </oglas>\n`
  })

  xml += `</nekretnine_oglasi>`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate'
    }
  })
}
