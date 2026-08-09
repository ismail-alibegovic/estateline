'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { useTranslations } from 'next-intl'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errors')

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html className="bg-[#FAF8F5]">
      <body>
        <main className="min-h-screen flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('somethingWentWrong') || 'Something went wrong'}
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              {t('tryAgainMessage') || 'An unexpected error occurred. Please try again.'}
            </p>
            <button
              onClick={() => reset()}
              className="px-5 py-2.5 bg-[#C9963B] text-white text-sm font-semibold rounded-xl shadow-md hover:bg-[#b88328] transition-colors"
            >
              {t('tryAgain') || 'Try Again'}
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
