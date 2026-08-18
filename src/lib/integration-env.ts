export const integrationEnv = {
  stripeSecretKey: process.env.ESTATELINE_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.ESTATELINE_STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET,
  stripePrices: {
    starter: process.env.ESTATELINE_STRIPE_PRICE_STARTER || process.env.STRIPE_PRICE_STARTER,
    pro: process.env.ESTATELINE_STRIPE_PRICE_PRO || process.env.STRIPE_PRICE_PRO,
    agency: process.env.ESTATELINE_STRIPE_PRICE_AGENCY || process.env.STRIPE_PRICE_AGENCY,
  },
  resendApiKey: process.env.ESTATELINE_RESEND_API_KEY || process.env.RESEND_API_KEY,
  emailFrom: process.env.ESTATELINE_EMAIL_FROM || process.env.EMAIL_FROM,
  twilioAccountSid: process.env.ESTATELINE_TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.ESTATELINE_TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN,
  twilioFromNumber: process.env.ESTATELINE_TWILIO_FROM_NUMBER || process.env.TWILIO_FROM_NUMBER,
  whatsappVerifyToken: process.env.ESTATELINE_WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN,
  geminiApiKey:
    process.env.ESTATELINE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  upstashRedisRestUrl: process.env.ESTATELINE_UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL,
  upstashRedisRestToken: process.env.ESTATELINE_UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
}

export function hasRealStripeSecret(): boolean {
  return Boolean(integrationEnv.stripeSecretKey && !integrationEnv.stripeSecretKey.startsWith('mock'))
}
