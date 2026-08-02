import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getRouteContext, isAuthError } from '@/lib/auth'

export async function GET() {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    const { org, supabase } = ctx

    const { data: subs, error } = await supabase
      .from('webhook_subscriptions')
      .select('id, url, events, secret, is_active, created_at, updated_at')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, data: subs })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    const { org, supabase } = ctx

    const { url, events } = await req.json()

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'Valid HTTP/HTTPS URL is required' }, { status: 400 })
    }

    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`

    const { data: newSub, error } = await supabase
      .from('webhook_subscriptions')
      .insert({
        organization_id: org.id,
        url,
        events: events || ['*'],
        secret,
        is_active: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, data: newSub })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    const { org, supabase } = ctx

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('webhook_subscriptions')
      .delete()
      .eq('organization_id', org.id)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
