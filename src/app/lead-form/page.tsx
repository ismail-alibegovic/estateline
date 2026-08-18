'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowRight, Building2, CheckCircle2, Mail, MessageSquareText, Phone, ShieldCheck, Sparkles, User } from 'lucide-react'

interface FormData {
  organization_slug: string
  first_name: string
  last_name: string
  email: string
  phone: string
  message: string
  property_id: string
}

const initialForm = (org = '', property = ''): FormData => ({
  organization_slug: org,
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  message: '',
  property_id: property,
})

function LeadFormInner() {
  const searchParams = useSearchParams()
  const defaultOrg = searchParams.get('org') || searchParams.get('agency') || ''
  const defaultProperty = searchParams.get('property') || ''
  const lockedOrg = Boolean(defaultOrg)
  const lockedProperty = Boolean(defaultProperty)
  const [formData, setFormData] = useState<FormData>(() => initialForm(defaultOrg, defaultProperty))
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const canSubmit = useMemo(() => {
    return Boolean(formData.organization_slug.trim() && formData.first_name.trim() && (formData.email.trim() || formData.phone.trim()))
  }, [formData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const response = await fetch('/api/leads/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(formData),
      })
      const result = await response.json()

      if (response.ok) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMsg(result.error || 'We could not send your request. Please check the details and try again.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Network connection failed. Please try again.')
    }
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setStatus('idle')
    setErrorMsg('')
    setFormData(initialForm(defaultOrg, defaultProperty))
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] font-sans text-gray-900" style={{ fontFamily: 'var(--font-body), Outfit, sans-serif' }}>
      <div className="grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
        <section
          className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between"
          style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 52%, #0F172A 100%)' }}
        >
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#C9963B] opacity-20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#C9963B] opacity-15 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:72px_72px]" />

          <div className="relative z-10 flex items-center gap-4">
            <Image src="/logo-icon.png" alt="EstateLine" width={48} height={48} className="h-12 w-12 object-contain drop-shadow-[0_4px_16px_rgba(201,150,59,0.5)]" />
            <div>
              <span className="block text-2xl font-bold leading-none tracking-tight text-white" style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}>
                EstateLine
              </span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.25em] text-[#C9963B]">REAL ESTATE CRM</span>
            </div>
          </div>

          <div className="relative z-10 my-auto max-w-lg space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-amber-300 backdrop-blur-md">
              <Sparkles size={14} />
              Public lead capture
            </div>
            <h1 className="text-5xl font-bold leading-tight tracking-tight text-white" style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}>
              Send the inquiry directly into the agency pipeline.
            </h1>
            <p className="text-base font-light leading-relaxed text-gray-300">
              This form is built for agency websites, property pages, and campaign links. Every valid inquiry lands in Estateline as a website lead.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                <Building2 size={20} className="text-[#C9963B]" />
                <p className="mt-3 text-sm font-bold text-white">Agency routed</p>
                <p className="mt-1 text-xs leading-5 text-gray-400">Uses organization slug to send leads to the right workspace.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                <ShieldCheck size={20} className="text-[#C9963B]" />
                <p className="mt-3 text-sm font-bold text-white">Protected intake</p>
                <p className="mt-1 text-xs leading-5 text-gray-400">Rate limited, validated, and stored server-side.</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-gray-400">
            <span>EstateLine Real Estate Management Platform</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-400" /> Supabase secured</span>
          </div>
        </section>

        <section className="flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-16">
          <div className="flex items-center gap-3 lg:hidden">
            <Image src="/logo-icon.png" alt="EstateLine" width={40} height={40} className="h-10 w-10 object-contain" />
            <div>
              <p className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display), serif' }}>EstateLine</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#C9963B]">Real Estate CRM</p>
            </div>
          </div>

          <div className="my-auto mx-auto w-full max-w-xl py-10">
            <div className="mb-8">
              <p className="page-eyebrow mb-1">PROPERTY INQUIRY</p>
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl" style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}>
                Request more information
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Leave your contact details and the agency will follow up with the right property context.
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200/70 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
              {status === 'success' ? (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                    <CheckCircle2 size={32} className="text-emerald-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display), serif' }}>Request sent</h1>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
                    Your inquiry is now in the agency workspace. An agent can follow up from Estateline.
                  </p>
                  <button
                    onClick={resetForm}
                    className="mt-7 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #C9963B 0%, #b88328 100%)', boxShadow: '0 4px 16px rgba(201,150,59,0.25)' }}
                  >
                    Send another inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">Agency slug *</label>
                    <div className="relative">
                      <Building2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={formData.organization_slug}
                        onChange={e => handleChange('organization_slug', e.target.value)}
                        placeholder="test"
                        disabled={lockedOrg}
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 shadow-sm outline-none transition-all focus:border-[#C9963B] focus:ring-2 focus:ring-[#C9963B]/20 disabled:bg-gray-50 disabled:text-gray-500"
                        required
                      />
                    </div>
                  </div>

                  {lockedProperty && (
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">Property ID</label>
                      <input
                        type="text"
                        value={formData.property_id}
                        disabled
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-xs text-gray-500 shadow-sm"
                      />
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">First name *</label>
                      <div className="relative">
                        <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={formData.first_name}
                          onChange={e => handleChange('first_name', e.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 shadow-sm outline-none transition-all focus:border-[#C9963B] focus:ring-2 focus:ring-[#C9963B]/20"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">Last name</label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={e => handleChange('last_name', e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition-all focus:border-[#C9963B] focus:ring-2 focus:ring-[#C9963B]/20"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">Email</label>
                      <div className="relative">
                        <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={e => handleChange('email', e.target.value)}
                          placeholder="name@email.com"
                          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 shadow-sm outline-none transition-all focus:border-[#C9963B] focus:ring-2 focus:ring-[#C9963B]/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">Phone</label>
                      <div className="relative">
                        <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={e => handleChange('phone', e.target.value)}
                          placeholder="+387 61 000 000"
                          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 shadow-sm outline-none transition-all focus:border-[#C9963B] focus:ring-2 focus:ring-[#C9963B]/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">Message</label>
                    <div className="relative">
                      <MessageSquareText size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
                      <textarea
                        value={formData.message}
                        onChange={e => handleChange('message', e.target.value)}
                        rows={4}
                        placeholder="I am interested in this property and would like more details."
                        className="w-full resize-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 shadow-sm outline-none transition-all focus:border-[#C9963B] focus:ring-2 focus:ring-[#C9963B]/20"
                      />
                    </div>
                  </div>

                  {status === 'error' && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                      {errorMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'loading' || !canSubmit}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white shadow-md transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-55 enabled:hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #C9963B 0%, #b88328 100%)', boxShadow: '0 4px 16px rgba(201,150,59,0.25)' }}
                  >
                    {status === 'loading' ? 'Sending inquiry...' : 'Send inquiry'}
                    {status !== 'loading' && <ArrowRight size={16} />}
                  </button>

                  <p className="text-center text-xs leading-5 text-gray-400">
                    Email or phone is required. This form is protected by rate limiting and validation.
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default function LeadCaptureForm() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDFBF7]" />}>
      <LeadFormInner />
    </Suspense>
  )
}
