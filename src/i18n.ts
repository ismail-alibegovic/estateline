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

export function setRequestLocale(locale: string) {
  return locale
}
