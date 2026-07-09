import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'
import { canAddAgent } from '@/lib/limits'

// ADD-EXISTING-USER-TO-ORG (not the real invite flow).
//
// This is a lean, MVP-only endpoint used while the owner onboards the first
// few agents by hand: it looks up an ALREADY-REGISTERED user by email and adds
// them to the org. It does NOT create users or send invites.
//
// The proper invite flow (owner invites by email -> invitee gets a token link
// -> signs up -> auto-joins the org) is PENDING and lives in the `invitations`
// table (migration 004). Do not mistake this route for that feature.
//
// Role gate: only org owners and admins may add members. Valid roles are
// defined by the organizations/organization_members CHECK:
//   ('owner', 'admin', 'agent', 'viewer')
// (There is deliberately no 'manager' role in the schema.)
export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    if (ctx.role !== 'owner' && ctx.role !== 'admin')
      return NextResponse.json({ error: 'Insufficient role' }, { status: 403 })

    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const role = typeof body.role === 'string' ? body.role : 'agent'
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
    if (!['owner', 'admin', 'agent', 'viewer'].includes(role))
      return NextResponse.json({ error: 'invalid role' }, { status: 400 })

    const { data: targetUser } = await ctx.supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const [{ count: memberCount }, { data: orgRow }] = await Promise.all([
      ctx.supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', ctx.org.id),
      ctx.supabase.from('organizations').select('subscription_tier').eq('id', ctx.org.id).single(),
    ])

    const agentLimit = canAddAgent(orgRow ?? {}, memberCount || 0)
    if (!agentLimit.allowed) {
      return NextResponse.json({ error: agentLimit.reason || 'Plan limit reached' }, { status: 403 })
    }

    const { data, error } = await ctx.supabase
      .from('organization_members')
      .insert({
        user_id: targetUser.id,
        organization_id: ctx.org.id,
        role,
        is_primary: false,
        accepted_at: null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
