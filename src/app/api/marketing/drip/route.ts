import { NextRequest, NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'

export async function GET() {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    const { org, supabase } = ctx

    const { data: campaigns, error } = await supabase
      .from('drip_campaigns')
      .select('*')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, data: campaigns || [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    const { org, supabase } = ctx

    const { name, trigger_stage, channel, template_body } = await req.json()

    if (!name || !trigger_stage || !template_body) {
      return NextResponse.json(
        { error: 'Missing required parameters (name, trigger_stage, template_body)' },
        { status: 400 }
      )
    }

    const { data: newCampaign, error } = await supabase
      .from('drip_campaigns')
      .insert({
        organization_id: org.id,
        name,
        trigger_stage,
        channel: channel || 'email',
        template_body,
        is_active: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, data: newCampaign })
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

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    const { error } = await supabase
      .from('drip_campaigns')
      .delete()
      .eq('organization_id', org.id)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
