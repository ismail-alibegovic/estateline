import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireSupabasePublicEnv } from '@/lib/env'

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

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://estateline-sprypine.zocomputer.io'
    const redirectTo = `${origin}/${locale}/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Upute za ponovno postavljanje lozinke su poslate na vašu email adresu.',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
