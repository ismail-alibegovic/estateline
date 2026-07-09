'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { whatsappLink } from '@/lib/whatsapp'

export function WhatsAppButton({
  phone,
  entityType,
  entityId,
  className = '',
}: {
  phone: string | null | undefined
  entityType: 'lead' | 'contact'
  entityId: string
  className?: string
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          action: 'messaged',
          metadata: { channel: 'whatsapp_click_to_chat' },
        }),
      })
    } catch {
      // best-effort logging; never block the user from opening WhatsApp
    } finally {
      setLogging(false)
      const url = whatsappLink(phone)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={logging}
      aria-label={t('messageOnWhatsApp')}
      className={`inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] disabled:opacity-50 ${className}`}
    >
      <WhatsAppGlyph className="h-3.5 w-3.5" />
      <span>{t('messageOnWhatsApp')}</span>
    </button>
  )
}

/** Inline WhatsApp mark — keeps the button visually consistent without an emoji. */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.8c2.16 0 4.18.84 5.71 2.37a8.03 8.03 0 0 1 2.38 5.74c0 4.45-3.62 8.07-8.07 8.07-1.6 0-3.16-.47-4.49-1.36l-.33-.21-3.12.82.83-3.04-.22-.34A7.93 7.93 0 0 1 4 11.91c0-4.45 3.62-8.07 8.04-8.07Zm-2.6 3.18c-.18 0-.46.07-.7.33-.24.26-.92.9-.92 2.19 0 1.29.94 2.39 1.07 2.56.13.17 1.83 2.8 4.45 3.92.62.27 1.1.43 1.48.55.62.2 1.19.17 1.64.1.5-.07 1.55-.63 1.77-1.24.22-.61.22-1.13.16-1.24-.06-.11-.23-.18-.48-.31-.25-.13-1.47-.73-1.7-.81-.23-.08-.4-.13-.56.13-.17.26-.64.81-.79.98-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.75-.66-1.25-1.48-1.4-1.73-.14-.25-.01-.39.11-.51.12-.12.26-.31.39-.47.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01Z" />
    </svg>
  )
}
