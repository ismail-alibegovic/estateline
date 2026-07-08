'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

interface Viewing {
  id: string
  property_id: string
  contact_id: string
  scheduled_at: string
  status: string
  notes: string
  properties?: { title: string }
  contacts?: { first_name: string; last_name: string }
}

export default function ViewingsPage() {
  const [viewings, setViewings] = useState<Viewing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('viewings')
        .select('*, properties(title), contacts(first_name, last_name)')
        .order('scheduled_at', { ascending: false })
      if (data) setViewings(data as any)
      setLoading(false)
    }
    fetch()
  }, [])

  if (loading) return <div className="p-8"><div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full" /></div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Viewings Calendar</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ Schedule Viewing</button>
      </div>

      {viewings.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500">
          No viewings scheduled yet.
        </div>
      )}

      <div className="space-y-3">
        {viewings.map(v => (
          <div key={v.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{v.properties?.title || 'Property'}</p>
              <p className="text-sm text-gray-500">
                With {v.contacts?.first_name} {v.contacts?.last_name || 'Unknown'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(v.scheduled_at).toLocaleDateString()} at {new Date(v.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              v.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
              v.status === 'completed' ? 'bg-green-100 text-green-700' :
              'bg-red-100 text-red-700'
            }`}>{v.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
