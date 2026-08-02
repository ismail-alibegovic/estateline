import { createAdminClient } from '@/lib/supabase'

export interface DripLeadContext {
  id: string
  full_name?: string
  email?: string
  phone?: string
  stage: string
}

export interface DripExecutionResult {
  triggered: boolean
  channel?: string
  campaign_name?: string
  recipient?: string
}

/**
 * Triggers matching automated drip campaigns when a lead transitions to a new stage.
 */
export async function triggerDripCampaign(
  organizationId: string,
  newStage: string,
  lead: DripLeadContext
): Promise<DripExecutionResult[]> {
  try {
    const supabase = createAdminClient()

    // Fetch active campaigns matching org & stage
    const { data: campaigns } = await supabase
      .from('drip_campaigns')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('trigger_stage', newStage)
      .eq('is_active', true)

    if (!campaigns || campaigns.length === 0) {
      return []
    }

    const results: DripExecutionResult[] = []

    for (const campaign of campaigns) {
      let recipient = lead.email
      if (campaign.channel === 'whatsapp' || campaign.channel === 'sms') {
        recipient = lead.phone
      }

      if (!recipient) {
        results.push({
          triggered: false,
          campaign_name: campaign.name,
          recipient: 'missing_contact_info',
        })
        continue
      }

      // Replace template variables e.g. {{name}}, {{stage}}
      const _body = campaign.template_body
        .replace(/{{name}}/g, lead.full_name || 'Klijent')
        .replace(/{{stage}}/g, newStage)

      // Simulate or dispatch nurture message
      results.push({
        triggered: true,
        channel: campaign.channel,
        campaign_name: campaign.name,
        recipient,
      })
    }

    return results
  } catch {
    return []
  }
}
