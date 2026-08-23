import { describe, it, expect, vi } from 'vitest'
import { recordEmailOutcome } from '../email-log'

function fakeClient() {
  const inserts: any[] = []
  const client = {
    from(table: string) {
      expect(table).toBe('email_log')
      return {
        insert(row: any) {
          inserts.push(row)
          return {
            error: null,
          }
        },
      }
    },
  }
  return { client, inserts }
}

describe('recordEmailOutcome', () => {
  it('writes a sent row with provider message id and sent_at', async () => {
    const { client, inserts } = fakeClient()
    await recordEmailOutcome(client as any, {
      organizationId: 'org-1',
      userId: 'user-1',
      recipient: 'client@example.com',
      subject: 'Viewing Confirmation: Apartment',
      template: 'viewing_confirmation',
      entityType: 'lead',
      entityId: 'lead-1',
      providerMessageId: 'resend-123',
      status: 'sent',
    })
    expect(inserts).toHaveLength(1)
    const row = inserts[0]
    expect(row.organization_id).toBe('org-1')
    expect(row.status).toBe('sent')
    expect(row.provider_message_id).toBe('resend-123')
    expect(row.entity_type).toBe('lead')
    expect(row.entity_id).toBe('lead-1')
    expect(row.sent_at).toBeTruthy()
    expect(row.error_message).toBeUndefined()
  })

  it('maps contact entity to contact_id', async () => {
    const { client, inserts } = fakeClient()
    await recordEmailOutcome(client as any, {
      organizationId: 'org-1',
      userId: 'user-1',
      recipient: 'c@example.com',
      subject: 'Hi',
      template: 'custom',
      entityType: 'contact',
      entityId: 'contact-9',
      providerMessageId: null,
      status: 'sent',
    })
    expect(inserts[0].entity_type).toBe('contact')
    expect(inserts[0].entity_id).toBe('contact-9')
  })

  it('records failures with error message and no sent_at', async () => {
    const { client, inserts } = fakeClient()
    await recordEmailOutcome(client as any, {
      organizationId: 'org-1',
      userId: 'user-1',
      recipient: 'x@example.com',
      subject: 'Brochure',
      template: 'brochure_link',
      entityType: null,
      entityId: null,
      providerMessageId: null,
      status: 'failed',
      errorMessage: '429 rate_limited',
    })
    const row = inserts[0]
    expect(row.status).toBe('failed')
    expect(row.error_message).toBe('429 rate_limited')
    expect(row.sent_at).toBeUndefined()
    expect(row.provider_message_id).toBeNull()
  })

  it('never throws when the log insert fails', async () => {
    const client = {
      from() {
        throw new Error('table missing')
      },
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      recordEmailOutcome(client as any, {
        organizationId: 'o',
        userId: 'user-1',
        recipient: 'r@e.com',
        subject: 's',
        template: 'custom',
        entityType: null,
        entityId: null,
        providerMessageId: 'pm',
        status: 'sent',
      })
    ).resolves.toBeUndefined()
    spy.mockRestore()
  })
})
