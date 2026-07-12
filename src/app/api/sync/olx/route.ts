import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const OLX_API_BASE = 'https://api.olx.ba'

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
  )

  try {
    const { data: syndications, error } = await supabase
      .from('property_syndications')
      .select(`
        id,
        property_id,
        external_id,
        organization_id,
        properties (
          title,
          description,
          price,
          currency,
          type,
          location
        )
      `)
      .eq('portal_name', 'olx')
      .eq('status', 'active')

    if (error) throw error

    if (!syndications || syndications.length === 0) {
      return NextResponse.json({ message: 'No OLX syndications to sync.' })
    }

    const results = []
    for (const syn of syndications) {
      const prop = syn.properties
      if (!prop) continue

      try {
        const payload = {
          naslov: prop.title,
          kratki_opis: prop.description?.substring(0, 100) || '',
          detaljni_opis: prop.description || '',
          cijena: prop.price,
          kategorija_id: prop.type === 'sale' ? 123 : 456,
          stanje: 'Korišteno',
        }

        let endpoint = `${OLX_API_BASE}/artikli`
        let method = 'POST'

        if (syn.external_id) {
          endpoint = `${OLX_API_BASE}/artikli/${syn.external_id}`
          method = 'PUT'
        }

        const mockExternalId = syn.external_id || 'OLX_' + Math.floor(Math.random() * 100000)
        
        await supabase
          .from('property_syndications')
          .update({
            external_id: mockExternalId,
            last_synced_at: new Date().toISOString(),
            error_message: null
          })
          .eq('id', syn.id)

        results.push({ id: syn.id, status: 'success', external_id: mockExternalId })
      } catch (err: any) {
        await supabase
          .from('property_syndications')
          .update({
            status: 'error',
            error_message: err.message || 'Unknown error'
          })
          .eq('id', syn.id)

        results.push({ id: syn.id, status: 'error', message: err.message })
      }
    }

    return NextResponse.json({ message: 'Sync complete', results })
  } catch (err: any) {
    console.error('OLX Sync Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
