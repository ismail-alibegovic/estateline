import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'mock_stripe_key', {
  apiVersion: '2023-10-16' as any,
})

const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || 'price_starter_mock',
  pro: process.env.STRIPE_PRICE_PRO || 'price_pro_mock',
  agency: process.env.STRIPE_PRICE_AGENCY || 'price_agency_mock',
}

export async function POST(request: Request) {
  const ctx = await getRouteContext()
  if (isAuthError(ctx)) return ctx

  try {
    const { tier } = await request.json()
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
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('mock')) {
      const { tier } = await request.json().catch(() => ({ tier: 'starter' }))
      const origin = request.headers.get('origin') || 'http://localhost:3000'
      return NextResponse.json({ url: `${origin}/dashboard/settings/billing?success=true&mock_tier=${tier}` })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
