/**
 * Helper utilities for Business Intelligence reports and conversion calculations.
 */

export interface StageCount {
  stage: string
  count: number
}

export interface FunnelMetric {
  stage: string
  count: number
  conversionRate: number // Percentage relative to total inbound leads
}

export function calculateFunnelMetrics(stageBreakdown: StageCount[] = []): FunnelMetric[] {
  const stageMap = new Map<string, number>()
  stageBreakdown.forEach(item => {
    stageMap.set(item.stage.toLowerCase(), Number(item.count || 0))
  })

  const newCount = stageMap.get('new') || stageMap.get('inbound') || 0
  const qualifiedCount = stageMap.get('qualified') || stageMap.get('contacted') || 0
  const viewingCount = stageMap.get('viewing') || stageMap.get('proposal') || 0
  const closedCount = stageMap.get('converted') || stageMap.get('won') || stageMap.get('closed_won') || 0

  const totalInbound = Math.max(1, newCount + qualifiedCount + viewingCount + closedCount)

  return [
    { stage: 'New / Inbound', count: newCount, conversionRate: 100 },
    { stage: 'Qualified', count: qualifiedCount, conversionRate: Math.round((qualifiedCount / totalInbound) * 100) },
    { stage: 'Viewing / Proposal', count: viewingCount, conversionRate: Math.round((viewingCount / totalInbound) * 100) },
    { stage: 'Closed Won', count: closedCount, conversionRate: Math.round((closedCount / totalInbound) * 100) }
  ]
}

export function formatCurrency(amount: number | string | null | undefined, currency = 'KM'): string {
  const val = Number(amount || 0)
  return `${val.toLocaleString()} ${currency}`
}
