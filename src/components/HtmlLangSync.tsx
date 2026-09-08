'use client'

import { useEffect } from 'react'
import { useLocale } from 'next-intl'

/** Keeps <html lang> in sync with the active [locale] segment. */
export default function HtmlLangSync() {
  const locale = useLocale()
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  return null
}
