import { describe, it, expect } from 'vitest'
import { calculatePropertyValuation } from '../valuation-helpers'

describe('Valuation Helpers', () => {
  it('calculates accurate valuation estimates for apartments in Sarajevo', () => {
    const res = calculatePropertyValuation({
      city: 'Sarajevo',
      type: 'apartment',
      area_size: 70,
      bedrooms: 2,
      bathrooms: 1,
      year_built: 2022
    })

    expect(res.city).toBe('Sarajevo')
    expect(res.type).toBe('apartment')
    expect(res.area_size).toBe(70)
    expect(res.estimated_price).toBeGreaterThan(200000)
    expect(res.min_price).toBeLessThan(res.estimated_price)
    expect(res.max_price).toBeGreaterThan(res.estimated_price)
    expect(res.confidence_score).toBeGreaterThanOrEqual(85)
  })

  it('adjusts rates for modern houses in Mostar', () => {
    const res = calculatePropertyValuation({
      city: 'Mostar',
      type: 'house',
      area_size: 150,
      bedrooms: 4,
      bathrooms: 2
    })

    expect(res.estimated_price).toBeGreaterThan(250000)
    expect(res.currency).toBe('BAM')
  })
})
