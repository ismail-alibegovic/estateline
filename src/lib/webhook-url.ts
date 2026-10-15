import net from 'net'

/**
 * Outgoing webhooks fetch customer-supplied URLs from our server, so a URL
 * pointing at localhost, a private network or a cloud metadata address would
 * let a customer probe our infrastructure (SSRF). This is a syntactic guard on
 * the hostname; DNS names that resolve to private IPs are checked separately
 * by the dispatcher.
 */
export function isPrivateAddress(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true

  if (net.isIPv4(h)) {
    const [a, b] = h.split('.').map(Number)
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    )
  }
  if (net.isIPv6(h)) {
    if (h === '::1' || h === '::') return true
    if (h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(h)
    if (mapped) return isPrivateAddress(mapped[1])
  }
  return false
}

export function validateWebhookUrl(
  raw: string,
  opts: { allowInsecure?: boolean } = {}
): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, reason: 'Invalid URL' }
  }
  const allowed = opts.allowInsecure ? ['https:', 'http:'] : ['https:']
  if (!allowed.includes(url.protocol)) return { ok: false, reason: 'Webhook URL must use https' }
  if (url.username || url.password) return { ok: false, reason: 'Credentials in URL are not allowed' }
  if (!opts.allowInsecure && isPrivateAddress(url.hostname)) {
    return { ok: false, reason: 'Webhook URL must not point to a private or local address' }
  }
  return { ok: true, url }
}
