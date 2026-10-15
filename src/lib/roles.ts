export type Role = 'owner' | 'admin' | 'agent' | 'viewer'

/** Organization owners and admins: settings, billing, data in/out, developer tools. */
export const ADMIN_ROLES: readonly Role[] = ['owner', 'admin']

/** Everyone who may change data or send messages. Excludes read-only viewers. */
export const WRITER_ROLES: readonly Role[] = ['owner', 'admin', 'agent']

/**
 * Role gate for API routes. Returns a 403 Response when the caller's role is
 * not in `allowed`, otherwise null:
 *
 *   const denied = requireRole(ctx, ADMIN_ROLES)
 *   if (denied) return denied
 *
 * RLS only isolates tenants; it does not restrict by role on most tables, so
 * routes that need owner/admin or non-viewer access must call this.
 */
export function requireRole(
  ctx: { role: Role },
  allowed: readonly Role[]
): Response | null {
  if (allowed.includes(ctx.role)) return null
  return new Response(
    JSON.stringify({
      error: 'You do not have permission to perform this action.',
      code: 'INSUFFICIENT_ROLE',
    }),
    { status: 403, headers: { 'content-type': 'application/json' } }
  )
}
