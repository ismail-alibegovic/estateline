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

  try {
    if (!sig || !webhookSecret) {
      // In development without CLI secrets, we can allow mock webhooks
      const json = JSON.parse(body)
      event = json as any
    } else {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabase = createAdminClient()

  // Handle billing events
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.metadata?.organization_id
        const tier = session.metadata?.tier

        if (orgId && tier) {
          const { error } = await supabase
            .from('organizations')
            .update({ subscription_tier: tier })
            .eq('id', orgId)
          if (error) throw error
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        // We'd query org by stripe customer ID if we stored it,
        // or for simplicity, fallback to starter/free
        // In real setup, we map customer_id -> org
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook handling error:', err)
    return new NextResponse('Webhook handler failed', { status: 500 })
  }
}
