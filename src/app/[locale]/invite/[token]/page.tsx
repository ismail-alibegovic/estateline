'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Building2, ShieldCheck, Mail, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'

type Preview = {
  orgName: string
  maskedEmail: string
  role: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  expiresAt: string
}

type Mode = 'signin' | 'signup'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) || 'en'
  const token = params?.token as string

  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [signedIn, setSignedIn] = useState(false)
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const supabase = createBrowserClient()
      const [{ data: { user } }, res] = await Promise.all([
        supabase.auth.getUser(),
        fetch(`/api/invitations/${token}`),
      ])
      if (cancelled) return

      if (res.ok) {
        const json = await res.json()
        setPreview(json.data)
        if (json.data.status !== 'pending') {
          setErrorCode(json.data.status.toUpperCase())
        }
      } else {
        const json = await res.json().catch(() => null)
        setErrorCode(json?.code || 'NOT_FOUND')
      }

      if (user) setSignedIn(true)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [token])

  const authenticate = async (): Promise<boolean> => {
    if (signedIn) return true

    if (mode === 'signin') {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || 'Failed to sign in')
        return false
      }
      // Session cookies are set by the API route.
      return true
    }

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setError(data?.error || 'Failed to create account')
      return false
    }
    if (!data.session) {
      setError('Account created. Please sign in to continue.')
      setMode('signin')
      return false
    }
    return true
  }

  const handleAccept = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)

    if (!signedIn && !email.trim()) {
      setError('Enter your email to continue.')
      return
    }
    if (!signedIn && password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setBusy(true)
    try {
      const authed = await authenticate()
      if (!authed) {
        setBusy(false)
        return
      }

      const res = await fetch(`/api/invitations/${token}/accept`, { method: 'POST' })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        switch (data?.code) {
          case 'EMAIL_MISMATCH':
            setError('This invitation was sent to a different email address. Sign in with the invited account.')
            break
          case 'ALREADY_MEMBER':
            router.push(`/${locale}/dashboard`)
            return
          case 'UNAUTHENTICATED':
            setError('Please sign in to accept this invitation.')
            break
          default:
            setError(data?.error || 'Could not accept this invitation.')
        }
        setBusy(false)
        return
      }

      setAccepted(true)
      setTimeout(() => router.push(`/${locale}/dashboard`), 1500)
    } catch {
      setError('An unexpected error occurred.')
      setBusy(false)
    }
  }

  const statusCopy: Record<string, { title: string; body: string }> = {
    NOT_FOUND: { title: 'Invitation not found', body: 'This invitation link is invalid or has been removed.' },
    REVOKED: { title: 'Invitation revoked', body: 'This invitation was canceled by the organization.' },
    EXPIRED: { title: 'Invitation expired', body: 'This invitation has expired. Ask the organization to send a new one.' },
    ACCEPTED: { title: 'Invitation already used', body: 'This invitation has already been accepted.' },
  }

  return (
    <div className="min-h-screen w-full flex bg-[#FDFBF7] font-sans">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-[42%] relative flex-col justify-between p-10 overflow-hidden" style={{ background: '#17151F' }}>
        <div>
          <Link href={`/${locale}`}>
            <Image src="/logo-white.svg" alt="Estateline" width={150} height={32} className="h-8 w-auto brightness-0 invert" />
          </Link>
        </div>
        <div className="space-y-5">
          <Building2 size={36} className="text-[#8B85FF]" />
          <h1 className="text-3xl font-semibold text-white leading-tight max-w-md">
            Join your team on Estateline
          </h1>
          <p className="text-sm text-neutral-400 max-w-sm leading-relaxed">
            Properties, leads, viewings, deals and commissions — one workspace for your entire agency.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <ShieldCheck size={14} /> Secure multi-tenant CRM
        </div>
      </div>

      {/* Right form area */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <Link href={`/${locale}`} className="lg:hidden block">
            <Image src="/logo.svg" alt="Estateline" width={130} height={28} className="h-7 w-auto" />
          </Link>

          {loading && (
            <div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm">
              <div className="animate-pulse text-sm text-muted-foreground">Loading invitation…</div>
            </div>
          )}

          {!loading && errorCode && statusCopy[errorCode] && (
            <div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm space-y-3">
              <XCircle size={32} className="mx-auto text-rose-500" />
              <h1 className="text-lg font-semibold">{statusCopy[errorCode].title}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">{statusCopy[errorCode].body}</p>
              <Link
                href={`/${locale}/login`}
                className="inline-block mt-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: '#3520D5' }}
              >
                Go to sign in
              </Link>
            </div>
          )}

          {!loading && !errorCode && preview && (
            <>
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-border">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">You&apos;re invited to join</p>
                    <h1 className="text-xl font-bold leading-tight">{preview.orgName}</h1>
                    <p className="text-xs text-muted-foreground mt-1">Role: <span className="font-semibold capitalize">{preview.role}</span></p>
                  </div>
                  <div className="size-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(53,32,213,0.08)' }}>
                    <Building2 size={20} style={{ color: '#3520D5' }} />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail size={14} />
                  <span>Invitation sent to <strong className="text-foreground font-mono text-xs">{preview.maskedEmail}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock size={13} />
                  <span>Expires {new Date(preview.expiresAt).toLocaleDateString()}</span>
                </div>

                {accepted ? (
                  <div className="badge badge-sage w-full p-3 rounded-lg flex items-center justify-center gap-2 normal-case font-semibold">
                    <CheckCircle2 size={15} /> Welcome aboard! Redirecting…
                  </div>
                ) : (
                  !signedIn && (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => { setMode('signin'); setError(null) }}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${mode === 'signin' ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:border-primary/40'}`}
                      >
                        I have an account
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMode('signup'); setError(null) }}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${mode === 'signup' ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:border-primary/40'}`}
                      >
                        Create account
                      </button>
                    </div>
                  )
                )}
              </div>

              {!accepted && (
                <form onSubmit={handleAccept} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                  {error && (
                    <div className="badge badge-rose w-full p-3 block rounded-lg leading-relaxed normal-case font-semibold text-center shadow-sm">
                      {error}
                    </div>
                  )}

                  {signedIn ? (
                    <>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        You&apos;re signed in. Accepting will add you to <strong className="text-foreground">{preview.orgName}</strong> as <span className="capitalize font-semibold">{preview.role}</span>.
                      </p>
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-2.5 text-white font-semibold rounded-lg text-xs hover:bg-primary/95 disabled:opacity-50 transition-all"
                        style={{ background: '#3520D5' }}
                      >
                        {busy ? 'Accepting…' : 'Accept invitation'}
                      </button>
                    </>
                  ) : mode === 'signin' ? (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Email</label>
                        <input
                          type="email"
                          required
                          placeholder="you@domain.com"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">Use the email the invitation was sent to.</p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Password</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-2.5 text-white font-semibold rounded-lg text-xs hover:bg-primary/95 disabled:opacity-50 transition-all"
                        style={{ background: '#3520D5' }}
                      >
                        {busy ? 'Signing in…' : 'Sign in & accept'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Your email</label>
                        <input
                          type="email"
                          required
                          placeholder="the invited email address"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">Must match the invited address ({preview.maskedEmail}).</p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Full name</label>
                        <input
                          type="text"
                          required
                          placeholder="Your name"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Password</label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          placeholder="At least 6 characters"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-2.5 text-white font-semibold rounded-lg text-xs hover:bg-primary/95 disabled:opacity-50 transition-all"
                        style={{ background: '#3520D5' }}
                      >
                        {busy ? 'Creating account…' : 'Create account & join'}
                      </button>
                    </>
                  )}
                </form>
              )}

              <p className="text-center text-[11px] text-muted-foreground">
                Invitations are single-use and expire after 7 days.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
