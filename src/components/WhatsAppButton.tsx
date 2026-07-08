'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

/**
 * Editorial, theme-consistent "Message on WhatsApp" button.
 *
 * - Hidden entirely when no phone/whatsapp number resolves.
 * - Logs an activity_log row (entity_type + entity_id) via /api/activity/log,
 *   awaiting the write before opening wa.me so the log survives navigation.
 * - Fails open visually on log error (logs to console) so the user can still
 *   message the lead; the activity row can be backfilled manually if needed.
 */
export function WhatsAppButton({
  phone,
  entityType,
  entityId,
}: {
  phone: string | null | undefined
  entityType: 'lead' | 'contact'
  entityId: string
}) {
  const t = useTranslations('common')
  const [logging, setLogging] = useState(false)

  if (!phone) return null

  async function handleClick() {
    if (logging) return
    setLogging(true)
    try {
      await fetch('/api/activity/log', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          action: 'messaged',
          metadata: { channel: 'whatsapp', phone },
        }),
      })
    } catch (err) {
      // Don't block the chat link on a logging failure — surface it in console.
      console.error('activity log write failed', err)
    } finally {
      const url = buildWhatsAppUrl(phone!)
      // Open after the await so navigation doesn't cancel the fetch.
      // noopener keeps the new tab out of our window handle.
      window.open(url, '_blank', 'noopener,noreferrer')
      setLogging(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={logging}
      aria-label={t('messageOnWhatsApp')}
      className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] disabled:opacity-50"
    >
      <WhatsAppGlyph className="h-3.5 w-3.5" />
      <span>{t('messageOnWhatsApp')}</span>
    </button>
  )
}

/**
 * wa.me deep link builder.
 *
 * Normalisation is conservative — we only rewrite numbers that look like bare
 * Balkan local numbers, and leave everything else untouched. The previous
 * version assumed "doesn't start with 387" == "missing country code", which
 * silently corrupted already-complete international numbers (HR 385, RS 381,
 * DE 49, AT 43, CH 41, …) by prepending 387 in front of them.
 *
 * Rules, in order:
 *   1. `00…` → drop the `00` international prefix, keep the rest verbatim.
 *   2. `0…`  → bare local trunk prefix → assume BA, prepend 387 + drop the 0.
 *   3. otherwise → already starts with a country code; pass through unchanged.
 *
 * Known limitation (intentional): a Croatian local number entered as `091…`
 * would be misread as Bosnian and get `387` prepended. We accept this false
 * positive because the far more common and damaging failure was corrupting
 * correct international numbers, which this now avoids. Fixing the local
 * ambiguity properly would require either a country selector on the lead
 * record or a full phone-library parse (libphonenumber) — out of scope here.
 */
export function buildWhatsAppUrl(phone: string): string {
  let digits = String(phone).replace(/\D/g, '')

  if (digits.startsWith('00')) {
    // International prefix → strip it, the rest is already a full country-coded number.
    digits = digits.slice(2)
  } else if (digits.startsWith('0')) {
    // Bare local trunk prefix (Balkan convention) → assume BA, drop the 0 + prepend 387.
    digits = '387' + digits.slice(1)
  }
  // Otherwise: already begins with a country code (385, 381, 49, 43, 41, …) → leave as-is.

  return `https://wa.me/${digits}`
}

/** Inline WhatsApp mark — keeps the button visually consistent without an emoji. */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.16 8.16 0 01-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.42 5.82c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.81-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42h-.48c-.16 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.57.12.16 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
    </svg>
  )
}
