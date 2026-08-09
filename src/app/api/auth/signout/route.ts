import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/auth'

const SITE_URL = 'https://estateline-sprypine.zocomputer.io'

export async function POST() {
  const supabase = createRouteClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(new URL('/en/login', SITE_URL), { status: 303 })
}
