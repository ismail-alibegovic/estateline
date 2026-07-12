import { NextIntlClientProvider } from 'next-intl'
import { setRequestLocale, getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales, defaultLocale, type Locale } from '@/i18n'
import '../globals.css'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

// Allow only the documented locale segments; reject anything else.
export const dynamicParams = false

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const { locale } = params
  if (!locales.includes(locale as Locale)) notFound()
  setRequestLocale(locale)

  const messages = await getMessages()

  return (
    <NextIntlClientProvider locale={locale as Locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
