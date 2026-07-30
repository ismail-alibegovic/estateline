/**
 * Sentry PII Sanitization / Scrubbing logic.
 * Ensures no phone numbers, emails, or names reach Sentry in beforeSend.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi
const PHONE_REGEX = /\b(\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g

export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return text
  return text.replace(EMAIL_REGEX, '[REDACTED_EMAIL]').replace(PHONE_REGEX, '[REDACTED_PHONE]')
}

const PII_KEYS = new Set([
  'email',
  'phone',
  'telephone',
  'phone_number',
  'mobile',
  'first_name',
  'last_name',
  'name',
  'sender_name',
  'contact_name',
  'full_name',
  'ip_address',
  'ip'
])

export function sanitizeObject(obj: any, depth = 0): any {
  if (depth > 8 || obj === null || obj === undefined) return obj
  if (typeof obj === 'string') return sanitizeText(obj)
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1))
  }

  const sanitized: Record<string, any> = {}
  for (const [key, val] of Object.entries(obj)) {
    const keyLower = key.toLowerCase()
    if (PII_KEYS.has(keyLower)) {
      sanitized[key] = keyLower.includes('email')
        ? '[REDACTED_EMAIL]'
        : keyLower.includes('phone') || keyLower.includes('mobile') || keyLower.includes('telephone')
        ? '[REDACTED_PHONE]'
        : '[REDACTED_NAME]'
    } else {
      sanitized[key] = sanitizeObject(val, depth + 1)
    }
  }
  return sanitized
}

export function beforeSendSentry(event: any): any {
  if (!event) return event

  // 1. Sanitize user info
  if (event.user) {
    if (event.user.email) event.user.email = '[REDACTED_EMAIL]'
    if (event.user.username) event.user.username = '[REDACTED_NAME]'
    if (event.user.ip_address) event.user.ip_address = '[REDACTED_IP]'
    if (event.user.phone) event.user.phone = '[REDACTED_PHONE]'
  }

  // 2. Sanitize request details
  if (event.request) {
    event.request = sanitizeObject(event.request)
  }

  // 3. Sanitize extra details
  if (event.extra) {
    event.extra = sanitizeObject(event.extra)
  }

  // 4. Sanitize breadcrumbs
  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map((bc: any) => sanitizeObject(bc))
  }

  // 5. Sanitize message & exceptions
  if (event.message) {
    event.message = sanitizeText(event.message)
  }

  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((exc: any) => {
      if (exc.value) exc.value = sanitizeText(exc.value)
      return exc
    })
  }

  return event
}
