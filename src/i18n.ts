import { getRequestConfig } from 'next-intl/server'

export const locales = ['en', 'bs'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const resolved = locales.includes(requested as Locale) ? (requested as Locale) : defaultLocale
  return {
    locale: resolved,
    messages: (await import(`./messages/${resolved}.json`)).default,
  }
})

/**
 * Single source of truth for swapping the locale segment of an app path.
 * Used by every language switcher so navigation always preserves the
 * current route. Paths outside /en|/bs (should not exist) get prefixed.
 */
export function switchLocalePath(pathname: string, nextLocale: Locale): string {
  const rest = pathname.replace(/^\/(en|bs)(?=\/|$)/, '')
  return `/${nextLocale}${rest === '' ? '' : rest}` || `/${nextLocale}`
}
