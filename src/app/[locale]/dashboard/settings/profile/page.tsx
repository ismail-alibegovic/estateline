'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { User, Shield, Key } from 'lucide-react'

export default function ProfileSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setEmail(user.email || '')

    const { data: u } = await supabase.from('users').select('first_name, last_name').eq('auth_id', user.id).single()
    if (u) {
      setFirstName(u.first_name || '')
      setLastName(u.last_name || '')
    }
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: updateError } = await supabase
      .from('users')
      .update({
        first_name: firstName,
        last_name: lastName
      })
      .eq('auth_id', user.id)

    setSaving(false)
    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess('Profile updated successfully!')
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-muted rounded" /><div className="h-48 bg-card border rounded-xl" /></div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Settings</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your personal account details.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <User size={18} className="text-primary" />
          <h2 className="font-semibold text-sm">Personal Details</h2>
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

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">First Name</label>
              <input
                type="text"
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Last Name</label>
              <input
                type="text"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email Address</label>
            <input
              type="email"
              disabled
              className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm outline-none cursor-not-allowed opacity-75"
              value={email}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Contact system administrator to change account email.</p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:bg-primary/95 disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
