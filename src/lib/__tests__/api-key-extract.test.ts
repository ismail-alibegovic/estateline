import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(), rateLimitResponse: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getRouteContext: vi.fn(), isAuthError: vi.fn() }))

import { extractApiKey, hashApiKey } from '../api-key-auth'

const req = (authorization?: string) => ({
  headers: new Headers(authorization ? { authorization } : {}),
})

describe('api key helpers', () => {
  it('extracts an Estateline bearer key', () => {
    expect(extractApiKey(req('Bearer est_live_abc123'))).toBe('est_live_abc123')
    expect(extractApiKey(req('bearer est_live_abc123'))).toBe('est_live_abc123')
  })

  it('ignores missing, malformed or foreign tokens', () => {
    expect(extractApiKey(req())).toBeNull()
    expect(extractApiKey(req('Bearer sk_other_123'))).toBeNull()
    expect(extractApiKey(req('Basic est_live_abc'))).toBeNull()
    expect(extractApiKey(req('Bearer est_live_a b'))).toBeNull()
  })

  it('hashes with sha256 hex, matching key creation', () => {
    expect(hashApiKey('est_live_x')).toMatch(/^[0-9a-f]{64}$/)
    expect(hashApiKey('est_live_x')).toBe(hashApiKey('est_live_x'))
    expect(hashApiKey('est_live_x')).not.toBe(hashApiKey('est_live_y'))
  })
})
