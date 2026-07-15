import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const defaultLocale = 'en'
const locales = ['en', 'bs']
const intlMiddleware = createMiddleware({ locales, defaultLocale })

export default function middleware(request: NextRequest) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Explicitly bypass API and static resource files before any rewrites
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/_next') || url.pathname.includes('.')) {
    return NextResponse.next()
  }

  console.log('Middleware intercepting:', url.pathname, 'Host:', hostname)

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
    const isApiOrStatic = url.pathname.startsWith('/api') || 
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
