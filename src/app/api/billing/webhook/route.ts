import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'mock_stripe_key', {
  apiVersion: '2023-10-16' as any,
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

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
        const status = subscription.status // 'active', 'past_due', 'canceled', 'unpaid'
        const tier = subscription.metadata?.tier

        if (customerId) {
          const updatePayload: Record<string, any> = {
            subscription_status: status === 'active' ? 'active' : (status === 'past_due' ? 'past_due' : 'canceled'),
          }
          if (tier) updatePayload.subscription_tier = tier

          const { error } = await supabase
            .from('organizations')
            .update(updatePayload)
            .eq('stripe_customer_id', customerId)

          if (error) console.error('Error updating subscription status from webhook:', error.message)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id

        if (customerId) {
          // Downgrade organization on subscription cancellation / payment failure
          const { error } = await supabase
            .from('organizations')
            .update({
              subscription_tier: 'starter',
              subscription_status: 'canceled',
            })
            .eq('stripe_customer_id', customerId)

          if (error) console.error('Error handling subscription deletion:', error.message)
          console.log(`Stripe Webhook: Downgraded org with customer ${customerId} to starter/canceled`)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook handling error:', err)
    return new NextResponse(`Webhook handler failed: ${err.message}`, { status: 500 })
  }
}
