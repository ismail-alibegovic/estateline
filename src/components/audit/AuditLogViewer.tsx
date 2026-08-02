'use client'

import { useState, useEffect } from 'react'

export interface AuditLogEntry {
  id: string
  actor_name: string
  action: string
  entity_type: string
  entity_id?: string
  details?: Record<string, unknown>
  created_at: string
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      try {
        const url = filterType === 'all'
          ? '/api/audit-logs'
          : `/api/audit-logs?entity_type=${filterType}`
        const res = await fetch(url)
        const data = await res.json()
        if (data.success) {
          setLogs(data.data)
        }
      } catch {
        // Ignore errors in UI load
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [filterType])

  const getBadgeColor = (action: string) => {
    if (action.includes('create') || action.includes('insert')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    if (action.includes('delete') || action.includes('remove')) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    if (action.includes('update') || action.includes('edit')) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Audit Security Log
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pregled svih aktivnosti agenata i sistema u agenciji
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Filtriraj po entitetu:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Svi entiteti</option>
            <option value="property">Nekretnine</option>
            <option value="lead">Leadovi</option>
            <option value="deal">Poslovi (Deals)</option>
            <option value="contact">Kontakti</option>
            <option value="api_key">API Ključevi</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
          Učitavanje sigurnosnih zapisa...
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Nema zabilježenih sigurnosnih aktivnosti za odabrani filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Korisnik / Akter</th>
                <th className="py-3 px-4">Akcija</th>
                <th className="py-3 px-4">Entitet</th>
                <th className="py-3 px-4">Vrijeme</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {log.actor_name}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 capitalize">
                    {log.entity_type} {log.entity_id ? `(${log.entity_id.substring(0, 8)})` : ''}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs">
                    {new Date(log.created_at).toLocaleString('bs-BA')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
