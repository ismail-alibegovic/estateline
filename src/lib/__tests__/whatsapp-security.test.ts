import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import {
  safeEqual,
  verifyChallengeToken,
  metaSignature,
  verifyMetaSignature,
} from '../whatsapp-security'

const SECRET = 'test_meta_app_secret_1234567890'
const TOKEN = 'configured_verify_token_abc123'

function sign(body: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')
}

describe('safeEqual (timing-safe comparison)', () => {
  it('matches identical strings', () => {
    expect(safeEqual('abc123', 'abc123')).toBe(true)
  })

  it('rejects different strings of equal length', () => {
    expect(safeEqual('abc123', 'abc124')).toBe(false)
  })

  it('rejects strings of different lengths without throwing', () => {
    expect(safeEqual('short', 'a-much-longer-value')).toBe(false)
  })

  it('rejects empty inputs', () => {
    expect(safeEqual('', '')).toBe(false)
    expect(safeEqual('x', '')).toBe(false)
  })
})

describe('verifyChallengeToken (GET hub verification)', () => {
  it('accepts the correct configured token', () => {
    expect(verifyChallengeToken(TOKEN, TOKEN)).toBe(true)
  })

  it('rejects a wrong verification token', () => {
    expect(verifyChallengeToken(TOKEN, 'wrong_token')).toBe(false)
  })

  it('fails safely when no token is configured', () => {
    expect(verifyChallengeToken(undefined, TOKEN)).toBe(false)
    expect(verifyChallengeToken('', TOKEN)).toBe(false)
  })

  it('fails safely when the incoming token is missing', () => {
    expect(verifyChallengeToken(TOKEN, null)).toBe(false)
  })
})

describe('metaSignature / verifyMetaSignature (POST X-Hub-Signature-256)', () => {
  const body = JSON.stringify({ entry: [{ changes: [] }] })

  it('produces sha256= prefixed hex HMAC over the exact raw body', () => {
    const sig = metaSignature(SECRET, body)
    expect(sig.startsWith('sha256=')).toBe(true)
    expect(sig).toBe(sign(body, SECRET))
  })

  it('accepts a valid signature computed over the raw body', () => {
    expect(verifyMetaSignature(body, sign(body, SECRET), SECRET)).toBe(true)
  })

  it('rejects a missing signature header', () => {
    expect(verifyMetaSignature(body, null, SECRET)).toBe(false)
    expect(verifyMetaSignature(body, undefined, SECRET)).toBe(false)
  })

  it('rejects an invalid signature', () => {
    expect(verifyMetaSignature(body, sign(body, 'other_secret'), SECRET)).toBe(false)
    expect(verifyMetaSignature(body, 'sha256=' + 'f'.repeat(64), SECRET)).toBe(false)
  })

  it('rejects a valid signature for a tampered body', () => {
    const tampered = JSON.stringify({ entry: [{ changes: [{ tampered: true }] }] })
    expect(verifyMetaSignature(tampered, sign(body, SECRET), SECRET)).toBe(false)
  })

  it('rejects headers that do not use the sha256 scheme', () => {
    expect(verifyMetaSignature(body, 'md5=deadbeef', SECRET)).toBe(false)
  })

  it('fails closed when the app secret is empty', () => {
    expect(verifyMetaSignature(body, sign(body, SECRET), '')).toBe(false)
  })

  it('is case-insensitive about the sha256 prefix but strict about the digest', () => {
    const sig = sign(body, SECRET)
    expect(verifyMetaSignature(body, 'SHA256=' + sig.slice(7), SECRET)).toBe(true)
  })
})
