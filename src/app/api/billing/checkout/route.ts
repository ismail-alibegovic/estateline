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
}

export async function POST(request: Request) {
  const ctx = await getRouteContext()
  if (isAuthError(ctx)) return ctx

  try {
    const { tier } = await request.json()
    if (!tier || !['starter', 'pro'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid or missing tier' }, { status: 400 })
    }

    const priceId = PRICE_IDS[tier]

    // Construct origin for redirect URLs
    const origin = request.headers.get('origin') || 'http://localhost:3000'

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
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
      metadata: {
        organization_id: ctx.org.id,
        tier,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe Checkout Error:', err)
    // For demo/mock purposes, if Stripe fails due to mock key, we simulate a mock redirect
    if (process.env.STRIPE_SECRET_KEY === undefined || process.env.STRIPE_SECRET_KEY.startsWith('mock')) {
      const { tier } = await request.json().catch(() => ({ tier: 'starter' }))
      const origin = request.headers.get('origin') || 'http://localhost:3000'
      // Mock redirect back to billing page with success to simulate flow
      return NextResponse.json({ url: `${origin}/dashboard/settings/billing?success=true&mock_tier=${tier}` })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
