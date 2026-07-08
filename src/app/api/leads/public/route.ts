import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  try {
    const { organization_slug, first_name, last_name, email, phone, message, property_id } = await req.json()

    if (!organization_slug || !first_name) {
      return NextResponse.json({ error: 'organization_slug and first_name are required' }, { status: 400 })
    }

    // Create a Supabase client with anon key — this is a public endpoint
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: () => '', set: () => {}, remove: () => {} } }
    )

    // Look up the organization by slug
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', organization_slug)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Insert the lead
    const { data, error } = await supabase
      .from('leads')
      .insert({
        organization_id: org.id,
        source: 'website',
        status: 'new',
        first_name,
        last_name: last_name || null,
        email: email || null,
        phone: phone || null,
        notes: message || null,
        interested_in: property_id ? [property_id] : [],
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
