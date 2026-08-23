import crypto from 'crypto'

export type InvitationRole = 'owner' | 'admin' | 'agent' | 'viewer'
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export const INVITATION_ROLES: InvitationRole[] = ['owner', 'admin', 'agent', 'viewer']
export const INVITATION_TTL_DAYS = 7

/** 64-char hex token from 32 random bytes. */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function invitationExpiry(from: Date = new Date()): string {
  return new Date(from.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Effective status of an invitation row. A row stuck in 'pending' whose
 * expiry has passed is reported (and may lazily be persisted) as 'expired'.
 */
export function resolveInvitationStatus(
  row: { status: string; expires_at: string },
  now: Date = new Date(),
): InvitationStatus {
  if (row.status === 'pending' && new Date(row.expires_at).getTime() <= now.getTime()) {
    return 'expired'
  }
  return row.status as InvitationStatus
}

/** Mask an invited email for public preview: j***@d***.com */
export function maskInviteEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  return `${local[0]}***@${domain[0]}***.${domain.split('.').pop() || 'com'}`
}

export type InvitationEmailPayload = {
  orgName: string
  inviterName: string | null
  role: InvitationRole
  inviteUrl: string
}

/** Branded invitation email consistent with existing transactional templates. */
export function buildInvitationEmail(payload: InvitationEmailPayload): { subject: string; html: string } {
  const { orgName, inviterName, role, inviteUrl } = payload
  const inviter = inviterName || 'A team administrator'
  const subject = `You've been invited to join ${orgName} on Estateline`
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #3520D5;">Join ${orgName}</h2>
      <p>${inviter} has invited you to collaborate as <strong>${role}</strong> on Estateline, the real-estate CRM for ${orgName}.</p>
      <p style="margin: 24px 0;">
        <a href="${inviteUrl}" style="background-color: #3520D5; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Accept invitation</a>
      </p>
      <p style="font-size: 13px; color: #555;">If the button doesn't work, paste this link into your browser:<br /><span style="color: #3520D5; word-break: break-all;">${inviteUrl}</span></p>
      <p style="font-size: 13px; color: #555;">This invitation expires in 7 days and can only be used once.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888;">Sent via Estateline CRM</p>
    </div>
  `.trim()
  return { subject, html }
}

export function buildInviteUrl(appUrl: string, token: string): string {
  return `${appUrl.replace(/\/$/, '')}/invite/${token}`
}

export function isUniqueViolation(error: { code?: string }): boolean {
  return error?.code === '23505'
}
