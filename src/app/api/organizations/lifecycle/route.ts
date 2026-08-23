import { NextRequest, NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const GRACE_DAYS = 30

export async function GET() {
  const ctx = await getRouteContext({ allowScheduledForDeletion: true })
  if (isAuthError(ctx)) return ctx

  return NextResponse.json({
    deletion_requested_at: ctx.org.deletion_requested_at ?? null,
    deletion_scheduled_for: ctx.org.deletion_scheduled_for ?? null,
    grace_days: GRACE_DAYS,
  })
}

export async function POST(req: NextRequest) {
  const ctx = await getRouteContext({ allowScheduledForDeletion: true })
  if (isAuthError(ctx)) return ctx

  if (ctx.role !== 'owner') {
    return NextResponse.json(
      { error: 'Only the organization owner can manage deletion' },
      { status: 403 }
    )
  }

  let body: { action?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.action === 'request') {
    const scheduledFor = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { error } = await ctx.supabase
      .from('organizations')
      .update({ deletion_requested_at: new Date().toISOString(), deletion_scheduled_for: scheduledFor })
      .eq('id', ctx.org.id)
    if (error) {
      console.error('Deletion request failed:', error.message)
      return NextResponse.json({ error: 'Failed to schedule deletion' }, { status: 500 })
    }
    return NextResponse.json({
      deletion_requested_at: new Date().toISOString(),
      deletion_scheduled_for: scheduledFor,
      message: `Organization will be permanently deleted ${GRACE_DAYS} days from now. Export your data before then.`,
    })
  }

  if (body.action === 'cancel') {
    const { error } = await ctx.supabase
      .from('organizations')
      .update({ deletion_requested_at: null, deletion_scheduled_for: null })
      .eq('id', ctx.org.id)
    if (error) {
      console.error('Deletion cancel failed:', error.message)
      return NextResponse.json({ error: 'Failed to cancel deletion' }, { status: 500 })
    }
    return NextResponse.json({
      deletion_requested_at: null,
      deletion_scheduled_for: null,
      message: 'Deletion cancelled — full access restored.',
    })
  }

  return NextResponse.json({ error: 'action must be "request" or "cancel"' }, { status: 400 })
}
