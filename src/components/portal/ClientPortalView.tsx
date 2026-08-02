'use client'

import { useState, useEffect } from 'react'

export interface ClientPortalViewProps {
  token: string
}

export interface PortalData {
  agency_name: string
  deal?: {
    id: string
    title: string
    stage: string
    value: number
    currency: string
    property?: {
      title: string
      type: string
      price: number
      currency: string
      address?: string
      city?: string
    }
  }
  viewings?: Array<{
    id: string
    scheduled_at: string
    status: string
    notes?: string
  }>
  expires_at: string
}

export function ClientPortalView({ token }: ClientPortalViewProps) {
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPortalData = async () => {
      try {
        const res = await fetch(`/api/portal/access?token=${token}`)
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        } else {
          setError(json.error || 'Nije moguće učitati portal')
        }
      } catch {
        setError('Mrežna greška pri učitavanju portala')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchPortalData()
    }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center text-slate-500 animate-pulse">
          Učitavanje Vašeg portala za nekretnine...
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center mb-4 text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Pristup Nije Moguć</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error || 'Link je nevažeći ili je istekao.'}</p>
          <p className="text-xs text-slate-400">Kontaktirajte Vašu agenciju za nekretnine radi novog pristupnog linka.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Klijentski Portal</span>
            <h1 className="text-2xl font-bold mt-1">{data.agency_name}</h1>
          </div>
          <div className="text-xs text-slate-400">
            Aktivno do: {new Date(data.expires_at).toLocaleDateString('bs-BA')}
          </div>
        </div>

        {/* Deal / Property Overview */}
        {data.deal && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Pregled Posla & Nekretnine</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Status Posla</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">{data.deal.stage}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Ugovorena / Tražena Cijena</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-lg">
                  {data.deal.value.toLocaleString()} {data.deal.currency}
                </span>
              </div>
            </div>

            {data.deal.property && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 mt-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">{data.deal.property.title}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {data.deal.property.type} | {data.deal.property.address || ''} {data.deal.property.city || ''}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Scheduled Viewings */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Termini Razgledanja</h2>
          {!data.viewings || data.viewings.length === 0 ? (
            <p className="text-sm text-slate-400">Trenutno nema zakazanih termina razgledanja.</p>
          ) : (
            <div className="space-y-3">
              {data.viewings.map((v) => (
                <div key={v.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm">
                  <div>
                    <span className="font-medium block">{new Date(v.scheduled_at).toLocaleString('bs-BA')}</span>
                    {v.notes && <span className="text-xs text-slate-400">{v.notes}</span>}
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
