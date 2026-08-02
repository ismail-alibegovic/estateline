import { describe, it, expect } from 'vitest'
import { generateClientPortalToken, isPortalTokenExpired } from '../client-portal'

describe('Client Portal Security Tokens', () => {
  it('generates a 64-char token with default 30-day expiration', () => {
    const res = generateClientPortalToken()

    expect(res.token).toHaveLength(64)
    expect(res.expires_at).toBeTruthy()
    expect(isPortalTokenExpired(res.expires_at)).toBe(false)
  })

  it('correctly detects expired portal tokens', () => {
    const expiredDate = new Date()
    expiredDate.setDate(expiredDate.getDate() - 1) // Yesterday

    expect(isPortalTokenExpired(expiredDate.toISOString())).toBe(true)
  })
})
