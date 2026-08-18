import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'
import { hasRealStripeSecret, integrationEnv } from '@/lib/integration-env'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(integrationEnv.stripeSecretKey || 'mock_stripe_key', {
  apiVersion: '2023-10-16' as any,
})

const PRICE_IDS: Record<string, string> = {
  starter: integrationEnv.stripePrices.starter || 'price_starter_mock',
  pro: integrationEnv.stripePrices.pro || 'price_pro_mock',
  agency: integrationEnv.stripePrices.agency || 'price_agency_mock',
}

export async function POST(request: Request) {
  const ctx = await getRouteContext()
  if (isAuthError(ctx)) return ctx

  let tier = 'starter'

  try {
    const body = await request.json()
    tier = body?.tier
    if (!tier || !['starter', 'pro', 'agency'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid or missing tier' }, { status: 400 })
    }

    const priceId = PRICE_IDS[tier]
    const origin = request.headers.get('origin') || 'http://localhost:3000'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/dashboard/settings/billing?success=true`,
      cancel_url: `${origin}/dashboard/settings/billing?canceled=true`,
      client_reference_id: ctx.org.id,
      metadata: {
        organization_id: ctx.org.id,
        tier,
      },
    }

    // Attach existing Stripe customer ID if previously stored
    if (ctx.org.stripe_customer_id) {
      sessionParams.customer = ctx.org.stripe_customer_id
    } else {
      sessionParams.customer_email = ctx.user.email
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe Checkout Error:', err)
    if (!hasRealStripeSecret()) {
      const origin = request.headers.get('origin') || 'http://localhost:3000'
      return NextResponse.json({ url: `${origin}/dashboard/settings/billing?success=true&mock_tier=${tier}` })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
