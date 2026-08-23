import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * DELETE: revoke a pending invitation (owner/admin only, tenant-scoped).
 * Idempotent for already-revoked rows — returns 404 only when nothing in this
 * organization matches the id.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await getRouteContext()
  if (isAuthError(ctx)) return ctx
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return NextResponse.json({ error: 'Insufficient role' }, { status: 403 })

  const { data: revoked, error } = await ctx.supabase
    .from('invitations')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('organization_id', ctx.org.id)
    .in('status', ['pending', 'expired'])
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!revoked || revoked.length === 0)
    return NextResponse.json({ error: 'Pending invitation not found' }, { status: 404 })

  return NextResponse.json({ data: { id: revoked[0].id, status: 'revoked' } })
}
