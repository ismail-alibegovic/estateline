import { describe, it, expect } from 'vitest'
import { resolveHostIdentifier } from '../domain-helpers'

describe('Domain Helpers', () => {
  it('parses internal subdomains correctly', () => {
    expect(resolveHostIdentifier('demoagency.estateline.ba', 'fallback')).toEqual({
      identifier: 'demoagency',
      isCustomDomain: false
    })
    expect(resolveHostIdentifier('localhost:3000', 'demo')).toEqual({
      identifier: 'demo',
      isCustomDomain: false
    })
  })

  it('identifies custom agency domains correctly', () => {
    expect(resolveHostIdentifier('properties.bestrealestate.com', 'fallback')).toEqual({
      identifier: 'properties.bestrealestate.com',
      isCustomDomain: true
    })
  })
})
