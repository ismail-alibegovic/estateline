import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Auth is mocked so each route can be exercised with any role. The role
// helpers stay real: they are what the routes call to decide.
let currentCtx: unknown
vi.mock('@/lib/auth', async () => {
  const roles = await import('@/lib/roles')
  return {
    ...roles,
    getRouteContext: vi.fn(async () => currentCtx),
    isAuthError: (c: unknown) => c instanceof Response,
  }
})
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ success: true })),
  rateLimitResponse: vi.fn(() => new Response('rate limited', { status: 429 })),
}))
vi.mock('@/lib/supabase', () => ({ createAdminClient: vi.fn(), createBrowserClient: vi.fn() }))

const noDb = new Proxy({}, {
  get() {
    throw new Error('database must not be touched when the role check fails')
  },
})

function ctx(role: string) {
  return {
    supabase: noDb,
    user: { id: 'u1', auth_id: 'a1', email: 'x@y.ba', full_name: 'X' },
    org: { id: 'org-1', name: 'Org', slug: 'org' },
    role,
  }
}

const req = (method: string, url = 'http://localhost/api/x') =>
  new NextRequest(url, { method, body: method === 'GET' ? undefined : '{}' })

// [module path, exported handler, method]
const ADMIN_ONLY: Array<[string, string, string]> = [
  ['../developer/api-keys/route', 'GET', 'GET'],
  ['../developer/api-keys/route', 'POST', 'POST'],
  ['../developer/api-keys/route', 'DELETE', 'DELETE'],
  ['../webhooks/subscriptions/route', 'GET', 'GET'],
  ['../webhooks/subscriptions/route', 'POST', 'POST'],
  ['../audit-logs/route', 'GET', 'GET'],
  ['../billing/portal/route', 'POST', 'POST'],
  ['../billing/checkout/route', 'POST', 'POST'],
]

describe('admin-only API routes', () => {
  beforeEach(() => {
    currentCtx = undefined
  })

  for (const [mod, handler, method] of ADMIN_ONLY) {
    for (const role of ['agent', 'viewer']) {
      it(`${mod.replace('../', '')} ${handler} rejects ${role} with 403 before touching data`, async () => {
        currentCtx = ctx(role)
        const route = await import(/* @vite-ignore */ mod)
        const res: Response = await route[handler](req(method))
        expect(res.status).toBe(403)
        expect((await res.json()).code).toBe('INSUFFICIENT_ROLE')
      })
    }
  }

  const WRITER_ONLY: Array<[string, string]> = [
    ['../sms/send/route', 'POST'],
    ['../email/send/route', 'POST'],
    ['../communications/quick-send/route', 'POST'],
    ['../ai/generate-description/route', 'POST'],
  ]
  for (const [mod, method] of WRITER_ONLY) {
    it(`${mod.replace('../', '')} rejects viewer with 403`, async () => {
      currentCtx = ctx('viewer')
      const route = await import(/* @vite-ignore */ mod)
      const res: Response = await route[method](req(method))
      expect(res.status).toBe(403)
    })
  }

  it('unauthenticated callers get the auth error, not data', async () => {
    currentCtx = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    const route = await import('../developer/api-keys/route')
    const res: Response = await route.GET()
    expect(res.status).toBe(401)
  })
})
