import crypto from 'crypto'

/**
 * Constant-time string comparison. Never throws on length mismatch;
 * performs a dummy comparison to keep timing uniform when lengths differ.
 */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ab.length === 0 || bb.length === 0 || ab.length !== bb.length) {
    crypto.timingSafeEqual(Buffer.alloc(32), Buffer.alloc(32))
    return false
  }
  return crypto.timingSafeEqual(ab, bb)
}

/** GET hub.verify_token check. Fails closed on missing values. */
export function verifyChallengeToken(configured: string | undefined | null, provided: string | null): boolean {
  if (!configured || !provided) return false
  return safeEqual(configured, provided)
}

/** Expected X-Hub-Signature-256 value for a raw body and Meta app secret. */
export function metaSignature(appSecret: string, rawBody: string): string {
  return 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')
}

/**
 * Validates a Meta X-Hub-Signature-256 header against the exact raw request
 * body using HMAC-SHA256 and a timing-safe comparison. Fails closed.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader || !appSecret) return false
  const trimmed = signatureHeader.trim()
  const eq = trimmed.indexOf('=')
  if (eq <= 0) return false
  if (trimmed.slice(0, eq).toLowerCase() !== 'sha256') return false
  const expected = metaSignature(appSecret, rawBody)
  return safeEqual(expected, 'sha256=' + trimmed.slice(eq + 1))
}
