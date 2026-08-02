export interface AgentSplitInput {
  agent_id: string
  agent_name: string
  split_percentage: number // e.g. 60.0 for 60%
}

export interface CommissionCalculationResult {
  deal_value: number
  total_agency_commission: number // Total commission pool (e.g., 3% of deal value)
  agency_net_amount: number // Remaining for the agency after splits
  agent_splits: Array<{
    agent_id: string
    agent_name: string
    split_percentage: number
    commission_amount: number
  }>
}

/**
 * Calculates deal commission splits between primary/secondary agents and agency net margin.
 */
export function calculateDealCommissions(
  dealValue: number,
  commissionRatePct: number, // e.g. 3.0 for 3%
  splits: AgentSplitInput[]
): CommissionCalculationResult {
  const totalCommissionPool = (dealValue * commissionRatePct) / 100
  let allocatedAgentTotal = 0

  const agentSplits = splits.map((s) => {
    const amount = (totalCommissionPool * s.split_percentage) / 100
    allocatedAgentTotal += amount
    return {
      agent_id: s.agent_id,
      agent_name: s.agent_name,
      split_percentage: s.split_percentage,
      commission_amount: Math.round(amount * 100) / 100,
    }
  })

  const agencyNet = Math.max(0, totalCommissionPool - allocatedAgentTotal)

  return {
    deal_value: dealValue,
    total_agency_commission: Math.round(totalCommissionPool * 100) / 100,
    agency_net_amount: Math.round(agencyNet * 100) / 100,
    agent_splits: agentSplits,
  }
}
