'use client'

import { useState } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Building2, ShieldCheck, Sparkles, TrendingUp, Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const locale = (params?.locale as string) || 'en'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return
    const pathParts = pathname.split('/')
    pathParts[1] = newLocale
    router.push(pathParts.join('/'))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to sign in')
        return
      }

      router.push(`/${locale}/dashboard`)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-[#FDFBF7] font-sans overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════
          LEFT PANEL — Dark Luxury Architectural Brand Hero (Desktop)
      ═══════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-16 text-white overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)',
        }}
      >
        {/* Ambient Gold Glow */}
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: '#C9963B' }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ background: '#C9963B' }}
        />

        {/* Top Brand Logo */}
        <div className="relative z-10 flex items-center gap-4">
          <img
            src="/logo-icon.png"
            alt="EstateLine"
            className="w-12 h-12 object-contain drop-shadow-[0_4px_16px_rgba(201,150,59,0.5)]"
          />
          <div>
            <span
              className="text-2xl font-bold tracking-tight text-white block leading-none"
              style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
            >
              EstateLine
            </span>
            <span className="text-[9px] tracking-[0.25em] text-[#C9963B] font-bold uppercase mt-1 block">
              REAL ESTATE CRM
            </span>
          </div>
        </div>

        {/* Middle Hero Content */}
        <div className="relative z-10 max-w-lg space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-amber-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles size={14} />
            <span>{t('heroTagline') || 'Premium Balkan Real Estate Platform'}</span>
          </div>

          <h1
            className="text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight"
            style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
          >
            {t('heroTitle1') || 'Where Luxury Real Estate Meets'} <span className="text-[#C9963B]">{t('heroTitle2') || 'Peak Performance'}</span>
          </h1>

          <p className="text-gray-300 text-base leading-relaxed font-light">
            {t('heroDesc') || 'Manage agency listings, client leads, OLX syndication, and automated contracts in one unified workspace.'}
          </p>

          {/* Glassmorphic Feature Cards */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 space-y-1.5">
              <Building2 size={20} className="text-[#C9963B]" />
              <p className="text-sm font-bold text-white">{t('heroFeature1Title') || 'Multi-Tenant CRM'}</p>
              <p className="text-xs text-gray-400">{t('heroFeature1Desc') || 'Isolated agency workspaces'}</p>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 space-y-1.5">
              <TrendingUp size={20} className="text-[#C9963B]" />
              <p className="text-sm font-bold text-white">{t('heroFeature2Title') || 'OLX & Portal Sync'}</p>
              <p className="text-xs text-gray-400">{t('heroFeature2Desc') || 'Automated listing import'}</p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-gray-400 border-t border-white/10 pt-6">
          <span>© 2026 EstateLine CRM</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            {t('sslEncrypted') || '256-bit SSL Encryption'}
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          RIGHT PANEL — Form Area
      ═══════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 relative overflow-y-auto">
        {/* Top Language Switcher Bar */}
        <div className="flex justify-between items-center w-full max-w-md mx-auto mb-6">
          <div className="lg:hidden flex items-center gap-3">
            <img
              src="/logo-icon.png"
              alt="EstateLine"
              className="w-9 h-9 object-contain drop-shadow-[0_2px_8px_rgba(201,150,59,0.3)]"
            />
            <span
              className="text-xl font-bold text-gray-900"
              style={{ fontFamily: 'var(--font-display), serif' }}
            >
              EstateLine
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
            {(['en', 'bs'] as const).map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => handleLanguageChange(lang)}
                className="px-3 py-1 text-xs font-bold uppercase rounded-lg transition-all"
                style={{
                  background: locale === lang ? 'linear-gradient(135deg, #C9963B, #b88328)' : 'transparent',
                  color: locale === lang ? '#FFFFFF' : '#6B7280',
                }}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Center Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-6">
          <div className="mb-8">
            <p className="page-eyebrow mb-1">{t('accessSystem') || 'SYSTEM ACCESS'}</p>
            <h2
              className="text-3xl font-bold text-gray-900"
              style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
            >
              {t('signInTitle') || 'Welcome back'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('signInSubtitle') || 'Enter your credentials to access your CRM workspace'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold animate-fade-in">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                {t('email') || 'Email address'}
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder') || 'name@agency.com'}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-[#C9963B] focus:ring-2 focus:ring-[#C9963B]/20 transition-all shadow-sm"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t('password') || 'Password'}
                </label>
                <Link
                  href={`/${locale}/forgot-password`}
                  className="text-xs text-[#C9963B] hover:underline font-semibold"
                >
                  {locale === 'bs' ? 'Zaboravili ste lozinku?' : 'Forgot password?'}
                </Link>
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder') || '••••••••'}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-[#C9963B] focus:ring-2 focus:ring-[#C9963B]/20 transition-all shadow-sm"
                  required
                />
              </div>
            </div>

            {/* Sign in Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 text-white font-semibold rounded-xl text-sm shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              style={{
                background: 'linear-gradient(135deg, #C9963B 0%, #b88328 100%)',
                boxShadow: '0 4px 16px rgba(201,150,59,0.25)',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{t('signingIn') || 'Signing in...'}</span>
                </>
              ) : (
                <span>{t('signIn') || 'Sign in'}</span>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            {t('dontHaveAccount') || "Don't have an account?"}{' '}
            <Link
              href={`/${locale}/signup`}
              className="font-bold text-[#C9963B] hover:text-[#a3721e] transition-colors"
            >
              {t('signUp') || 'Sign up'}
            </Link>
          </p>
        </div>

        {/* Footer Notice */}
        <div className="text-center text-xs text-gray-400 max-w-md mx-auto">
          {t('platformFooter') || 'EstateLine Real Estate Management Platform'}
        </div>
      </div>
    </div>
  )
}
