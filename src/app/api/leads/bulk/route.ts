import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'
import {
  parseBulkIds,
  LEAD_BULK_STATUSES,
  MAX_BULK_IDS,
  MAX_STAGE_LENGTH,
} from '@/lib/bulk'

export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx

    if (ctx.role !== 'owner' && ctx.role !== 'admin' && ctx.role !== 'agent')
      return NextResponse.json({ error: 'Insufficient role' }, { status: 403 })

    const body = await request.json()
    const ids = parseBulkIds(body?.ids)
    if (!ids)
      return NextResponse.json(
        { error: `Provide 1-${MAX_BULK_IDS} valid lead ids` },
        { status: 400 }
      )

    const action = body?.action
    const value = body?.value
    const patch: Record<string, unknown> = {}

    if (action === 'assign') {
      if (typeof value !== 'string')
        return NextResponse.json({ error: 'Missing assignee' }, { status: 400 })
      // Assignee must be a member of THIS organization.
      const { data: member, error: memberError } = await ctx.supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', ctx.org.id)
        .eq('user_id', value)
        .maybeSingle()
      if (memberError) throw memberError
      if (!member)
        return NextResponse.json(
          { error: 'Assignee is not a member of this organization' },
          { status: 400 }
        )
      patch.assigned_to = value
    } else if (action === 'stage') {
      // Stage ids come from the organization's pipeline UI — same contract as
      // single-lead stage updates. Validated as a bounded string.
      if (
        typeof value !== 'string' ||
        !value.trim() ||
        value.length > MAX_STAGE_LENGTH
      )
        return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
      patch.stage = value.trim()
      // The app's pipeline stages are new/contacted/qualified/negotiation/converted.
      // 'converted' closes the lead; everything else reopens it.
      patch.status = value.trim() === 'converted' ? 'won' : 'open'
    } else if (action === 'status') {
      if (
        typeof value !== 'string' ||
        !(LEAD_BULK_STATUSES as readonly string[]).includes(value)
      )
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      patch.status = value
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const { data, error } = await ctx.supabase
      .from('leads')
      .update(patch)
      .eq('organization_id', ctx.org.id)
      .in('id', ids)
      .select('id')

    if (error) throw error

    return NextResponse.json({ updated: data?.length ?? 0 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
