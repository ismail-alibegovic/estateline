import { NextRequest, NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'
import { calculateDealCommissions } from '@/lib/commission-service'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    const { org, supabase } = ctx

    const { searchParams } = new URL(req.url)
    const deal_id = searchParams.get('deal_id')

    let query = supabase
      .from('deal_commissions')
      .select('*')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })

    if (deal_id) {
      query = query.eq('deal_id', deal_id)
    }

    const { data: commissions, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: commissions || [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    const { org, supabase } = ctx

    const { deal_id, commission_rate_pct, splits } = await req.json()

    if (!deal_id || !splits || !Array.isArray(splits)) {
      return NextResponse.json(
        { error: 'Missing deal_id or valid splits array' },
        { status: 400 }
      )
    }

    // Fetch deal value
    const { data: deal } = await supabase
      .from('deals')
      .select('id, value')
      .eq('organization_id', org.id)
      .eq('id', deal_id)
      .single()

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const calculation = calculateDealCommissions(
      deal.value || 0,
      commission_rate_pct || 3.0,
      splits
    )

    // Insert commission records
    const insertPayload = calculation.agent_splits.map((s) => ({
      organization_id: org.id,
      deal_id: deal.id,
      agent_id: s.agent_id,
      agent_name: s.agent_name,
      split_percentage: s.split_percentage,
      commission_amount: s.commission_amount,
      status: 'pending',
    }))

    const { data: inserted, error } = await supabase
      .from('deal_commissions')
      .insert(insertPayload)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      calculation,
      data: inserted,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
