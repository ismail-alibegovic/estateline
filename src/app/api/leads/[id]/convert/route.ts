import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'

function requireWrite(role: string) {
  return role === 'owner' || role === 'admin' || role === 'agent'
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    if (!requireWrite(ctx.role))
      return NextResponse.json({ error: 'Insufficient role' }, { status: 403 })

    const body = await request.json()
    const dealType = body.deal_type === 'rental' ? 'rental' : 'sale'
    const propertyId = body.property_id || null

    // 1. Fetch the lead
    const { data: lead, error: leadErr } = await ctx.supabase
      .from('leads')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', ctx.org.id)
      .single()

    if (leadErr || !lead)
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    // 2. Create or find contact from lead
    let contactId: string
    const { data: existingContact } = await ctx.supabase
      .from('contacts')
      .select('id')
      .eq('organization_id', ctx.org.id)
      .eq('first_name', lead.first_name)
      .ilike('email', lead.email || '')
      .limit(1)
      .maybeSingle()

    if (existingContact) {
      contactId = existingContact.id
    } else {
      const { data: newContact, error: contactErr } = await ctx.supabase
        .from('contacts')
        .insert({
          organization_id: ctx.org.id,
          first_name: lead.first_name,
          last_name: lead.last_name || null,
          email: lead.email || null,
          phone: lead.phone || null,
          type: 'client',
        })
        .select('id')
        .single()

      if (contactErr) throw contactErr
      contactId = newContact.id
    }

    // 3. Fetch property price if linked
    let propertyPrice = 0
    if (propertyId) {
      const { data: prop, error: propertyErr } = await ctx.supabase
        .from('properties')
        .select('price')
        .eq('id', propertyId)
        .eq('organization_id', ctx.org.id)
        .single()
      if (propertyErr || !prop) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 })
      }
      propertyPrice = Number(prop.price) || 0
    }

    // 4. Create deal
    const dealTitle = `${lead.first_name} ${lead.last_name || ''}`.trim() + ' — Deal'
    const { data: deal, error: dealErr } = await ctx.supabase
      .from('deals')
      .insert({
        organization_id: ctx.org.id,
        title: dealTitle,
        type: dealType,
        stage: 'qualified',
        contact_id: contactId,
        lead_id: lead.id,
        property_id: propertyId,
        price: propertyPrice || Number(lead.budget_max) || 0,
        currency: 'BAM',
        commission_pct: 3,
        commission_amount: Math.round((propertyPrice || Number(lead.budget_max) || 0) * 0.03),
        probability: 25,
      })
      .select('id, title')
      .single()

    if (dealErr) throw dealErr

    // 5. Update lead status to won
    await ctx.supabase
      .from('leads')
      .update({ status: 'won', updated_at: new Date().toISOString() })
      .eq('id', params.id)

    // 6. Log activity
    await ctx.supabase
      .from('activity_log')
      .insert({
        organization_id: ctx.org.id,
        lead_id: params.id,
        type: 'stage_change',
        description: `Lead converted to deal: ${deal.title}`,
      })

    return NextResponse.json({ data: deal })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
