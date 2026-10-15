import { describe, it, expect, vi, beforeEach } from 'vitest'

let currentCtx: any
const dispatch = vi.fn()
vi.mock('@/lib/auth', async () => {
  const roles = await import('@/lib/roles')
  return {
    ...roles,
    getRouteContext: vi.fn(async () => currentCtx),
    isAuthError: (c: unknown) => c instanceof Response,
  }
})
vi.mock('@/lib/webhook-dispatcher', () => ({ dispatchWebhookEvent: (...a: unknown[]) => dispatch(...a) }))

function dbReturning(row: unknown, calls: any[] = []) {
  const chain: any = {
    update: (p: unknown) => { calls.push(['update', p]); return chain },
    eq: (k: string, v: unknown) => { calls.push(['eq', k, v]); return chain },
    select: () => chain,
    single: async () => ({ data: row, error: row ? null : { message: 'none' } }),
  }
  return { from: () => chain }
}
const ctx = (role: string, db: any) => ({
  supabase: db, user: { id: 'u1' }, org: { id: 'org-1' }, role,
})
const patch = (body: unknown) =>
  new Request('http://x/api/deals/d1', { method: 'PATCH', body: JSON.stringify(body) })

describe('PATCH /api/deals/[id]', () => {
  beforeEach(() => { dispatch.mockClear() })

  it('rejects viewers with 403', async () => {
    const { PATCH } = await import('../deals/[id]/route')
    currentCtx = ctx('viewer', {})
    const res = await PATCH(patch({ stage: 'offer' }), { params: { id: 'd1' } })
    expect(res.status).toBe(403)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('rejects an unknown stage', async () => {
    const { PATCH } = await import('../deals/[id]/route')
    currentCtx = ctx('agent', {})
    const res = await PATCH(patch({ stage: 'bogus' }), { params: { id: 'd1' } })
    expect(res.status).toBe(400)
  })

  it('ignores non-editable fields and scopes by organization', async () => {
    const { PATCH } = await import('../deals/[id]/route')
    const calls: any[] = []
    currentCtx = ctx('agent', dbReturning({ id: 'd1', stage: 'offer' }, calls))
    const res = await PATCH(
      patch({ stage: 'offer', organization_id: 'evil', id: 'x' }),
      { params: { id: 'd1' } }
    )
    expect(res.status).toBe(200)
    const upd = calls.find(c => c[0] === 'update')[1]
    expect(upd.organization_id).toBeUndefined()
    expect(upd.id).toBeUndefined()
    expect(calls).toContainEqual(['eq', 'organization_id', 'org-1'])
    expect(dispatch).toHaveBeenCalledWith('org-1', 'deal.updated', { id: 'd1', stage: 'offer' })
  })

  it('stamps closed_at when a deal is won', async () => {
    const { PATCH } = await import('../deals/[id]/route')
    const calls: any[] = []
    currentCtx = ctx('admin', dbReturning({ id: 'd1' }, calls))
    await PATCH(patch({ stage: 'closed_won' }), { params: { id: 'd1' } })
    expect(calls.find(c => c[0] === 'update')[1].closed_at).toBeTruthy()
  })

  it('404s when the deal is not in this organization', async () => {
    const { PATCH } = await import('../deals/[id]/route')
    currentCtx = ctx('agent', dbReturning(null))
    const res = await PATCH(patch({ stage: 'offer' }), { params: { id: 'other-org-deal' } })
    expect(res.status).toBe(404)
    expect(dispatch).not.toHaveBeenCalled()
  })
})
