'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

export default function IntegrationsPage() {
  const [org, setOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copiedFeed, setCopiedFeed] = useState<string | null>(null)
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([])

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }
  
  // OLX States
  const [olxUrl, setOlxUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const loadOrg = async () => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: u } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!u) {
      setLoading(false)
      return
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('organizations(*)')
      .eq('user_id', u.id)
      .eq('is_primary', true)
      .single()

    if (member?.organizations) {
      setOrg(member.organizations)
      setOlxUrl(member.organizations.olx_profile_url || '')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadOrg()
  }, [])

  const handleSaveUrl = async () => {
    if (!org) return
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase
        .from('organizations')
        .update({ olx_profile_url: olxUrl })
        .eq('id', org.id)

      if (error) throw error
      
      // Update local state
      setOrg((prev: any) => ({ ...prev, olx_profile_url: olxUrl }))
      toast('OLX Profile Link saved successfully!')
    } catch (err: any) {
      toast('Failed to save link: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSyncProfile = async () => {
    if (!org) return
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)

    try {
      const res = await fetch('/api/sync/olx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'pull', olx_url: olxUrl })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Sync failed')
      }

      setSyncResult(data)
    } catch (err: any) {
      setSyncError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  const copyToClipboard = (url: string, key: string) => {
    navigator.clipboard.writeText(url)
    setCopiedFeed(key)
    setTimeout(() => setCopiedFeed(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin h-7 w-7 border-b-2 border-primary rounded-full" />
      </div>
    )
  }

  if (!org) {
    return <div className="p-8">No organization found. Please onboard first.</div>
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const njuskaloFeedUrl = `${origin}/api/feeds/njuskalo/${org.id}`
  const nekretnineFeedUrl = `${origin}/api/feeds/nekretnine_rs/${org.id}`

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <header className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Settings</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Integrations & Sync</h1>
        <p className="mt-2 text-muted-foreground">
          Syndicate your property listings automatically to popular real estate portals.
        </p>
      </header>

      <div className="space-y-8">
        {/* OLX.ba Section */}
        <section className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                OLX.ba Integration <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">API & Scraping Sync</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your OLX profile or store link to automatically sync and import active listings into Estateline.
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full">
              Active Sync
            </span>
          </div>

          <div className="border-t border-border pt-6 space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                OLX Profile or Store Link
              </label>
              <div className="flex gap-3 max-w-xl">
                <input
                  type="url"
                  placeholder="https://olx.ba/profil/vaš-profil ili https://olx.ba/shops/vaša-trgovina"
                  value={olxUrl}
                  onChange={(e) => setOlxUrl(e.target.value)}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  onClick={handleSaveUrl}
                  disabled={saving || !olxUrl}
                  className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/95 disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  {saving ? 'Saving...' : 'Save URL'}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground/60 mt-1">
                Format: https://olx.ba/profil/korisnicko-ime ili https://olx.ba/shops/naziv-trgovine
              </p>
            </div>

            <div className="bg-neutral-50 rounded-xl p-4 border border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Sync Listings</p>
                <p className="text-xs text-muted-foreground">Pull active properties from this profile into your database.</p>
              </div>
              <button
                onClick={handleSyncProfile}
                disabled={syncing || !org.olx_profile_url}
                className="rounded-lg bg-emerald-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0"
              >
                {syncing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                    </svg>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.283 8H18.2" />
                    </svg>
                    Sync Profile Now
                  </>
                )}
              </button>
            </div>

            {/* Sync Results Display */}
            {syncResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200/60 rounded-xl space-y-3 transition-all duration-300">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                  <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Successfully Synced Profile!</span>
                </div>
                <p className="text-xs text-emerald-700 font-medium">
                  We checked the OLX.ba account. Imported {syncResult.importedCount} new properties:
                </p>
                {syncResult.imported.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {syncResult.imported.map((item: any) => (
                      <div key={item.id} className="bg-white border border-emerald-100 p-2.5 rounded-lg flex items-center justify-between text-xs">
                        <span className="font-medium text-neutral-800 truncate pr-2">{item.title}</span>
                        <span className="font-bold text-emerald-700 shrink-0">{item.price.toLocaleString()} BAM</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 italic">No new listings found (all properties are already synced and up-to-date!).</p>
                )}
              </div>
            )}
            
            {syncError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                Error during sync: {syncError}
              </div>
            )}
          </div>
        </section>

        {/* Njuškalo & Nekretnine Section */}
        <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            XML Feed Portals <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">URL-based</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Copy these XML feed URLs and submit them to your B2B dashboard/support agent on the respective portals.
          </p>

          <div className="mt-6 space-y-6 border-t border-border pt-4">
            {/* Njuskalo */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-foreground">Njuškalo.hr (Croatia)</span>
                <button
                  onClick={() => copyToClipboard(njuskaloFeedUrl, 'njuskalo')}
                  className="text-xs text-primary hover:underline"
                >
                  {copiedFeed === 'njuskalo' ? 'Copied!' : 'Copy Feed URL'}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={njuskaloFeedUrl}
                className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-xs text-muted-foreground font-mono outline-none"
              />
            </div>

            {/* Nekretnine.rs */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-foreground">Nekretnine.rs (Serbia)</span>
                <button
                  onClick={() => copyToClipboard(nekretnineFeedUrl, 'nekretnine')}
                  className="text-xs text-primary hover:underline"
                >
                  {copiedFeed === 'nekretnine' ? 'Copied!' : 'Copy Feed URL'}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={nekretnineFeedUrl}
                className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-xs text-muted-foreground font-mono outline-none"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Floating Toasts */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border ${t.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {t.type === 'success' ? '✓' : '✗'} {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}
