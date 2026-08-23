import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'
import {
  parseBulkIds,
  PROPERTY_BULK_STATUSES,
  MAX_BULK_IDS,
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
        { error: `Provide 1-${MAX_BULK_IDS} valid property ids` },
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
    } else if (action === 'status') {
      if (
        typeof value !== 'string' ||
        !(PROPERTY_BULK_STATUSES as readonly string[]).includes(value)
      )
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      patch.status = value
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const { data, error } = await ctx.supabase
      .from('properties')
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
