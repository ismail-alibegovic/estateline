import { describe, it, expect, vi, afterEach } from 'vitest'
import { generatePropertyDescription, calculatePropertyLeadMatches } from '../ai-service'

describe('AI Service & Matchmaking', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('generates fallback property description with rule engine', async () => {
    vi.stubEnv('ESTATELINE_GEMINI_API_KEY', '')
    vi.stubEnv('GEMINI_API_KEY', '')
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '')

    const result = await generatePropertyDescription({
      title: 'Luksuzan stan u centru',
      type: 'Stan',
      price: 250000,
      currency: 'BAM',
      area_size: 85,
      bedrooms: 3,
      bathrooms: 2,
      city: 'Sarajevo',
      language: 'bs',
    })

    expect(result.headline).toContain('Stan u lokaciji Sarajevo')
    expect(result.key_highlights.length).toBeGreaterThan(0)
    expect(result.generated_via).toBe('rule_engine')
  })

  it('calculates perfect matchmaking score for matching criteria', () => {
    const lead = {
      id: 'lead-1',
      preferred_type: 'Stan',
      preferred_city: 'Sarajevo',
      budget_max: 300000,
      budget_min: 150000,
      min_bedrooms: 2,
    }

    const properties = [
      {
        id: 'prop-1',
        title: 'Moderan stan Grbavica',
        type: 'Stan',
        city: 'Sarajevo',
        price: 220000,
        currency: 'BAM',
        bedrooms: 3,
      },
      {
        id: 'prop-2',
        title: 'Kuća Ilidža',
        type: 'Kuća',
        city: 'Ilidža',
        price: 450000,
        currency: 'BAM',
        bedrooms: 4,
      },
    ]

    const matches = calculatePropertyLeadMatches(lead, properties)

    expect(matches[0].property_id).toBe('prop-1')
    expect(matches[0].match_score).toBeGreaterThanOrEqual(85)
    expect(matches[0].match_level).toBe('perfect')

    expect(matches[1].property_id).toBe('prop-2')
    expect(matches[1].match_score).toBeLessThan(50)
  })
})
