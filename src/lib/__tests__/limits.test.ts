import { describe, it, expect } from 'vitest'
import { canAddAgent, canAddProperty, canSendWhatsApp } from '../limits'

describe('Plan Limit Logic', () => {
  it('enforces agent limits accurately per tier', () => {
    expect(canAddAgent({ subscription_tier: 'beta' }, 0).allowed).toBe(true)
    expect(canAddAgent({ subscription_tier: 'beta' }, 1).allowed).toBe(false)

    expect(canAddAgent({ subscription_tier: 'starter' }, 2).allowed).toBe(true)
    expect(canAddAgent({ subscription_tier: 'starter' }, 3).allowed).toBe(false)

    expect(canAddAgent({ subscription_tier: 'pro' }, 14).allowed).toBe(true)
    expect(canAddAgent({ subscription_tier: 'pro' }, 15).allowed).toBe(false)

    expect(canAddAgent({ subscription_tier: 'agency' }, 100).allowed).toBe(true)
  })

  it('enforces property limits accurately per tier', () => {
    expect(canAddProperty({ subscription_tier: 'beta' }, 9).allowed).toBe(true)
    expect(canAddProperty({ subscription_tier: 'beta' }, 10).allowed).toBe(false)

    expect(canAddProperty({ subscription_tier: 'starter' }, 1000).allowed).toBe(true)
    expect(canAddProperty({ subscription_tier: 'pro' }, 1000).allowed).toBe(true)
    expect(canAddProperty({ subscription_tier: 'agency' }, 1000).allowed).toBe(true)
  })

  it('enforces WhatsApp monthly message limits per tier', () => {
    expect(canSendWhatsApp({ subscription_tier: 'beta' }, 49).allowed).toBe(true)
    expect(canSendWhatsApp({ subscription_tier: 'beta' }, 50).allowed).toBe(false)

    expect(canSendWhatsApp({ subscription_tier: 'starter' }, 199).allowed).toBe(true)
    expect(canSendWhatsApp({ subscription_tier: 'starter' }, 200).allowed).toBe(false)

    expect(canSendWhatsApp({ subscription_tier: 'pro' }, 999).allowed).toBe(true)
    expect(canSendWhatsApp({ subscription_tier: 'pro' }, 1000).allowed).toBe(false)

    expect(canSendWhatsApp({ subscription_tier: 'agency' }, 5000).allowed).toBe(true)
  })
})
