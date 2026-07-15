import { NextResponse, NextRequest } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const ctx = await getRouteContext()
  if (isAuthError(ctx)) return ctx

  const { org, supabase } = ctx
  const searchParams = request.nextUrl.searchParams
  const q = searchParams.get('q') || ''

  if (!q.trim()) {
    return NextResponse.json({ properties: [], contacts: [], leads: [], deals: [] })
  }

  try {
    const likeQuery = `%${q}%`

    const [
      { data: properties },
      { data: contacts },
      { data: leads },
      { data: deals }
    ] = await Promise.all([
      // Search Properties
      supabase
        .from('properties')
        .select('id, title, city, price, type')
        .eq('organization_id', org.id)
        .or(`title.ilike.${likeQuery},city.ilike.${likeQuery}`)
        .limit(5),
      
      // Search Contacts
      supabase
        .from('contacts')
        .select('id, first_name, last_name, email, type')
        .eq('organization_id', org.id)
        .or(`first_name.ilike.${likeQuery},last_name.ilike.${likeQuery},email.ilike.${likeQuery}`)
        .limit(5),

      // Search Leads
      supabase
        .from('leads')
        .select('id, first_name, last_name, email, stage')
        .eq('organization_id', org.id)
        .or(`first_name.ilike.${likeQuery},last_name.ilike.${likeQuery},email.ilike.${likeQuery}`)
        .limit(5),

      // Search Deals
      supabase
        .from('deals')
        .select('id, title, price, stage')
        .eq('organization_id', org.id)
        .ilike('title', likeQuery)
        .limit(5)
    ])

    return NextResponse.json({
      properties: properties || [],
      contacts: contacts || [],
      leads: leads || [],
      deals: deals || []
    })
  } catch (err: any) {
    console.error('Search API Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
