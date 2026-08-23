type EmailLogClient = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null } | unknown>
  }
}

export type EmailLogInput = {
  organizationId: string
  userId: string
  recipient: string
  subject: string | null
  template: string
  entityType?: 'lead' | 'contact' | 'property' | 'deal' | null
  entityId?: string | null
  providerMessageId: string | null
  status: 'sent' | 'failed'
  errorMessage?: string | null
}

export function buildEmailLogRow(input: EmailLogInput): Record<string, unknown> {
  const row: Record<string, unknown> = {
    organization_id: input.organizationId,
    user_id: input.userId,
    recipient: input.recipient,
    subject: input.subject,
    template: input.template,
    provider: 'resend',
    provider_message_id: input.providerMessageId,
    status: input.status,
  }

  if (input.entityType && input.entityId) {
    row.entity_type = input.entityType
    row.entity_id = input.entityId
  }

  if (input.status === 'sent') {
    row.sent_at = new Date().toISOString()
  } else if (input.errorMessage) {
    row.error_message = input.errorMessage
  }

  return row
}

export async function recordEmailOutcome(
  supabase: EmailLogClient,
  input: EmailLogInput
): Promise<void> {
  try {
    const result = (await supabase
      .from('email_log')
      .insert(buildEmailLogRow(input))) as { error: { message: string } | null }
    if (result?.error) {
      console.error('email_log insert failed:', result.error.message)
    }
  } catch (err: any) {
    console.error('email_log insert threw:', err?.message || err)
  }
}
