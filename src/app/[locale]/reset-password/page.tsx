'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import { useTranslations } from 'next-intl'

export default function ResetPasswordPage() {
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) || 'en'
  const tr = useTranslations('resetPassword')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const hydrateRecoverySession = async () => {
      const supabase = createBrowserClient()
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          setError(tr('linkInvalid'))
        } else {
          window.history.replaceState(null, '', window.location.pathname)
        }
      }

      setSessionReady(true)
    }

    void hydrateRecoverySession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError(tr('mismatch'))
      return
    }
    if (password.length < 6) {
      setError(tr('tooShort'))
      return
    }

    setLoading(true)
    setError('')

    try {
      if (!sessionReady) {
        setError(tr('linkChecking'))
        return
      }

      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || tr('failed'))
        return
      }

      setMessage(data.message || tr('success'))
      setTimeout(() => {
        router.push(`/${locale}/login`)
      }, 2000)
    } catch {
      setError(tr('unexpected'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFBF7] p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-[#E8E2D6] rounded-3xl p-8 shadow-xl shadow-amber-950/5 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center mx-auto text-[#C9963B]">
            <Lock size={24} />
          </div>
          <h1
            className="text-2xl font-bold text-slate-900 tracking-tight"
            style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
          >
            {tr('title')}
          </h1>
          <p className="text-sm text-slate-600">{tr('subtitle')}</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {message && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <span>{message} {tr('redirecting')}</span>
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {tr('newPassword')}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C9963B]/30 focus:border-[#C9963B] text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {tr('confirmPassword')}
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C9963B]/30 focus:border-[#C9963B] text-sm transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !sessionReady}
              className="w-full py-3.5 px-4 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-sm transition-all shadow-md shadow-slate-900/10 disabled:opacity-50"
            >
              {loading ? tr('saving') : tr('save')}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-100 text-center">
          <Link
            href={`/${locale}/login`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#C9963B] hover:text-amber-700 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>{tr('backToLogin')}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
