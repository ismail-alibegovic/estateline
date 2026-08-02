import { NextRequest, NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { generateClientPortalToken, isPortalTokenExpired } from '@/lib/client-portal'

// GET: Resolve client portal token (public, unauthenticated for clients)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: record, error } = await supabase
      .from('client_portal_tokens')
      .select('*, organization:organizations(name, logo_url)')
      .eq('token', token)
      .single()

    if (error || !record) {
      return NextResponse.json({ error: 'Invalid or expired portal link' }, { status: 404 })
    }

    if (isPortalTokenExpired(record.expires_at)) {
      return NextResponse.json({ error: 'Portal link has expired' }, { status: 410 })
    }

    // Fetch deal details if attached
    let deal = null
    if (record.deal_id) {
      const { data: dealData } = await supabase
        .from('deals')
        .select('*, property:properties(title, type, price, currency, address, city)')
        .eq('id', record.deal_id)
        .single()
      deal = dealData
    }

    // Fetch viewings
    let viewings: unknown[] = []
    if (record.contact_id || record.deal_id) {
      const { data: viewingData } = await supabase
        .from('viewings')
        .select('*')
        .or(`contact_id.eq.${record.contact_id || '00000000-0000-0000-0000-000000000000'}`)
        .order('scheduled_at', { ascending: true })
      viewings = viewingData || []
    }

    return NextResponse.json({
      success: true,
      data: {
        agency_name: record.organization?.name || 'Real Estate Agency',
        deal,
        viewings,
        expires_at: record.expires_at,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST: Create client portal link (authenticated agent action)
export async function POST(req: NextRequest) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    const { org, supabase } = ctx

    const { contact_id, deal_id, days_valid } = await req.json()

    const tokenData = generateClientPortalToken(days_valid || 30)

    const { data: newRecord, error } = await supabase
      .from('client_portal_tokens')
      .insert({
        organization_id: org.id,
        contact_id: contact_id || null,
        deal_id: deal_id || null,
        token: tokenData.token,
        expires_at: tokenData.expires_at,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const host = req.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const portalUrl = `${protocol}://${host}/portal/${newRecord.token}`

    return NextResponse.json({
      success: true,
      data: newRecord,
      portal_url: portalUrl,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
