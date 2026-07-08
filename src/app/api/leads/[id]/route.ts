import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx

    const { data, error } = await ctx.supabase
      .from('leads')
      .select('*, properties(title, city, price, cover_image_url)')
      .eq('id', params.id)
      .eq('organization_id', ctx.org.id)
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

function requireWrite(role: string) {
  return role === 'owner' || role === 'admin' || role === 'agent'
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    if (!requireWrite(ctx.role))
      return NextResponse.json({ error: 'Insufficient role' }, { status: 403 })

    const body = await request.json()
    const updates: any = { ...body }
    if (body.stage || body.status) updates.last_activity_at = new Date().toISOString()

    const { data, error } = await ctx.supabase
      .from('leads')
      .update(updates)
      .eq('id', params.id)
      .eq('organization_id', ctx.org.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    if (ctx.role !== 'owner' && ctx.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const { error } = await ctx.supabase
      .from('leads')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', ctx.org.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
