import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError, WRITER_ROLES, requireRole } from '@/lib/auth'
import { dispatchWebhookEvent } from '@/lib/webhook-dispatcher'

const DEAL_STAGES = [
  'new', 'qualified', 'viewing', 'offer', 'negotiation',
  'under_contract', 'closed_won', 'closed_lost', 'withdrawn',
] as const

// Only these columns may be changed through this endpoint.
const EDITABLE = [
  'title', 'stage', 'price', 'currency', 'commission_pct', 'commission_amount',
  'probability', 'expected_close_date', 'lost_reason', 'assigned_to', 'notes', 'tags',
] as const

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    const denied = requireRole(ctx, WRITER_ROLES)
    if (denied) return denied

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const patch: Record<string, unknown> = {}
    for (const key of EDITABLE) {
      if (key in body) patch[key] = body[key]
    }
    if ('stage' in patch && !(DEAL_STAGES as readonly string[]).includes(String(patch.stage))) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 })
    }

    if (patch.stage === 'closed_won' || patch.stage === 'closed_lost') {
      patch.closed_at = new Date().toISOString()
    }
    patch.last_activity_at = new Date().toISOString()

    const { data, error } = await ctx.supabase
      .from('deals')
      .update(patch)
      .eq('id', params.id)
      .eq('organization_id', ctx.org.id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    void dispatchWebhookEvent(ctx.org.id, 'deal.updated', data)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
