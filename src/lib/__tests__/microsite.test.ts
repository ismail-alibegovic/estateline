import { describe, it, expect } from 'vitest'
import { mapAgency, mapProperty } from '../microsite'

describe('microsite mappers', () => {
  it('maps org row with empty branding to safe defaults', () => {
    const a = mapAgency({ id: '1', name: 'Acme', slug: 'acme', logo_url: null, branding: null })
    expect(a.primary_color).toBe('#1a2332')
    expect(a.accent_color).toBe('#C9963B')
    expect(a.phone).toBeNull()
  })
  it('reads branding values', () => {
    const a = mapAgency({ id: '1', name: 'A', slug: 'a', branding: { primary_color: '#000', phone: '+387', tagline: 'Hi' } })
    expect(a.primary_color).toBe('#000')
    expect(a.phone).toBe('+387')
    expect(a.tagline).toBe('Hi')
  })
  it('derives listing type from price_period and maps area/cover', () => {
    const p = mapProperty({ id: 'p', title: 'T', slug: 't', price: '1200', price_period: 'month', area_size: '55', type: 'apartment', images: ['x.jpg', 5] })
    expect(p.listing_type).toBe('rent')
    expect(p.area).toBe(55)
    expect(p.price).toBe(1200)
    expect(p.cover_image).toBe('x.jpg')
    expect(p.images).toEqual(['x.jpg'])
    expect(mapProperty({ id: 'p', title: 'T', slug: 't', price: 1 }).listing_type).toBe('sale')
  })
})
