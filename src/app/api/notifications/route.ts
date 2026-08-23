import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'
import { listNotifications, countUnread, markRead, markAllRead } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/** GET: current user's notifications + unread badge count. */
export async function GET() {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx

    const [data, unread] = await Promise.all([
      listNotifications(ctx.supabase, ctx.user.id),
      countUnread(ctx.supabase, ctx.user.id),
    ])
    return NextResponse.json({ data, unread })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

/**
 * PATCH: mark one ({ id }) or all ({ all: true }) as read.
 * Every query is additionally scoped to the caller's user id —
 * passing another user's id can only ever match zero rows.
 */
export async function PATCH(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx

    const body = await request.json().catch(() => ({}))

    if (body?.all === true) {
      const updated = await markAllRead(ctx.supabase, ctx.user.id)
      return NextResponse.json({ updated })
    }

    const id = typeof body?.id === 'string' ? body.id : null
    if (!id) {
      return NextResponse.json(
        { error: 'Provide notification id or all=true' },
        { status: 400 }
      )
    }

    const updated = await markRead(ctx.supabase, ctx.user.id, id)
    if (updated === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }
    return NextResponse.json({ updated })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
