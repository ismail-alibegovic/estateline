import { describe, it, expect } from 'vitest'
import { calculateWebhookSignature } from '../webhook-signature'

describe('Webhook Dispatcher & HMAC Security', () => {
  it('calculates deterministic HMAC-SHA256 signature for payload', () => {
    const secret = 'whsec_test_secret_123456789'
    const payload = JSON.stringify({ event: 'property.created', id: '123' })

    const sig1 = calculateWebhookSignature(secret, payload)
    const sig2 = calculateWebhookSignature(secret, payload)

    expect(sig1).toBe(sig2)
    expect(sig1.length).toBe(64) // SHA-256 hex string length
  })

  it('generates different signatures for different secrets or payloads', () => {
    const secret1 = 'secret_a'
    const secret2 = 'secret_b'
    const payload = JSON.stringify({ event: 'lead.created' })

    const sig1 = calculateWebhookSignature(secret1, payload)
    const sig2 = calculateWebhookSignature(secret2, payload)

    expect(sig1).not.toBe(sig2)
  })
})
