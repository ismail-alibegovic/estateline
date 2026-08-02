import { NextIntlClientProvider } from 'next-intl'
import { setRequestLocale, getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales, defaultLocale, type Locale } from '@/i18n'
import { CurrencyProvider } from '@/components/CurrencyContext'
import '../globals.css'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

// Allow dynamic locale segments and params
export const dynamicParams = true

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
      <CurrencyProvider>
        {children}
      </CurrencyProvider>
    </NextIntlClientProvider>
  )
}
