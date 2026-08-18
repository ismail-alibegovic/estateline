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
  get geminiApiKey() {
    return process.env.ESTATELINE_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY
  },
  get upstashRedisRestUrl() { return process.env.ESTATELINE_UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL },
  get upstashRedisRestToken() { return process.env.ESTATELINE_UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN },
}

export function hasRealStripeSecret(): boolean {
  return Boolean(integrationEnv.stripeSecretKey && !integrationEnv.stripeSecretKey.startsWith('mock'))
}
