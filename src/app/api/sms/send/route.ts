import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient, getRouteContext, isAuthError } from '@/lib/auth'
import { maskPhone } from '@/lib/redact'
import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_FROM_NUMBER

const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null

export const dynamic = 'force-dynamic'

const ENTITY_TO_COLUMN: Record<'lead' | 'contact', 'lead_id' | 'contact_id'> = {
  lead: 'lead_id',
  contact: 'contact_id',
}

function renderSmsTemplate(template: string, payload: Record<string, any>): string {
  switch (template) {
    case 'viewing_reminder': {
      const propertyTitle = payload.propertyTitle || 'Property'
      const date = payload.date || 'TBD'
      const time = payload.time || 'TBD'
      return `Reminder: Viewing for ${propertyTitle} is scheduled on ${date} at ${time}. - Estateline CRM`
    }

    case 'viewing_confirmation': {
      const propertyTitle = payload.propertyTitle || 'Property'
      const date = payload.date || 'TBD'
      const time = payload.time || 'TBD'
      return `Viewing Confirmed: ${propertyTitle} on ${date} at ${time}. Reply if you need to reschedule. - Estateline CRM`
    }

    case 'custom':
    default: {
      const message = payload.message || payload.body || 'Update regarding your property search.'
      return `${message} - Estateline CRM`
    }
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getRouteContext()
  if (isAuthError(ctx)) return ctx

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { to, template, payload = {}, entity_type, entity_id } = body || {}

  if (!to || typeof to !== 'string') {
    return NextResponse.json({ error: 'Recipient phone number "to" is required' }, { status: 400 })
  }

  const messageText = renderSmsTemplate(template || 'custom', payload)
  let twilioMessageSid: string | null = null

  // Send SMS via Twilio API if credentials are configured
  if (twilioClient && fromNumber) {
    try {
      const message = await twilioClient.messages.create({
        body: messageText,
        from: fromNumber,
        to,
      })
      twilioMessageSid = message.sid
    } catch (err: any) {
      console.error('Twilio SMS Send Error:', err)
      return NextResponse.json({ error: `Failed to send SMS: ${err.message}` }, { status: 500 })
    }
  } else {
    console.log(`[Mock SMS Send] To: ${maskPhone(to)}`)
  }

  // Insert activity log into activity_log with type = 'sms'
  const supabase = createRouteClient()
  const insertData: Record<string, any> = {
    organization_id: ctx.org.id,
    user_id: ctx.user.id,
    type: 'sms',
    description: `SMS sent to ${to}`,
    metadata: {
      template: template || 'custom',
      recipient: to,
      message_text: messageText,
      twilio_sid: twilioMessageSid,
      ...payload,
    },
  }

  if (entity_type && entity_type in ENTITY_TO_COLUMN && entity_id) {
    insertData[ENTITY_TO_COLUMN[entity_type as 'lead' | 'contact']] = entity_id
  }

  const { data: activityRow, error: activityError } = await supabase
    .from('activity_log')
    .insert(insertData)
    .select('id')
    .single()

  if (activityError) {
    console.error('Error logging SMS activity to activity_log:', activityError.message)
  }

  return NextResponse.json(
    {
      success: true,
      message: 'SMS processed successfully',
      twilio_sid: twilioMessageSid,
      activity_id: activityRow?.id || null,
    },
    { status: 200 }
  )
}
