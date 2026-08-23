import { describe, it, expect } from 'vitest'
import {
  parseBulkIds,
  MAX_BULK_IDS,
  LEAD_BULK_STATUSES,
  PROPERTY_BULK_STATUSES,
} from '../bulk'

const UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

describe('parseBulkIds', () => {
  it('accepts a valid list of uuids', () => {
    expect(parseBulkIds([UUID, UUID])).toEqual([UUID, UUID])
  })

  it('rejects non-arrays', () => {
    expect(parseBulkIds('x')).toBeNull()
    expect(parseBulkIds(null)).toBeNull()
    expect(parseBulkIds(undefined)).toBeNull()
  })

  it('rejects empty selections', () => {
    expect(parseBulkIds([])).toBeNull()
  })

  it('rejects lists above the limit', () => {
    expect(parseBulkIds(Array(MAX_BULK_IDS + 1).fill(UUID))).toBeNull()
  })

  it('rejects non-uuid entries', () => {
    expect(parseBulkIds([UUID, 'not-a-uuid'])).toBeNull()
    expect(parseBulkIds([42])).toBeNull()
  })
})

describe('status whitelists', () => {
  it('lead statuses match the schema constraint', () => {
    expect([...LEAD_BULK_STATUSES]).toEqual(['open', 'won', 'lost', 'junk'])
  })

  it('property statuses match the enum', () => {
    expect([...PROPERTY_BULK_STATUSES]).toEqual([
      'active',
      'inactive',
      'sold',
      'rented',
      'draft',
    ])
  })
})
