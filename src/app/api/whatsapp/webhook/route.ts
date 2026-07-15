import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { normalizeWhatsApp } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

/**
 * GET: Webhook verification from Meta Developer Console.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'default_verify_token'

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WhatsApp Webhook verified successfully.')
    return new Response(challenge, { status: 200 })
  }

  console.warn('WhatsApp Webhook verification failed: tokens do not match.')
  return new Response('Forbidden', { status: 403 })
}

/**
 * POST: Incoming WhatsApp message payloads.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Inspect if this is a standard message update payload
    const entry = body.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value

    if (!value || !value.messages || value.messages.length === 0) {
      // Return 200 to acknowledge receipt of other updates (e.g. message statuses)
      return NextResponse.json({ received: true })
    }

    const message = value.messages[0]
    const phone_number_id = value.metadata?.phone_number_id
    const sender_phone = message.from
    const sender_name = value.contacts?.[0]?.profile?.name || 'WhatsApp Lead'
    const message_body = message.text?.body || `[WhatsApp Message Type: ${message.type}]`

    if (!phone_number_id || !sender_phone) {
      return NextResponse.json({ error: 'Missing webhook metadata' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Resolve tenant organization by mapping phone_number_id
    const { data: org } = await supabase
      .from('organizations')
      .select('id, slug')
      .eq('whatsapp_config->>phone_number_id', phone_number_id)
      .limit(1)
      .maybeSingle()

    let targetOrg = org

    if (!targetOrg) {
      console.warn(`WhatsApp message received for unmapped phone_number_id: ${phone_number_id}`)
      return NextResponse.json({ error: 'Tenant organization not found' }, { status: 404 })
    }

    const normalizedPhone = normalizeWhatsApp(sender_phone) || sender_phone

    // 2. Manage contact opt-in consent: since user initiated message, set consent to true
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('organization_id', targetOrg.id)
      .eq('phone', normalizedPhone)
      .limit(1)

    if (existingContacts && existingContacts.length > 0) {
      await supabase
        .from('contacts')
        .update({
          whatsapp_opted_in: true,
          whatsapp_consent_at: new Date().toISOString()
        })
        .eq('id', existingContacts[0].id)
    } else {
      // Split display name into first & last name
      const nameParts = sender_name.trim().split(/\s+/)
      const firstName = nameParts[0] || 'WhatsApp'
      const lastName = nameParts.slice(1).join(' ') || 'Lead'

      // Create a matching contact automatically to track future consent
      await supabase
        .from('contacts')
        .insert({
          organization_id: targetOrg.id,
          first_name: firstName,
          last_name: lastName,
          phone: normalizedPhone,
          type: 'client',
          whatsapp_opted_in: true,
          whatsapp_consent_at: new Date().toISOString()
        })
    }

    // 3. Create lead in organization (matching public_create_lead shape but with 'social' source)
    const nameParts = sender_name.trim().split(/\s+/)
    const firstName = nameParts[0] || 'WhatsApp'
    const lastName = nameParts.slice(1).join(' ') || 'Lead'

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        organization_id: targetOrg.id,
        first_name: firstName,
        last_name: lastName,
        phone: normalizedPhone,
        requirements: message_body,
        source: 'social',
        stage: 'new',
        status: 'open'
      })
      .select('id')
      .single()

    if (leadError) {
      throw leadError
    }

    // 4. Log activity_log for inbound WhatsApp message
    await supabase.from('activity_log').insert({
      organization_id: targetOrg.id,
      type: 'note',
      description: `Inbound WhatsApp message from ${sender_name}: "${message_body.slice(0, 60)}${message_body.length > 60 ? '...' : ''}"`,
      metadata: { 
        action: 'messaged', 
        channel: 'whatsapp_inbound', 
        body: message_body 
      },
      lead_id: lead!.id
    })

    return NextResponse.json({ success: true, lead_id: lead!.id })
  } catch (error: any) {
    console.error('WhatsApp webhook processing error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
