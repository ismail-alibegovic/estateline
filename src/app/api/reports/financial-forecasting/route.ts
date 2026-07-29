import { NextRequest, NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx

    const { data, error } = await ctx.supabase.rpc('get_financial_forecasting_report', {
      p_org_id: ctx.org.id,
    })

    if (error) {
      console.error('Error fetching financial forecasting report RPC:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const reportData = data && data.length > 0 ? data[0] : {
      total_pipeline_value: 0,
      weighted_forecast_revenue: 0,
      total_closed_won_revenue: 0,
      earned_commission_paid: 0,
      earned_commission_unpaid: 0,
      active_deals_count: 0,
      closed_won_deals_count: 0
    }

    return NextResponse.json({ data: reportData }, { status: 200 })
  } catch (error: any) {
    console.error('Unexpected error in financial forecasting report endpoint:', error)
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 })
  }
}
