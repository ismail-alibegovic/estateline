export const integrationEnv = {
  get stripeSecretKey() { return process.env.ESTATELINE_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY },
  get stripeWebhookSecret() { return process.env.ESTATELINE_STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET },
  stripePrices: {
    get starter() { return process.env.ESTATELINE_STRIPE_PRICE_STARTER || process.env.STRIPE_PRICE_STARTER },
    get pro() { return process.env.ESTATELINE_STRIPE_PRICE_PRO || process.env.STRIPE_PRICE_PRO },
    get agency() { return process.env.ESTATELINE_STRIPE_PRICE_AGENCY || process.env.STRIPE_PRICE_AGENCY },
  },
  get resendApiKey() { return process.env.ESTATELINE_RESEND_API_KEY || process.env.RESEND_API_KEY },
  get emailFrom() { return process.env.ESTATELINE_EMAIL_FROM || process.env.EMAIL_FROM },
  get twilioAccountSid() { return process.env.ESTATELINE_TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID },
  get twilioAuthToken() { return process.env.ESTATELINE_TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN },
  get twilioFromNumber() { return process.env.ESTATELINE_TWILIO_FROM_NUMBER || process.env.TWILIO_FROM_NUMBER },
  get whatsappVerifyToken() { return process.env.ESTATELINE_WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN },
  get whatsappAppSecret() { return process.env.ESTATELINE_WHATSAPP_APP_SECRET || process.env.WHATSAPP_APP_SECRET },
  get geminiApiKey() {
    return process.env.ESTATELINE_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY
  },
  get upstashRedisRestUrl() { return process.env.ESTATELINE_UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL },
  get upstashRedisRestToken() { return process.env.ESTATELINE_UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN },
}

/**
 * Mock fallbacks (fake checkout URLs, "sent" messages that were never sent)
 * are for local development only. In production a missing provider key must
 * surface as an error, not as a success the customer believes.
 */
export function allowMockIntegrations(): boolean {
  return process.env.NODE_ENV !== 'production'
}

export function integrationNotConfiguredResponse(name: string): Response {
  return new Response(
    JSON.stringify({
      error: `${name} is not configured on this server. Contact support.`,
      code: 'INTEGRATION_NOT_CONFIGURED',
    }),
    { status: 503, headers: { 'content-type': 'application/json' } }
  )
}

export function hasRealStripeSecret(): boolean {
  return Boolean(integrationEnv.stripeSecretKey && !integrationEnv.stripeSecretKey.startsWith('mock'))
}
