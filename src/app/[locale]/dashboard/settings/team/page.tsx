'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Users, UserPlus, Shield, Mail, Clock, XCircle, RefreshCw, Link2, Copy } from 'lucide-react'

interface TeamMember {
  id: string
  role: string
  is_primary: boolean
  users: {
    full_name: string | null
    email: string
  }
}

interface PendingInvitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
}

const ROLE_OPTIONS = [
  { value: 'agent', label: 'Agent' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'admin', label: 'Administrator' },
]

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('agent')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pendingLink, setPendingLink] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [canManage, setCanManage] = useState(false)
  const [appUrl, setAppUrl] = useState('')
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    loadTeam()
    setAppUrl(window.location.origin)
  }, [])

  const loadTeam = async () => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: u } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!u) return

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', u.id)
      .eq('is_primary', true)
      .single()

    if (!member) {
      setLoading(false)
      return
    }

    setOrgId(member.organization_id)
    setCanManage(member.role === 'owner' || member.role === 'admin')

    const [{ data: team }, invRes] = await Promise.all([
      supabase
        .from('organization_members')
        .select('id, role, is_primary, users(full_name, email)')
        .eq('organization_id', member.organization_id),
      fetch('/api/organizations/invitations'),
    ])

    if (team) setMembers(team as any[])
    if (invRes.ok) {
      const inv = await invRes.json()
      setInvitations(
        (inv.data || []).filter(
          (i: PendingInvitation & { status?: string }) =>
            i.status === 'pending' && new Date(i.expires_at).getTime() > Date.now(),
        ),
      )
    }
    setLoading(false)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setError(null)
    setSuccess(null)
    setPendingLink(null)

    const res = await fetch('/api/organizations/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    })
    const data = await res.json().catch(() => ({}))
    setInviting(false)

    if (!res.ok) {
      setError(data.error || 'Failed to send invitation.')
      return
    }

    setInviteEmail('')
    if (data.emailSent) {
      setSuccess(`Invitation sent to ${data.data.email}.`)
    } else {
      setSuccess(`Invitation created for ${data.data.email}. Email delivery is not configured — share the link manually.`)
      setPendingLink(`${appUrl}/invite/${data.token}`)
    }
    loadTeam()
  }

  const handleRevoke = async (id: string) => {
    setBusyId(id)
    const res = await fetch(`/api/organizations/invitations/${id}`, { method: 'DELETE' })
    setBusyId(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to revoke invitation.')
      return
    }
    setError(null)
    setSuccess(null)
    loadTeam()
  }

  const handleResend = async (id: string) => {
    setBusyId(id)
    const res = await fetch(`/api/organizations/invitations/${id}/resend`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setBusyId(null)
    if (!res.ok) {
      setError(data.error || 'Failed to resend invitation.')
      return
    }
    setError(null)
    if (data.emailSent) {
      setSuccess('Invitation email resent.')
      setPendingLink(null)
    } else {
      setPendingLink(`${appUrl}/invite/${data.token}`)
      setSuccess('Email delivery is not configured — share this link instead.')
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
        {/* Members + Pending Invitations */}
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
                      {m.users?.full_name || m.users?.email}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail size={12} /> {m.users?.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge ${m.role === 'admin' ? 'badge-gold' : 'badge-indigo'}`}>
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

          {canManage && invitations.length > 0 && (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                <h2 className="font-semibold text-sm">Pending Invitations ({invitations.length})</h2>
              </div>
              <ul className="divide-y divide-border">
                {invitations.map((inv) => (
                  <li key={inv.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                    <div className="space-y-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="badge badge-indigo">
                        <Shield size={10} /> {inv.role}
                      </span>
                      <button
                        onClick={() => handleResend(inv.id)}
                        disabled={busyId === inv.id}
                        title="Resend invitation"
                        className="p-1.5 rounded-md border border-input hover:bg-muted/20 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={13} />
                      </button>
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        disabled={busyId === inv.id}
                        title="Revoke invitation"
                        className="p-1.5 rounded-md border border-input hover:bg-badge-rose-bg transition-colors disabled:opacity-50"
                      >
                        <XCircle size={13} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pendingLink && (
            <div className="bg-card border border-dashed border-primary/40 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Link2 size={12} /> Invitation link
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-background border border-input rounded-lg px-3 py-2 truncate">{pendingLink}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(pendingLink)}
                  className="p-2 rounded-lg border border-input hover:bg-muted/20 transition-colors"
                  title="Copy link"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Invite Form */}
        {canManage && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm h-fit space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <UserPlus size={16} className="text-primary" />
            <h2 className="font-semibold text-sm">Invite Member</h2>
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
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={inviting || !inviteEmail}
              className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/95 disabled:opacity-50 transition-all"
            >
              {inviting ? 'Sending…' : 'Send Invitation'}
            </button>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              The recipient receives an email with a secure link valid for 7 days. They must sign in with this exact address to join.
            </p>
          </form>
        </div>
        )}
      </div>
    </div>
  )
}
