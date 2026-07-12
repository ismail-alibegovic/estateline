import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'mock_stripe_key', {
  apiVersion: '2023-10-16' as any,
})

export async function POST(request: Request) {
  const ctx = await getRouteContext()
  if (isAuthError(ctx)) return ctx

  try {
    const origin = request.headers.get('origin') || 'http://localhost:3000'

    // In a real environment, we'd store stripe_customer_id in organizations table
    // For now we mock/create a new customer or use a mock redirect
    const session = await stripe.billingPortal.sessions.create({
      customer: 'cus_mock_id', // Needs valid customer ID in live
      return_url: `${origin}/dashboard/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe Portal Error:', err)
    // Fallback for mock environments
    const origin = request.headers.get('origin') || 'http://localhost:3000'
    return NextResponse.json({ url: `${origin}/dashboard/settings/billing` })
  }
}
