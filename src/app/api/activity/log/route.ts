import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient, getRouteContext, isAuthError } from '@/lib/auth'

/**
 * POST /api/activity/log
 *
 * Writes a single activity_log row for the authenticated user. The caller
 * never supplies org_id or user_id — both are resolved server-side from the
 * session via getRouteContext(), so a logged-in agent can only attribute
 * activity to themselves and their own org.
 *
 * body: { entity_type: 'lead'|'contact', entity_id: string,
 *         action: string, metadata?: object }
 *
 * ACTIVITY ENUM GAP (intentional, not a bug to "fix"):
 * The activity_type enum currently has: call, email, meeting, viewing, note,
 * task, document_sent, document_signed, stage_change, system. There is no
 * 'messaged' value — WhatsApp click-to-chat buckets under 'note' on purpose,
 * with the real action ('messaged') + channel ('whatsapp') + phone preserved
 * in metadata. DO NOT later "promote" this to a separate type or relocate
 * the channel into the enum without a coordinated migration that backfills
 * existing rows — otherwise historical messaging rows split across two
 * representations and queries will silently miss records.
 * TODO(follow-up migration): alter type activity_type add value 'messaged'
 *   and backfill { type='note', metadata->>'action'='messaged' } rows when
 *   the WhatsApp Cloud API work lands.
 */
const ENTITY_TO_COLUMN: Record<'lead' | 'contact', 'lead_id' | 'contact_id'> = {
  lead: 'lead_id',
  contact: 'contact_id',
}

const VALID_ACTIONS = new Set(['messaged', 'call', 'email', 'meeting', 'note'])

export async function POST(req: NextRequest) {
  const ctx = await getRouteContext()
  if (isAuthError(ctx)) return ctx

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { entity_type, entity_id, action, metadata } = body || {}
  if (!entity_type || !(entity_type in ENTITY_TO_COLUMN)) {
    return NextResponse.json({ error: 'entity_type must be lead or contact' }, { status: 400 })
  }
  if (!entity_id || typeof entity_id !== 'string') {
    return NextResponse.json({ error: 'entity_id required' }, { status: 400 })
  }
  if (!action || !VALID_ACTIONS.has(action)) {
    return NextResponse.json({ error: `action must be one of: ${[...VALID_ACTIONS].join(', ')}` }, { status: 400 })
  }

  const column = ENTITY_TO_COLUMN[entity_type as 'lead' | 'contact']
  // 'messaged' isn't in the activity_type enum yet (no Meta Cloud API), so we
  // store it as a 'note' and keep the real action + channel in metadata.
  const meta = (metadata && typeof metadata === 'object' ? metadata : {}) as Record<string, unknown>

  // ACTIVITY ENUM GAP (intentional, not a bug to "fix"): the `activity_type`
  // enum currently has call / email / meeting / viewing / note / task /
  // document_sent / document_signed / stage_change / system — there is no
  // 'messaged' value. WhatsApp click-to-chat buckets under 'note' on purpose,
  // with the real action ('messaged') + channel ('whatsapp') + phone preserved
  // in metadata. Do NOT later "promote" this to its own type or move the
  // channel into the enum without a coordinated migration that backfills
  // existing rows — otherwise history splits across two representations and
  // queries silently miss records.
  // TODO(follow-up migration): `alter type activity_type add value 'messaged'`
  //   and backfill { type='note', metadata->>'action'='messaged' } rows when
  //   the WhatsApp Cloud API work lands.

  const supabase = createRouteClient()
  const { data, error } = await supabase
    .from('activity_log')
    .insert({
      organization_id: ctx.org.id,
      user_id: ctx.user.id,
      type: 'note',
      description: `WhatsApp message via ${meta.channel ?? 'whatsapp'}`,
      metadata: { action, ...meta },
      [column]: entity_id,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data!.id }, { status: 201 })
}
