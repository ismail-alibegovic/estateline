import { describe, it, expect } from 'vitest'
import { calculateDealCommissions } from '../commission-service'

describe('Commission Split Engine', () => {
  it('calculates agent splits and agency net margin correctly', () => {
    const dealValue = 200000 // 200,000 EUR
    const commissionRatePct = 3.0 // 3% = 6,000 EUR total pool

    const splits = [
      { agent_id: 'agent-1', agent_name: 'Marko Marković', split_percentage: 60.0 }, // 60% of 6,000 = 3,600
      { agent_id: 'agent-2', agent_name: 'Ana Anić', split_percentage: 20.0 }, // 20% of 6,000 = 1,200
    ]

    const result = calculateDealCommissions(dealValue, commissionRatePct, splits)

    expect(result.total_agency_commission).toBe(6000)
    expect(result.agent_splits[0].commission_amount).toBe(3600)
    expect(result.agent_splits[1].commission_amount).toBe(1200)
    expect(result.agency_net_amount).toBe(1200) // Remaining 20%
  })

  it('handles 100% agent split with 0 agency net margin', () => {
    const result = calculateDealCommissions(100000, 3.0, [
      { agent_id: 'a1', agent_name: 'Agent A', split_percentage: 100.0 },
    ])

    expect(result.total_agency_commission).toBe(3000)
    expect(result.agent_splits[0].commission_amount).toBe(3000)
    expect(result.agency_net_amount).toBe(0)
  })
})
