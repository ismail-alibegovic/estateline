export type AppLocale = 'en' | 'bs'

export const APP_LOCALES: AppLocale[] = ['en', 'bs']

export function isAppLocale(value: unknown): value is AppLocale {
  return value === 'en' || value === 'bs'
}

/** Replaces (or inserts) the leading /{locale} segment of a Next.js pathname. */
export function switchLocalePath(pathname: string, nextLocale: AppLocale): string {
  const parts = pathname.split('/')
  if (parts[1] === 'en' || parts[1] === 'bs') {
    parts[1] = nextLocale
  } else {
    parts.splice(1, 0, nextLocale)
  }
  return parts.join('/')
}
