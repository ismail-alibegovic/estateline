import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
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
    let customerId = ctx.org.stripe_customer_id

    // If no stripe customer ID is attached to the organization, create one now
    if (!customerId && process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('mock')) {
      const customer = await stripe.customers.create({
        email: ctx.user.email,
        name: ctx.org.name,
        metadata: {
          organization_id: ctx.org.id,
        },
      })
      customerId = customer.id

      const supabase = createAdminClient()
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', ctx.org.id)
    }

    if (!customerId) {
      // In mock/test environments without live Stripe credentials, redirect back to billing UI
      return NextResponse.json({ url: `${origin}/dashboard/settings/billing` })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe Portal Error:', err)
    const origin = request.headers.get('origin') || 'http://localhost:3000'
    return NextResponse.json({ url: `${origin}/dashboard/settings/billing` })
  }
}
