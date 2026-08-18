import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireSupabasePublicEnv } from '@/lib/env'

const supportedLocales = new Set(['en', 'bs'])

function safeNextPath(input: string | null): string {
  if (!input || !input.startsWith('/')) return '/en/dashboard'
  if (input.startsWith('//')) return '/en/dashboard'
  return input
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = safeNextPath(requestUrl.searchParams.get('next'))
  const locale = requestUrl.searchParams.get('locale')
  const fallbackLocale = locale && supportedLocales.has(locale) ? locale : 'en'
  const fallbackUrl = new URL(`/${fallbackLocale}/login`, requestUrl.origin)

  if (!code) {
    fallbackUrl.searchParams.set('error', 'missing_code')
    return NextResponse.redirect(fallbackUrl)
  }

  const response = NextResponse.redirect(new URL(next, requestUrl.origin))
  const cookieStore = cookies()
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = requireSupabasePublicEnv()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    fallbackUrl.searchParams.set('error', 'invalid_or_expired_link')
    return NextResponse.redirect(fallbackUrl)
  }

  return response
}
