import crypto from 'crypto'

export interface ClientPortalTokenResult {
  token: string
  expires_at: string
}

export interface ClientPortalDetails {
  valid: boolean
  organization_id?: string
  contact_id?: string
  deal_id?: string
  expires_at?: string
  error?: string
}

/**
 * Generates a secure, 64-char hexadecimal token for client portal access.
 */
export function generateClientPortalToken(daysValid = 30): ClientPortalTokenResult {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresDate = new Date()
  expiresDate.setDate(expiresDate.getDate() + daysValid)

  return {
    token,
    expires_at: expiresDate.toISOString(),
  }
}

/**
 * Validates a client portal token against expiration timestamp.
 */
export function isPortalTokenExpired(expiresAtISO: string): boolean {
  const expires = new Date(expiresAtISO).getTime()
  const now = new Date().getTime()
  return now > expires
}
