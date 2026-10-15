import { describe, it, expect } from 'vitest'
import { ADMIN_ROLES, WRITER_ROLES, requireRole } from '../roles'
import type { Role } from '../roles'

function ctxWithRole(role: Role) {
  return { role }
}

describe('requireRole', () => {
  it('lets owners and admins through admin-only routes', () => {
    expect(requireRole(ctxWithRole('owner'), ADMIN_ROLES)).toBeNull()
    expect(requireRole(ctxWithRole('admin'), ADMIN_ROLES)).toBeNull()
  })

  it('blocks agents and viewers from admin-only routes with a 403', async () => {
    for (const role of ['agent', 'viewer'] as const) {
      const denied = requireRole(ctxWithRole(role), ADMIN_ROLES)
      expect(denied).not.toBeNull()
      expect(denied!.status).toBe(403)
      const body = await denied!.json()
      expect(body.code).toBe('INSUFFICIENT_ROLE')
    }
  })

  it('lets agents write but never viewers', () => {
    expect(requireRole(ctxWithRole('owner'), WRITER_ROLES)).toBeNull()
    expect(requireRole(ctxWithRole('admin'), WRITER_ROLES)).toBeNull()
    expect(requireRole(ctxWithRole('agent'), WRITER_ROLES)).toBeNull()
    expect(requireRole(ctxWithRole('viewer'), WRITER_ROLES)?.status).toBe(403)
  })

  it('rejects an unexpected role value instead of allowing it', () => {
    const ctx = { role: 'superuser' as unknown as Role }
    expect(requireRole(ctx, WRITER_ROLES)?.status).toBe(403)
  })
})
