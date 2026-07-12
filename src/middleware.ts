import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const defaultLocale = 'en'
const locales = ['en', 'bs']
const pathname = createMiddleware({ locales, defaultLocale })

export default function middleware(request: NextRequest) {
  return pathname(request)
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*)*)'],
}
