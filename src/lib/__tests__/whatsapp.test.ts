import { describe, it, expect } from 'vitest'
import { normalizeWhatsApp, whatsappLink } from '../whatsapp'

describe('WhatsApp Normalization Logic', () => {
  it('normalizes Bosnian local phone numbers with country code', () => {
    expect(normalizeWhatsApp('061 123 456')).toBe('38761123456')
    expect(normalizeWhatsApp('+387 61 123 456')).toBe('38761123456')
  })

  it('normalizes regional Balkan country codes correctly', () => {
    expect(normalizeWhatsApp('+385 91 234 5678')).toBe('385912345678')
    expect(normalizeWhatsApp('+381 64 123 4567')).toBe('381641234567')
  })

  it('returns valid wa.me deep links', () => {
    expect(whatsappLink('061123456')).toBe('https://wa.me/38761123456')
    expect(whatsappLink(null)).toBeNull()
  })
})
