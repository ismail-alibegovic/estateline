import crypto from 'crypto'
import { calculateWebhookSignature } from './webhook-signature'
import { createAdminClient } from '@/lib/supabase'

export interface WebhookEventPayload {
  event: 'property.created' | 'property.updated' | 'lead.created' | 'deal.updated' | 'viewing.scheduled'
  organization_id: string
  timestamp: string
  data: Record<string, unknown>
}

/**
 * Calculates HMAC-SHA256 signature for webhook payload verification.
 */
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')

/**
 * Dispatches an event payload to all active webhook subscribers for an organization.
 */
export async function dispatchWebhookEvent(
  organizationId: string,
  event: WebhookEventPayload['event'],
  data: Record<string, unknown>
): Promise<{ dispatched: number; failed: number }> {
  try {
    const supabase = createAdminClient()

    // Fetch active subscriptions for this org & event
    const { data: subscriptions } = await supabase
      .from('webhook_subscriptions')
      .select('id, url, secret, events')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (!subscriptions || subscriptions.length === 0) {
      return { dispatched: 0, failed: 0 }
    }

    const matchingSubs = subscriptions.filter(
      (sub) => sub.events.includes('*') || sub.events.includes(event)
    )

    if (matchingSubs.length === 0) {
      return { dispatched: 0, failed: 0 }
    }

    const payloadObj: WebhookEventPayload = {
      event,
      organization_id: organizationId,
      timestamp: new Date().toISOString(),
      data,
    }

    const payloadString = JSON.stringify(payloadObj)
    let dispatched = 0
    let failed = 0

    await Promise.allSettled(
      matchingSubs.map(async (sub) => {
        try {
          const signature = calculateWebhookSignature(sub.secret, payloadString)
          const response = await fetch(sub.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Estateline-Signature': signature,
              'X-Estateline-Event': event,
            },
            body: payloadString,
          })

          if (response.ok) {
            dispatched++
          } else {
            failed++
          }
        } catch {
          failed++
        }
      })
    )

    return { dispatched, failed }
  } catch {
    return { dispatched: 0, failed: 0 }
  }
}
