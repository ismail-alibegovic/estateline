import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireSupabasePublicEnv } from '@/lib/env'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
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

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Vaša lozinka je uspješno izmijenjena.',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
