'use client'

import { useEffect, useState } from 'react'
import {
  BarChart3, TrendingUp, Users, Clock, DollarSign, Filter,
  Download, Calendar, Award, ArrowUpRight, CheckCircle2, Building2
} from 'lucide-react'
import { useCurrency } from '@/components/CurrencyContext'

export default function ReportsDashboardPage() {
  const { formatPrice } = useCurrency()
  const [activeTab, setActiveTab] = useState<'agent' | 'conversion' | 'velocity' | 'financial'>('agent')
  const [loading, setLoading] = useState(false)

  // Demo fallback datasets
  const agentData = [
    { agent_name: 'Dino Hodžić', closed_deals_count: 5, total_closed_price: 1250000, total_commission_amount: 37500, viewings_conducted_count: 14 },
    { agent_name: 'Selma Begović', closed_deals_count: 3, total_closed_price: 780000, total_commission_amount: 23400, viewings_conducted_count: 9 },
    { agent_name: 'Mirza Selimović', closed_deals_count: 2, total_closed_price: 490000, total_commission_amount: 14700, viewings_conducted_count: 6 },
  ]

  const financialData = {
    total_pipeline_value: 1730000,
    weighted_forecast_revenue: 1245000,
    total_closed_won_revenue: 2520000,
    earned_commission_paid: 75600,
    earned_commission_unpaid: 32700,
  }

  const exportCSV = () => {
    const csvContent = "Agent,Broj Prodaja,Ukupna Vrijednost,Ostvarena Provizija\n" +
      agentData.map(r => `"${r.agent_name}",${r.closed_deals_count},"${r.total_closed_price} €","${r.total_commission_amount} €"`).join("\n")

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Izvjestaj_Estateline_${activeTab}.csv`
    link.click()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4 font-sans animate-fade-in">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/70 pb-6">
        <div>
          <p className="page-eyebrow mb-1">ANALITIKA & IZVJEŠTAJI AGENCIJE</p>
          <h1
            className="text-3xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
          >
            Business Intelligence
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Učinak agenata, stopa konverzije kupaca, brzina prodaje i finansijske prognoze.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-[#C9963B] bg-amber-50 border border-amber-200/80 hover:bg-amber-100 transition-colors shadow-sm"
        >
          <Download size={16} />
          <span>Izvezi CSV Izvještaj</span>
        </button>
      </header>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200 gap-1 overflow-x-auto">
        {[
          { id: 'agent', label: 'Učinak Agenata', icon: <Users size={14} /> },
          { id: 'conversion', label: 'Lijevak Upita (Funnel)', icon: <TrendingUp size={14} /> },
          { id: 'velocity', label: 'Brzina Prodaje', icon: <Clock size={14} /> },
          { id: 'financial', label: 'Finansijska Prognoza', icon: <DollarSign size={14} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: AGENT PERFORMANCE */}
      {activeTab === 'agent' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200/70 rounded-3xl p-6 shadow-sm space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C9963B]">Top Agent Mjeseca</span>
              <h3 className="text-2xl font-bold text-gray-900">Dino Hodžić</h3>
              <p className="text-xs text-gray-500">5 zaključenih ugovora • {formatPrice(37500)} provizije</p>
            </div>
            <div className="bg-white border border-gray-200/70 rounded-3xl p-6 shadow-sm space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Ukupno Obilazaka</span>
              <h3 className="text-2xl font-bold text-gray-900">29 Obilazaka</h3>
              <p className="text-xs text-gray-500">Prosječno 9 obilazaka po agentu</p>
            </div>
            <div className="bg-white border border-gray-200/70 rounded-3xl p-6 shadow-sm space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Ostvarena Provizija</span>
              <h3 className="text-2xl font-bold text-emerald-700">{formatPrice(75600)}</h3>
              <p className="text-xs text-gray-500">+ €32,700 u obradi za isplatu</p>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-white rounded-3xl border border-gray-200/70 shadow-sm overflow-hidden divide-y divide-gray-100">
            <div className="p-4 bg-gray-50/70 flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
              <span>Agent</span>
              <span>Zaključeno Poslova</span>
              <span>Obilazaka</span>
              <span>Ukupni Volumen</span>
              <span>Provizija</span>
            </div>

            {agentData.map((a, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between gap-4 text-xs font-semibold text-gray-900">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <span>{a.agent_name}</span>
                </div>
                <span>{a.closed_deals_count} ugovora</span>
                <span>{a.viewings_conducted_count} obilazaka</span>
                <span>{formatPrice(a.total_closed_price)}</span>
                <span className="text-[#C9963B] font-bold">{formatPrice(a.total_commission_amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIAL FORECAST */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-gray-200/70 rounded-3xl p-6 shadow-sm space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Ukupni Pipeline</span>
              <h3 className="text-2xl font-bold text-gray-900">{formatPrice(financialData.total_pipeline_value)}</h3>
            </div>
            <div className="bg-white border border-gray-200/70 rounded-3xl p-6 shadow-sm space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C9963B]">Prognozirani Prihod</span>
              <h3 className="text-2xl font-bold text-[#C9963B]">{formatPrice(financialData.weighted_forecast_revenue)}</h3>
            </div>
            <div className="bg-white border border-gray-200/70 rounded-3xl p-6 shadow-sm space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Naplaćene Provizije</span>
              <h3 className="text-2xl font-bold text-emerald-700">{formatPrice(financialData.earned_commission_paid)}</h3>
            </div>
            <div className="bg-white border border-gray-200/70 rounded-3xl p-6 shadow-sm space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Nenaplaćene Provizije</span>
              <h3 className="text-2xl font-bold text-amber-700">{formatPrice(financialData.earned_commission_unpaid)}</h3>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
