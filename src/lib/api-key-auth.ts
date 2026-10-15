import crypto from 'crypto'
import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { getRouteContext, isAuthError } from '@/lib/auth'
import type { RouteContext } from '@/lib/auth'

export const API_KEY_PREFIX = 'est_live_'

export function hashApiKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

/** Extract `Authorization: Bearer est_live_...`; null when absent or not an Estateline key. */
export function extractApiKey(req: Pick<NextRequest, 'headers'>): string | null {
  const header = req.headers.get('authorization')
  if (!header) return null
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim())
  if (!match || !match[1].startsWith(API_KEY_PREFIX)) return null
  return match[1]
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export interface ApiKeyContext {
  /**
   * Service-role client. It bypasses RLS, so every query made with it MUST be
   * filtered by `org.id`. Only use it in routes that opt in to API-key access.
   */
  supabase: SupabaseClient
  org: { id: string }
  keyId: string
  permissions: string[]
}

/**
 * Validate an API key. Keys are stored as SHA-256 hashes, so the lookup is by
 * hash. Returns an error Response (401/403/429) or the key's context.
 */
export async function authenticateApiKey(
  req: NextRequest,
  required: 'read' | 'write' = 'read'
): Promise<ApiKeyContext | Response> {
  const raw = extractApiKey(req)
  if (!raw) return json(401, { error: 'Missing or malformed API key', code: 'API_KEY_REQUIRED' })

  const admin = createAdminClient()
  const { data: key } = await admin
    .from('api_keys')
    .select('id, organization_id, permissions, last_used_at')
    .eq('key_hash', hashApiKey(raw))
    .maybeSingle()

  if (!key) return json(401, { error: 'Invalid API key', code: 'API_KEY_INVALID' })

  const permissions: string[] = key.permissions ?? []
  if (!permissions.includes(required)) {
    return json(403, { error: `API key lacks '${required}' permission`, code: 'API_KEY_FORBIDDEN' })
  }

  const rl = await checkRateLimit(req, 120, 60 * 1000, `apikey:${key.id}`)
  if (!rl.success) return rateLimitResponse()

  // Record usage at most once a minute to avoid a write per request.
  const last = key.last_used_at ? new Date(key.last_used_at).getTime() : 0
  if (Date.now() - last > 60 * 1000) {
    await admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id)
  }

  return { supabase: admin, org: { id: key.organization_id }, keyId: key.id, permissions }
}

export interface ReadContext {
  supabase: SupabaseClient
  org: { id: string }
  via: 'session' | 'api_key'
}

/**
 * For read-only GET routes that also serve integrations (Claude connector,
 * scripts): an `Authorization: Bearer est_live_...` header selects API-key
 * auth, otherwise the normal cookie session is used.
 */
export async function getReadContext(req: NextRequest): Promise<ReadContext | Response> {
  if (extractApiKey(req)) {
    const ctx = await authenticateApiKey(req, 'read')
    if (ctx instanceof Response) return ctx
    return { supabase: ctx.supabase, org: ctx.org, via: 'api_key' }
  }
  const ctx: RouteContext | Response = await getRouteContext()
  if (isAuthError(ctx)) return ctx
  return { supabase: ctx.supabase, org: ctx.org, via: 'session' }
}
