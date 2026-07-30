/**
 * Domain parsing & custom domain resolution helpers for agency microsites.
 */

export interface ResolvedDomain {
  identifier: string
  isCustomDomain: boolean
}

export function resolveHostIdentifier(host?: string | null, fallbackSubdomain?: string): ResolvedDomain {
  const cleanFallback = (fallbackSubdomain || '').trim().toLowerCase()
  if (!host || typeof host !== 'string') {
    return { identifier: cleanFallback, isCustomDomain: false }
  }

  const cleanHost = host.split(':')[0].toLowerCase().trim()

  // Internal or localhost domains
  if (
    cleanHost === 'localhost' ||
    cleanHost.endsWith('.localhost') ||
    cleanHost.endsWith('.vercel.app') ||
    cleanHost.endsWith('.estateline.ba') ||
    cleanHost.endsWith('.estateline.com')
  ) {
    const parts = cleanHost.split('.')
    if (parts.length > 2 && parts[0] !== 'www') {
      return { identifier: parts[0], isCustomDomain: false }
    }
    return { identifier: cleanFallback, isCustomDomain: false }
  }

  // Apex or third-party custom domain (e.g. properties.agency.com)
  return { identifier: cleanHost, isCustomDomain: true }
}
