import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const defaultLocale = 'en'
const locales = ['en', 'bs']
const intlMiddleware = createMiddleware({ locales, defaultLocale })

export default function middleware(request: NextRequest) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Define allowed main domains (in production this would include estateline.ba, getestateline.com, etc.)
  const mainDomains = ['localhost:3000', 'estateline.ba', 'estateline.io', 'getestateline.com']
  
  // Detect subdomain
  let subdomain = ''
  const isMainDomain = mainDomains.some(d => hostname === d || hostname.endsWith('.' + d))
  
  if (isMainDomain) {
    // If it's localhost:3000 or main domain, check for subdomains like agency.localhost:3000
    const parts = hostname.split('.')
    // For localhost:3000, parts would be ['localhost:3000'] (length 1)
    // For agency.localhost:3000, parts would be ['agency', 'localhost:3000'] (length 2)
    // For agency.estateline.ba, parts would be ['agency', 'estateline', 'ba'] (length 3)
    if (hostname.includes('localhost') && parts.length > 1 && parts[0] !== 'www') {
      subdomain = parts[0]
    } else if (!hostname.includes('localhost') && parts.length > 2 && parts[0] !== 'www') {
      subdomain = parts[0]
    }
  } else {
    // If it's a custom domain mapped to an organization (future white-label feature)
    // we can map the whole hostname as the subdomain identifier
    subdomain = hostname
  }

  // Rewrite to subdomain path if detected
  if (subdomain && subdomain !== 'www') {
    // Exclude API routes and static files from rewrite
    const isApiOrStatic = url.pathname.startsWith('/api') || 
                          url.pathname.startsWith('/_next') || 
                          url.pathname.includes('.')
    
    if (!isApiOrStatic) {
      // Rewrite request to /site/[subdomain]/[path]
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
