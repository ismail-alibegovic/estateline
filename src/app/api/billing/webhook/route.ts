import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { integrationEnv } from '@/lib/integration-env'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(integrationEnv.stripeSecretKey || 'mock_stripe_key', {
  apiVersion: '2023-10-16' as any,
})

const webhookSecret = integrationEnv.stripeWebhookSecret || ''

/** Reverse map of configured Stripe price IDs -> plan tier (for events without metadata.tier). */
function tierFromPrice(priceId: string | null | undefined): string | undefined {
  if (!priceId) return undefined
  const { starter, pro, agency } = integrationEnv.stripePrices
  if (priceId && priceId === starter) return 'starter'
  if (priceId && priceId === pro) return 'pro'
  if (priceId && priceId === agency) return 'agency'
  return undefined
}

function firstSubscriptionPriceId(subscription: Stripe.Subscription): string | undefined {
  const item = subscription.items?.data?.[0]
  const price = item?.price
  return typeof price === 'string' ? price : price?.id
}

/**
 * Claim an event before processing. Returns false when the event was already
 * seen (duplicate delivery / Stripe retry) so it can be acknowledged without
 * re-applying side effects.
 */
async function claimEvent(supabase: ReturnType<typeof createAdminClient>, event: Stripe.Event): Promise<boolean> {
  const { data, error } = await supabase
    .from('stripe_webhook_events')
    .upsert(
      { event_id: event.id, event_type: event.type },
      { onConflict: 'event_id', ignoreDuplicates: true }
    )
    .select('id')

  if (error) {
    // Claim table unavailable — log loudly but process anyway so billing
    // state never diverges from Stripe because of our own bookkeeping.
    console.error('Stripe webhook: failed to claim event (processing anyway):', error.message)
    return true
  }
  return Array.isArray(data) && data.length > 0
}

async function markEventProcessed(supabase: ReturnType<typeof createAdminClient>, eventId: string): Promise<void> {
  await supabase
    .from('stripe_webhook_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('event_id', eventId)
}

async function updateOrgByCustomer(
  supabase: ReturnType<typeof createAdminClient>,
  customerId: string,
  payload: Record<string, any>
): Promise<void> {
  const { error } = await supabase
    .from('organizations')
    .update(payload)
    .eq('stripe_customer_id', customerId)
  if (error) console.error('Stripe webhook: org update failed:', error.message)
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature') || ''

  let event: Stripe.Event

  // In production, signature verification is MANDATORY
  const isProd = process.env.NODE_ENV === 'production'

  try {
    if (isProd || webhookSecret) {
      if (!sig || !webhookSecret) {
        console.error('Stripe webhook failed: Missing stripe-signature or STRIPE_WEBHOOK_SECRET')
        return new NextResponse('Webhook Error: Missing signature or webhook secret', { status: 400 })
      }
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } else {
      // Development mock mode fallback
      event = JSON.parse(body) as Stripe.Event
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabase = createAdminClient()

  // Idempotency gate — Stripe retries deliveries until we return 200.
  if (!(await claimEvent(supabase, event))) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.metadata?.organization_id || session.client_reference_id
        const tier = session.metadata?.tier || 'pro'
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

        if (orgId) {
          const updatePayload: Record<string, any> = {
            subscription_tier: tier,
            subscription_status: 'active',
          }
          if (customerId) updatePayload.stripe_customer_id = customerId
          if (subscriptionId) updatePayload.stripe_subscription_id = subscriptionId

          const { error } = await supabase
            .from('organizations')
            .update(updatePayload)
            .eq('id', orgId)

          if (error) throw error
          console.log(`Stripe Webhook: Updated org ${orgId} to tier ${tier}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
        const status = subscription.status // 'active', 'past_due', 'unpaid', 'canceled'

        // Grace statuses keep the org flagged but not canceled.
        const mapped =
          status === 'active'
            ? 'active'
            : status === 'past_due' || status === 'unpaid'
              ? 'past_due'
              : 'canceled'

        if (customerId) {
          const updatePayload: Record<string, any> = {
            subscription_status: mapped,
          }
          // Tier: prefer event metadata, fall back to the subscription's price.
          const tier = subscription.metadata?.tier || tierFromPrice(firstSubscriptionPriceId(subscription))
          if (tier) updatePayload.subscription_tier = tier

          await updateOrgByCustomer(supabase, customerId, updatePayload)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id

        if (customerId) {
          // Downgrade organization on subscription cancellation / payment failure
          await updateOrgByCustomer(supabase, customerId, {
            subscription_tier: 'starter',
            subscription_status: 'canceled',
          })
          console.log(`Stripe Webhook: Downgraded org with customer ${customerId} to starter/canceled`)
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        if (customerId) {
          await updateOrgByCustomer(supabase, customerId, { subscription_status: 'active' })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        if (customerId) {
          await updateOrgByCustomer(supabase, customerId, { subscription_status: 'past_due' })
        }
        break
      }
    }

    await markEventProcessed(supabase, event.id)
    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook handling error:', err)
    return new NextResponse(`Webhook handler failed: ${err.message}`, { status: 500 })
  }
}
