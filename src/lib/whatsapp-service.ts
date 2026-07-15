import { createAdminClient } from './supabase'

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button'
  index?: string
  parameters: Array<{
    type: 'text' | 'image' | 'document' | 'video'
    text?: string
    image?: { link: string }
    document?: { link: string; filename?: string }
    video?: { link: string }
  }>
}

/**
 * Sends a WhatsApp Template message using Meta's Cloud API.
 */
export async function sendWhatsAppTemplate(
  orgId: string,
  to: string,
  templateName: string,
  components: WhatsAppTemplateComponent[] = [],
  languageCode: string = 'bs'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const supabase = createAdminClient()
    
    // Fetch organization credentials from whatsapp_config
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('whatsapp_config')
      .eq('id', orgId)
      .single()

    if (orgError || !org?.whatsapp_config) {
      return { success: false, error: 'Organization WhatsApp configuration not found.' }
    }

    const config = org.whatsapp_config as any
    if (!config.access_token || !config.phone_number_id) {
      return { success: false, error: 'WhatsApp API credentials are not configured.' }
    }

    // Normalize target phone number (digits only, no + or spaces)
    const cleanPhone = to.replace(/[^\d]/g, '')
    if (!cleanPhone) {
      return { success: false, error: 'Invalid recipient phone number.' }
    }

    // Check opt-in consent for this phone number
    const { data: contact } = await supabase
      .from('contacts')
      .select('whatsapp_opted_in')
      .eq('organization_id', orgId)
      .eq('phone', to)
      .limit(1)
      .maybeSingle()

    // Enforce opt-in consent before sending template
    if (contact && !contact.whatsapp_opted_in) {
      console.warn(`Attempted to send WhatsApp template to opted-out phone: ${to}`)
      return { success: false, error: 'Recipient has not opted-in to receive WhatsApp messages.' }
    }

    // Make the Meta Graph API request
    const response = await fetch(`https://graph.facebook.com/v19.0/${config.phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          },
          components
        }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error?.message || 'Meta API returned error status' }
    }

    const messageId = data.messages?.[0]?.id

    return { success: true, messageId }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Triggers appropriate WhatsApp outbound templates on lead stage transitions.
 */
export async function handleLeadStageTransition(orgId: string, leadId: string, newStage: string): Promise<void> {
  const supabase = createAdminClient()

  // Fetch the lead details
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .eq('organization_id', orgId)
    .single()

  if (error || !lead || !lead.phone) return

  let templateName = ''
  let components: WhatsAppTemplateComponent[] = []

  const stageLower = newStage.toLowerCase()

  // Match stage to predefined templates
  if (stageLower === 'contacted') {
    templateName = 'brochure_delivery'
    components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: lead.first_name || 'Klijent' },
          { type: 'text', text: 'Pogledajte našu ponudu na estateline.ba' }
        ]
      }
    ]
  } else if (stageLower === 'qualified') {
    templateName = 'viewing_confirmation'
    components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: lead.first_name || 'Klijent' }
        ]
      }
    ]
  } else if (stageLower === 'converted') {
    templateName = 'onboarding_welcome'
    components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: lead.first_name || 'Klijent' }
        ]
      }
    ]
  }

  if (!templateName) return

  // Trigger the template send
  const sendResult = await sendWhatsAppTemplate(orgId, lead.phone, templateName, components, 'bs')

  if (sendResult.success) {
    // Log outbound activity in activity_log
    await supabase.from('activity_log').insert({
      organization_id: orgId,
      type: 'note',
      description: `WhatsApp outbound template "${templateName}" sent to ${lead.first_name}`,
      metadata: { 
        action: 'messaged', 
        channel: 'whatsapp_outbound', 
        template: templateName, 
        message_id: sendResult.messageId 
      },
      lead_id: leadId
    })
  } else {
    console.error(`Failed to trigger automated WhatsApp transition template: ${sendResult.error}`)
  }
}
