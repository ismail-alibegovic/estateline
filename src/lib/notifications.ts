import type { SupabaseClient } from '@supabase/supabase-js'

export const NOTIFICATION_TYPES = [
  'lead_assigned',
  'viewing_upcoming',
  'task_overdue',
  'document_signed',
  'portal_sync_failed',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export function isNotificationType(value: string): value is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(value)
}

interface NotifyInput {
  supabase: SupabaseClient
  organizationId: string
  userId: string
  type: NotificationType
  title: string
  subtitle?: string | null
  link?: string | null
}

/**
 * Insert a notification for a recipient. Best-effort by design:
 * a failed notification must never break the domain action that
 * triggered it, so errors are logged, not thrown.
 */
export async function notifyUser(input: NotifyInput): Promise<void> {
  if (!isNotificationType(input.type)) {
    console.error(`[notifications] unknown type "${input.type}" — skipping`)
    return
  }
  try {
    const { error } = await input.supabase.from('notifications').insert({
      organization_id: input.organizationId,
      user_id: input.userId,
      type: input.type,
      title: input.title,
      subtitle: input.subtitle ?? null,
      link: input.link ?? null,
    })
    if (error) console.error('[notifications] insert failed:', error.message)
  } catch (err) {
    console.error('[notifications] insert threw:', err)
  }
}

export interface AppNotification {
  id: string
  organization_id: string
  user_id: string
  type: NotificationType
  title: string
  subtitle: string | null
  link: string | null
  read: boolean
  created_at: string
}

const SELECT_COLUMNS =
  'id, organization_id, user_id, type, title, subtitle, link, read, created_at'

/** List the recipient's notifications, newest first. RLS also scopes this. */
export async function listNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(SELECT_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as AppNotification[]
}

/** Count of unread notifications for the badge. */
export async function countUnread(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
  if (error) throw new Error(error.message)
  return count ?? 0
}

/** Mark one notification read. Returns rows updated (0 if not owned). */
export async function markRead(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<number> {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', userId)
    .eq('read', false)
    .select('id')
  if (error) throw new Error(error.message)
  return data?.length ?? 0
}

/** Mark every unread notification read for the recipient. */
export async function markAllRead(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
    .select('id')
  if (error) throw new Error(error.message)
  return data?.length ?? 0
}
