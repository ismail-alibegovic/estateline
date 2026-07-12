'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface FormData {
  organization_slug: string
  first_name: string
  last_name: string
  email: string
  phone: string
  message: string
  property_id: string
}

export default function LeadCaptureForm() {
  const [formData, setFormData] = useState<FormData>({
    organization_slug: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    message: '',
    property_id: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const response = await fetch('/api/leads/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const result = await response.json()

      if (response.ok) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMsg(result.error || 'Failed to submit')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Network error')
    }
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border shadow-soft p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Contact Us
          </h1>
          <p className="text-muted-foreground mt-1">
            Interested in a property? Send us a message.
          </p>
        </div>

        {status === 'success' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-[#eaf9e6] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#4d8f3a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground">Message Sent!</h2>
            <p className="text-muted-foreground mt-2">
              We'll get back to you soon.
            </p>
            <button
              onClick={() => {
                setStatus('idle')
                setFormData({ organization_slug: '', first_name: '', last_name: '', email: '', phone: '', message: '', property_id: '' })
              }}
              className="mt-6 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Send Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Organization *
              </label>
              <input
                type="text"
                value={formData.organization_slug}
                onChange={e => handleChange('organization_slug', e.target.value)}
                placeholder="agency-slug"
                className="w-full border border-border rounded-lg px-4 py-2.5 bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={e => handleChange('first_name', e.target.value)}
                  className="w-full border border-border rounded-lg px-4 py-2.5 bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={e => handleChange('last_name', e.target.value)}
                  className="w-full border border-border rounded-lg px-4 py-2.5 bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                className="w-full border border-border rounded-lg px-4 py-2.5 bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                className="w-full border border-border rounded-lg px-4 py-2.5 bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Message
              </label>
              <textarea
                value={formData.message}
                onChange={e => handleChange('message', e.target.value)}
                rows={3}
                className="w-full border border-border rounded-lg px-4 py-2.5 bg-background text-foreground focus:ring-2 focus:ring-primary outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {status === 'loading' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75"/></svg>
                  Sending...
                </span>
              ) : (
                'Send Message'
              )}
            </button>

            {status === 'error' && (
              <p className="text-destructive text-sm text-center">{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
