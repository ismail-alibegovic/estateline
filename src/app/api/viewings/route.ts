import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx

    const { data, error } = await ctx.supabase
      .from('viewings')
      .select(`
        *,
        properties:property_id (title, address, city, cover_image_url),
        contacts:contact_id (first_name, last_name, email, phone),
        leads:lead_id (first_name, last_name, email),
        assigned_agent:assigned_to (full_name, email)
      `)
      .eq('organization_id', ctx.org.id)
      .order('scheduled_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    if (ctx.role === 'viewer')
      return NextResponse.json({ error: 'Insufficient role' }, { status: 403 })

    const body = await request.json()
    const { data, error } = await ctx.supabase
      .from('viewings')
      .insert({
        organization_id: ctx.org.id,
        property_id: body.property_id,
        contact_id: body.contact_id,
        lead_id: body.lead_id,
        assigned_agent: body.assigned_agent,
        scheduled_at: body.scheduled_at,
        duration_minutes: body.duration_minutes || 30,
        notes: body.notes,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    if (ctx.role === 'viewer')
      return NextResponse.json({ error: 'Insufficient role' }, { status: 403 })

    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { data, error } = await ctx.supabase
      .from('viewings')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', ctx.org.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    if (ctx.role !== 'owner' && ctx.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { error } = await ctx.supabase
      .from('viewings')
      .delete()
      .eq('id', id)
      .eq('organization_id', ctx.org.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
