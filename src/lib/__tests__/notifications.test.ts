import { describe, it, expect } from 'vitest'
import { isNotificationType, NOTIFICATION_TYPES } from '../notifications'

describe('notification types', () => {
  it('exposes the v1 event whitelist', () => {
    expect(NOTIFICATION_TYPES).toContain('lead_assigned')
    expect(NOTIFICATION_TYPES).toContain('portal_sync_failed')
  })

  it('accepts known types', () => {
    for (const t of NOTIFICATION_TYPES) {
      expect(isNotificationType(t)).toBe(true)
    }
  })

  it('rejects unknown or malicious type strings', () => {
    expect(isNotificationType('new_lead')).toBe(false)
    expect(isNotificationType("lead_assigned'; DROP TABLE notifications;--")).toBe(false)
    expect(isNotificationType('')).toBe(false)
  })
})
