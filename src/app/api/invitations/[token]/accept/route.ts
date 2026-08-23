import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { canAddAgent } from '@/lib/limits'
import { normalizeInviteEmail, resolveInvitationStatus } from '@/lib/invitations'

export const dynamic = 'force-dynamic'

/**
 * POST: accept an invitation as the signed-in user.
 *
 * Uses a plain authenticated client instead of getRouteContext because the
 * invitee typically has no organization membership yet. Rules enforced
 * server-side:
 *  - invitation exists, is pending and not expired (single-use claim below)
 *  - the signed-in account's email matches the invited email
 *  - plan seat limit for the target organization
 *  - atomic status transition pending→accepted prevents double acceptance
 */
export async function POST(
  _request: Request,
  { params }: { params: { token: string } },
) {
  const supabase = createRouteClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser)
    return NextResponse.json({ error: 'Sign in to accept this invitation', code: 'UNAUTHENTICATED' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('id, email')
    .eq('auth_id', authUser.id)
    .single()
  if (!profile)
    return NextResponse.json({ error: 'Profile not found', code: 'NO_PROFILE' }, { status: 403 })

  const admin = createAdminClient()
  const { data: invitation } = await admin
    .from('invitations')
    .select('id, organization_id, email, role, status, expires_at, organizations(slug)')
    .eq('token', params.token)
    .maybeSingle()

  if (!invitation)
    return NextResponse.json({ error: 'Invitation not found', code: 'NOT_FOUND' }, { status: 404 })

  const effective = resolveInvitationStatus(invitation)
  if (effective === 'revoked' || effective === 'expired' || effective === 'accepted') {
    return NextResponse.json(
      { error: `This invitation has been ${effective}`, code: effective.toUpperCase() },
      { status: 410 },
    )
  }

  if (normalizeInviteEmail(profile.email) !== invitation.email) {
    return NextResponse.json(
      {
        error: 'This invitation was sent to a different email address. Sign in with the invited account.',
        code: 'EMAIL_MISMATCH',
      },
      { status: 403 },
    )
  }

  const orgId = invitation.organization_id

  const { data: alreadyMember } = await admin
    .from('organization_members')
    .select('id')
    .eq('organization_id', orgId)
    .eq('user_id', profile.id)
    .maybeSingle()
  if (alreadyMember) {
    // Self-heal: mark stale pending rows accepted so the UI stops offering them.
    await admin
      .from('invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: profile.id })
      .eq('id', invitation.id)
      .eq('status', 'pending')
    return NextResponse.json(
      { error: 'You are already a member of this organization', code: 'ALREADY_MEMBER', slug: (invitation.organizations as any)?.slug },
      { status: 409 },
    )
  }

  const [{ count: memberCount }, { data: orgRow }] = await Promise.all([
    admin.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    admin.from('organizations').select('subscription_tier').eq('id', orgId).single(),
  ])
  const limit = canAddAgent(orgRow ?? {}, memberCount || 0)
  if (!limit.allowed)
    return NextResponse.json({ error: limit.reason || 'Plan limit reached', code: 'PLAN_LIMIT' }, { status: 403 })

  // Atomic single-use claim.
  const now = new Date().toISOString()
  const { data: claimed, error: claimError } = await admin
    .from('invitations')
    .update({ status: 'accepted', accepted_at: now, accepted_by: profile.id, updated_at: now })
    .eq('id', invitation.id)
    .eq('status', 'pending')
    .select('id')

  if (claimError)
    return NextResponse.json({ error: claimError.message, code: 'DB_ERROR' }, { status: 500 })
  if (!claimed || claimed.length === 0)
    return NextResponse.json({ error: 'This invitation has already been used', code: 'ALREADY_USED' }, { status: 410 })

  const { data: member, error: memberError } = await admin
    .from('organization_members')
    .insert({
      user_id: profile.id,
      organization_id: orgId,
      role: invitation.role,
      is_primary: false,
      accepted_at: now,
    })
    .select('id, role')

  if (memberError) {
    // Roll the claim back so the invitation can be retried.
    await admin
      .from('invitations')
      .update({ status: 'pending', accepted_at: null, accepted_by: null })
      .eq('id', invitation.id)
    return NextResponse.json({ error: memberError.message, code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      membership: member?.[0] ?? null,
      slug: (invitation.organizations as any)?.slug ?? null,
    },
  })
}
