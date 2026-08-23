import { describe, it, expect } from 'vitest'
import {
  generateInvitationToken,
  invitationExpiry,
  resolveInvitationStatus,
  maskInviteEmail,
  buildInviteUrl,
  buildInvitationEmail,
  normalizeInviteEmail,
  isUniqueViolation,
  canGrantInvitationRole,
  INVITATION_TTL_DAYS,
} from '../invitations'

describe('invitation tokens', () => {
  it('generates 64-char hex tokens (32 bytes)', () => {
    const token = generateInvitationToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generates unique tokens', () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateInvitationToken()))
    expect(seen.size).toBe(200)
  })
})

describe('invitation expiry', () => {
  it('defaults to a 7-day TTL', () => {
    const from = new Date('2026-08-23T12:00:00Z')
    const expiry = new Date(invitationExpiry(from))
    expect(expiry.getTime() - from.getTime()).toBe(INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000)
  })

  it('normalizes emails for storage/matching', () => {
    expect(normalizeInviteEmail(' Agent@Example.COM ')).toBe('agent@example.com')
  })
})

describe('resolveInvitationStatus', () => {
  const future = new Date(Date.now() + 60_000).toISOString()
  const past = new Date(Date.now() - 60_000).toISOString()

  it('reports pending rows with future expiry as pending', () => {
    expect(resolveInvitationStatus({ status: 'pending', expires_at: future })).toBe('pending')
  })

  it('reports expired pendings as expired', () => {
    expect(resolveInvitationStatus({ status: 'pending', expires_at: past })).toBe('expired')
  })

  it('never reclassifies terminal states by time', () => {
    expect(resolveInvitationStatus({ status: 'accepted', expires_at: past })).toBe('accepted')
    expect(resolveInvitationStatus({ status: 'revoked', expires_at: past })).toBe('revoked')
  })
})

describe('maskInviteEmail', () => {
  it('masks local part and domain but keeps TLD', () => {
    expect(maskInviteEmail('ismail@example.com')).toBe('i***@e***.com')
  })

  it('handles malformed input without throwing', () => {
    expect(maskInviteEmail('not-an-email')).toBe('***')
  })
})

describe('buildInviteUrl / buildInvitationEmail', () => {
  it('builds the invite URL under /invite/<token>', () => {
    expect(buildInviteUrl('https://estateline.ba/', 'tok123')).toBe('https://estateline.ba/invite/tok123')
  })

  it('renders subject and body with org, role and link', () => {
    const email = buildInvitationEmail({
      orgName: 'Nekretnine Sarajevo',
      inviterName: null,
      role: 'agent',
      inviteUrl: 'https://estateline.ba/invite/tok123',
    })
    expect(email.subject).toContain('Nekretnine Sarajevo')
    expect(email.html).toContain('agent')
    expect(email.html).toContain('https://estateline.ba/invite/tok123')
    expect(email.html).toContain('#3520D5')
  })
})

describe('isUniqueViolation', () => {
  it('detects Postgres duplicate-key errors only', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true)
    expect(isUniqueViolation({ code: '23503' })).toBe(false)
    expect(isUniqueViolation({})).toBe(false)
  })
})


describe('canGrantInvitationRole', () => {
  it('allows owners to grant all invitation roles', () => {
    expect(canGrantInvitationRole('owner', 'owner')).toBe(true)
    expect(canGrantInvitationRole('owner', 'admin')).toBe(true)
    expect(canGrantInvitationRole('owner', 'agent')).toBe(true)
    expect(canGrantInvitationRole('owner', 'viewer')).toBe(true)
  })

  it('prevents admins from granting owner access', () => {
    expect(canGrantInvitationRole('admin', 'owner')).toBe(false)
    expect(canGrantInvitationRole('admin', 'admin')).toBe(true)
    expect(canGrantInvitationRole('admin', 'agent')).toBe(true)
  })

  it('prevents non-managers from granting any role', () => {
    expect(canGrantInvitationRole('agent', 'agent')).toBe(false)
    expect(canGrantInvitationRole('viewer', 'viewer')).toBe(false)
  })
})
