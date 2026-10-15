import { calculateWebhookSignature } from './webhook-signature'
import { createAdminClient } from '@/lib/supabase'
import { validateWebhookUrl } from './webhook-url'
import { allowMockIntegrations } from './integration-env'

export interface WebhookEventPayload {
  event:
    | 'property.created'
    | 'property.updated'
    | 'lead.created'
    | 'deal.updated'
    | 'viewing.scheduled'
  organization_id: string
  timestamp: string
  data: Record<string, unknown>
}

const ATTEMPT_DELAYS_MS = [0, 1000, 4000]
const REQUEST_TIMEOUT_MS = 5000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function deliver(
  url: string,
  secret: string,
  event: string,
  body: string
): Promise<{ ok: boolean; status: number | null; attempts: number; error?: string }> {
  const check = validateWebhookUrl(url, { allowInsecure: allowMockIntegrations() })
  if (!check.ok) return { ok: false, status: null, attempts: 0, error: check.reason }

  let status: number | null = null
  let error: string | undefined
  for (let i = 0; i < ATTEMPT_DELAYS_MS.length; i++) {
    if (ATTEMPT_DELAYS_MS[i]) await sleep(ATTEMPT_DELAYS_MS[i])
    try {
      const res = await fetch(check.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Estateline-Signature': calculateWebhookSignature(secret, body),
          'X-Estateline-Event': event,
        },
        body,
        redirect: 'manual',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      status = res.status
      if (res.ok) return { ok: true, status, attempts: i + 1 }
      error = `HTTP ${res.status}`
      // 4xx (except 408/429) will not succeed on retry
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        return { ok: false, status, attempts: i + 1, error }
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'request failed'
    }
  }
  return { ok: false, status, attempts: ATTEMPT_DELAYS_MS.length, error }
}

/**
 * Dispatch an event to every active subscription of the organization that
 * listens for it. Never throws. Each delivery is retried (1s, 4s backoff) and
 * logged to webhook_deliveries when that table exists. Call it without
 * awaiting from request handlers: `void dispatchWebhookEvent(...)`.
 */
export async function dispatchWebhookEvent(
  organizationId: string,
  event: WebhookEventPayload['event'],
  data: Record<string, unknown>
): Promise<{ dispatched: number; failed: number }> {
  try {
    const supabase = createAdminClient()

    const { data: subscriptions } = await supabase
      .from('webhook_subscriptions')
      .select('id, url, secret, events')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    const matchingSubs = (subscriptions ?? []).filter(
      (sub) => sub.events.includes('*') || sub.events.includes(event)
    )
    if (matchingSubs.length === 0) return { dispatched: 0, failed: 0 }

    const payload: WebhookEventPayload = {
      event,
      organization_id: organizationId,
      timestamp: new Date().toISOString(),
      data,
    }
    const body = JSON.stringify(payload)
    let dispatched = 0
    let failed = 0

    await Promise.allSettled(
      matchingSubs.map(async (sub) => {
        const result = await deliver(sub.url, sub.secret, event, body)
        if (result.ok) dispatched++
        else failed++
        // Best-effort log; ignored if the table is not migrated yet.
        await supabase
          .from('webhook_deliveries')
          .insert({
            organization_id: organizationId,
            subscription_id: sub.id,
            event,
            success: result.ok,
            status_code: result.status,
            attempts: result.attempts,
            error: result.error ?? null,
          })
          .then(() => undefined, () => undefined)
      })
    )

    return { dispatched, failed }
  } catch {
    return { dispatched: 0, failed: 0 }
  }
}
