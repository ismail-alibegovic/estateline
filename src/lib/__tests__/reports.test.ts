import { describe, it, expect } from 'vitest'
import { calculateFunnelMetrics, formatCurrency } from '../report-helpers'

describe('Reports & Analytics Helpers', () => {
  it('calculates funnel conversion metrics correctly', () => {
    const stageData = [
      { stage: 'new', count: 50 },
      { stage: 'qualified', count: 25 },
      { stage: 'viewing', count: 15 },
      { stage: 'closed_won', count: 10 }
    ]

    const metrics = calculateFunnelMetrics(stageData)
    expect(metrics).toHaveLength(4)
    expect(metrics[0].stage).toBe('New / Inbound')
    expect(metrics[0].conversionRate).toBe(100)
    expect(metrics[3].stage).toBe('Closed Won')
    expect(metrics[3].count).toBe(10)
    expect(metrics[3].conversionRate).toBe(10) // 10 out of 100 total = 10%
  })

  it('formats currency values cleanly', () => {
    expect(formatCurrency(1250000)).toBe('1,250,000 KM')
    expect(formatCurrency(0)).toBe('0 KM')
    expect(formatCurrency(null)).toBe('0 KM')
  })
})
