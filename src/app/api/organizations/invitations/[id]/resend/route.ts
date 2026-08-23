import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'
import { integrationEnv } from '@/lib/integration-env'
import { recordEmailOutcome } from '@/lib/email-log'
import { buildInvitationEmail, buildInviteUrl, invitationExpiry, resolveInvitationStatus } from '@/lib/invitations'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const resend = integrationEnv.resendApiKey ? new Resend(integrationEnv.resendApiKey) : null

/**
 * POST: resend an invitation email (owner/admin only).
 * Pending invitations keep their token; expired ones are re-activated with a
 * fresh 7-day window. Accepted/revoked invitations cannot be resent.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await getRouteContext()
  if (isAuthError(ctx)) return ctx
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return NextResponse.json({ error: 'Insufficient role' }, { status: 403 })

  const { data: invitation } = await ctx.supabase
    .from('invitations')
    .select('id, email, role, status, token, expires_at')
    .eq('id', params.id)
    .eq('organization_id', ctx.org.id)
    .maybeSingle()

  if (!invitation)
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })

  const effective = resolveInvitationStatus(invitation)
  if (effective === 'accepted' || effective === 'revoked')
    return NextResponse.json({ error: `Cannot resend a ${effective} invitation` }, { status: 409 })

  if (effective === 'expired') {
    const { error } = await ctx.supabase
      .from('invitations')
      .update({ expires_at: invitationExpiry(), updated_at: new Date().toISOString() })
      .eq('id', invitation.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://estateline.ba'
  const inviteUrl = buildInviteUrl(appUrl, invitation.token)
  const content = buildInvitationEmail({
    orgName: ctx.org.name,
    inviterName: ctx.user.full_name || null,
    role: invitation.role,
    inviteUrl,
  })

  let emailSent = false
  if (resend) {
    try {
      const result = await resend.emails.send({
        from: integrationEnv.emailFrom || 'Estateline <onboarding@resend.dev>',
        to: invitation.email,
        subject: content.subject,
        html: content.html,
      })
      if (result.error) throw new Error(result.error.message)
      emailSent = true
      await recordEmailOutcome(ctx.supabase, {
        organizationId: ctx.org.id,
        userId: ctx.user.id,
        recipient: invitation.email,
        subject: content.subject,
        template: 'team_invitation_resend',
        providerMessageId: result.data?.id ?? null,
        status: 'sent',
      })
    } catch (err: any) {
      await recordEmailOutcome(ctx.supabase, {
        organizationId: ctx.org.id,
        userId: ctx.user.id,
        recipient: invitation.email,
        subject: content.subject,
        template: 'team_invitation_resend',
        providerMessageId: null,
        status: 'failed',
        errorMessage: err?.message ?? 'Unknown send failure',
      })
    }
  }

  return NextResponse.json({ data: { id: invitation.id, inviteUrl }, emailSent })
}
