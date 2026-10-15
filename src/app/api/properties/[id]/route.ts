import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'
import { dispatchWebhookEvent } from '@/lib/webhook-dispatcher'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx

    const { data, error } = await ctx.supabase
      .from('properties')
      .select('*')
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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    if (ctx.role === 'viewer')
      return NextResponse.json({ error: 'Insufficient role' }, { status: 403 })

    const body = await request.json()
    // Never let a client re-parent or rewrite identity columns.
    delete body.id
    delete body.organization_id
    delete body.created_at

    const { data, error } = await ctx.supabase
      .from('properties')
      .update(body)
      .eq('id', params.id)
      .eq('organization_id', ctx.org.id)
      .select()
      .single()

    if (error) throw error
    void dispatchWebhookEvent(ctx.org.id, 'property.updated', data)
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
      .from('properties')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', ctx.org.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
