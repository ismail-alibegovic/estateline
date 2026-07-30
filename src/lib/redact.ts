/**
 * PII Redaction utility functions for sanitizing console logs and third-party outputs.
 */

export function maskPhone(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') return '[REDACTED_PHONE]'
  const clean = phone.trim()
  if (clean.length <= 4) return '***'
  const visibleCount = Math.min(3, Math.floor(clean.length / 3))
  const prefix = clean.slice(0, visibleCount)
  const suffix = clean.slice(-visibleCount)
  return `${prefix}***${suffix}`
}

export function maskEmail(email?: string | null): string {
  if (!email || typeof email !== 'string') return '[REDACTED_EMAIL]'
  const clean = email.trim()
  const parts = clean.split('@')
  if (parts.length !== 2) return '[REDACTED_EMAIL]'
  const [name, domain] = parts
  if (name.length <= 2) return `*@${domain}`
  return `${name[0]}***${name[name.length - 1]}@${domain}`
}
