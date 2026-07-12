'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function SignupPage() {
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
  const router = useRouter()
  const params = useParams()
  const locale = params?.locale || 'en'

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-8 bg-card rounded-2xl border border-border shadow-soft">
        <h1 className="text-2xl font-bold text-center mb-6 text-foreground">
          Create your account
        </h1>

        <div className="flex mb-6">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 mx-1 rounded ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded text-sm">
              {error}
            </div>
          )}

          {step === 1 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Full name
                </label>
                <input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Password
                </label>
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  minLength={8}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md shadow-soft transition-colors"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Organization name
                </label>
                <input
                  name="orgName"
                  value={formData.orgName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Organization slug (unique)
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-border rounded-l-md bg-muted text-muted-foreground text-sm">
                    estateline.com/
                  </span>
                  <input
                    name="orgSlug"
                    value={formData.orgSlug}
                    onChange={handleChange}
                    pattern="[a-z0-9-]+"
                    className="flex-1 px-3 py-2 border border-border rounded-r-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Lowercase letters, numbers, and hyphens only.
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md shadow-soft disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-2 px-4 bg-transparent hover:bg-muted text-muted-foreground font-medium rounded-md transition-colors"
              >
                Back
              </button>
            </>
          )}
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <a href={`/${locale}/login`} className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}
