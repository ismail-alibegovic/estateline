'use client'

import { useState } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Image from 'next/image'
import { Building2, ShieldCheck, Sparkles, TrendingUp, User, Mail, Lock } from 'lucide-react'

export default function SignupPage() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const locale = (params?.locale as string) || 'en'

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    orgName: '',
    orgSlug: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return
    const pathParts = pathname.split('/')
    pathParts[1] = newLocale
    router.push(pathParts.join('/'))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create account')
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
        {/* Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: '#C9963B' }} />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: '#C9963B' }} />

        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-4">
          <Image
            src="/logo-icon.png"
            alt="EstateLine"
            width={48}
            height={48}
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

        {/* Hero Content */}
        <div className="relative z-10 max-w-lg space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-amber-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles size={14} />
            <span>{t('heroSignupTagline') || 'Digitalizing Real Estate Agencies'}</span>
          </div>

          <h1
            className="text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight"
            style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
          >
            {t('heroSignupTitle1') || 'Start Your Real Estate'} <span className="text-[#C9963B]">{t('heroSignupTitle2') || 'Empire Today'}</span>
          </h1>

          <p className="text-gray-300 text-base leading-relaxed font-light">
            {t('heroSignupDesc') || 'Automate your client workflow, organize properties, and syndicate listings to top portals effortlessly.'}
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 space-y-1.5">
              <Building2 size={20} className="text-[#C9963B]" />
              <p className="text-sm font-bold text-white">{t('heroSignupFeature1Title') || 'Client Management'}</p>
              <p className="text-xs text-gray-400">{t('heroSignupFeature1Desc') || 'Complete history of buyer leads'}</p>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 space-y-1.5">
              <TrendingUp size={20} className="text-[#C9963B]" />
              <p className="text-sm font-bold text-white">{t('heroSignupFeature2Title') || 'Fast Syndication'}</p>
              <p className="text-xs text-gray-400">{t('heroSignupFeature2Desc') || 'One-click OLX.ba profile import'}</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-gray-400 border-t border-white/10 pt-6">
          <span>© 2026 EstateLine CRM</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            {t('secureWorkspace') || 'Secure Agency Workspace'}
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          RIGHT PANEL — Form Area
      ═══════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 relative overflow-y-auto">
        <div className="flex justify-between items-center w-full max-w-md mx-auto mb-4">
          <div className="lg:hidden flex items-center gap-3">
            <Image
              src="/logo-icon.png"
              alt="EstateLine"
              width={36}
              height={36}
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

        {/* Center Container */}
        <div className="w-full max-w-md mx-auto my-auto py-4">
          <div className="mb-6">
            <p className="page-eyebrow mb-1">{t('registerAgency') || 'AGENCY REGISTRATION'}</p>
            <h2
              className="text-3xl font-bold text-gray-900"
              style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
            >
              {t('signUpTitle') || 'Create your account'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('signUpSubtitle') || 'Join EstateLine to elevate your real estate business'}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-6 bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/60">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                step === 1 ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-[#C9963B] text-white' : 'bg-gray-200'}`}>1</span>
              <span>{t('step1') || 'Account Info'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (formData.fullName && formData.email && formData.password) setStep(2)
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                step === 2 ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-[#C9963B] text-white' : 'bg-gray-200'}`}>2</span>
              <span>{t('step2') || 'Agency Details'}</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold animate-fade-in">
                {error}
              </div>
            )}

            {step === 1 ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    {t('fullName') || 'Full name'}
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder={t('fullNamePlaceholder') || 'John Doe'}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-[#C9963B] focus:ring-2 focus:ring-[#C9963B]/20 transition-all shadow-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    {t('email') || 'Email address'}
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder={t('emailPlaceholder') || 'name@agency.com'}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-[#C9963B] focus:ring-2 focus:ring-[#C9963B]/20 transition-all shadow-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    {t('password') || 'Password'}
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder={t('passwordPlaceholder') || '••••••••'}
                      minLength={8}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-[#C9963B] focus:ring-2 focus:ring-[#C9963B]/20 transition-all shadow-sm"
                      required
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (formData.fullName && formData.email && formData.password) {
                      setStep(2)
                    } else {
                      setError(locale === 'bs' ? 'Molimo popunite sva polja koraka 1' : 'Please fill in all step 1 fields')
                    }
                  }}
                  className="w-full py-3.5 px-4 text-white font-semibold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-2"
                  style={{
                    background: 'linear-gradient(135deg, #C9963B 0%, #b88328 100%)',
                    boxShadow: '0 4px 16px rgba(201,150,59,0.25)',
                  }}
                >
                  <span>{t('continue') || 'Continue'}</span>
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    {t('orgName') || 'Agency / Organization name'}
                  </label>
                  <div className="relative">
                    <Building2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      name="orgName"
                      value={formData.orgName}
                      onChange={handleChange}
                      placeholder={t('orgNamePlaceholder') || 'Prestige Real Estate'}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-[#C9963B] focus:ring-2 focus:ring-[#C9963B]/20 transition-all shadow-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    {t('orgSlug') || 'Agency web slug'}
                  </label>
                  <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm focus-within:border-[#C9963B]">
                    <span className="inline-flex items-center px-3.5 bg-gray-100 text-gray-500 text-xs font-semibold border-r border-gray-200">
                      estateline.com/
                    </span>
                    <input
                      name="orgSlug"
                      value={formData.orgSlug}
                      onChange={handleChange}
                      placeholder={t('orgSlugPlaceholder') || 'my-agency'}
                      pattern="[a-z0-9-]+"
                      className="flex-1 px-3.5 py-3 bg-transparent text-gray-900 text-sm focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 text-white font-semibold rounded-xl text-sm shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                  style={{
                    background: 'linear-gradient(135deg, #C9963B 0%, #b88328 100%)',
                    boxShadow: '0 4px 16px rgba(201,150,59,0.25)',
                  }}
                >
                  {loading ? (
                    <span>{t('creatingAccount') || 'Creating account...'}</span>
                  ) : (
                    <span>{t('signUp') || 'Create account'}</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  ← {t('backToPersonal') || 'Back to account info'}
                </button>
              </>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {t('alreadyHaveAccount') || 'Already have an account?'}{' '}
            <Link
              href={`/${locale}/login`}
              className="font-bold text-[#C9963B] hover:text-[#a3721e] transition-colors"
            >
              {t('signIn') || 'Sign in'}
            </Link>
          </p>
        </div>

        <div className="text-center text-xs text-gray-400 max-w-md mx-auto">
          {t('platformFooter') || 'EstateLine Real Estate Management Platform'}
        </div>
      </div>
    </div>
  )
}
