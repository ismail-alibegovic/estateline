'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Trash2, ShieldAlert, Database } from 'lucide-react'

const ENTITIES = [
  { key: 'properties', label: 'Properties' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'leads', label: 'Leads' },
  { key: 'deals', label: 'Deals' },
  { key: 'viewings', label: 'Viewings' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'communications', label: 'Communications' },
]

const GRACE_DAYS = 30

type Lifecycle = {
  deletion_requested_at: string | null
  deletion_scheduled_for: string | null
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DataSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [lifecycle, setLifecycle] = useState<Lifecycle | null>(null)
  const [orgName, setOrgName] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/organizations/lifecycle')
    if (res.ok) {
      const json = await res.json()
      setLifecycle({ deletion_requested_at: json.deletion_requested_at, deletion_scheduled_for: json.deletion_scheduled_for })
      setOrgName(json.organization || '')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const act = async (action: 'request' | 'cancel') => {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/organizations/lifecycle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || `Request failed (${res.status})`)
      } else {
        setLifecycle({ deletion_requested_at: json.deletion_requested_at, deletion_scheduled_for: json.deletion_scheduled_for })
        setSuccess(
          action === 'request'
            ? `Deletion scheduled. All data will be permanently removed on ${formatDate(json.deletion_scheduled_for)}. You can cancel until then — export first.`
            : 'Deletion cancelled. Your organization remains fully active.'
        )
        setConfirmText('')
      }
    } finally {
      setBusy(false)
    }
  }

  const scheduled = lifecycle?.deletion_scheduled_for ? new Date(lifecycle.deletion_scheduled_for) : null
  const pending = scheduled && scheduled > new Date()

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse space-y-4">
        <div className="h-8 w-56 bg-muted rounded" />
        <div className="h-40 bg-card border rounded-xl" />
        <div className="h-48 bg-card border rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Settings</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Data &amp; Account</h1>
        <p className="text-sm text-muted-foreground mt-1">Export your agency data or manage account deletion.</p>
      </div>

      {error && (
        <div className="badge badge-rose w-full p-3 block rounded-lg leading-relaxed normal-case font-semibold text-center shadow-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="badge badge-sage w-full p-3 block rounded-lg leading-relaxed normal-case font-semibold text-center shadow-sm">
          {success}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Database size={18} className="text-primary" />
          <h2 className="font-semibold text-sm">Export Data</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Download every record belonging to your organization. The full export is a single
          JSON file; individual sections are available as CSV.
        </p>
        <a
          href="/api/export?entity=all&format=json"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:bg-primary/95 transition-all"
        >
          <Download size={15} />
          Download Full Export (JSON)
        </a>
        <div className="flex flex-wrap gap-2 pt-1">
          {ENTITIES.map(e => (
            <a
              key={e.key}
              href={`/api/export?entity=${e.key}&format=csv`}
              className="px-3 py-1.5 rounded-lg border border-input text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
            >
              {e.label} ↓
            </a>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Trash2 size={18} className="text-rose-500" />
          <h2 className="font-semibold text-sm">Delete Organization</h2>
        </div>

        {pending ? (
          <>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200">
              <ShieldAlert size={18} className="text-rose-500 shrink-0 mt-0.5" />
              <div className="text-sm text-rose-800 space-y-1">
                <p className="font-semibold">Deletion is scheduled.</p>
                <p>
                  Requested: {formatDate(lifecycle!.deletion_requested_at)}
                  <br />
                  Permanent removal: {formatDate(lifecycle!.deletion_scheduled_for)}
                </p>
                <p className="text-rose-700">
                  Until that date you can still use Estateline normally and export your data.
                  After it passes, the organization becomes read-only and all data ({orgName})
                  is permanently deleted by the retention job.
                </p>
              </div>
            </div>
            <button
              onClick={() => act('cancel')}
              disabled={busy}
              className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:bg-primary/95 disabled:opacity-50 transition-all"
            >
              {busy ? 'Working…' : 'Cancel Deletion'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Schedules permanent removal of <span className="font-semibold text-foreground">{orgName || 'your organization'}</span> and
              all properties, contacts, leads, deals, documents, and media after a {GRACE_DAYS}-day grace period.
              During the grace period everything keeps working and you can export or cancel at any time.
            </p>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Type &quot;DELETE&quot; to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <button
              onClick={() => act('request')}
              disabled={busy || confirmText !== 'DELETE'}
              className="px-5 py-2.5 bg-rose-600 text-white font-semibold rounded-lg text-sm hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {busy ? 'Working…' : `Schedule Deletion (${GRACE_DAYS} days)`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
