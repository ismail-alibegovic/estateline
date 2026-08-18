import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'
import { supabaseEnv } from '@/lib/env'
import { integrationEnv, hasRealStripeSecret } from '@/lib/integration-env'

type StatusLevel = 'connected' | 'partial' | 'missing'

type IntegrationStatus = {
  key: string
  label: string
  description: string
  status: StatusLevel
  configured: string[]
  missing: string[]
}

const has = (value: string | undefined | null) => Boolean(value && value.trim().length > 0)

function statusFrom(required: Record<string, string | undefined | null>, optional: Record<string, string | undefined | null> = {}): Pick<IntegrationStatus, 'status' | 'configured' | 'missing'> {
  const configured = [...Object.entries(required), ...Object.entries(optional)]
    .filter(([, value]) => has(value))
    .map(([name]) => name)

  const missing = Object.entries(required)
    .filter(([, value]) => !has(value))
    .map(([name]) => name)

  return {
    status: missing.length === 0 ? 'connected' : configured.length > 0 ? 'partial' : 'missing',
    configured,
    missing,
  }
}

export async function GET() {
  const ctx = await getRouteContext()
  if (isAuthError(ctx)) return ctx

  const supabase = statusFrom({
    ESTATELINE_SUPABASE_URL: supabaseEnv.url,
    ESTATELINE_SUPABASE_ANON_KEY: supabaseEnv.anonKey,
    ESTATELINE_SUPABASE_SERVICE_ROLE_KEY: supabaseEnv.serviceRoleKey,
  }, {
    ESTATELINE_SUPABASE_MANAGEMENT_TOKEN: process.env.ESTATELINE_SUPABASE_MANAGEMENT_TOKEN,
  })

  const stripe = statusFrom({
    ESTATELINE_STRIPE_SECRET_KEY: integrationEnv.stripeSecretKey,
    ESTATELINE_STRIPE_PRICE_STARTER: integrationEnv.stripePrices.starter,
    ESTATELINE_STRIPE_PRICE_PRO: integrationEnv.stripePrices.pro,
    ESTATELINE_STRIPE_PRICE_AGENCY: integrationEnv.stripePrices.agency,
    ESTATELINE_STRIPE_WEBHOOK_SECRET: integrationEnv.stripeWebhookSecret,
  })

  const email = statusFrom({
    ESTATELINE_RESEND_API_KEY: integrationEnv.resendApiKey,
    ESTATELINE_EMAIL_FROM: integrationEnv.emailFrom,
  })

  const sms = statusFrom({
    ESTATELINE_TWILIO_ACCOUNT_SID: integrationEnv.twilioAccountSid,
    ESTATELINE_TWILIO_AUTH_TOKEN: integrationEnv.twilioAuthToken,
    ESTATELINE_TWILIO_FROM_NUMBER: integrationEnv.twilioFromNumber,
  }, {
    ESTATELINE_WHATSAPP_VERIFY_TOKEN: integrationEnv.whatsappVerifyToken,
  })

  const ai = statusFrom({
    ESTATELINE_GEMINI_API_KEY: integrationEnv.geminiApiKey,
  })

  const rateLimit = statusFrom({
    ESTATELINE_UPSTASH_REDIS_REST_URL: integrationEnv.upstashRedisRestUrl,
    ESTATELINE_UPSTASH_REDIS_REST_TOKEN: integrationEnv.upstashRedisRestToken,
  })

  const database = statusFrom({
    ESTATELINE_DATABASE_URL: process.env.ESTATELINE_DATABASE_URL || process.env.DATABASE_URL,
  })

  const integrations: IntegrationStatus[] = [
    {
      key: 'supabase',
      label: 'Supabase',
      description: 'Auth, organizations, listings, leads, RLS, and admin APIs.',
      ...supabase,
    },
    {
      key: 'gemini',
      label: 'Gemini AI',
      description: 'AI property descriptions and intelligent copy generation.',
      ...ai,
    },
    {
      key: 'stripe',
      label: 'Stripe Billing',
      description: hasRealStripeSecret() ? 'Live checkout, portal, and subscription webhooks.' : 'Checkout uses safe mock mode until live Stripe keys are added.',
      ...stripe,
    },
    {
      key: 'email',
      label: 'Resend Email',
      description: 'Transactional email for reports, invoices, and client communication.',
      ...email,
    },
    {
      key: 'sms',
      label: 'Twilio / WhatsApp',
      description: 'SMS reminders, WhatsApp webhook verification, and client messaging.',
      ...sms,
    },
    {
      key: 'rate-limit',
      label: 'Upstash Redis',
      description: 'Cross-instance rate limiting for public/API endpoints.',
      ...rateLimit,
    },
    {
      key: 'database-url',
      label: 'DB Smoke Tests',
      description: 'Direct Postgres connection for migration, RLS, and RPC smoke tests.',
      ...database,
    },
  ]

  return NextResponse.json({
    success: true,
    checked_at: new Date().toISOString(),
    organization: { id: ctx.org.id, name: ctx.org.name },
    summary: {
      connected: integrations.filter(item => item.status === 'connected').length,
      partial: integrations.filter(item => item.status === 'partial').length,
      missing: integrations.filter(item => item.status === 'missing').length,
    },
    integrations,
  })
}
