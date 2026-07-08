import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { locales, defaultLocale } from '@/i18n'

const APP_DOMAINS = new Set(['localhost', 'estateline.zocomputer.io', 'estateline-sprypine.zocomputer.io'])

function isMicrositeHost(host: string): boolean {
  return !APP_DOMAINS.has(host) && !host.split('.').every(p => !isNaN(Number(p)))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') || 'localhost'

  // ---- 1. Subdomain microsite: delegate to app/[subdomain] ----
  if (isMicrositeHost(host) && !pathname.startsWith('/api/') && !pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }

  // ---- 2. Locale handling for app domain ----
  const pathnameSegments = pathname.split('/').filter(Boolean)
  const hasLocalePrefix = locales.includes(pathnameSegments[0] as typeof locales[number])

  // Redirect bare /dashboard etc. → /<defaultLocale>/dashboard
  if (!hasLocalePrefix && !pathname.startsWith('/api/') && !pathname.startsWith('/_next') && pathname !== '/') {
    const newPath = `/${defaultLocale}${pathname === '/' ? '' : pathname}`
    const url = request.nextUrl.clone()
    url.pathname = newPath
    return NextResponse.redirect(url)
  }

  // ---- 3. Auth gate for /<locale>/dashboard ----
  const response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          (request.cookies as any).set(name, value, options)
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const isDashboardPath = pathnameSegments[1] === 'dashboard'
  const isAuthPage = pathnameSegments[1] === 'login' || pathnameSegments[1] === 'signup'

  if (isDashboardPath && !session) {
    const url = request.nextUrl.clone()
    url.pathname = `/${pathnameSegments[0]}/login`
    return NextResponse.redirect(url)
  }

  if (session && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = `/${pathnameSegments[0]}/dashboard`
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
