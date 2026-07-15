'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Users, UserPlus, Shield, Mail } from 'lucide-react'

interface TeamMember {
  id: string
  role: string
  is_primary: boolean
  users: {
    first_name: string
    last_name: string | null
    email: string
  }
}

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('agent')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    loadTeam()
  }, [])

  const loadTeam = async () => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: u } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!u) return

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', u.id)
      .eq('is_primary', true)
      .single()

    if (member) {
      setOrgId(member.organization_id)
      const { data: team } = await supabase
        .from('organization_members')
        .select('id, role, is_primary, users(first_name, last_name, email)')
        .eq('organization_id', member.organization_id)
      
      if (team) setMembers(team as any[])
    }
    setLoading(false)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || !orgId) return
    setInviting(true)
    setError(null)
    setSuccess(null)

    const supabase = createBrowserClient()
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', inviteEmail.trim())
      .single()

    if (!existingUser) {
      setError('No registered user found with this email address.')
      setInviting(false)
      return
    }

    const { error: inviteError } = await supabase.from('organization_members').insert({
      organization_id: orgId,
      user_id: existingUser.id,
      role: inviteRole,
      is_primary: false,
    })

    setInviting(false)
    if (inviteError) {
      setError(inviteError.message)
    } else {
      setSuccess('Team member invited successfully!')
      setInviteEmail('')
      loadTeam()
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-muted rounded" /><div className="h-64 bg-card border rounded-xl" /></div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Settings</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Team Members</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage who has access to this workspace.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Members List */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <h2 className="font-semibold text-sm">Active Members ({members.length})</h2>
            </div>
            <ul className="divide-y divide-border">
              {members.map((m) => (
                <li key={m.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">
                      {m.users?.first_name} {m.users?.last_name || ''}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail size={12} /> {m.users?.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 capitalize">
                      <Shield size={10} /> {m.role}
                    </span>
                    {m.is_primary && (
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">Primary</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Invite Form */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm h-fit space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <UserPlus size={16} className="text-primary" />
            <h2 className="font-semibold text-sm">Invite Member</h2>
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs">{error}</div>}
          {success && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg text-xs">{success}</div>}

          <form onSubmit={handleInvite} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="colleague@domain.com"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Role</label>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
              >
                <option value="agent">Agent</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviting || !inviteEmail}
              className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/95 disabled:opacity-50 transition-all"
            >
              {inviting ? 'Inviting…' : 'Send Invitation'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
