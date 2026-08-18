import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireSupabasePublicEnv } from '@/lib/env'
import { maskEmail } from '@/lib/redact'

export async function POST(request: Request) {
  try {
    const { email, locale = 'bs' } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const cookieStore = cookies()
    const { url: supabaseUrl, anonKey: supabaseAnonKey } = requireSupabasePublicEnv()
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          },
        },
      }
    )

    const safeLocale = locale === 'bs' ? 'bs' : 'en'
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://estateline-sprypine.zocomputer.io'
    const redirectTo = `${origin}/${safeLocale}/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      console.warn('Password reset request could not be sent:', {
        email: maskEmail(email),
        status: error.status,
        message: error.message,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Upute za ponovno postavljanje lozinke su poslate na vašu email adresu.',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
