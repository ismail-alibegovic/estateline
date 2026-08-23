import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'
import { canAddAgent } from '@/lib/limits'
import { integrationEnv } from '@/lib/integration-env'
import { recordEmailOutcome } from '@/lib/email-log'
import {
  generateInvitationToken,
  invitationExpiry,
  normalizeInviteEmail,
  buildInvitationEmail,
  buildInviteUrl,
  isUniqueViolation,
  INVITATION_ROLES,
  InvitationRole,
  canGrantInvitationRole,
} from '@/lib/invitations'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const resend = integrationEnv.resendApiKey ? new Resend(integrationEnv.resendApiKey) : null

/**
 * GET: list invitations for the current organization.
 * Role gate: owner/admin (agent/viewer must not enumerate invites).
 */
export async function GET() {
  const ctx = await getRouteContext()
  if (isAuthError(ctx)) return ctx
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return NextResponse.json({ error: 'Insufficient role' }, { status: 403 })

  const { data, error } = await ctx.supabase
    .from('invitations')
    .select('id, email, role, status, created_at, expires_at, accepted_at')
    .eq('organization_id', ctx.org.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

/**
 * POST: create an invitation.
 * Flow: validate → plan limit → duplicate-active check → insert tokenized row
 * → best-effort email (logged). If Resend is not configured the invitation is
 * still created and `emailSent: false` tells the UI to offer "copy link".
 */
export async function POST(request: Request) {
  const ctx = await getRouteContext()
  if (isAuthError(ctx)) return ctx
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return NextResponse.json({ error: 'Insufficient role' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const email = body && typeof body.email === 'string' ? normalizeInviteEmail(body.email) : ''
  const role = (body?.role ?? 'agent') as InvitationRole

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  if (!INVITATION_ROLES.includes(role))
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  if (!canGrantInvitationRole(ctx.role, role))
    return NextResponse.json({ error: 'Only organization owners can grant owner access' }, { status: 403 })

  const [{ count: memberCount }, { data: orgRow }] = await Promise.all([
    ctx.supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', ctx.org.id),
    ctx.supabase.from('organizations').select('subscription_tier').eq('id', ctx.org.id).single(),
  ])

  const limit = canAddAgent(orgRow ?? {}, memberCount || 0)
  if (!limit.allowed)
    return NextResponse.json({ error: limit.reason || 'Plan limit reached' }, { status: 403 })

  // Block inviting an email that already belongs to the org.
  const { data: existingMember } = await ctx.supabase
    .from('organization_members')
    .select('id, users!inner(email)')
    .eq('organization_id', ctx.org.id)
    .eq('users.email', email)
    .maybeSingle()
  if (existingMember)
    return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 409 })

  const token = generateInvitationToken()
  const { data: invitation, error } = await ctx.supabase
    .from('invitations')
    .insert({
      organization_id: ctx.org.id,
      invited_by: ctx.user.id,
      email,
      role,
      status: 'pending',
      token,
      expires_at: invitationExpiry(),
    })
    .select('id, email, role, status, expires_at, created_at')
    .single()

  if (error) {
    if (isUniqueViolation(error))
      return NextResponse.json(
        { error: 'An active invitation for this email already exists' },
        { status: 409 },
      )
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let emailSent = false
  if (resend) {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://estateline.ba'
    const inviteUrl = buildInviteUrl(appUrl, token)
    const content = buildInvitationEmail({
      orgName: ctx.org.name,
      inviterName: ctx.user.full_name || null,
      role,
      inviteUrl,
    })
    try {
      const result = await resend.emails.send({
        from: integrationEnv.emailFrom || 'Estateline <onboarding@resend.dev>',
        to: email,
        subject: content.subject,
        html: content.html,
      })
      if (result.error) throw new Error(result.error.message)
      emailSent = true
      await recordEmailOutcome(
        ctx.supabase,
        {
          organizationId: ctx.org.id,
          userId: ctx.user.id,
          recipient: email,
          subject: content.subject,
          template: 'team_invitation',
          providerMessageId: result.data?.id ?? null,
          status: 'sent',
        },
      )
    } catch (err: any) {
      await recordEmailOutcome(
        ctx.supabase,
        {
          organizationId: ctx.org.id,
          userId: ctx.user.id,
          recipient: email,
          subject: content.subject,
          template: 'team_invitation',
          providerMessageId: null,
          status: 'failed',
          errorMessage: err?.message ?? 'Unknown send failure',
        },
      )
    }
  }

  return NextResponse.json({ data: invitation, emailSent }, { status: 201 })
}
