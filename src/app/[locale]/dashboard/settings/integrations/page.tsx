'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

export default function IntegrationsPage() {
  const [org, setOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copiedFeed, setCopiedFeed] = useState<string | null>(null)

  useEffect(() => {
    const loadOrg = async () => {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: member } = await supabase
        .from('organization_members')
        .select('organizations(*)')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single()

      if (member?.organizations) {
        setOrg(member.organizations)
      }
      setLoading(false)
    }

    loadOrg()
  }, [])

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
        {/* OLX.ba */}
        <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                OLX.ba Integration <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">API-based</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Direct JSON API sync to Bosnia's largest portal. Status changes push instantly.
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full">
              Available
            </span>
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">OLX API Token (Mocked)</label>
            <div className="flex gap-3 max-w-md">
              <input
                type="password"
                value="••••••••••••••••••••••••••••••••••••••••"
                disabled
                className="flex-1 rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground outline-none cursor-not-allowed"
              />
              <button disabled className="rounded-lg bg-primary/20 px-4 py-2 text-sm font-medium text-primary-foreground cursor-not-allowed">
                Save
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">API token is securely managed and derived automatically based on organization session.</p>
          </div>
        </section>

        {/* Njuškalo & Nekretnine */}
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
    </div>
  )
}
