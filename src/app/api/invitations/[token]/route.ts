import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { maskInviteEmail, resolveInvitationStatus, InvitationStatus } from '@/lib/invitations'

export const dynamic = 'force-dynamic'

/**
 * GET: public invitation preview by token.
 * Returns only what the invite landing page needs — no tokens, no org internals.
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } },
) {
  const admin = createAdminClient()
  const { data: invitation } = await admin
    .from('invitations')
    .select('email, role, status, expires_at, organizations(name)')
    .eq('token', params.token)
    .maybeSingle()

  if (!invitation)
    return NextResponse.json({ error: 'Invitation not found', code: 'NOT_FOUND' }, { status: 404 })

  const status: InvitationStatus = resolveInvitationStatus(invitation)

  return NextResponse.json({
    data: {
      orgName: (invitation.organizations as any)?.name ?? 'Organization',
      maskedEmail: maskInviteEmail(invitation.email),
      role: invitation.role,
      status,
      expiresAt: invitation.expires_at,
    },
  })
}
