import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const defaultLocale = 'en'
const locales = ['en', 'bs']
const intlMiddleware = createMiddleware({ locales, defaultLocale })

export async function middleware(request: NextRequest) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Explicitly bypass API and static resource files before any rewrites
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/_next') || url.pathname.includes('.')) {
    return NextResponse.next()
  }

  // Check if pathname targets dashboard
  const isDashboardPath =
    url.pathname === '/dashboard' ||
    url.pathname.startsWith('/dashboard/') ||
    locales.some(
      loc => url.pathname === `/${loc}/dashboard` || url.pathname.startsWith(`/${loc}/dashboard/`)
    )

  if (isDashboardPath) {
    let responseWithCookies = NextResponse.next()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            request.cookies.set({ name, value, ...options })
            responseWithCookies = NextResponse.next({
              request: { headers: request.headers },
            })
            responseWithCookies.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            request.cookies.set({ name, value: '', ...options })
            responseWithCookies = NextResponse.next({
              request: { headers: request.headers },
            })
            responseWithCookies.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const matchedLocale =
        locales.find(loc => url.pathname.startsWith(`/${loc}/`)) || defaultLocale
      const loginUrl = new URL(`/${matchedLocale}/login`, request.url)
      loginUrl.searchParams.set('redirect', url.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Clean the host name by removing ports
  const cleanHost = hostname.split(':')[0]

  let subdomain = ''

  if (cleanHost === 'localhost' || cleanHost === '127.0.0.1') {
    // Local dev: No subdomain rewrite
    subdomain = ''
  } else if (cleanHost.endsWith('.localhost')) {
    // Local dev subdomains (e.g. agency.localhost)
    subdomain = cleanHost.replace('.localhost', '')
  } else {
    // Production domains
    const mainDomains = ['estateline.ba', 'estateline.io', 'getestateline.com']
    const isMainDomain = mainDomains.some(d => cleanHost === d || cleanHost.endsWith('.' + d))

    if (isMainDomain) {
      for (const d of mainDomains) {
        if (cleanHost.endsWith('.' + d)) {
          subdomain = cleanHost.replace('.' + d, '')
          break
        }
      }
    } else {
      // Custom white-labeled domain mapping
      subdomain = cleanHost
    }
  }

  // Rewrite to subdomain path if detected
  if (subdomain && subdomain !== 'www') {
    const isApiOrStatic =
      url.pathname.startsWith('/api') ||
      url.pathname.startsWith('/_next') ||
      url.pathname.includes('.')

    if (!isApiOrStatic) {
      const path = url.pathname === '/' ? '' : url.pathname
      return NextResponse.rewrite(new URL(`/site/${subdomain}${path}`, request.url))
    }
  }

  // Otherwise, run internationalization middleware
  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*)*)'],
}

