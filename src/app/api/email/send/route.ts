import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient, getRouteContext, isAuthError } from '@/lib/auth'
import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

export const dynamic = 'force-dynamic'

const ENTITY_TO_COLUMN: Record<'lead' | 'contact', 'lead_id' | 'contact_id'> = {
  lead: 'lead_id',
  contact: 'contact_id',
}

function renderTemplate(template: string, payload: Record<string, any>): { subject: string; html: string } {
  switch (template) {
    case 'viewing_confirmation': {
      const propertyTitle = payload.propertyTitle || 'Property'
      const date = payload.date || 'TBD'
      const time = payload.time || 'TBD'
      const subject = `Viewing Confirmation: ${propertyTitle}`
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
          <h2 style="color: #3520D5;">Viewing Confirmation</h2>
          <p>Your property viewing has been scheduled!</p>
          <ul>
            <li><strong>Property:</strong> ${propertyTitle}</li>
            <li><strong>Date:</strong> ${date}</li>
            <li><strong>Time:</strong> ${time}</li>
          </ul>
          <p>If you need to reschedule, please reply directly to this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Sent via Estateline CRM</p>
        </div>
      `.trim()
      return { subject, html }
    }

    case 'brochure_link': {
      const propertyTitle = payload.propertyTitle || 'Listing'
      const brochureUrl = payload.brochureUrl || '#'
      const subject = `Property Brochure: ${propertyTitle}`
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
          <h2 style="color: #3520D5;">Property Brochure</h2>
          <p>Here is the detailed brochure link for <strong>${propertyTitle}</strong>:</p>
          <p style="margin: 20px 0;">
            <a href="${brochureUrl}" style="background-color: #3520D5; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Download Brochure
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Sent via Estateline CRM</p>
        </div>
      `.trim()
      return { subject, html }
    }

    case 'custom':
    default: {
      const subject = payload.subject || 'Message from your Real Estate Agent'
      const body = payload.message || payload.body || 'No message content provided.'
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
          <h2 style="color: #3520D5;">Estateline Real Estate</h2>
          <p>${body}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Sent via Estateline CRM</p>
        </div>
      `.trim()
      return { subject, html }
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
    return NextResponse.json({ error: 'Recipient email "to" is required' }, { status: 400 })
  }

  const { subject, html } = renderTemplate(template || 'custom', payload)
  const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev'

  let resendId: string | null = null

  // Send via Resend API if configured
  if (resend) {
    try {
      const sent = await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject,
        html,
      })
      resendId = sent.data?.id || null
    } catch (err: any) {
      console.error('Resend Email Send Error:', err)
      return NextResponse.json({ error: `Failed to send email: ${err.message}` }, { status: 500 })
    }
  } else {
    console.log(`[Mock Email Send] To: ${to} | Subject: ${subject}`)
  }

  // Log activity into activity_log with type = 'email'
  const supabase = createRouteClient()
  const insertData: Record<string, any> = {
    organization_id: ctx.org.id,
    user_id: ctx.user.id,
    type: 'email',
    description: `Email "${subject}" sent to ${to}`,
    metadata: {
      template: template || 'custom',
      recipient: to,
      resend_id: resendId,
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
    console.error('Error logging email activity to activity_log:', activityError.message)
  }

  return NextResponse.json(
    {
      success: true,
      message: 'Email processed successfully',
      resend_id: resendId,
      activity_id: activityRow?.id || null,
    },
    { status: 200 }
  )
}
