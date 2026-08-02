import { NextRequest, NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'
import { calculatePropertyLeadMatches } from '@/lib/ai-service'

export async function POST(req: NextRequest) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    const { org, supabase } = ctx

    const { lead_id, property_id } = await req.json()

    if (!lead_id && !property_id) {
      return NextResponse.json(
        { error: 'Specify lead_id or property_id for matchmaking' },
        { status: 400 }
      )
    }

    if (lead_id) {
      // 1. Match lead to active properties
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', org.id)
        .eq('id', lead_id)
        .single()

      if (!lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }

      const { data: properties } = await supabase
        .from('properties')
        .select('id, title, type, city, price, currency, area_size, bedrooms, bathrooms, status')
        .eq('organization_id', org.id)
        .eq('status', 'active')

      const matches = calculatePropertyLeadMatches(
        {
          id: lead.id,
          full_name: lead.full_name,
          email: lead.email,
          phone: lead.phone,
          preferred_type: lead.property_type,
          preferred_city: lead.city,
          budget_max: lead.budget_max,
          budget_min: lead.budget_min,
          min_bedrooms: lead.min_bedrooms,
        },
        properties || []
      )

      return NextResponse.json({ success: true, mode: 'lead_to_properties', matches })
    } else {
      // 2. Match property to active leads
      const { data: property } = await supabase
        .from('properties')
        .select('id, title, type, city, price, currency, area_size, bedrooms, bathrooms, status')
        .eq('organization_id', org.id)
        .eq('id', property_id)
        .single()

      if (!property) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 })
      }

      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', org.id)

      const matches = (leads || []).map((l) => {
        const res = calculatePropertyLeadMatches(
          {
            id: l.id,
            full_name: l.full_name,
            email: l.email,
            phone: l.phone,
            preferred_type: l.property_type,
            preferred_city: l.city,
            budget_max: l.budget_max,
            budget_min: l.budget_min,
            min_bedrooms: l.min_bedrooms,
          },
          [property]
        )
        return {
          lead_id: l.id,
          lead_name: l.full_name || l.email || 'Lead',
          ...res[0],
        }
      }).sort((a, b) => b.match_score - a.match_score)

      return NextResponse.json({ success: true, mode: 'property_to_leads', matches })
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
