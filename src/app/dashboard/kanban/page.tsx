'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

interface Lead {
  id: string
  first_name: string
  last_name: string
  status: string
  email: string
  phone: string
  budget_min: number | null
  budget_max: number | null
}

const STAGES = ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost']

const STAGE_COLORS: Record<string, string> = {
  new: 'border-l-blue-500',
  contacted: 'border-l-yellow-500',
  qualified: 'border-l-green-500',
  unqualified: 'border-l-gray-500',
  converted: 'border-l-emerald-500',
  lost: 'border-l-red-500',
}

export default function KanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  const grouped = STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter(l => l.status === stage)
    return acc
  }, {} as Record<string, Lead[]>)

  useEffect(() => {
    const fetch = async () => {
      const supabase = createBrowserClient()
      const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
      if (data) setLeads(data as Lead[])
      setLoading(false)
    }
    fetch()
  }, [])

  if (loading) return <div className="p-8"><div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full" /></div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Leads Pipeline</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ Add Lead</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {STAGES.map(stage => (
          <div key={stage} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
            <h3 className="font-semibold text-sm capitalize mb-3 flex items-center justify-between">
              <span>{stage}</span>
              <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{grouped[stage].length}</span>
            </h3>
            {grouped[stage].length === 0 && <p className="text-xs text-gray-400 text-center py-4">No leads</p>}
            <div className="space-y-2">
              {grouped[stage].map(lead => (
                <div key={lead.id} className={`bg-white dark:bg-gray-700 rounded p-3 border-l-4 ${STAGE_COLORS[stage]} shadow-sm`}>
                  <p className="font-medium text-sm">{lead.first_name} {lead.last_name}</p>
                  {lead.email && <p className="text-xs text-gray-500 truncate">{lead.email}</p>}
                  {lead.phone && <p className="text-xs text-gray-500">{lead.phone}</p>}
                  {lead.budget_min && <p className="text-xs text-gray-400 mt-1">Budget: €{lead.budget_min.toLocaleString()} - €{lead.budget_max?.toLocaleString()}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
