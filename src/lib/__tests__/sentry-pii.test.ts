import { describe, it, expect } from 'vitest'
import { beforeSendSentry, sanitizeText, sanitizeObject } from '../sentry-pii'
import { maskPhone, maskEmail } from '../redact'

describe('PII Masking Utilities', () => {
  it('masks phone numbers correctly', () => {
    expect(maskPhone('+38761123456')).toBe('+38***456')
    expect(maskPhone('061123456')).toBe('061***456')
    expect(maskPhone(null)).toBe('[REDACTED_PHONE]')
  })

  it('masks email addresses correctly', () => {
    expect(maskEmail('john.doe@example.com')).toBe('j***e@example.com')
    expect(maskEmail(null)).toBe('[REDACTED_EMAIL]')
  })
})

describe('Sentry PII Scrubbing (beforeSend)', () => {
  it('scrubs email and phone from text strings', () => {
    const raw = 'User john.doe@example.com called +38761123456 regarding property'
    const clean = sanitizeText(raw)
    expect(clean).not.toContain('john.doe@example.com')
    expect(clean).not.toContain('+38761123456')
    expect(clean).toContain('[REDACTED_EMAIL]')
    expect(clean).toContain('[REDACTED_PHONE]')
  })

  it('scrubs PII fields from nested objects and Sentry event payloads', () => {
    const event: any = {
      user: {
        email: 'user@test.com',
        username: 'John Doe',
        ip_address: '1.2.3.4',
        phone: '+123456789'
      },
      request: {
        url: 'https://example.com/api',
        data: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'lead@test.com',
          phone: '+987654321',
          message: 'Contact me at +987654321 or test@user.com'
        }
      },
      message: 'Error with lead user@domain.com',
      extra: {
        contact_name: 'Jane Doe'
      }
    }

    const sanitized = beforeSendSentry(event)

    expect(sanitized.user.email).toBe('[REDACTED_EMAIL]')
    expect(sanitized.user.username).toBe('[REDACTED_NAME]')
    expect(sanitized.user.phone).toBe('[REDACTED_PHONE]')
    expect(sanitized.request.data.first_name).toBe('[REDACTED_NAME]')
    expect(sanitized.request.data.last_name).toBe('[REDACTED_NAME]')
    expect(sanitized.request.data.email).toBe('[REDACTED_EMAIL]')
    expect(sanitized.request.data.phone).toBe('[REDACTED_PHONE]')
    expect(sanitized.request.data.message).not.toContain('test@user.com')
    expect(sanitized.message).not.toContain('user@domain.com')
    expect(sanitized.extra.contact_name).toBe('[REDACTED_NAME]')
  })
})
