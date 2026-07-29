'use client'

import { useEffect, useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  DollarSign,
  Filter,
  Download,
  Calendar,
  Award,
  ArrowUpRight
} from 'lucide-react'

export default function ReportsDashboardPage() {
  const [activeTab, setActiveTab] = useState<'agent' | 'conversion' | 'velocity' | 'financial'>('agent')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)

  // Report states
  const [agentData, setAgentData] = useState<any[]>([])
  const [conversionData, setConversionData] = useState<any>({ by_source: [], by_status: [], by_stage: [], lost_reasons: [] })
  const [velocityData, setVelocityData] = useState<any[]>([])
  const [financialData, setFinancialData] = useState<any>({})

  const fetchReports = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      const q = params.toString() ? `?${params.toString()}` : ''

      if (activeTab === 'agent') {
        const res = await fetch(`/api/reports/agent-performance${q}`)
        const json = await res.json()
        setAgentData(json.data || [])
      } else if (activeTab === 'conversion') {
        const res = await fetch(`/api/reports/lead-conversion${q}`)
        const json = await res.json()
        setConversionData(json.data || { by_source: [], by_status: [], by_stage: [], lost_reasons: [] })
      } else if (activeTab === 'velocity') {
        const res = await fetch(`/api/reports/time-to-close${q}`)
        const json = await res.json()
        setVelocityData(json.data || [])
      } else if (activeTab === 'financial') {
        const res = await fetch(`/api/reports/financial-forecasting`)
        const json = await res.json()
        setFinancialData(json.data || {})
      }
    } catch (e) {
      console.error('Failed to load report data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [activeTab, startDate, endDate])

  const exportCSV = () => {
    let rows: any[] = []
    let filename = `report_${activeTab}.csv`

    if (activeTab === 'agent') {
      rows = agentData.map(r => ({
        Agent: r.agent_name || r.agent_email,
        'Closed Deals': r.closed_deals_count,
        'Closed Volume (KM)': r.total_closed_price,
        'Commission Earned (KM)': r.total_commission_amount,
        'Viewings Conducted': r.viewings_conducted_count
      }))
    } else if (activeTab === 'velocity') {
      rows = velocityData.map(r => ({
        'Deal Type': r.deal_type,
        'Total Closed Deals': r.total_closed,
        'Avg Days to Close': r.avg_days_to_close,
        'Min Days to Close': r.min_days_to_close,
        'Max Days to Close': r.max_days_to_close
      }))
    } else if (activeTab === 'financial') {
      rows = [{
        'Total Pipeline Value': financialData.total_pipeline_value,
        'Weighted Revenue Forecast': financialData.weighted_forecast_revenue,
        'Closed Won Revenue': financialData.total_closed_won_revenue,
        'Earned Commission (Paid)': financialData.earned_commission_paid,
        'Earned Commission (Unpaid)': financialData.earned_commission_unpaid,
        'Active Deals': financialData.active_deals_count,
        'Closed Won Deals': financialData.closed_won_deals_count
      }]
    }

    if (!rows.length) return
    const keys = Object.keys(rows[0])
    const csvContent = [
      keys.join(','),
      ...rows.map(row => keys.map(k => `"${row[k] ?? ''}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#111827]">Business Intelligence & Reports</h1>
          <p className="text-sm text-[#6B7280]">Real-time analytics, revenue forecasting, agent rankings, and pipeline velocity.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] shadow-sm transition-all"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E7EB] pb-3">
        <div className="flex items-center gap-2">
          {[
            { id: 'agent', label: 'Agent Performance', icon: <Users size={15} /> },
            { id: 'conversion', label: 'Lead Funnel', icon: <TrendingUp size={15} /> },
            { id: 'velocity', label: 'Time to Close', icon: <Clock size={15} /> },
            { id: 'financial', label: 'Financial Forecast', icon: <DollarSign size={15} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-[#090e0c] text-[#FAF8F5] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#111827] hover:bg-white'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Date Filter */}
        {activeTab !== 'financial' && (
          <div className="flex items-center gap-2 text-xs">
            <Calendar size={14} className="text-[#9CA3AF]" />
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-2 py-1 bg-white border border-[#E5E7EB] rounded-md text-[#374151]"
            />
            <span className="text-[#9CA3AF]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-2 py-1 bg-white border border-[#E5E7EB] rounded-md text-[#374151]"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-[#6B7280]">Loading report insights...</div>
      ) : (
        <>
          {/* TAB 1: AGENT PERFORMANCE & LEADERBOARD */}
          {activeTab === 'agent' && (
            <div className="space-y-6">
              {/* Agent Leaderboard Card */}
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Award className="text-[#C9963B]" size={20} />
                    <h2 className="text-base font-semibold text-[#111827]">Agent Leaderboard & Sales Volume</h2>
                  </div>
                  <span className="text-xs text-[#6B7280]">Ranked by closed volume</span>
                </div>

                {agentData.length === 0 ? (
                  <p className="text-sm text-[#9CA3AF] py-4">No agent performance data recorded for this date range.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#F3F4F6] text-[#9CA3AF] font-semibold uppercase tracking-wider">
                          <th className="py-3 px-2">Rank</th>
                          <th className="py-3 px-2">Agent</th>
                          <th className="py-3 px-2 text-right">Closed Deals</th>
                          <th className="py-3 px-2 text-right">Closed Volume</th>
                          <th className="py-3 px-2 text-right">Commission Earned</th>
                          <th className="py-3 px-2 text-right">Viewings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F3F4F6]">
                        {agentData.map((agent, idx) => (
                          <tr key={agent.agent_id} className="hover:bg-[#FAF8F5]">
                            <td className="py-3.5 px-2 font-bold">
                              {idx === 0 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#FEF3C7] text-[#D97706] font-bold">1</span>
                              ) : (
                                <span className="text-[#6B7280] ml-2">#{idx + 1}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-2 font-semibold text-[#111827]">
                              {agent.agent_name || agent.agent_email}
                            </td>
                            <td className="py-3.5 px-2 text-right font-medium">{agent.closed_deals_count}</td>
                            <td className="py-3.5 px-2 text-right font-bold text-[#111827]">
                              {Number(agent.total_closed_price || 0).toLocaleString()} KM
                            </td>
                            <td className="py-3.5 px-2 text-right font-semibold text-[#059669]">
                              {Number(agent.total_commission_amount || 0).toLocaleString()} KM
                            </td>
                            <td className="py-3.5 px-2 text-right text-[#6B7280]">{agent.viewings_conducted_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LEAD FUNNEL */}
          {activeTab === 'conversion' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm">
                <h3 className="text-sm font-semibold text-[#111827] mb-4">Lead Source Attribution</h3>
                <div className="space-y-3">
                  {(conversionData.by_source || []).map((item: any) => (
                    <div key={item.source} className="flex items-center justify-between text-xs">
                      <span className="capitalize font-medium text-[#374151]">{item.source || 'Direct / Unknown'}</span>
                      <span className="font-bold text-[#111827]">{item.count} leads</span>
                    </div>
                  ))}
                  {(!conversionData.by_source || conversionData.by_source.length === 0) && (
                    <p className="text-xs text-[#9CA3AF]">No lead source data available.</p>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm">
                <h3 className="text-sm font-semibold text-[#111827] mb-4">Pipeline Stage Breakdown</h3>
                <div className="space-y-3">
                  {(conversionData.by_stage || []).map((item: any) => (
                    <div key={item.stage} className="flex items-center justify-between text-xs">
                      <span className="capitalize font-medium text-[#374151]">{item.stage}</span>
                      <span className="font-bold text-[#111827]">{item.count}</span>
                    </div>
                  ))}
                  {(!conversionData.by_stage || conversionData.by_stage.length === 0) && (
                    <p className="text-xs text-[#9CA3AF]">No stage breakdown available.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TIME TO CLOSE */}
          {activeTab === 'velocity' && (
            <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm">
              <h3 className="text-base font-semibold text-[#111827] mb-4">Transaction Velocity (Days to Close)</h3>
              {velocityData.length === 0 ? (
                <p className="text-sm text-[#9CA3AF]">No closed deal velocity metrics recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#F3F4F6] text-[#9CA3AF] font-semibold uppercase">
                        <th className="py-3 px-2">Deal Type</th>
                        <th className="py-3 px-2 text-right">Total Closed</th>
                        <th className="py-3 px-2 text-right">Avg Days</th>
                        <th className="py-3 px-2 text-right">Min Days</th>
                        <th className="py-3 px-2 text-right">Max Days</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6]">
                      {velocityData.map((row) => (
                        <tr key={row.deal_type} className="hover:bg-[#FAF8F5]">
                          <td className="py-3.5 px-2 font-semibold capitalize text-[#111827]">{row.deal_type}</td>
                          <td className="py-3.5 px-2 text-right">{row.total_closed}</td>
                          <td className="py-3.5 px-2 text-right font-bold text-[#059669]">{row.avg_days_to_close} days</td>
                          <td className="py-3.5 px-2 text-right text-[#6B7280]">{row.min_days_to_close} days</td>
                          <td className="py-3.5 px-2 text-right text-[#6B7280]">{row.max_days_to_close} days</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FINANCIAL FORECASTING */}
          {activeTab === 'financial' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Weighted Forecast Revenue</p>
                <p className="text-2xl font-bold text-[#111827] mt-2">
                  {Number(financialData.weighted_forecast_revenue || 0).toLocaleString()} KM
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">Probability-adjusted pipeline value</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Closed Won Revenue</p>
                <p className="text-2xl font-bold text-[#059669] mt-2">
                  {Number(financialData.total_closed_won_revenue || 0).toLocaleString()} KM
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">{financialData.closed_won_deals_count || 0} completed deals</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Commissions (Paid vs Unpaid)</p>
                <p className="text-xl font-bold text-[#111827] mt-2">
                  {Number(financialData.earned_commission_paid || 0).toLocaleString()} KM <span className="text-xs font-normal text-[#059669]">(Paid)</span>
                </p>
                <p className="text-xs font-semibold text-[#D97706] mt-1">
                  {Number(financialData.earned_commission_unpaid || 0).toLocaleString()} KM pending payout
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
