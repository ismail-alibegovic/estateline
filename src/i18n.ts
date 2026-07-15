import { getRequestConfig } from 'next-intl/server'

export const locales = ['en', 'bs'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

export default getRequestConfig(async ({ locale }) => {
  const resolved = (locale as Locale) || defaultLocale
  return {
    messages: (await import(`./messages/${resolved}.json`)).default,
  }
})

export function setRequestLocale(locale: string) {
  return locale
}
