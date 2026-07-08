import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

/**
 * SSR client bound to the caller's cookies. RLS is enforced: a user can
 * only see rows for organizations they belong to. Never use this for
 * privileged actions that bypass RLS.
 *
 * Typed loosely (SupabaseClient rather than the partial Database type) so
 * inserts/updates against tables not yet declared in src/lib/supabase.ts
 * do not break the typecheck. RLS applies at the database layer regardless.
 */
export function createRouteClient(): SupabaseClient {
  const cookieStore = cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
  })
}

export interface RouteContext {
  /** RLS-enforced client — use for all reads/writes. */
  supabase: ReturnType<typeof createRouteClient>
  /** The authenticated user's profile row in `users`. */
  user: { id: string; auth_id: string; email: string; full_name: string | null }
  /** The user's primary organization. */
  org: { id: string; name: string; slug: string }
  /** The user's role in this org (owner | admin | agent | viewer). */
  role: 'owner' | 'admin' | 'agent' | 'viewer'
}

/**
 * Resolve the authenticated user + their primary organization.
 *
 * Throws a `Response` (401 / 403) when there is no session or the user has
 * no org, so callers can `return errorResponse(ctx)` to short-circuit. This
 * replaces every prior `createAdminClient()` call: API routes must never
 * trust a client-supplied `org_id` and must never touch the service role.
 */
export async function getRouteContext(): Promise<RouteContext | Response> {
  const supabase = createRouteClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, auth_id, email, full_name')
    .eq('auth_id', authUser.id)
    .single()

  if (!profile) {
    return new Response(
      JSON.stringify({ error: 'Profile not found' }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    )
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role, organization_id, organizations(id, name, slug)')
    .eq('user_id', profile.id)
    .eq('is_primary', true)
    .single()

  if (!membership) {
    return new Response(
      JSON.stringify({ error: 'No organization membership' }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    )
  }

  return {
    supabase,
    user: profile as RouteContext['user'],
    // @ts-expect-error — join select returns a nested object
    org: membership.organizations,
    role: membership.role as RouteContext['role'],
  }
}

/** Convenience: turn a thrown Response into the proper NextResponse return. */
export function isAuthError(ctx: RouteContext | Response): ctx is Response {
  return ctx instanceof Response
}
