import { describe, it, expect } from 'vitest'
import { validateWebhookUrl, isPrivateAddress } from '../webhook-url'

describe('webhook url guard', () => {
  it('accepts public https urls', () => {
    expect(validateWebhookUrl('https://hooks.example.com/estateline').ok).toBe(true)
  })

  it('rejects http, credentials and garbage in production mode', () => {
    expect(validateWebhookUrl('http://example.com/x').ok).toBe(false)
    expect(validateWebhookUrl('https://user:pw@example.com/x').ok).toBe(false)
    expect(validateWebhookUrl('not a url').ok).toBe(false)
    expect(validateWebhookUrl('ftp://example.com').ok).toBe(false)
  })

  it('rejects local and private targets', () => {
    for (const host of [
      'localhost', '127.0.0.1', '10.0.0.5', '172.16.3.4', '192.168.1.1',
      '169.254.169.254', '100.64.0.1', '[::1]', '[fd00::1]', 'db.internal',
    ]) {
      expect(validateWebhookUrl(`https://${host}/hook`).ok, host).toBe(false)
    }
    expect(isPrivateAddress('8.8.8.8')).toBe(false)
    expect(isPrivateAddress('172.32.0.1')).toBe(false)
  })

  it('allows http and local addresses only when explicitly relaxed (dev)', () => {
    expect(validateWebhookUrl('http://localhost:3000/hook', { allowInsecure: true }).ok).toBe(true)
  })
})
